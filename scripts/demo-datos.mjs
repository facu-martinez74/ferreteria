/* Carga pedidos de ejemplo de los ultimos 14 dias para que el panel (Estadisticas) no se vea vacio en la demo.
   Los pedidos quedan marcados con la nota "DEMO" y NO tocan el stock.
   Uso (en el servidor, Ventana B):
     node scripts/demo-datos.mjs            -> carga ~40 pedidos de ejemplo (si no hay ya datos DEMO)
     node scripts/demo-datos.mjs --borrar   -> borra solo los pedidos DEMO */
import { db } from '../db.js';

const borrar = process.argv.includes('--borrar');
const ids = () => db.prepare("SELECT id FROM pedidos WHERE notas = 'DEMO'").all().map((r) => r.id);

if (borrar || ids().length) {
  const viejos = ids();
  for (const id of viejos) {
    db.prepare('DELETE FROM pedido_items WHERE pedido_id = ?').run(id);
    db.prepare('DELETE FROM pedidos WHERE id = ?').run(id);
  }
  console.log(borrar ? `Borrados ${viejos.length} pedidos DEMO.` : `Ya habia ${viejos.length} pedidos DEMO: no cargo otros (usa --borrar primero).`);
  process.exit(0);
}

const nombres = ['Martín', 'Lucía', 'Carlos', 'Sofía', 'Diego', 'Ana', 'Pablo', 'Valeria', 'Jorge', 'Camila', 'Nicolás', 'Marta'];
const productos = db.prepare('SELECT id, nombre, precio FROM productos WHERE stock > 0').all();
const azar = (n) => Math.floor(Math.random() * n);
const ahora = Date.now();
const insP = db.prepare('INSERT INTO pedidos (cliente, telefono, notas, total, estado, origen, creado) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insI = db.prepare('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)');

db.exec('BEGIN');
let n = 0;
for (let dia = 13; dia >= 0; dia--) {
  const cant = 2 + azar(4) + (dia % 7 === 5 ? 2 : 0); // un poco mas los sabados
  for (let k = 0; k < cant; k++) {
    const items = [];
    for (let j = 0, m = 1 + azar(4); j < m; j++) {
      const p = productos[azar(productos.length)];
      if (!items.some((x) => x.p.id === p.id)) items.push({ p, c: 1 + azar(p.precio > 50000 ? 1 : 3) });
    }
    const total = items.reduce((t, x) => t + x.p.precio * x.c, 0);
    const fecha = new Date(ahora - dia * 86400000 - azar(9 * 3600) * 1000 - 3600_000).toISOString();
    const estado = dia === 0 ? ['nuevo', 'preparando', 'listo'][azar(3)] : 'entregado';
    const origen = Math.random() < 0.45 ? 'asistente' : 'web';
    const r = insP.run(nombres[azar(nombres.length)] + ' (demo)', '3415' + String(100000 + azar(899999)), 'DEMO', total, estado, origen, fecha);
    for (const x of items) insI.run(Number(r.lastInsertRowid), x.p.id, x.p.nombre, x.p.precio, x.c);
    n++;
  }
}
db.exec('COMMIT');
console.log(`Cargados ${n} pedidos DEMO de los ultimos 14 dias. Para borrarlos: node scripts/demo-datos.mjs --borrar`);
