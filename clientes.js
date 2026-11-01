// Cuentas de clientes: registro, login con sesión por token, datos guardados y "mis pedidos".
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db, ErrorNegocio, normalizar } from './db.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    pass_hash TEXT NOT NULL,
    creado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sesiones (
    token_hash TEXT PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    expira INTEGER NOT NULL
  );
`);

const VIDA_SESION = 30 * 24 * 3600 * 1000; // 30 días
const sha = (s) => createHash('sha256').update(s).digest('hex');

function hashear(pass) {
  const sal = randomBytes(16);
  return `${sal.toString('hex')}:${scryptSync(pass, sal, 64).toString('hex')}`;
}
function verificar(pass, guardado) {
  const [sal, h] = String(guardado).split(':');
  if (!sal || !h) return false;
  const calc = scryptSync(pass, Buffer.from(sal, 'hex'), 64);
  const real = Buffer.from(h, 'hex');
  return calc.length === real.length && timingSafeEqual(calc, real);
}

const publico = (c) => ({ id: c.id, nombre: c.nombre, email: c.email, telefono: c.telefono, direccion: c.direccion });

function limpiar({ nombre, email, telefono, direccion }) {
  nombre = String(nombre || '').trim().slice(0, 80);
  email = String(email || '').trim().toLowerCase().slice(0, 120);
  telefono = String(telefono || '').trim().slice(0, 40);
  direccion = String(direccion || '').trim().slice(0, 160);
  return { nombre, email, telefono, direccion };
}

function abrirSesion(clienteId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sesiones (token_hash, cliente_id, expira) VALUES (?, ?, ?)').run(sha(token), clienteId, Date.now() + VIDA_SESION);
  db.prepare('DELETE FROM sesiones WHERE expira < ?').run(Date.now());
  return token;
}

export function registrar(datos) {
  const { nombre, email, telefono, direccion } = limpiar(datos);
  const pass = String(datos.password || '');
  if (nombre.length < 2) throw new ErrorNegocio('Ingresá tu nombre.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ErrorNegocio('Ingresá un email válido.');
  if (pass.length < 6 || pass.length > 100) throw new ErrorNegocio('La contraseña debe tener al menos 6 caracteres.');
  if (db.prepare('SELECT 1 FROM clientes WHERE email = ?').get(email)) throw new ErrorNegocio('Ese email ya tiene una cuenta. Probá ingresar.', 409);
  const r = db.prepare('INSERT INTO clientes (nombre, email, telefono, direccion, pass_hash, creado) VALUES (?, ?, ?, ?, ?, ?)')
    .run(nombre, email, telefono, direccion, hashear(pass), new Date().toISOString());
  const id = Number(r.lastInsertRowid);
  return { token: abrirSesion(id), cliente: publico(db.prepare('SELECT * FROM clientes WHERE id = ?').get(id)) };
}

export function ingresar(email, password) {
  const c = db.prepare('SELECT * FROM clientes WHERE email = ?').get(String(email || '').trim().toLowerCase());
  // Se hashea igual aunque no exista, para no revelar qué emails están registrados por el tiempo de respuesta.
  const ok = c ? verificar(String(password || ''), c.pass_hash) : (verificar('x', hashear('y')), false);
  if (!ok) throw new ErrorNegocio('Email o contraseña incorrectos.', 401);
  return { token: abrirSesion(c.id), cliente: publico(c) };
}

export function clienteDeToken(token) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const s = db.prepare('SELECT cliente_id, expira FROM sesiones WHERE token_hash = ?').get(sha(token));
  if (!s || s.expira < Date.now()) return null;
  const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(s.cliente_id);
  return c ? publico(c) : null;
}

export function cerrarSesion(token) {
  if (token) db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(sha(token));
}

export function actualizarCliente(id, datos) {
  const { nombre, telefono, direccion } = limpiar(datos);
  if (nombre.length < 2) throw new ErrorNegocio('Ingresá tu nombre.');
  db.prepare('UPDATE clientes SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?').run(nombre, telefono, direccion, id);
  return publico(db.prepare('SELECT * FROM clientes WHERE id = ?').get(id));
}

export function pedidosDeCliente(clienteId) {
  const peds = db.prepare('SELECT id, total, estado, origen, entrega, direccion, costo_envio, pago, creado, telefono FROM pedidos WHERE cliente_id = ? ORDER BY id DESC LIMIT 50').all(clienteId);
  const itemsDe = db.prepare('SELECT producto_id, nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ? ORDER BY id');
  return peds.map((p) => ({ ...p, items: itemsDe.all(p.id) }));
}
void normalizar;
