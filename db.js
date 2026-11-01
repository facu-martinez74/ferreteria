import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, 'data');
mkdirSync(DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DIR, 'ferreteria.db'));
db.exec('PRAGMA journal_mode = WAL;');

export class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    marca TEXT,
    descripcion TEXT,
    usos TEXT,
    precio INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    unidad TEXT NOT NULL DEFAULT 'unidad',
    busqueda TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    telefono TEXT NOT NULL,
    notas TEXT,
    total INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'nuevo',
    origen TEXT NOT NULL DEFAULT 'web',
    creado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pedido_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
    producto_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    precio INTEGER NOT NULL,
    cantidad INTEGER NOT NULL
  );
`);

// Migración liviana: pedidos.conversacion_id (vínculo pedido <-> charla con el asistente)
try {
  const cols = db.prepare('PRAGMA table_info(pedidos)').all().map((c) => c.name);
  if (!cols.includes('conversacion_id')) db.exec('ALTER TABLE pedidos ADD COLUMN conversacion_id TEXT');
} catch (e) {
  console.error('Migración pedidos.conversacion_id falló:', e);
}
db.exec('CREATE INDEX IF NOT EXISTS idx_pedidos_creado ON pedidos(creado)');
db.exec('CREATE INDEX IF NOT EXISTS idx_items_pedido ON pedido_items(pedido_id)');

export function normalizar(s = '') {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// [nombre, categoria, marca, precio, stock, stock_minimo, unidad, descripcion, usos]
const SEMILLA = [
  ['Martillo carpintero 500 g', 'Herramientas manuales', 'Stanley', 12500, 25, 5, 'unidad', 'Martillo con mango de fibra de vidrio y cabeza forjada.', 'clavar clavos, carpinteria, colgar cuadros, armar muebles'],
  ['Destornillador Phillips PH2', 'Herramientas manuales', 'Stanley', 3800, 40, 8, 'unidad', 'Destornillador de punta cruz con mango ergonomico.', 'atornillar, armar muebles, electricidad, reparaciones'],
  ['Destornillador plano 6 mm', 'Herramientas manuales', 'Stanley', 3600, 35, 8, 'unidad', 'Destornillador de punta plana con mango ergonomico.', 'atornillar, tapas de enchufes, reparaciones'],
  ['Juego de llaves combinadas x12', 'Herramientas manuales', 'Bremen', 38900, 10, 3, 'juego', 'Llaves combinadas de acero cromo vanadio, de 8 a 19 mm.', 'mecanica, bicicletas, mantenimiento, armar estructuras'],
  ['Pinza universal 8"', 'Herramientas manuales', 'Truper', 9800, 20, 5, 'unidad', 'Pinza universal con mango aislado.', 'sujetar, cortar alambre, electricidad, reparaciones'],
  ['Alicate de corte 6"', 'Herramientas manuales', 'Truper', 8700, 18, 5, 'unidad', 'Alicate de corte diagonal para cables y alambres.', 'cortar cables, electricidad, alambre, manualidades'],
  ['Cinta metrica 5 m', 'Herramientas manuales', 'Stanley', 7200, 30, 6, 'unidad', 'Cinta metrica con freno y carcasa antigolpes.', 'medir, obra, carpinteria, colocar cortinas, muebles'],
  ['Nivel de burbuja 40 cm', 'Herramientas manuales', 'Stanley', 11400, 14, 4, 'unidad', 'Nivel de aluminio con tres burbujas.', 'nivelar, colgar cuadros, estantes, colocar ceramicos, albanileria'],
  ['Serrucho 20"', 'Herramientas manuales', 'Tramontina', 10900, 12, 4, 'unidad', 'Serrucho de dientes templados para madera.', 'cortar madera, carpinteria, podar, muebles'],
  ['Llave inglesa 10"', 'Herramientas manuales', 'Bremen', 13200, 9, 3, 'unidad', 'Llave ajustable de acero forjado.', 'plomeria, canillas, mecanica, tuercas'],

  ['Taladro percutor 650 W', 'Herramientas electricas', 'Bosch', 89900, 8, 3, 'unidad', 'Taladro percutor con velocidad variable y mandril de 13 mm.', 'perforar pared, perforar concreto, perforar madera, colgar estantes, instalar tarugos'],
  ['Amoladora angular 4 1/2" 850 W', 'Herramientas electricas', 'Makita', 74500, 6, 2, 'unidad', 'Amoladora angular para cortar y desbastar.', 'cortar metal, cortar ceramicos, desbastar, soldaduras, rejas'],
  ['Atornillador inalambrico 12 V', 'Herramientas electricas', 'Black+Decker', 62300, 2, 3, 'unidad', 'Atornillador a bateria con cargador y 2 puntas.', 'atornillar, armar muebles, instalar estantes, madera'],
  ['Sierra caladora 550 W', 'Herramientas electricas', 'Bosch', 68900, 5, 2, 'unidad', 'Sierra caladora con corte pendular.', 'cortar madera, cortar melamina, cortes curvos, muebles'],
  ['Mecha para concreto 6 mm', 'Herramientas electricas', 'Bosch', 2900, 60, 15, 'unidad', 'Mecha de widia para perforar mamposteria y concreto.', 'perforar pared, perforar concreto, perforar ladrillo, colgar cuadros, tarugos'],
  ['Mecha para concreto 8 mm', 'Herramientas electricas', 'Bosch', 3400, 55, 15, 'unidad', 'Mecha de widia para tarugos de 8 mm.', 'perforar pared, perforar concreto, colgar estantes, soportes, tarugos'],
  ['Juego de mechas para metal y madera x10', 'Herramientas electricas', 'Makita', 15800, 16, 4, 'juego', 'Mechas HSS de 1 a 10 mm en estuche.', 'perforar metal, perforar madera, taladrar, armar muebles'],
  ['Disco de corte metal 4 1/2"', 'Herramientas electricas', 'Norton', 1900, 90, 20, 'unidad', 'Disco abrasivo fino para amoladora.', 'cortar metal, cortar hierro, rejas, caños'],

  ['Latex interior blanco 20 L', 'Pintureria', 'Alba', 118000, 12, 3, 'balde', 'Pintura latex lavable para interiores, acabado mate.', 'pintar paredes, pintar habitacion, pintar techo, renovar ambiente'],
  ['Latex interior blanco 4 L', 'Pintureria', 'Alba', 31500, 24, 6, 'lata', 'Pintura latex lavable para interiores, acabado mate.', 'pintar paredes, retoques, pintar habitacion chica'],
  ['Esmalte sintetico blanco 1 L', 'Pintureria', 'Sinteplast', 18900, 20, 5, 'lata', 'Esmalte brillante para madera y metal.', 'pintar puertas, pintar rejas, pintar madera, pintar metal, ventanas'],
  ['Rodillo de lana 22 cm', 'Pintureria', 'Atlas', 6900, 30, 8, 'unidad', 'Rodillo de lana con cabo y armazon reforzado.', 'pintar paredes, pintar techos, latex'],
  ['Pincel 2"', 'Pintureria', 'Atlas', 3200, 45, 10, 'unidad', 'Pincel de cerda para esmaltes y latex.', 'pintar zocalos, bordes, puertas, retoques'],
  ['Cinta de enmascarar 24 mm', 'Pintureria', '3M', 2800, 50, 12, 'unidad', 'Cinta de papel para proteger bordes al pintar.', 'pintar prolijo, proteger marcos, bordes, enmascarar'],
  ['Lija al agua grano 220 (pack x5)', 'Pintureria', '3M', 4100, 40, 10, 'pack', 'Pliegos de lija fina al agua.', 'lijar, preparar paredes, lijar madera, lijar metal, acabado'],
  ['Enduido plastico interior 4 L', 'Pintureria', 'Sinteplast', 14800, 15, 4, 'lata', 'Enduido para nivelar y reparar paredes interiores.', 'reparar paredes, tapar agujeros, nivelar, preparar pintura, fisuras'],
  ['Aguarras 1 L', 'Pintureria', 'Alba', 5400, 22, 6, 'botella', 'Diluyente para esmaltes y limpieza de pinceles.', 'limpiar pinceles, diluir esmalte, pintura'],

  ['Cable unipolar 2,5 mm x 100 m', 'Electricidad', 'Pirelli', 96000, 7, 2, 'rollo', 'Cable unipolar normalizado para instalaciones domiciliarias.', 'instalacion electrica, tomacorrientes, cableado, reformas'],
  ['Tomacorriente doble 10 A', 'Electricidad', 'Sica', 6800, 35, 8, 'unidad', 'Modulo de tomacorriente doble con placa.', 'instalar enchufes, reformas, electricidad, cocina'],
  ['Llave termica bipolar 20 A', 'Electricidad', 'Schneider', 21500, 4, 5, 'unidad', 'Interruptor termomagnetico bipolar 20 A.', 'tablero electrico, proteccion, instalacion electrica, aire acondicionado'],
  ['Cinta aisladora negra', 'Electricidad', '3M', 2100, 80, 20, 'unidad', 'Cinta aisladora de PVC de 18 mm x 10 m.', 'aislar cables, empalmes, electricidad, reparaciones'],
  ['Lampara LED 10 W calida', 'Electricidad', 'Philips', 3900, 70, 20, 'unidad', 'Lampara LED rosca E27, luz calida.', 'iluminacion, reemplazo de lamparas, ahorro de energia'],
  ['Alargue 5 m con 3 tomas', 'Electricidad', 'Sica', 11900, 18, 5, 'unidad', 'Alargue con cable de 2,5 mm y tres tomas.', 'extension electrica, herramientas, jardin, taller'],

  ['Cinta de teflon', 'Plomeria', 'Tigre', 900, 120, 30, 'unidad', 'Cinta selladora para roscas de agua y gas.', 'sellar roscas, canillas, perdidas de agua, plomeria'],
  ['Canilla de pared 1/2"', 'Plomeria', 'FV', 16800, 12, 4, 'unidad', 'Canilla de bronce cromada para pared.', 'reemplazar canilla, lavadero, jardin, cocina'],
  ['Cano PVC 40 mm x 4 m', 'Plomeria', 'Tigre', 14300, 15, 4, 'unidad', 'Cano de PVC para desagues.', 'desagues, instalacion sanitaria, cocina, bano'],
  ['Sellador de siliconas transparente', 'Plomeria', 'Sika', 7600, 28, 8, 'unidad', 'Silicona acetica para sellar juntas.', 'sellar banera, sellar ventanas, cocina, bano, juntas'],

  ['Tarugos de nylon 8 mm x100', 'Fijaciones', 'Fischer', 4800, 50, 12, 'caja', 'Tarugos de nylon para fijar en pared.', 'colgar estantes, colgar cuadros, fijar soportes, perforar pared, tornillos'],
  ['Tornillos autoperforantes 6 x 1" x100', 'Fijaciones', 'Fischer', 5200, 45, 10, 'caja', 'Tornillos cabeza Phillips para madera y chapa.', 'madera, chapa, armar muebles, estantes'],
  ['Clavos 2" (1 kg)', 'Fijaciones', 'Acindar', 4600, 30, 8, 'kg', 'Clavos de acero para carpinteria.', 'carpinteria, clavar madera, obra, encofrados'],
  ['Adhesivo epoxi bicomponente', 'Fijaciones', 'Poxipol', 4900, 40, 10, 'unidad', 'Adhesivo epoxi de secado rapido.', 'pegar metal, pegar plastico, reparaciones, pegado fuerte'],

  ['Guantes de trabajo reforzados', 'Seguridad', 'Libus', 5700, 40, 10, 'par', 'Guantes de descarne con refuerzo en palma.', 'proteccion manos, obra, jardin, carga'],
  ['Lentes de seguridad transparentes', 'Seguridad', '3M', 4300, 0, 10, 'unidad', 'Lentes de policarbonato con proteccion lateral.', 'proteccion ojos, amoladora, taladro, lijar'],
  ['Casco de obra con ajuste', 'Seguridad', 'Libus', 9300, 12, 4, 'unidad', 'Casco de polietileno con arnes regulable.', 'obra, albanileria, proteccion cabeza'],

  ['Manguera de jardin 15 m', 'Jardin', 'Tramontina', 28900, 10, 3, 'unidad', 'Manguera reforzada con conectores.', 'riego, jardin, lavar auto, limpieza'],
  ['Pala ancha con cabo', 'Jardin', 'Tramontina', 17800, 9, 3, 'unidad', 'Pala de acero con cabo de madera.', 'cavar, jardin, mezclar, obra, mover tierra'],
  ['Tijera de podar', 'Jardin', 'Truper', 13500, 11, 4, 'unidad', 'Tijera de podar con hojas de acero templado.', 'podar, jardin, plantas, cercos'],
];

function sembrar() {
  const hay = db.prepare('SELECT COUNT(*) AS n FROM productos').get().n;
  if (hay > 0) return;
  const ins = db.prepare(`INSERT INTO productos
    (nombre, categoria, marca, precio, stock, stock_minimo, unidad, descripcion, usos, busqueda)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  db.exec('BEGIN');
  try {
    for (const [nombre, categoria, marca, precio, stock, minimo, unidad, descripcion, usos] of SEMILLA) {
      const busqueda = normalizar([nombre, categoria, marca, descripcion, usos].join(' '));
      ins.run(nombre, categoria, marca, precio, stock, minimo, unidad, descripcion, usos, busqueda);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
sembrar();

const CAMPOS = 'id, nombre, categoria, marca, descripcion, usos, precio, stock, stock_minimo, unidad';

export function buscarProductos({ q = '', categoria = '', soloConStock = false, limite = 200 } = {}) {
  const palabras = normalizar(q).split(/\s+/).filter(Boolean)
    .map((p) => (p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p));
  const donde = [];
  const params = [];
  for (const p of palabras) {
    donde.push('busqueda LIKE ?');
    params.push(`%${p}%`);
  }
  if (categoria) {
    donde.push('categoria = ?');
    params.push(categoria);
  }
  if (soloConStock) donde.push('stock > 0');
  const sql = `SELECT ${CAMPOS} FROM productos ${donde.length ? 'WHERE ' + donde.join(' AND ') : ''} ORDER BY categoria, nombre LIMIT ?`;
  params.push(limite);
  return db.prepare(sql).all(...params);
}

export function obtenerProducto(id) {
  return db.prepare(`SELECT ${CAMPOS} FROM productos WHERE id = ?`).get(id);
}

export function listarCategorias() {
  return db.prepare('SELECT categoria, COUNT(*) AS cantidad FROM productos GROUP BY categoria ORDER BY categoria').all();
}

// Crea un pedido validando stock real y descontandolo en una sola transaccion.
// Lo usan tanto la web como (mas adelante) el asistente de IA.
export function crearPedido({ cliente, telefono, notas = '', items, origen = 'web', conversacionId = null }) {
  cliente = String(cliente || '').trim().slice(0, 80);
  telefono = String(telefono || '').trim().slice(0, 40);
  notas = String(notas || '').trim().slice(0, 500);
  conversacionId = typeof conversacionId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(conversacionId) ? conversacionId : null;
  if (cliente.length < 2) throw new ErrorNegocio('Ingresa tu nombre.');
  if (telefono.replace(/\D/g, '').length < 6) throw new ErrorNegocio('Ingresa un telefono valido.');
  if (!Array.isArray(items) || items.length === 0) throw new ErrorNegocio('El pedido esta vacio.');

  const juntos = new Map();
  for (const it of items) {
    const id = Number(it?.id);
    const cantidad = Math.floor(Number(it?.cantidad));
    if (!Number.isInteger(id) || !(cantidad >= 1) || cantidad > 9999) {
      throw new ErrorNegocio('Hay un producto con datos invalidos.');
    }
    juntos.set(id, (juntos.get(id) || 0) + cantidad);
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const lineas = [];
    let total = 0;
    for (const [id, cantidad] of juntos) {
      const p = db.prepare('SELECT id, nombre, precio, stock FROM productos WHERE id = ?').get(id);
      if (!p) throw new ErrorNegocio('Un producto del pedido ya no existe.', 409);
      if (p.stock < cantidad) {
        throw new ErrorNegocio(
          p.stock === 0
            ? `"${p.nombre}" se quedo sin stock.`
            : `Solo quedan ${p.stock} de "${p.nombre}" y pediste ${cantidad}.`,
          409
        );
      }
      lineas.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad });
      total += p.precio * cantidad;
    }

    const res = db.prepare(
      'INSERT INTO pedidos (cliente, telefono, notas, total, estado, origen, creado, conversacion_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(cliente, telefono, notas, total, 'nuevo', origen, new Date().toISOString(), conversacionId);
    const pedidoId = Number(res.lastInsertRowid);

    const insItem = db.prepare(
      'INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)'
    );
    const descuenta = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
    for (const l of lineas) {
      insItem.run(pedidoId, l.producto_id, l.nombre, l.precio, l.cantidad);
      descuenta.run(l.cantidad, l.producto_id);
    }
    db.exec('COMMIT');
    return { id: pedidoId, cliente, telefono, total, estado: 'nuevo', items: lineas };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* ---------------- Panel de administracion ---------------- */

export const ESTADOS = ['nuevo', 'preparando', 'listo', 'entregado', 'cancelado'];

export function listarPedidos({ estado = '' } = {}) {
  const pedidos = estado
    ? db.prepare('SELECT * FROM pedidos WHERE estado = ? ORDER BY id DESC LIMIT 300').all(estado)
    : db.prepare('SELECT * FROM pedidos ORDER BY id DESC LIMIT 300').all();
  const itemsDe = db.prepare('SELECT producto_id, nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?');
  return pedidos.map((p) => ({ ...p, items: itemsDe.all(p.id) }));
}

// Si se cancela un pedido, el stock vuelve al inventario. Un pedido cancelado no se reabre.
export function cambiarEstadoPedido(id, estado) {
  if (!ESTADOS.includes(estado)) throw new ErrorNegocio('Estado invalido.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const p = db.prepare('SELECT id, estado FROM pedidos WHERE id = ?').get(id);
    if (!p) throw new ErrorNegocio('El pedido no existe.', 404);
    if (p.estado !== estado) {
      if (p.estado === 'cancelado') throw new ErrorNegocio('Un pedido cancelado no se puede reabrir.', 409);
      if (estado === 'cancelado') {
        const items = db.prepare('SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?').all(id);
        const devuelve = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');
        for (const it of items) devuelve.run(it.cantidad, it.producto_id);
      }
      db.prepare('UPDATE pedidos SET estado = ? WHERE id = ?').run(estado, id);
    }
    db.exec('COMMIT');
    return { id, estado };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function resumenAdmin() {
  const ped = db.prepare(`SELECT
      COUNT(*) AS total_pedidos,
      SUM(CASE WHEN estado = 'nuevo' THEN 1 ELSE 0 END) AS nuevos,
      SUM(CASE WHEN estado IN ('nuevo', 'preparando', 'listo') THEN 1 ELSE 0 END) AS abiertos,
      SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END) AS ventas
    FROM pedidos`).get();
  const stock = db.prepare(`SELECT
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS sin_stock,
      SUM(CASE WHEN stock > 0 AND stock <= stock_minimo THEN 1 ELSE 0 END) AS bajo_stock,
      COUNT(*) AS productos
    FROM productos`).get();
  return {
    total_pedidos: Number(ped.total_pedidos || 0),
    nuevos: Number(ped.nuevos || 0),
    abiertos: Number(ped.abiertos || 0),
    ventas: Number(ped.ventas || 0),
    sin_stock: Number(stock.sin_stock || 0),
    bajo_stock: Number(stock.bajo_stock || 0),
    productos: Number(stock.productos || 0),
  };
}

export function actualizarProducto(id, cambios = {}) {
  const campos = [];
  const valores = [];
  for (const k of ['stock', 'precio', 'stock_minimo']) {
    if (cambios[k] === undefined) continue;
    const v = Number(cambios[k]);
    if (!Number.isInteger(v) || v < 0 || v > 10_000_000) throw new ErrorNegocio(`Valor invalido para ${k}.`);
    if (k === 'precio' && v < 1) throw new ErrorNegocio('El precio debe ser mayor a cero.');
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) throw new ErrorNegocio('No hay cambios para guardar.');
  const r = db.prepare(`UPDATE productos SET ${campos.join(', ')} WHERE id = ?`).run(...valores, id);
  if (r.changes === 0) throw new ErrorNegocio('El producto no existe.', 404);
  return obtenerProducto(id);
}

/* ---------------- Estadisticas del panel ---------------- */

// Fechas en hora argentina (UTC-3). Los pedidos cancelados no cuentan como venta.
export function estadisticas(dias = 14) {
  dias = Math.min(Math.max(Number(dias) || 14, 1), 90);
  const filas = db.prepare(`
    SELECT date(creado, '-3 hours') AS dia, COUNT(*) AS pedidos, SUM(total) AS ventas
    FROM pedidos WHERE estado != 'cancelado' AND date(creado, '-3 hours') >= date('now', '-3 hours', ?)
    GROUP BY dia`).all(`-${dias - 1} days`);
  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const serie = [];
  const hoy = new Date(Date.now() - 3 * 3600 * 1000);
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 86400000).toISOString().slice(0, 10);
    const f = porDia.get(d);
    serie.push({ dia: d, pedidos: Number(f?.pedidos || 0), ventas: Number(f?.ventas || 0) });
  }
  const top = db.prepare(`
    SELECT i.nombre, SUM(i.cantidad) AS unidades, SUM(i.cantidad * i.precio) AS ingresos
    FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
    WHERE p.estado != 'cancelado' GROUP BY i.producto_id, i.nombre
    ORDER BY unidades DESC, ingresos DESC LIMIT 8`).all()
    .map((r) => ({ nombre: r.nombre, unidades: Number(r.unidades), ingresos: Number(r.ingresos) }));
  const origen = db.prepare(`
    SELECT origen, COUNT(*) AS pedidos, SUM(total) AS ventas
    FROM pedidos WHERE estado != 'cancelado' GROUP BY origen`).all()
    .map((r) => ({ origen: r.origen, pedidos: Number(r.pedidos), ventas: Number(r.ventas || 0) }));
  let conv = { total: 0, con_pedido: 0 };
  try {
    const c = db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN pedido_id IS NOT NULL THEN 1 ELSE 0 END) AS con_pedido FROM conversaciones').get();
    conv = { total: Number(c.total || 0), con_pedido: Number(c.con_pedido || 0) };
  } catch { /* la tabla conversaciones puede no existir todavia */ }
  const ticket = db.prepare("SELECT AVG(total) AS t FROM pedidos WHERE estado != 'cancelado'").get().t;
  return { serie, top, origen, conversaciones: conv, ticket_promedio: Math.round(Number(ticket || 0)) };
}
