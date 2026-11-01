import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarProductos, listarCategorias, crearPedido, ErrorNegocio } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

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
  return json(res, 404, { error: 'Ruta no encontrada.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      return await api(req, res, url);
    }

    const ruta = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
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
