/* Asistente de la ferretería: widget de chat autocontenido (estilos incluidos). */
(function () {
  'use strict';

  const CSS = `
  :root { --fc-color: #eab308; --fc-oscuro: #111827; }
  .fc-fab { position: fixed; right: 18px; bottom: 18px; z-index: 60; display: flex; align-items: center; gap: 8px;
    background: #facc15; color: #111827; border: 0; border-radius: 999px; padding: 14px 20px; font: 600 15px system-ui, sans-serif;
    cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  .fc-fab:hover { filter: brightness(1.07); }
  .fc-ventana { position: fixed; right: 18px; bottom: 18px; z-index: 70; width: 390px; max-width: calc(100vw - 24px);
    height: 600px; max-height: calc(100vh - 36px); background: #fff; border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35); display: none; flex-direction: column; font-family: system-ui, sans-serif; }
  .fc-ventana.abierta { display: flex; }
  .fc-cab { background: var(--fc-oscuro); color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
  .fc-cab .tit { flex: 1; line-height: 1.2; }
  .fc-cab .tit b { display: block; font-size: 15px; }
  .fc-cab .tit span { font-size: 12px; opacity: .75; }
  .fc-cab button { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 13px; opacity: .85; padding: 6px; }
  .fc-cab button:hover { opacity: 1; }
  .fc-msgs { flex: 1; overflow-y: auto; padding: 14px; background: #f3f4f6; display: flex; flex-direction: column; gap: 10px; }
  .fc-m { max-width: 88%; padding: 10px 13px; border-radius: 14px; font-size: 14.5px; line-height: 1.45; word-wrap: break-word; }
  .fc-m.bot { background: #fff; color: #111827; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
  .fc-m.yo { background: #facc15; color: #111827; align-self: flex-end; border-bottom-right-radius: 4px; }
  .fc-m ul { margin: 6px 0 6px 18px; padding: 0; }
  .fc-m li { margin: 2px 0; }
  .fc-m.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .fc-m.error button { margin-top: 8px; background: #991b1b; color: #fff; border: 0; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
  .fc-pedido { align-self: flex-start; max-width: 88%; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 12px; padding: 10px 13px; font-size: 14px; }
  .fc-pedido b { display: block; font-size: 15px; }
  .fc-escribiendo { display: flex; gap: 4px; padding: 12px 14px; }
  .fc-escribiendo i { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; animation: fcsalto 1s infinite ease-in-out; }
  .fc-escribiendo i:nth-child(2) { animation-delay: .15s; } .fc-escribiendo i:nth-child(3) { animation-delay: .3s; }
  @keyframes fcsalto { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-5px); opacity: 1; } }
  .fc-sugs { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; background: #f3f4f6; }
  .fc-sugs button { background: #fff; border: 1px solid #d1d5db; border-radius: 999px; padding: 7px 12px; font-size: 13px; cursor: pointer; color: #374151; text-align: left; }
  .fc-sugs button:hover { border-color: var(--fc-color); color: var(--fc-color); }
  .fc-form { display: flex; gap: 8px; padding: 10px; background: #fff; border-top: 1px solid #e5e7eb; }
  .fc-form textarea { flex: 1; resize: none; border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 11px; font: 16px system-ui, sans-serif; max-height: 90px; outline: none; }
  .fc-form textarea:focus { border-color: var(--fc-color); }
  .fc-form button { background: #facc15; color: #111827; border: 0; border-radius: 10px; padding: 0 16px; font-weight: 600; cursor: pointer; }
  .fc-form button:disabled { opacity: .5; cursor: not-allowed; }
  .fc-estado { align-self: flex-start; display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 13px; padding: 2px 4px; }
  .fc-estado .pts { display: flex; gap: 3px; } .fc-estado .pts i { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; animation: fcsalto 1s infinite ease-in-out; }
  .fc-estado .pts i:nth-child(2) { animation-delay: .15s; } .fc-estado .pts i:nth-child(3) { animation-delay: .3s; }
  .fc-lista { align-self: stretch; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .fc-grupo { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; background: #f9fafb; padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
  .fc-grupo.rec { border-top: 1px solid #e5e7eb; }
  .fc-it { display: grid; grid-template-columns: 34px 1fr auto; gap: 2px 10px; align-items: center; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  .fc-it .ic { grid-row: 1 / 3; width: 34px; height: 34px; border-radius: 9px; background: #fef9c3; color: #92400e; display: grid; place-items: center; }
  .fc-it .n { font-size: 13.5px; font-weight: 600; line-height: 1.25; color: #111827; }
  .fc-it .d { font-size: 12px; color: #6b7280; }
  .fc-it .d .poco { color: #b45309; font-weight: 600; }
  .fc-it .p { grid-row: 1 / 3; grid-column: 3; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .fc-it .p b { font-size: 14px; color: #111827; }
  .fc-it .p button { background: #facc15; color: #111827; border: 0; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
  .fc-it .p button.ok { background: #dcfce7; color: #166534; cursor: default; }
  .fc-pie { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: #fffbeb; flex-wrap: wrap; }
  .fc-pie b { font-size: 15px; }
  .fc-pie .acc { display: flex; gap: 6px; flex-wrap: wrap; }
  .fc-pie button { border: 1px solid #eab308; background: #facc15; color: #111827; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .fc-pie button.sec { background: #fff; border-color: #d1d5db; font-weight: 600; }
  .fc-m.bot b { font-weight: 700; }
  @media (max-width: 520px) {
    .fc-ventana { right: 0; bottom: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; }
    .fc-fab { right: 12px; bottom: 12px; }
  }`;

  const SUGERENCIAS = [
    'Quiero colgar un estante en una pared de ladrillo',
    'Voy a pintar mi dormitorio, ¿qué necesito?',
    'Me pierde agua una canilla',
  ];
  const BIENVENIDA = '¡Hola! Soy el asistente de Ferretería El Clavo. Contame qué trabajo vas a hacer y te armo la lista de lo que necesitás, con precios y stock real. Si querés, también te dejo el pedido listo para retirar.';

  const guardar = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* sin storage */ } };
  const leer = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };

  function nuevoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  // Texto del asistente -> HTML seguro (negrita, listas y saltos de línea).
  function formatear(texto) {
    const lineas = esc(texto).split('\n');
    let html = '';
    let enLista = false;
    for (const l of lineas) {
      const item = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
      if (item) {
        if (!enLista) { html += '<ul>'; enLista = true; }
        html += '<li>' + item[1] + '</li>';
      } else {
        if (enLista) { html += '</ul>'; enLista = false; }
        html += l.trim() ? l + '<br>' : '<br>';
      }
    }
    if (enLista) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(<br>)+$/, '');
  }

  let sessionId = leer('fc-sesion') || nuevoId();
  guardar('fc-sesion', sessionId);
  let historial = [];
  try { historial = JSON.parse(leer('fc-historial') || '[]'); } catch (e) { historial = []; }
  let ocupado = false;
  let disponible = true;

  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const fab = document.createElement('button');
  fab.className = 'fc-fab';
  fab.innerHTML = '<span>💬</span><span>Asistente</span>';
  fab.setAttribute('aria-label', 'Abrir el asistente');

  const ventana = document.createElement('section');
  ventana.className = 'fc-ventana';
  ventana.setAttribute('aria-label', 'Asistente de pedidos');
  ventana.innerHTML = `
    <div class="fc-cab">
      <div class="tit"><b>Asistente de El Clavo</b><span>Te armo la lista y el pedido</span></div>
      <button type="button" data-nueva title="Empezar de nuevo">Nueva</button>
      <button type="button" data-cerrar aria-label="Cerrar">✕</button>
    </div>
    <div class="fc-msgs" aria-live="polite"></div>
    <div class="fc-sugs"></div>
    <form class="fc-form">
      <textarea rows="1" maxlength="1000" placeholder="Escribí tu consulta…" aria-label="Mensaje"></textarea>
      <button type="submit">Enviar</button>
    </form>`;
  document.body.append(fab, ventana);

  const $msgs = ventana.querySelector('.fc-msgs');
  const $sugs = ventana.querySelector('.fc-sugs');
  const $form = ventana.querySelector('.fc-form');
  const $txt = $form.querySelector('textarea');
  const $enviar = $form.querySelector('button');

  function burbuja(rol, texto) {
    const d = document.createElement('div');
    d.className = 'fc-m ' + (rol === 'user' ? 'yo' : 'bot');
    if (rol === 'user') d.textContent = texto; else d.innerHTML = formatear(texto);
    $msgs.appendChild(d);
    bajar();
    return d;
  }
  function bajar() { $msgs.scrollTop = $msgs.scrollHeight; }
  function persistir() { guardar('fc-historial', JSON.stringify(historial.slice(-30))); }

  function dibujarTodo() {
    $msgs.innerHTML = '';
    burbuja('assistant', BIENVENIDA);
    for (const m of historial) { if (m.role === 'assistant') mostrarRespuesta(m); else burbuja(m.role, m.content); }
    $sugs.style.display = historial.length ? 'none' : 'flex';
  }

  function sugerencias() {
    $sugs.innerHTML = '';
    for (const s of SUGERENCIAS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', () => enviar(s));
      $sugs.appendChild(b);
    }
  }

  function bloquear(v) {
    ocupado = v;
    $enviar.disabled = v;
    $txt.disabled = v;
    if (!v) $txt.focus();
  }

  function escribiendo() {
    const d = document.createElement('div');
    d.className = 'fc-m bot fc-escribiendo';
    d.innerHTML = '<i></i><i></i><i></i>';
    $msgs.appendChild(d);
    bajar();
    return d;
  }

  function dibujarLista(lista) {
    const cont = document.createElement('div');
    cont.className = 'fc-lista';
    const total = lista.reduce((t, l) => t + l.precio * l.cantidad, 0);
    const unidades = lista.reduce((t, l) => t + l.cantidad, 0);
    const grupos = [['imprescindible', 'Imprescindible'], ['recomendado', 'Recomendado']];
    let html = '';
    for (const [clave, titulo] of grupos) {
      const items = lista.filter((l) => l.grupo === clave);
      if (!items.length) continue;
      html += `<div class="fc-grupo ${clave === 'recomendado' ? 'rec' : ''}">${titulo}</div>`;
      html += items.map((l) => `
        <div class="fc-it">
          <div class="ic">${window.iconos ? window.iconos.producto(l, 20) : ''}</div>
          <div class="n">${esc(l.nombre)}</div>
          <div class="d">${l.cantidad} × ${esc(fmt.format(l.precio))}${l.stock_bajo ? ` · <span class="poco">quedan ${l.stock}</span>` : ''}</div>
          <div class="p"><b>${esc(fmt.format(l.precio * l.cantidad))}</b><button type="button" data-id="${l.id}">Agregar</button></div>
        </div>`).join('');
    }
    html += `<div class="fc-pie"><span>Total <b>${esc(fmt.format(total))}</b></span>
      <span class="acc"><button type="button" class="sec" data-ver>Ver mi pedido</button><button type="button" data-todo>Agregar todo (${unidades})</button></span></div>`;
    cont.innerHTML = html;
    const api = () => window.elClavo;
    cont.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || !api()) return;
      if (b.dataset.ver !== undefined) { api().abrirCarrito(); return; }
      const marcar = (btn) => { btn.textContent = '✓ Agregado'; btn.classList.add('ok'); };
      if (b.dataset.todo !== undefined) {
        api().agregarItems(lista);
        cont.querySelectorAll('.p button').forEach(marcar);
        b.textContent = '✓ Agregado al pedido';
        b.disabled = true;
        return;
      }
      if (b.dataset.id && !b.classList.contains('ok')) {
        const it = lista.find((l) => String(l.id) === b.dataset.id);
        if (it) { api().agregarItems([it]); marcar(b); }
      }
    });
    return cont;
  }

  function mostrarRespuesta(m) {
    burbuja('assistant', m.content);
    if (Array.isArray(m.lista) && m.lista.length) { $msgs.appendChild(dibujarLista(m.lista)); bajar(); }
  }

  // Lee la respuesta en líneas JSON: {tipo:'estado'|'fin'|'error'}. Funciona aunque el proxy junte todo y llegue de una vez.
  async function leerStream(r, alEstado) {
    if (!r.body || !r.body.getReader) {
      const txt = await r.text();
      const lineas = txt.split('\n').filter(Boolean).map((l) => JSON.parse(l));
      return lineas.find((o) => o.tipo === 'fin' || o.tipo === 'error') || {};
    }
    const lector = r.body.getReader();
    const dec = new TextDecoder();
    let resto = '';
    let final = null;
    const procesar = (linea) => {
      if (!linea.trim()) return;
      let o; try { o = JSON.parse(linea); } catch (e) { return; }
      if (o.tipo === 'estado') alEstado(o.texto);
      else if (o.tipo === 'fin' || o.tipo === 'error') final = o;
    };
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      resto += dec.decode(value, { stream: true });
      const partes = resto.split('\n');
      resto = partes.pop();
      partes.forEach(procesar);
    }
    procesar(resto);
    return final || { tipo: 'error', error: 'La respuesta llegó incompleta. Probá de nuevo.' };
  }

  async function pedirRespuesta() {
    bloquear(true);
    const aviso = document.createElement('div');
    aviso.className = 'fc-estado';
    aviso.innerHTML = '<span class="pts"><i></i><i></i><i></i></span><span class="tx">Pensando…</span>';
    $msgs.appendChild(aviso);
    bajar();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mensajes: historial.slice(-20).map((m) => (m.lista ? { role: m.role, content: m.content, lista: m.lista.map((l) => ({ id: l.id, cantidad: l.cantidad, grupo: l.grupo })) } : { role: m.role, content: m.content })),
        }),
      });
      let datos;
      if (r.headers.get('content-type') && r.headers.get('content-type').includes('ndjson')) {
        datos = await leerStream(r, (t) => { aviso.querySelector('.tx').textContent = t; bajar(); });
      } else {
        const j = await r.json().catch(() => ({}));
        datos = r.ok ? { tipo: 'fin', ...j } : { tipo: 'error', error: j.error };
      }
      aviso.remove();
      if (datos.tipo === 'error') throw new Error(datos.error || 'No pude responder. Probá de nuevo.');
      const msg = { role: 'assistant', content: datos.respuesta };
      if (datos.lista && datos.lista.length) msg.lista = datos.lista;
      historial.push(msg);
      persistir();
      mostrarRespuesta(msg);
      for (const p of datos.pedidos || []) {
        const c = document.createElement('div');
        c.className = 'fc-pedido';
        c.innerHTML = `<b>✅ Pedido #${esc(p.id)} registrado</b>Total ${esc(fmt.format(p.total))}. El local lo prepara y te avisa.`;
        $msgs.appendChild(c);
        bajar();
        if (typeof window.cargarProductos === 'function') window.cargarProductos();
      }
    } catch (e) {
      aviso.remove();
      const d = document.createElement('div');
      d.className = 'fc-m error';
      const msg = e instanceof TypeError ? 'No hay conexión con el servidor. Revisá tu internet.' : e.message;
      d.innerHTML = esc(msg) + '<br><button type="button">Reintentar</button>';
      d.querySelector('button').addEventListener('click', () => { d.remove(); pedirRespuesta(); });
      $msgs.appendChild(d);
      bajar();
    } finally {
      bloquear(false);
    }
  }

  function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    if (!disponible) return;
    $sugs.style.display = 'none';
    historial.push({ role: 'user', content: texto });
    persistir();
    burbuja('user', texto);
    $txt.value = '';
    $txt.style.height = 'auto';
    pedirRespuesta();
  }

  function abrir(texto) {
    if (typeof texto === 'string' && texto.trim()) setTimeout(() => enviar(texto), 80);
    ventana.classList.add('abierta');
    fab.style.display = 'none';
    setTimeout(() => $txt.focus(), 50);
  }
  function cerrar() {
    ventana.classList.remove('abierta');
    fab.style.display = '';
  }
  function reiniciar() {
    if (ocupado) return;
    historial = [];
    sessionId = nuevoId();
    guardar('fc-sesion', sessionId);
    persistir();
    dibujarTodo();
  }

  fab.addEventListener('click', () => abrir());
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && ventana.classList.contains('abierta')) cerrar(); });
  window.elClavoChat = { abrir };
  ventana.querySelector('[data-cerrar]').addEventListener('click', cerrar);
  ventana.querySelector('[data-nueva]').addEventListener('click', reiniciar);
  $form.addEventListener('submit', (ev) => { ev.preventDefault(); enviar($txt.value); });
  $txt.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar($txt.value); }
  });
  $txt.addEventListener('input', () => {
    $txt.style.height = 'auto';
    $txt.style.height = Math.min($txt.scrollHeight, 90) + 'px';
  });

  sugerencias();
  dibujarTodo();

  // Si el asistente no está configurado en el servidor, lo avisamos en vez de fallar al enviar.
  fetch('/api/chat/estado').then((r) => r.json()).then((d) => {
    if (d && d.disponible === false) {
      disponible = false;
      $txt.disabled = true;
      $enviar.disabled = true;
      $txt.placeholder = 'Asistente no disponible por ahora';
    }
  }).catch(() => { /* si falla, se intenta igual al enviar */ });
})();
