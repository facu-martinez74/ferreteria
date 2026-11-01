import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buscarProductos, listarCategorias, crearPedido, ErrorNegocio,
  listarPedidos, cambiarEstadoPedido, resumenAdmin, actualizarProducto, estadisticas,
} from './db.js';
import { responder, asistenteDisponible } from './assistant.js';
import { listarConversaciones } from './conversaciones.js';
import { fotoDe } from './fotos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');

// Lee un archivo .env (si existe) sin dependencias. Las variables ya definidas no se pisan.
function cargarEnv() {
  try {
    const txt = readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const linea of txt.split(/\r?\n/)) {
      if (linea.trim().startsWith('#')) continue;
      const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {
    /* no hay .env: se usan los valores por defecto */
  }
}
cargarEnv();

const PORT = process.env.PORT || 3000;
// Sin ADMIN_PASSWORD no hay clave por defecto (el repo es público): se genera una al azar y se muestra en los logs.
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = randomBytes(6).toString('hex');
  console.warn(`Aviso: falta ADMIN_PASSWORD en el .env. Clave temporal del panel: ${ADMIN_PASSWORD}`);
}
process.on('unhandledRejection', (e) => console.error('Promesa sin manejar:', e));
process.on('uncaughtException', (e) => console.error('Excepción sin manejar:', e));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function leerJSON(req, limite = 100_000) {
  return new Promise((resolve, reject) => {
    let tam = 0;
    const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > limite) {
        reject(new ErrorNegocio('El pedido es demasiado grande.', 413));
        req.destroy();
        return;
      }
      partes.push(c);
    });
    req.on('end', () => {
      try {
        resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
      } catch {
        reject(new ErrorNegocio('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

/* ---------- Autenticacion del panel ---------- */
const VIDA_TOKEN = 12 * 3600 * 1000; // la sesión del panel dura 12 horas
const firmar = (exp) => createHmac('sha256', ADMIN_PASSWORD).update('ferreteria-admin-v2:' + exp).digest('hex');
function nuevoToken() {
  const exp = Date.now() + VIDA_TOKEN;
  return `${exp}.${firmar(exp)}`;
}

function iguales(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function esAdmin(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [exp, firma = ''] = t.split('.');
  if (!/^\d{10,15}$/.test(exp || '') || Number(exp) < Date.now()) return false;
  return iguales(firma, firmar(exp));
}

const intentos = new Map(); // ip -> { n, hasta }
function ipDe(req) {
  // nginx agrega la IP real al final de x-forwarded-for; la primera la puede inventar el cliente.
  const partes = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',');
  return partes[partes.length - 1].trim();
}

// Limites: protegen la API key compartida y el stock de pedidos falsos.
// Ventana deslizante por IP y clave; cada bucket guarda las marcas de tiempo recientes.
function crearLimitador(max, ventanaMs) {
  const hits = new Map();
  const permitido = (clave) => {
    const ahora = Date.now();
    const recientes = (hits.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= max) { hits.set(clave, recientes); return false; }
    recientes.push(ahora);
    hits.set(clave, recientes);
    return true;
  };
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, ts] of hits) if (!ts.some((t) => ahora - t < ventanaMs)) hits.delete(k);
  }, 5 * 60_000).unref();
  return permitido;
}
const num = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);
const chatPorMinuto = crearLimitador(num(process.env.CHAT_MAX_POR_MIN, 12), 60_000);
const chatPorDia = crearLimitador(num(process.env.CHAT_MAX_POR_DIA, 200), 24 * 3600_000);
const chatGlobalPorHora = crearLimitador(num(process.env.CHAT_MAX_GLOBAL_HORA, 1200), 3600_000);
const pedidosPorIp = crearLimitador(num(process.env.PEDIDOS_MAX_10MIN, 8), 10 * 60_000);
const adminPorMin = crearLimitador(120, 60_000);

/* ---------- API ---------- */
async function api(req, res, url) {
  const { pathname } = url;
  const metodo = req.method;

  if (pathname === '/api/health' && metodo === 'GET') {
    return json(res, 200, { ok: true, hora: new Date().toISOString() });
  }
  if (pathname === '/api/categorias' && metodo === 'GET') {
    return json(res, 200, listarCategorias());
  }
  if (pathname === '/api/productos' && metodo === 'GET') {
    const productos = buscarProductos({
      q: url.searchParams.get('q') || '',
      categoria: url.searchParams.get('categoria') || '',
    });
    return json(res, 200, productos.map((p) => ({ ...p, foto: fotoDe(p.nombre) })));
  }
  if (pathname === '/api/chat/estado' && metodo === 'GET') {
    return json(res, 200, { disponible: asistenteDisponible() });
  }
  if (pathname === '/api/chat' && metodo === 'POST') {
    const ip = ipDe(req);
    if (!chatPorMinuto(ip)) {
      return json(res, 429, { error: 'Estás escribiendo muy rápido. Esperá unos segundos y probá de nuevo.' });
    }
    if (!chatPorDia(ip) || !chatGlobalPorHora('global')) {
      return json(res, 429, { error: 'El asistente llegó a su límite de consultas por ahora. Probá más tarde o armá tu pedido desde el catálogo.' });
    }
    const cuerpo = await leerJSON(req, 60_000);
    // Respuesta en líneas JSON: primero avisos de progreso ("Buscando…") y al final el resultado.
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    });
    const enviar = (o) => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
    try {
      const r = await responder({
        mensajes: cuerpo.mensajes,
        sessionId: cuerpo.sessionId,
        onEstado: (texto) => enviar({ tipo: 'estado', texto }),
      });
      enviar({ tipo: 'fin', ...r });
    } catch (e) {
      if (!(e instanceof ErrorNegocio)) console.error(e);
      enviar({ tipo: 'error', status: e.status || 500, error: e instanceof ErrorNegocio ? e.message : 'El asistente tuvo un problema. Probá de nuevo.' });
    }
    return res.end();
  }
  if (pathname === '/api/pedidos' && metodo === 'POST') {
    if (!pedidosPorIp(ipDe(req))) {
      return json(res, 429, { error: 'Hiciste varios pedidos seguidos. Esperá unos minutos o llamanos al local.' });
    }
    const cuerpo = await leerJSON(req);
    const pedido = crearPedido({ cliente: cuerpo.cliente, telefono: cuerpo.telefono, notas: cuerpo.notas, items: cuerpo.items, origen: 'web' });
    return json(res, 201, pedido);
  }

  /* --- Admin --- */
  if (pathname === '/api/admin/login' && metodo === 'POST') {
    const ip = ipDe(req);
    const reg = intentos.get(ip);
    if (reg && reg.n >= 10 && Date.now() < reg.hasta) {
      return json(res, 429, { error: 'Demasiados intentos. Esperá unos minutos.' });
    }
    const { password } = await leerJSON(req, 2_000);
    if (!iguales(password ?? '', ADMIN_PASSWORD)) {
      const n = (reg && Date.now() < reg.hasta ? reg.n : 0) + 1;
      intentos.set(ip, { n, hasta: Date.now() + 5 * 60_000 });
      return json(res, 401, { error: 'Clave incorrecta.' });
    }
    intentos.delete(ip);
    return json(res, 200, { token: nuevoToken() });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!esAdmin(req)) return json(res, 401, { error: 'No autorizado.' });
    if (!adminPorMin(ipDe(req))) return json(res, 429, { error: 'Demasiadas consultas. Esperá un momento.' });

    if (pathname === '/api/admin/resumen' && metodo === 'GET') {
      return json(res, 200, resumenAdmin());
    }
    if (pathname === '/api/admin/estadisticas' && metodo === 'GET') {
      return json(res, 200, estadisticas(Number(url.searchParams.get('dias')) || 14));
    }
    if (pathname === '/api/admin/conversaciones' && metodo === 'GET') {
      return json(res, 200, listarConversaciones(100));
    }
    if (pathname === '/api/admin/pedidos' && metodo === 'GET') {
      return json(res, 200, listarPedidos({ estado: url.searchParams.get('estado') || '' }));
    }
    if (pathname === '/api/admin/productos' && metodo === 'GET') {
      let lista = buscarProductos({ q: url.searchParams.get('q') || '', limite: 500 });
      if (url.searchParams.get('bajo') === '1') lista = lista.filter((p) => p.stock <= p.stock_minimo);
      return json(res, 200, lista);
    }
    const m = pathname.match(/^\/api\/admin\/(pedidos|productos)\/(\d+)$/);
    if (m && metodo === 'PATCH') {
      const id = Number(m[2]);
      const cuerpo = await leerJSON(req, 5_000);
      if (m[1] === 'pedidos') return json(res, 200, cambiarEstadoPedido(id, cuerpo.estado));
      return json(res, 200, actualizarProducto(id, cuerpo));
    }
  }

  return json(res, 404, { error: 'Ruta no encontrada.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

    if (url.pathname.startsWith('/api/')) {
      return await api(req, res, url);
    }

    let ruta;
    try { ruta = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end('Solicitud inválida'); }
    if (ruta === '/') ruta = '/index.html';
    if (ruta === '/admin' || ruta === '/admin/') ruta = '/admin.html';
    const archivo = path.normalize(path.join(PUBLIC, ruta));
    if (archivo !== PUBLIC && !archivo.startsWith(PUBLIC + path.sep)) {
      res.writeHead(403);
      return res.end('Prohibido');
    }
    const data = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': ruta.startsWith('/img/') ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(data);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof ErrorNegocio) return json(res, e.status, { error: e.message });
    if (e.code === 'ENOENT' || e.code === 'EISDIR') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    console.error(e);
    json(res, 500, { error: 'Error interno del servidor.' });
  }
});

server.keepAliveTimeout = 65_000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
