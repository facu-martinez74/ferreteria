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
let sesion = null; // { token, cliente }
try { sesion = JSON.parse(localStorage.getItem('clavo_sesion') || 'null'); } catch { sesion = null; }
const guardarSesion = () => { try { sesion ? localStorage.setItem('clavo_sesion', JSON.stringify(sesion)) : localStorage.removeItem('clavo_sesion'); } catch {} };
let config = { envio: { costo: 3500, gratis_desde: 60000 } };
async function pedir(url, opciones = {}) {
  if (sesion?.token) opciones = { ...opciones, headers: { ...(opciones.headers || {}), Authorization: 'Bearer ' + sesion.token } };
  const r = await fetch(url, opciones);
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || 'Algo salió mal. Probá de nuevo.');
  return datos;
}

/* ---------- Paneles ---------- */
const PANELES = ['#panel', '#hoja-det', '#hoja-pedido', '#hoja-cuenta', '#hoja-mis'];
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

/* ---------- Cuenta del cliente ---------- */
const primerNombre = () => String(sesion?.cliente?.nombre || '').split(' ')[0];
function pintarCuenta() {
  $('#cuenta-txt').textContent = sesion ? primerNombre() : 'Ingresar';
}
async function validarSesion() {
  if (!sesion) return;
  try { sesion.cliente = await pedir('/api/auth/yo'); guardarSesion(); }
  catch (e) { if (!(e instanceof TypeError)) { sesion = null; guardarSesion(); } }
  pintarCuenta();
}
let despuesDeLogin = null;
function abrirCuenta(modo = 'login', alTerminar = null) {
  despuesDeLogin = alTerminar;
  cambiarModoCuenta(modo);
  $('#cuenta-error').hidden = true;
  cerrarTodo();
  mostrar('#hoja-cuenta');
}
function cambiarModoCuenta(modo) {
  const reg = modo === 'registro';
  document.querySelectorAll('#hoja-cuenta [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === modo));
  document.querySelectorAll('#form-cuenta [data-solo]').forEach((e) => { e.hidden = !reg; });
  const f = $('#form-cuenta');
  f.dataset.modo = modo;
  f.nombre.required = reg;
  f.password.autocomplete = reg ? 'new-password' : 'current-password';
  $('#btn-cuenta-ok').textContent = reg ? 'Crear mi cuenta' : 'Ingresar';
  $('#cuenta-sub').textContent = reg ? 'Guardamos tus datos para que no los cargues en cada compra y puedas ver tus pedidos.' : 'Entrá para ver tus pedidos y comprar sin volver a cargar tus datos.';
}
$('#hoja-cuenta').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (b) cambiarModoCuenta(b.dataset.tab); });
$('#form-cuenta').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const reg = f.dataset.modo === 'registro';
  const btn = $('#btn-cuenta-ok');
  btn.disabled = true;
  $('#cuenta-error').hidden = true;
  try {
    const cuerpo = reg
      ? { nombre: f.nombre.value, email: f.email.value, password: f.password.value, telefono: f.telefono.value, direccion: f.direccion.value }
      : { email: f.email.value, password: f.password.value };
    const r = await pedir(reg ? '/api/auth/registro' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    sesion = r;
    guardarSesion();
    pintarCuenta();
    f.reset();
    avisar(reg ? `¡Bienvenido, ${primerNombre()}!` : `Hola de nuevo, ${primerNombre()}`);
    const seguir = despuesDeLogin;
    despuesDeLogin = null;
    cerrarTodo();
    if (seguir) seguir();
  } catch (e) {
    $('#cuenta-error').textContent = e instanceof TypeError ? 'No hay conexión. Revisá tu internet.' : e.message;
    $('#cuenta-error').hidden = false;
  } finally { btn.disabled = false; }
});

const ESTADO_TXT = { nuevo: 'Recibido', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
const t4 = (t) => String(t || '').replace(/\D/g, '').slice(-4);
let misPedidos = [];
async function abrirMis() {
  cerrarTodo();
  mostrar('#hoja-mis');
  $('#mis-titulo').textContent = `Hola, ${primerNombre()}`;
  cambiarTabMis('pedidos');
  const f = $('#form-datos');
  const c = sesion.cliente;
  f.nombre.value = c.nombre || ''; f.email.value = c.email || ''; f.telefono.value = c.telefono || ''; f.direccion.value = c.direccion || '';
  $('#mis-pedidos').innerHTML = '<div class="vacio-mis">Cargando tus pedidos…</div>';
  try {
    misPedidos = await pedir('/api/auth/pedidos');
    pintarMis();
  } catch (e) {
    if (/Sesión vencida/.test(e.message)) { sesion = null; guardarSesion(); pintarCuenta(); return abrirCuenta('login'); }
    $('#mis-pedidos').innerHTML = `<div class="vacio-mis">${esc(e.message)}</div>`;
  }
}
function cambiarTabMis(t) {
  document.querySelectorAll('#hoja-mis [data-mtab]').forEach((b) => b.classList.toggle('on', b.dataset.mtab === t));
  $('#mis-pedidos').hidden = t !== 'pedidos';
  $('#form-datos').hidden = t !== 'datos';
}
function pintarMis() {
  if (!misPedidos.length) {
    $('#mis-pedidos').innerHTML = '<div class="vacio-mis">Todavía no hiciste pedidos.<br>Cuando compres, los vas a ver acá y podés repetirlos con un toque.</div>';
    return;
  }
  $('#mis-pedidos').innerHTML = misPedidos.map((p) => `
    <article class="mp">
      <div class="mp-cab"><b>Pedido #${p.id}</b><span class="pill ${esc(p.estado)}">${esc(ESTADO_TXT[p.estado] || p.estado)}</span></div>
      <small>${esc(new Date(p.creado).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }))} · ${p.entrega === 'envio' ? 'Envío a domicilio' : 'Retiro en el local'} · ${p.pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}</small>
      <ul>${p.items.map((i) => `<li><span>${i.cantidad} × ${esc(i.nombre)}</span><span>${fmt.format(i.precio * i.cantidad)}</span></li>`).join('')}
        ${p.costo_envio ? `<li><span>Envío</span><span>${fmt.format(p.costo_envio)}</span></li>` : ''}</ul>
      <div class="mp-pie"><b>${fmt.format(p.total)}</b>
        <span><a class="btn" href="/seguimiento.html?n=${p.id}&t=${t4(p.telefono)}">Seguir</a>
        <button class="btn" type="button" data-repetir="${p.id}">Repetir pedido</button></span></div>
    </article>`).join('');
}
$('#hoja-mis').addEventListener('click', async (ev) => {
  const tab = ev.target.closest('[data-mtab]');
  if (tab) return cambiarTabMis(tab.dataset.mtab);
  const rep = ev.target.closest('[data-repetir]');
  if (rep) {
    const p = misPedidos.find((x) => x.id === Number(rep.dataset.repetir));
    if (!p) return;
    try {
      const todos = await pedir('/api/productos');
      const items = p.items.map((i) => todos.find((x) => x.id === i.producto_id) && { ...todos.find((x) => x.id === i.producto_id), cantidad: i.cantidad }).filter(Boolean);
      const sinStock = items.filter((x) => x.stock <= 0).length + (p.items.length - items.length);
      productos = todos.length >= productos.length ? todos : productos;
      agregarItems(items.map((x) => ({ id: x.id, nombre: x.nombre, precio: x.precio, cantidad: x.cantidad, stock: x.stock, categoria: x.categoria })));
      if (sinStock) avisar('Agregué lo que hay; algunos productos ya no tienen stock.');
      abrirPanel();
    } catch (e) { avisar(e.message); }
  }
});
$('#btn-salir').addEventListener('click', async () => {
  try { await pedir('/api/auth/logout', { method: 'POST' }); } catch {}
  sesion = null; guardarSesion(); pintarCuenta(); cerrarTodo(); avisar('Cerraste sesión');
});
$('#form-datos').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  $('#datos-error').hidden = true;
  try {
    sesion.cliente = await pedir('/api/auth/yo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: f.nombre.value, telefono: f.telefono.value, direccion: f.direccion.value }) });
    guardarSesion(); pintarCuenta(); $('#mis-titulo').textContent = `Hola, ${primerNombre()}`;
    avisar('✓ Datos guardados');
  } catch (e) { $('#datos-error').textContent = e.message; $('#datos-error').hidden = false; }
});
$('#btn-cuenta').addEventListener('click', () => (sesion ? abrirMis() : abrirCuenta('login')));

/* ---------- Pedido ---------- */
const envioGratis = () => totalCarrito() >= config.envio.gratis_desde;
const costoEnvio = () => (document.querySelector('#form-pedido [name=entrega]:checked')?.value === 'envio' && !envioGratis() ? config.envio.costo : 0);

function pintarResumenPedido() {
  const f = $('#form-pedido');
  const envio = f.entrega.value === 'envio';
  $('#l-dir').hidden = !envio;
  f.direccion.required = envio;
  $('#pago-efectivo-det').textContent = envio ? 'Pagás cuando te lo llevamos' : 'Pagás al retirar';
  $('#envio-det').textContent = envioGratis() ? 'Gratis en esta compra' : `${fmt.format(config.envio.costo)} · gratis desde ${fmt.format(config.envio.gratis_desde)}`;
  const sub = totalCarrito();
  const env = costoEnvio();
  $('#resumen-ped').innerHTML = `
    <div><span>Subtotal (${carrito.reduce((s, l) => s + l.cantidad, 0)} productos)</span><span>${fmt.format(sub)}</span></div>
    ${envio ? `<div><span>Envío</span><span class="${env ? '' : 'gr'}">${env ? fmt.format(env) : 'Gratis'}</span></div>` : ''}
    <div class="t"><span>Total</span><span>${fmt.format(sub + env)}</span></div>`;
}
function pintarAvisoCuenta() {
  const a = $('#aviso-cuenta');
  if (sesion) { a.className = 'aviso-cuenta ok'; a.textContent = `Comprando como ${sesion.cliente.nombre}. Tus datos están completados.`; }
  else { a.className = 'aviso-cuenta'; a.innerHTML = '¿Ya tenés cuenta? <button type="button" data-login>Ingresá</button> o <button type="button" data-registro>creá una</button> para completar tus datos solos. También podés comprar sin cuenta.'; }
}
$('#aviso-cuenta').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  abrirCuenta(b.hasAttribute('data-registro') ? 'registro' : 'login', abrirPedido);
});
$('#form-pedido').addEventListener('change', pintarResumenPedido);

function abrirPedido() {
  const f = $('#form-pedido');
  $('#form-error').hidden = true;
  f.hidden = false;
  $('#exito').hidden = true;
  if (sesion?.cliente) {
    if (!f.cliente.value) f.cliente.value = sesion.cliente.nombre || '';
    if (!f.telefono.value) f.telefono.value = sesion.cliente.telefono || '';
    if (!f.direccion.value) f.direccion.value = sesion.cliente.direccion || '';
  }
  pintarAvisoCuenta();
  pintarResumenPedido();
  cerrarTodo();
  mostrar('#hoja-pedido');
  $('#hoja-pedido').scrollTop = 0;
}

async function enviarPedido(ev) {
  ev.preventDefault();
  const f = ev.target;
  const btn = $('#btn-enviar');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  $('#form-error').hidden = true;
  try {
    const envio = f.entrega.value === 'envio';
    const pago = f.pago.value;
    const pedido = await pedir('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: f.cliente.value,
        telefono: f.telefono.value,
        notas: f.notas.value,
        entrega: f.entrega.value,
        direccion: envio ? f.direccion.value : '',
        pago,
        items: carrito.map((l) => ({ id: l.id, cantidad: l.cantidad })),
      }),
    });
    carrito = [];
    guardarCarrito();
    dibujarCarrito();
    f.hidden = true;
    const como = pedido.entrega === 'envio' ? `Lo llevamos a ${pedido.direccion}.` : 'Te avisamos cuando esté listo para retirar.';
    $('#exito-texto').textContent = `Pedido #${pedido.id} por ${fmt.format(pedido.total)}${pedido.costo_envio ? ` (incluye envío de ${fmt.format(pedido.costo_envio)})` : ''}. ${como}`;
    const T = N.transferencia || {};
    $('#exito-extra').innerHTML = pago === 'transferencia'
      ? (T.alias || T.cbu
        ? `<div class="transf"><div><b>Alias</b> ${esc(T.alias || '-')}</div>${T.cbu ? `<div><b>CBU</b> ${esc(T.cbu)}</div>` : ''}${T.titular ? `<div><b>Titular</b> ${esc(T.titular)}</div>` : ''}<div><b>Importe</b> ${fmt.format(pedido.total)}</div><div style="margin-top:6px;color:var(--mut)">Indicá el pedido #${pedido.id} en el concepto y enviá el comprobante${N.whatsapp ? ' por WhatsApp' : ''}.</div></div>`
        : `<div class="transf">Elegiste pagar por transferencia: el local te pasa los datos por teléfono o WhatsApp para confirmar tu pedido #${pedido.id}.</div>`)
      : '';
    $('#exito-seguir').href = `/seguimiento.html?n=${pedido.id}&t=${t4(f.telefono.value || pedido.telefono)}`;
    $('#exito').hidden = false;
    f.notas.value = '';
    cargarProductos();
  } catch (e) {
    $('#form-error').textContent = e instanceof TypeError ? 'No hay conexión. Revisá tu internet y probá de nuevo.' : e.message;
    $('#form-error').hidden = false;
    cargarProductos();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar pedido';
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
  pintarCuenta();
  validarSesion();
  pedir('/api/config').then((c) => { config = c; }).catch(() => {});
  try { await cargarCategorias(); } catch { /* sin chips, el catálogo igual carga */ }
  await cargarProductos();
})();
