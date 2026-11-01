const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const ICONOS = {
  'Herramientas manuales': '🔨',
  'Herramientas electricas': '🪛',
  'Pintureria': '🎨',
  'Electricidad': '💡',
  'Plomeria': '🚰',
  'Fijaciones': '🔩',
  'Seguridad': '🦺',
  'Jardin': '🌱',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let productos = [];
let categoria = '';
let carrito = cargarCarrito();

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

/* ---------- Catálogo ---------- */
async function cargarCategorias() {
  const cats = await pedir('/api/categorias');
  const chips = $('#chips');
  chips.innerHTML =
    `<button class="chip activo" data-cat="">Todo</button>` +
    cats.map((c) => `<button class="chip" data-cat="${esc(c.categoria)}">${ICONOS[c.categoria] || '📦'} ${esc(c.categoria)}</button>`).join('');
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

function estadoStock(p) {
  if (p.stock <= 0) return `<span class="estado sin">Sin stock</span>`;
  if (p.stock <= p.stock_minimo) return `<span class="estado poco">¡Últimas ${p.stock} unidades!</span>`;
  return `<span class="estado ok">En stock</span>`;
}

function dibujarGrilla() {
  $('#resumen').textContent = productos.length
    ? `${productos.length} producto${productos.length === 1 ? '' : 's'}`
    : '';
  if (!productos.length) {
    $('#grilla').innerHTML = `<div class="vacio">No encontramos nada con esa búsqueda. Probá con otras palabras.</div>`;
    return;
  }
  const ordenados = [...productos].sort((x, y) => (y.stock > 0) - (x.stock > 0));
  $('#grilla').innerHTML = ordenados.map((p) => `
    <article class="tarjeta ${p.stock <= 0 ? 'agotado' : ''}">
      <div class="icono">${ICONOS[p.categoria] || '📦'}</div>
      <div class="marca">${esc(p.marca)}</div>
      <h3>${esc(p.nombre)}</h3>
      <p class="desc">${esc(p.descripcion)}</p>
      ${p.usos ? `<p class="usos">Sirve para: ${esc(p.usos.split(',').slice(0, 3).join(', '))}</p>` : ''}
      <div class="precio">${fmt.format(p.precio)}</div>
      ${estadoStock(p)}
      <button class="btn primario" data-agregar="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Agregar al pedido</button>
    </article>`).join('');
}

/* ---------- Carrito ---------- */
function cantidadEnCarrito(id) {
  return carrito.find((l) => l.id === id)?.cantidad || 0;
}

function agregar(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  const linea = carrito.find((l) => l.id === id);
  if (linea) {
    if (linea.cantidad >= p.stock) return avisar(`Solo hay ${p.stock} en stock.`);
    linea.cantidad++;
    linea.stock = p.stock;
  } else {
    carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, stock: p.stock });
  }
  guardarCarrito();
  dibujarCarrito();
  const btn = document.querySelector(`[data-agregar="${id}"]`);
  if (btn) { btn.textContent = '✓ Agregado'; setTimeout(() => (btn.textContent = 'Agregar al pedido'), 900); }
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

function totalCarrito() {
  return carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);
}

function avisar(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:100;font-size:.9rem';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function dibujarCarrito() {
  const cant = carrito.reduce((s, l) => s + l.cantidad, 0);
  $('#carrito-cant').textContent = cant;
  $('#total').textContent = fmt.format(totalCarrito());
  $('#btn-confirmar').disabled = carrito.length === 0;
  $('#lineas').innerHTML = carrito.length
    ? carrito.map((l) => `
      <div class="linea">
        <div>
          <div class="nom">${esc(l.nombre)}</div>
          <div class="sub">${fmt.format(l.precio)} c/u</div>
        </div>
        <div class="imp">${fmt.format(l.precio * l.cantidad)}</div>
        <div class="cant">
          <button data-menos="${l.id}" aria-label="Quitar uno">−</button>
          <span>${l.cantidad}</span>
          <button data-mas="${l.id}" aria-label="Agregar uno">+</button>
        </div>
        <button class="quitar" data-quitar="${l.id}">Quitar</button>
      </div>`).join('')
    : `<div class="carrito-vacio">Todavía no agregaste nada.<br>Buscá un producto y sumalo a tu pedido.</div>`;
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
    if (linea) { linea.cantidad = nueva; linea.stock = it.stock; linea.precio = it.precio; }
    else carrito.push({ id, nombre: it.nombre, precio: it.precio, cantidad: nueva, stock: it.stock });
  }
  guardarCarrito();
  dibujarCarrito();
  avisar(tope ? 'Agregado al pedido (algunas cantidades se ajustaron al stock).' : '✓ Agregado a tu pedido');
}
window.elClavo = { agregarItems, abrirCarrito: () => abrirPanel() };

function abrirPanel() {
  $('#panel').classList.add('abierto');
  $('#panel').setAttribute('aria-hidden', 'false');
  $('#velo').hidden = false;
}
function cerrarPanel() {
  $('#panel').classList.remove('abierto');
  $('#panel').setAttribute('aria-hidden', 'true');
  $('#velo').hidden = true;
}

/* ---------- Pedido ---------- */
function abrirModal() {
  $('#form-error').hidden = true;
  $('#form-pedido').hidden = false;
  $('#exito').hidden = true;
  $('#modal').hidden = false;
  $('#form-pedido [name=cliente]').focus();
}
function cerrarModal() {
  $('#modal').hidden = true;
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
    cerrarPanel();
    f.hidden = true;
    $('#exito-texto').textContent = `Pedido #${pedido.id} por ${fmt.format(pedido.total)}. Lo estamos preparando, ${pedido.cliente}.`;
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

/* ---------- Eventos ---------- */
let temporizador;
$('#buscador').addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarProductos, 250);
});

$('#chips').addEventListener('click', (ev) => {
  const chip = ev.target.closest('.chip');
  if (!chip) return;
  categoria = chip.dataset.cat;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('activo', c === chip));
  cargarProductos();
});

$('#grilla').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-agregar]');
  if (b) agregar(Number(b.dataset.agregar));
});

$('#lineas').addEventListener('click', (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  if (t.dataset.mas) cambiarCantidad(Number(t.dataset.mas), 1);
  else if (t.dataset.menos) cambiarCantidad(Number(t.dataset.menos), -1);
  else if (t.dataset.quitar) quitar(Number(t.dataset.quitar));
});

$('#btn-carrito').addEventListener('click', abrirPanel);
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (!$('#modal').hidden) cerrarModal(); else cerrarPanel();
});
document.querySelectorAll('[data-asistente]').forEach((b) => b.addEventListener('click', () => {
  if (window.elClavoChat) window.elClavoChat.abrir(b.dataset.asistente === '1' ? '' : b.dataset.asistente);
}));
$('#cerrar-panel').addEventListener('click', cerrarPanel);
$('#velo').addEventListener('click', cerrarPanel);
$('#btn-confirmar').addEventListener('click', abrirModal);
$('#btn-cancelar').addEventListener('click', cerrarModal);
$('#btn-cerrar-exito').addEventListener('click', cerrarModal);
$('#form-pedido').addEventListener('submit', enviarPedido);

(async function iniciar() {
  $('#grilla').innerHTML = '<div class="vacio">Cargando catálogo…</div>';
  dibujarCarrito();
  try { await cargarCategorias(); } catch { /* sin chips, el catálogo igual carga */ }
  await cargarProductos();
})();
