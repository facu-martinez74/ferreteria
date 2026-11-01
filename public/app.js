const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = window.NEGOCIO || {};

// categoría -> [ícono, fondo, color]
const CAT = {
  'Herramientas manuales': ['hammer', '#e6ebf1', '#334155'],
  'Herramientas electricas': ['drill', '#fbeec9', '#7a5600'],
  'Pintureria': ['roller', '#e1efec', '#17615a'],
  'Electricidad': ['bulb', '#fae6dc', '#9a3c12'],
  'Plomeria': ['faucet', '#dfecf9', '#1d4f87'],
  'Fijaciones': ['screw', '#ebe6f4', '#493a7a'],
  'Seguridad': ['hat', '#fbe4e4', '#a32222'],
  'Jardin': ['plant', '#e2f0df', '#2f6a2a'],
};
const ETIQ = { 'Herramientas electricas': 'Herramientas eléctricas', 'Pintureria': 'Pinturería', 'Plomeria': 'Plomería', 'Jardin': 'Jardín' };
const etiq = (c) => ETIQ[c] || c;
const ic = (n) => `<svg class="i"><use href="#${n}"/></svg>`;
const pic = (p, extra = '') => {
  const [i, t, c] = CAT[p.categoria] || ['box', '#e9edf1', '#3b4650'];
  const foto = p.foto ? `<img class="foto" src="${esc(p.foto)}" alt="${esc(p.nombre || '')}" loading="lazy" onerror="this.remove()">` : '';
  return `<div class="pic ${foto ? 'conFoto' : ''}" style="--t:${t};--c:${c}">${ic('c-' + i)}${foto}${extra}</div>`;
};
const estado = (p) => (p.stock <= 0 ? ['sin', 'Sin stock'] : p.stock <= p.stock_minimo ? ['poco', `Últimas ${p.stock} unidades`] : ['ok', 'En stock']);

let productos = [];
let categoria = '';
let carrito = cargarCarrito();
let detalle = null;
let detCant = 1;

function cargarCarrito() {
  try { return JSON.parse(localStorage.getItem('carrito') || '[]'); } catch { return []; }
}
function guardarCarrito() {
  try { localStorage.setItem('carrito', JSON.stringify(carrito)); } catch {}
}
async function pedir(url, opciones) {
  const r = await fetch(url, opciones);
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || 'Algo salió mal. Probá de nuevo.');
  return datos;
}

/* ---------- Paneles ---------- */
const PANELES = ['#panel', '#hoja-det', '#hoja-pedido'];
function mostrar(sel) {
  $(sel).classList.add('on');
  $('#velo').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function cerrarTodo() {
  PANELES.forEach((s) => $(s).classList.remove('on'));
  $('#velo').classList.remove('on');
  document.body.style.overflow = '';
}
const abrirPanel = () => { cerrarTodo(); mostrar('#panel'); };
let tt;
function avisar(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- Catálogo ---------- */
async function cargarCategorias() {
  const cats = await pedir('/api/categorias');
  $('#chips').innerHTML =
    `<button class="chip on" data-cat="">${ic('c-box')}Todo</button>` +
    cats.map((c) => `<button class="chip" data-cat="${esc(c.categoria)}">${ic('c-' + (CAT[c.categoria] || ['box'])[0])}${esc(etiq(c.categoria))}</button>`).join('');
}

async function cargarProductos() {
  const q = $('#buscador').value.trim();
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoria) params.set('categoria', categoria);
  try {
    productos = await pedir('/api/productos?' + params);
    dibujarGrilla();
  } catch (e) {
    $('#grilla').innerHTML = `<div class="vacio">No pudimos cargar el catálogo. ${esc(e.message)}</div>`;
  }
}

function ordenar(lista) {
  const m = $('#orden').value;
  const hay = (x, y) => (y.stock > 0) - (x.stock > 0);
  const f = { menor: (x, y) => x.precio - y.precio, mayor: (x, y) => y.precio - x.precio, az: (x, y) => x.nombre.localeCompare(y.nombre, 'es') }[m];
  return [...lista].sort((x, y) => hay(x, y) || (f ? f(x, y) : 0));
}

function dibujarGrilla() {
  $('#tit-cat').textContent = categoria ? etiq(categoria) : 'Catálogo';
  $('#resumen').textContent = productos.length ? `${productos.length} producto${productos.length === 1 ? '' : 's'}` : '';
  if (!productos.length) {
    $('#grilla').innerHTML = `<div class="vacio">No encontramos nada con esa búsqueda.<br>Probá con otras palabras o contale tu trabajo al asistente.</div>`;
    return;
  }
  $('#grilla').innerHTML = ordenar(productos).map((p) => {
    const e = estado(p);
    return `<article class="card ${p.stock <= 0 ? 'sin' : ''}" data-id="${p.id}" tabindex="0">
      ${pic(p, '<span class="en" hidden></span>')}
      <div class="info">
        <small>${esc(p.marca)}</small>
        <h3>${esc(p.nombre)}</h3>
        <span class="st ${e[0]}">${e[1]}</span>
        <div class="pr"><b>${fmt.format(p.precio)}</b>
          <button class="mas" data-agregar="${p.id}" aria-label="Agregar ${esc(p.nombre)} al pedido" ${p.stock <= 0 ? 'disabled' : ''}>${ic('i-plus')}</button>
        </div>
      </div></article>`;
  }).join('');
  marcarEnCarrito();
}

function marcarEnCarrito() {
  document.querySelectorAll('.card').forEach((c) => {
    const n = cantidadEnCarrito(Number(c.dataset.id));
    const el = c.querySelector('.en');
    el.hidden = !n;
    el.textContent = n ? `${n} en tu pedido` : '';
  });
}

/* ---------- Detalle de producto ---------- */
function abrirDetalle(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  detalle = p;
  detCant = 1;
  pintarDetalle();
  cerrarTodo();
  mostrar('#hoja-det');
}
function pintarDetalle() {
  const p = detalle;
  const e = estado(p);
  const usos = (p.usos || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  $('#det').innerHTML = `${pic(p)}
    <div class="marca">${esc(p.marca)}</div>
    <h2>${esc(p.nombre)}</h2>
    <div class="pd"><b>${fmt.format(p.precio)}</b><span>por ${esc(p.unidad || 'unidad')}</span></div>
    <span class="st ${e[0]}">${e[1]}</span>
    <p class="desc">${esc(p.descripcion)}</p>
    ${usos.length ? `<h3>Sirve para</h3><div class="usos">${usos.map((u) => `<span>${esc(u)}</span>`).join('')}</div>` : ''}
    <div class="dacc">
      <div class="qty"><button data-dmenos aria-label="Quitar uno">${ic('i-minus')}</button><span>${detCant}</span><button data-dmas aria-label="Sumar uno">${ic('i-plus')}</button></div>
      <button class="btn pri" data-dagregar ${p.stock <= 0 ? 'disabled' : ''}>Agregar ${fmt.format(p.precio * detCant)}</button>
    </div>`;
}

/* ---------- Carrito ---------- */
const cantidadEnCarrito = (id) => carrito.find((l) => l.id === id)?.cantidad || 0;

function agregar(id, cant = 1) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  const linea = carrito.find((l) => l.id === id);
  const actual = linea ? linea.cantidad : 0;
  if (actual + cant > p.stock) {
    if (actual >= p.stock) return avisar(`Solo hay ${p.stock} en stock.`);
    cant = p.stock - actual;
  }
  if (linea) { linea.cantidad += cant; linea.stock = p.stock; }
  else carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: cant, stock: p.stock, categoria: p.categoria });
  guardarCarrito();
  dibujarCarrito();
  avisar('✓ Agregado a tu pedido');
}

function cambiarCantidad(id, delta) {
  const l = carrito.find((x) => x.id === id);
  if (!l) return;
  const nueva = l.cantidad + delta;
  if (nueva > l.stock) return avisar(`Solo hay ${l.stock} en stock.`);
  l.cantidad = nueva;
  if (l.cantidad <= 0) carrito = carrito.filter((x) => x.id !== id);
  guardarCarrito();
  dibujarCarrito();
}
function quitar(id) {
  carrito = carrito.filter((x) => x.id !== id);
  guardarCarrito();
  dibujarCarrito();
}
const totalCarrito = () => carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);

function dibujarCarrito() {
  const cant = carrito.reduce((s, l) => s + l.cantidad, 0);
  $('#carrito-cant').textContent = cant;
  $('#carrito-cant').hidden = !cant;
  $('#total').textContent = fmt.format(totalCarrito());
  $('#btn-confirmar').disabled = carrito.length === 0;
  $('#lineas').innerHTML = carrito.length
    ? carrito.map((l) => `
      <div class="li">
        ${pic({ ...(productos.find((x) => x.id === l.id) || {}), categoria: l.categoria })}
        <div>
          <h4>${esc(l.nombre)}</h4>
          <small>${fmt.format(l.precio)} c/u</small>
          <div class="qty"><button data-menos="${l.id}" aria-label="Quitar uno">${ic('i-minus')}</button><span>${l.cantidad}</span><button data-mas="${l.id}" aria-label="Sumar uno">${ic('i-plus')}</button></div>
        </div>
        <div><div class="imp">${fmt.format(l.precio * l.cantidad)}</div><button class="rm" data-quitar="${l.id}">Quitar</button></div>
      </div>`).join('')
    : `<div class="vacio">Todavía no agregaste nada.<br>Sumá productos o pedile una lista al asistente.<br><br><button class="btn pri" data-cerrar-panel>Ver el catálogo</button></div>`;
  marcarEnCarrito();
}

// API que usa el asistente del chat para sumar productos al mismo pedido de la tienda.
function agregarItems(items) {
  let tope = 0;
  for (const it of items || []) {
    const id = Number(it.id);
    const cant = Math.max(1, Math.floor(Number(it.cantidad)) || 1);
    if (!Number.isInteger(id) || !(it.stock > 0)) continue;
    const linea = carrito.find((l) => l.id === id);
    const nueva = Math.min((linea ? linea.cantidad : 0) + cant, it.stock);
    if (nueva < (linea ? linea.cantidad : 0) + cant) tope++;
    const prod = productos.find((x) => x.id === id);
    if (linea) { linea.cantidad = nueva; linea.stock = it.stock; linea.precio = it.precio; }
    else carrito.push({ id, nombre: it.nombre, precio: it.precio, cantidad: nueva, stock: it.stock, categoria: it.categoria || prod?.categoria });
  }
  guardarCarrito();
  dibujarCarrito();
  avisar(tope ? 'Agregado al pedido (algunas cantidades se ajustaron al stock).' : '✓ Agregado a tu pedido');
}
window.elClavo = { agregarItems, abrirCarrito: () => abrirPanel() };

/* ---------- Pedido ---------- */
function abrirPedido() {
  $('#form-error').hidden = true;
  $('#form-pedido').hidden = false;
  $('#exito').hidden = true;
  cerrarTodo();
  mostrar('#hoja-pedido');
  setTimeout(() => $('#form-pedido [name=cliente]').focus(), 250);
}

async function enviarPedido(ev) {
  ev.preventDefault();
  const f = ev.target;
  const btn = $('#btn-enviar');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  $('#form-error').hidden = true;
  try {
    const pedido = await pedir('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: f.cliente.value,
        telefono: f.telefono.value,
        notas: f.notas.value,
        items: carrito.map((l) => ({ id: l.id, cantidad: l.cantidad })),
      }),
    });
    carrito = [];
    guardarCarrito();
    dibujarCarrito();
    f.hidden = true;
    $('#exito-texto').textContent = `Pedido #${pedido.id} por ${fmt.format(pedido.total)}. Lo estamos preparando, ${pedido.cliente}. Te avisamos cuando esté listo para retirar.`;
    const t4 = String(f.telefono.value || pedido.telefono || '').replace(/\D/g, '').slice(-4);
    $('#exito-seguir').href = `/seguimiento.html?n=${pedido.id}&t=${t4}`;
    $('#exito').hidden = false;
    f.reset();
    cargarProductos();
  } catch (e) {
    $('#form-error').textContent = e.message;
    $('#form-error').hidden = false;
    cargarProductos();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar pedido';
  }
}

/* ---------- Datos del local ---------- */
function pintarNegocio() {
  const f = [];
  if (N.direccion) f.push(`${ic('i-pin')}<span>${esc(N.direccion)}</span>`);
  if (N.horarios) f.push(`${ic('i-clock')}<span>${esc(N.horarios)}</span>`);
  if (N.telefono) f.push(`${ic('i-phone')}<a href="tel:${esc(String(N.telefono).replace(/[^\d+]/g, ''))}">${esc(N.telefono)}</a>`);
  if (N.whatsapp) f.push(`${ic('i-chat')}<a href="https://wa.me/${esc(String(N.whatsapp).replace(/\D/g, ''))}" target="_blank" rel="noopener">Escribinos por WhatsApp</a>`);
  $('#contacto').innerHTML = f.map((x) => `<li>${x}</li>`).join('');
  $('#contacto').hidden = !f.length;
  if (N.horarios) $('#aviso').textContent = `Retirá en el local: ${N.horarios}`;
}

/* ---------- Eventos ---------- */
let temporizador;
$('#buscador').addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarProductos, 250);
});
$('#orden').addEventListener('change', () => productos.length && dibujarGrilla());

$('#chips').addEventListener('click', (ev) => {
  const chip = ev.target.closest('.chip');
  if (!chip) return;
  categoria = chip.dataset.cat;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
  chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  cargarProductos();
});

$('#grilla').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-agregar]');
  if (b) return agregar(Number(b.dataset.agregar));
  const c = ev.target.closest('.card');
  if (c) abrirDetalle(Number(c.dataset.id));
});
$('#grilla').addEventListener('keydown', (ev) => {
  const c = ev.target.closest('.card');
  if (c && ev.target === c && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); abrirDetalle(Number(c.dataset.id)); }
});

$('#det').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b || !detalle) return;
  if (b.hasAttribute('data-dmas')) detCant = Math.min(detCant + 1, Math.max(detalle.stock, 1));
  else if (b.hasAttribute('data-dmenos')) detCant = Math.max(1, detCant - 1);
  else if (b.hasAttribute('data-dagregar')) { agregar(detalle.id, detCant); return cerrarTodo(); }
  pintarDetalle();
});

$('#lineas').addEventListener('click', (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  if (t.dataset.mas) cambiarCantidad(Number(t.dataset.mas), 1);
  else if (t.dataset.menos) cambiarCantidad(Number(t.dataset.menos), -1);
  else if (t.dataset.quitar) quitar(Number(t.dataset.quitar));
  else if (t.hasAttribute('data-cerrar-panel')) { cerrarTodo(); document.querySelector('#catalogo').scrollIntoView(); }
});

$('#btn-carrito').addEventListener('click', abrirPanel);
$('#cerrar-panel').addEventListener('click', cerrarTodo);
$('#velo').addEventListener('click', cerrarTodo);
document.querySelectorAll('.cerrar-hoja').forEach((b) => b.addEventListener('click', cerrarTodo));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarTodo(); });
$('#btn-confirmar').addEventListener('click', abrirPedido);
$('#btn-cancelar').addEventListener('click', abrirPanel);
$('#btn-cerrar-exito').addEventListener('click', cerrarTodo);
$('#form-pedido').addEventListener('submit', enviarPedido);

document.querySelectorAll('[data-asistente]').forEach((b) => b.addEventListener('click', () => {
  if (window.elClavoChat) window.elClavoChat.abrir(b.dataset.asistente === '1' ? '' : b.dataset.asistente);
}));
$('#f-asis').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const t = $('#t-asis').value.trim();
  if (window.elClavoChat) window.elClavoChat.abrir(t);
  $('#t-asis').value = '';
});

// La barra de categorías se pega justo debajo del encabezado, que en el celu ocupa dos filas.
const medir = () => document.documentElement.style.setProperty('--hh', document.querySelector('header').offsetHeight + 'px');
addEventListener('resize', medir);

(async function iniciar() {
  medir();
  pintarNegocio();
  $('#grilla').innerHTML = '<div class="vacio">Cargando catálogo…</div>';
  dibujarCarrito();
  try { await cargarCategorias(); } catch { /* sin chips, el catálogo igual carga */ }
  await cargarProductos();
})();
