const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ESTADOS = {
  nuevo: 'Nuevo',
  preparando: 'Preparando',
  listo: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
const SIGUIENTE = {
  nuevo: { estado: 'preparando', texto: 'Empezar a preparar' },
  preparando: { estado: 'listo', texto: 'Marcar listo' },
  listo: { estado: 'entregado', texto: 'Marcar entregado' },
};

let token = leerToken();
let filtroEstado = '';
let pedidos = [];
let ultimoIdVisto = null;
let temporizador = null;
let tabActual = 'pedidos';

function leerToken() { try { return localStorage.getItem('adminToken') || ''; } catch { return ''; } }
function guardarToken(t) { try { t ? localStorage.setItem('adminToken', t) : localStorage.removeItem('adminToken'); } catch {} }

async function api(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/admin/login') {
    salir();
    throw new Error('Tu sesión venció. Volvé a ingresar.');
  }
  if (!r.ok) throw new Error(datos.error || 'Algo salió mal.');
  return datos;
}

function aviso(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:100;font-size:.9rem;box-shadow:0 4px 16px rgba(0,0,0,.25)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ---------- Sesión ---------- */
function mostrarApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#btn-salir').hidden = false;
  refrescarTodo();
  clearInterval(temporizador);
  temporizador = setInterval(refrescarPeriodico, 8000);
}

function salir() {
  token = '';
  guardarToken('');
  clearInterval(temporizador);
  $('#app').hidden = true;
  $('#btn-salir').hidden = true;
  $('#login').hidden = false;
  document.title = 'Panel · Ferretería El Clavo';
}

$('#form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('#login-error').hidden = true;
  try {
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#clave').value }) });
    token = r.token;
    guardarToken(token);
    $('#clave').value = '';
    mostrarApp();
  } catch (e) {
    $('#login-error').textContent = e.message;
    $('#login-error').hidden = false;
  }
});
$('#btn-salir').addEventListener('click', salir);

/* ---------- Resumen ---------- */
async function cargarResumen() {
  const r = await api('/api/admin/resumen');
  $('#kpis').innerHTML = `
    <div class="kpi ${r.nuevos ? 'destacado' : ''}"><div class="num">${r.nuevos}</div><div class="lbl">Pedidos nuevos</div></div>
    <div class="kpi"><div class="num">${r.abiertos}</div><div class="lbl">Pedidos abiertos</div></div>
    <div class="kpi"><div class="num">${fmt.format(r.ventas)}</div><div class="lbl">Ventas (${r.total_pedidos} pedidos)</div></div>
    <div class="kpi ${r.bajo_stock ? 'alerta' : ''}"><div class="num">${r.bajo_stock}</div><div class="lbl">Productos con stock bajo</div></div>
    <div class="kpi ${r.sin_stock ? 'alerta' : ''}"><div class="num">${r.sin_stock}</div><div class="lbl">Productos agotados</div></div>`;
  const bn = $('#badge-nuevos');
  bn.hidden = !r.nuevos;
  bn.textContent = r.nuevos;
  const alertas = r.bajo_stock + r.sin_stock;
  const bs = $('#badge-stock');
  bs.hidden = !alertas;
  bs.textContent = alertas;
  document.title = (r.nuevos ? `(${r.nuevos}) ` : '') + 'Panel · Ferretería El Clavo';
}

/* ---------- Pedidos ---------- */
function hace(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-AR');
}

function linkWhatsApp(p) {
  let n = String(p.telefono).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length === 10) n = '549' + n;
  const texto = `Hola ${p.cliente}! Tu pedido #${p.id} de Ferretería El Clavo ya está listo para retirar. Total: ${fmt.format(p.total)}. ¡Te esperamos!`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

function dibujarFiltros() {
  const items = [['', 'Todos'], ...Object.entries(ESTADOS)];
  $('#filtros-estado').innerHTML = items
    .map(([k, v]) => `<button class="chip ${k === filtroEstado ? 'activo' : ''}" data-estado="${k}">${v}</button>`)
    .join('');
}

function dibujarPedidos() {
  const cont = $('#lista-pedidos');
  if (!pedidos.length) {
    cont.innerHTML = `<div class="sin-datos">No hay pedidos${filtroEstado ? ' en este estado' : ' todavía'}.</div>`;
    return;
  }
  cont.innerHTML = pedidos.map((p) => {
    const sig = SIGUIENTE[p.estado];
    const puedeCancelar = p.estado !== 'entregado' && p.estado !== 'cancelado';
    return `
    <article class="pedido ${p.estado}">
      <div class="ped-cab">
        <h3>#${p.id} · ${esc(p.cliente)}</h3>
        <div>
          ${p.origen && p.origen !== 'web' ? `<span class="pill origen">🤖 ${esc(p.origen)}</span>` : ''}
          <span class="pill ${p.estado}">${ESTADOS[p.estado] || esc(p.estado)}</span>
        </div>
      </div>
      <div class="ped-meta">📞 <a href="tel:${esc(p.telefono)}">${esc(p.telefono)}</a> · ${hace(p.creado)}</div>
      <ul class="ped-items">
        ${p.items.map((i) => `<li><span>${i.cantidad} × ${esc(i.nombre)}</span><span>${fmt.format(i.precio * i.cantidad)}</span></li>`).join('')}
      </ul>
      ${p.notas ? `<div class="ped-nota">📝 ${esc(p.notas)}</div>` : ''}
      <div class="ped-pie">
        <span class="ped-total">${fmt.format(p.total)}</span>
        <div class="ped-acc">
          ${p.estado === 'listo' ? `<a class="btn chico wa" href="${linkWhatsApp(p)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>` : ''}
          ${sig ? `<button class="btn primario chico" data-pedido="${p.id}" data-nuevo="${sig.estado}">${sig.texto}</button>` : ''}
          ${puedeCancelar ? `<button class="btn peligro chico" data-pedido="${p.id}" data-nuevo="cancelado">Cancelar</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

async function cargarPedidos() {
  const q = filtroEstado ? '?estado=' + encodeURIComponent(filtroEstado) : '';
  pedidos = await api('/api/admin/pedidos' + q);
  dibujarPedidos();
}

async function detectarNuevos() {
  const todos = filtroEstado ? await api('/api/admin/pedidos') : pedidos;
  const maxId = todos.reduce((m, p) => Math.max(m, p.id), 0);
  if (ultimoIdVisto !== null && maxId > ultimoIdVisto) {
    const nuevos = todos.filter((p) => p.id > ultimoIdVisto);
    aviso(`🔔 Pedido nuevo: #${nuevos[0].id} de ${nuevos[0].cliente}`);
  }
  ultimoIdVisto = maxId;
}

$('#filtros-estado').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-estado]');
  if (!b) return;
  filtroEstado = b.dataset.estado;
  dibujarFiltros();
  try { await cargarPedidos(); } catch (e) { aviso(e.message); }
});

$('#lista-pedidos').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-pedido]');
  if (!b) return;
  const id = Number(b.dataset.pedido);
  const nuevo = b.dataset.nuevo;
  if (nuevo === 'cancelado' && !confirm(`¿Cancelar el pedido #${id}? El stock de sus productos vuelve al inventario.`)) return;
  b.disabled = true;
  try {
    await api('/api/admin/pedidos/' + id, { method: 'PATCH', body: JSON.stringify({ estado: nuevo }) });
    aviso(nuevo === 'cancelado' ? `Pedido #${id} cancelado. Stock devuelto.` : `Pedido #${id}: ${ESTADOS[nuevo]}`);
    await Promise.all([cargarPedidos(), cargarResumen()]);
    if (tabActual === 'inventario') await cargarInventario();
  } catch (e) {
    aviso(e.message);
    b.disabled = false;
  }
});

/* ---------- Inventario ---------- */
let productos = [];

function estadoStock(p) {
  if (p.stock <= 0) return ['sin', 'Agotado'];
  if (p.stock <= p.stock_minimo) return ['bajo', 'Stock bajo'];
  return ['ok', 'OK'];
}

async function cargarInventario() {
  const params = new URLSearchParams();
  const q = $('#buscar-inv').value.trim();
  if (q) params.set('q', q);
  if ($('#solo-bajo').checked) params.set('bajo', '1');
  productos = await api('/api/admin/productos?' + params);
  dibujarInventario();
}

function dibujarInventario() {
  if (!productos.length) {
    $('#cuerpo-inv').innerHTML = `<tr><td colspan="5" class="sin-datos">No hay productos para mostrar.</td></tr>`;
    return;
  }
  $('#cuerpo-inv').innerHTML = productos.map((p) => {
    const [clase, texto] = estadoStock(p);
    return `
    <tr class="${clase === 'sin' ? 'fila-sin' : clase === 'bajo' ? 'fila-bajo' : ''}" data-fila="${p.id}">
      <td class="prod">${esc(p.nombre)}<small>${esc(p.categoria)} · ${esc(p.marca)}</small></td>
      <td><span class="pill ${clase}">${texto}</span></td>
      <td><input type="number" min="0" step="1" value="${p.stock}" data-id="${p.id}" data-campo="stock"></td>
      <td><input type="number" min="0" step="1" value="${p.stock_minimo}" data-id="${p.id}" data-campo="stock_minimo"></td>
      <td><input type="number" min="1" step="1" value="${p.precio}" data-id="${p.id}" data-campo="precio"></td>
    </tr>`;
  }).join('');
}

$('#cuerpo-inv').addEventListener('change', async (ev) => {
  const inp = ev.target.closest('input[data-campo]');
  if (!inp) return;
  const id = Number(inp.dataset.id);
  try {
    const p = await api('/api/admin/productos/' + id, { method: 'PATCH', body: JSON.stringify({ [inp.dataset.campo]: inp.value }) });
    const i = productos.findIndex((x) => x.id === id);
    if (i >= 0) productos[i] = p;
    inp.classList.remove('fallo');
    inp.classList.add('guardado');
    // Actualiza la fila (estado y color) sin perder el foco de lo demás
    const fila = inp.closest('tr');
    const [clase, texto] = estadoStock(p);
    fila.className = clase === 'sin' ? 'fila-sin' : clase === 'bajo' ? 'fila-bajo' : '';
    fila.querySelector('.pill').className = 'pill ' + clase;
    fila.querySelector('.pill').textContent = texto;
    setTimeout(() => inp.classList.remove('guardado'), 1200);
    cargarResumen().catch(() => {});
  } catch (e) {
    inp.classList.add('fallo');
    aviso(e.message);
    cargarInventario().catch(() => {});
  }
});

let tInv;
$('#buscar-inv').addEventListener('input', () => {
  clearTimeout(tInv);
  tInv = setTimeout(() => cargarInventario().catch((e) => aviso(e.message)), 250);
});
$('#solo-bajo').addEventListener('change', () => cargarInventario().catch((e) => aviso(e.message)));

/* ---------- Pestañas y refresco ---------- */
document.querySelector('.tabs').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-tab]');
  if (!b) return;
  tabActual = b.dataset.tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('activo', t === b));
  $('#tab-pedidos').hidden = tabActual !== 'pedidos';
  $('#tab-inventario').hidden = tabActual !== 'inventario';
  try {
    if (tabActual === 'inventario') await cargarInventario();
    else await cargarPedidos();
  } catch (e) { aviso(e.message); }
});

async function refrescarTodo() {
  dibujarFiltros();
  try {
    await Promise.all([cargarResumen(), cargarPedidos()]);
    await detectarNuevos();
    if (tabActual === 'inventario') await cargarInventario();
  } catch (e) {
    aviso(e.message);
  }
}

// Cada 8 segundos: trae pedidos nuevos y resumen. El inventario no se toca para no pisar lo que se esté editando.
async function refrescarPeriodico() {
  try {
    await Promise.all([cargarResumen(), cargarPedidos()]);
    await detectarNuevos();
  } catch { /* si falla una vez, se reintenta en el próximo ciclo */ }
}

if (token) mostrarApp();
