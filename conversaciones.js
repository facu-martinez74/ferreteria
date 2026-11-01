import { db } from './db.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS conversaciones (
    id TEXT PRIMARY KEY,
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    mensajes TEXT NOT NULL,
    pedido_id INTEGER
  );
`);

export function idValido(id) {
  return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

// Guarda (o actualiza) una conversacion completa. Si se creo un pedido, lo asocia.
export function guardarConversacion({ id, mensajes, pedidoId = null }) {
  if (!idValido(id)) return;
  const ahora = new Date().toISOString();
  db.prepare(`
    INSERT INTO conversaciones (id, creado, actualizado, mensajes, pedido_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      actualizado = excluded.actualizado,
      mensajes = excluded.mensajes,
      pedido_id = COALESCE(excluded.pedido_id, conversaciones.pedido_id)
  `).run(id, ahora, ahora, JSON.stringify(mensajes), pedidoId);
}

export function listarConversaciones(limite = 100) {
  const filas = db.prepare(
    'SELECT id, creado, actualizado, mensajes, pedido_id FROM conversaciones ORDER BY actualizado DESC LIMIT ?'
  ).all(limite);
  return filas.map((f) => {
    let mensajes = [];
    try { mensajes = JSON.parse(f.mensajes); } catch { /* conversacion corrupta: se muestra vacia */ }
    const primero = mensajes.find((m) => m.role === 'user');
    return {
      id: f.id,
      creado: f.creado,
      actualizado: f.actualizado,
      pedido_id: f.pedido_id,
      cantidad_mensajes: mensajes.length,
      resumen: primero ? String(primero.content).slice(0, 90) : '',
      mensajes,
    };
  });
}
