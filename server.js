import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buscarProductos, listarCategorias, crearPedido, ErrorNegocio,
  listarPedidos, cambiarEstadoPedido, resumenAdmin, actualizarProducto,
} from './db.js';

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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ferreteria2026';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('Aviso: usando la clave de admin por defecto. Definila con ADMIN_PASSWORD en el archivo .env.');
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
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
function tokenAdmin() {
  return createHmac('sha256', ADMIN_PASSWORD).update('ferreteria-admin-v1').digest('hex');
}

function iguales(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function esAdmin(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return iguales(t, tokenAdmin());
}

const intentos = new Map(); // ip -> { n, hasta }
function ipDe(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

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
    return json(res, 200, productos);
  }
  if (pathname === '/api/pedidos' && metodo === 'POST') {
    const cuerpo = await leerJSON(req);
    const pedido = crearPedido({ ...cuerpo, origen: 'web' });
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
    return json(res, 200, { token: tokenAdmin() });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!esAdmin(req)) return json(res, 401, { error: 'No autorizado.' });

    if (pathname === '/api/admin/resumen' && metodo === 'GET') {
      return json(res, 200, resumenAdmin());
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
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      return await api(req, res, url);
    }

    let ruta = decodeURIComponent(url.pathname);
    if (ruta === '/') ruta = '/index.html';
    if (ruta === '/admin' || ruta === '/admin/') ruta = '/admin.html';
    const archivo = path.normalize(path.join(PUBLIC, ruta));
    if (!archivo.startsWith(PUBLIC)) {
      res.writeHead(403);
      return res.end('Prohibido');
    }
    const data = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch (e) {
    if (e instanceof ErrorNegocio) return json(res, e.status, { error: e.message });
    if (e.code === 'ENOENT' || e.code === 'EISDIR') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    console.error(e);
    json(res, 500, { error: 'Error interno del servidor.' });
  }
});

server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
