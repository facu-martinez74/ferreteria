/* Seguimiento de pedido para el cliente. Consulta /api/pedidos/seguimiento con numero + ultimos 4 digitos. */
const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = window.NEGOCIO || {};
const PASOS = [
  ['nuevo', 'Pedido recibido', 'Ya lo tenemos y el stock está reservado.'],
  ['preparando', 'Lo estamos preparando', 'Estamos juntando tus productos.'],
  ['listo', 'Listo para retirar', 'Pasá por el local cuando quieras.'],
  ['entregado', 'Entregado', '¡Gracias por tu compra!'],
];
let timer = null;

function dibujar(p) {
  const idx = PASOS.findIndex((x) => x[0] === p.estado);
  const cancelado = p.estado === 'cancelado';
  const titulo = cancelado ? 'Pedido cancelado' : PASOS[idx]?.[1] || p.estado;
  const linea = cancelado ? '' : `<ol class="linea">${PASOS.map((x, i) => `
      <li class="${i < idx || p.estado === 'entregado' ? 'hecho' : i === idx ? 'ahora' : ''}">
        <span class="pt">${i < idx || p.estado === 'entregado' ? '✓' : ''}</span>
        <div><b>${x[1]}</b>${i === idx ? `<small>${x[2]}</small>` : ''}</div></li>`).join('')}</ol>`;
  const local = [N.direccion && `📍 ${esc(N.direccion)}`, N.horarios && `🕒 ${esc(N.horarios)}`, N.telefono && `📞 ${esc(N.telefono)}`].filter(Boolean);
  $('#res').hidden = false;
  $('#res').innerHTML = `
    <div><span class="num">Pedido #${esc(p.id)} · ${esc(new Date(p.creado).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }))}</span>
    <div class="estado-t">${esc(titulo)}</div><span class="num">Hola ${esc(p.cliente)}, este es el estado de tu pedido.</span></div>
    ${cancelado ? '<div class="cancelado">Este pedido fue cancelado. Si fue un error, llamanos o hacé uno nuevo desde la tienda.</div>' : ''}
    ${p.estado === 'listo' ? '<div class="listo-box">¡Tu pedido está listo! Podés pasar a retirarlo.</div>' : ''}
    ${linea}
    <div class="items">${p.items.map((i) => `<div><span>${esc(i.cantidad)} × ${esc(i.nombre)}</span><span>${esc(fmt.format(i.precio * i.cantidad))}</span></div>`).join('')}</div>
    <div class="total"><span>Total</span><span>${esc(fmt.format(p.total))}</span></div>
    ${local.length ? `<div class="local">${local.map((l) => `<span>${l}</span>`).join('')}</div>` : ''}`;
}

async function consultar(n, t, silencioso = false) {
  if (!silencioso) $('#err').hidden = true;
  try {
    const r = await fetch(`/api/pedidos/seguimiento?n=${encodeURIComponent(n)}&t=${encodeURIComponent(t)}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No pudimos consultar el pedido. Probá de nuevo.');
    dibujar(j);
    try { localStorage.setItem('clavo_pedido', JSON.stringify({ n, t })); } catch { /* sin storage */ }
    clearTimeout(timer);
    if (!['entregado', 'cancelado'].includes(j.estado)) timer = setTimeout(() => consultar(n, t, true), 15000);
  } catch (e) {
    if (silencioso) { timer = setTimeout(() => consultar(n, t, true), 30000); return; }
    $('#res').hidden = true;
    $('#err').textContent = e instanceof TypeError ? 'No hay conexión. Revisá tu internet.' : e.message;
    $('#err').hidden = false;
  }
}

$('#f').addEventListener('submit', (ev) => {
  ev.preventDefault();
  clearTimeout(timer);
  consultar(ev.target.n.value.trim(), ev.target.t.value.trim());
});

// Autocompleta desde el link (?n=15&t=1234) o desde el ultimo pedido hecho en este celular.
const q = new URLSearchParams(location.search);
let guardado = {};
try { guardado = JSON.parse(localStorage.getItem('clavo_pedido') || '{}'); } catch { /* ignorar */ }
const n0 = q.get('n') || guardado.n || '';
const t0 = q.get('t') || (n0 === guardado.n ? guardado.t : '') || '';
if (n0) $('#f').n.value = n0;
if (t0) $('#f').t.value = t0;
if (n0 && t0) consultar(n0, t0);
