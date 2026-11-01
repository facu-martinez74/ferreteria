/* Saca las fotos que no corresponden al producto (quedan con ícono) y regenera creditos.html.
   Uso (Ventana A):  node scripts/quitar-fotos.mjs
   Para sacar otras:  node scripts/quitar-fotos.mjs pala casco */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { DIR_IMG } from '../fotos.js';

const MALAS = ['cable', 'canilla', 'casco', 'clavos', 'guantes', 'latex', 'pala', 'pincel', 'termica', 'tijera-podar', 'lampara', 'tornillos', 'tomacorriente'];
const quitar = process.argv.slice(2).length ? process.argv.slice(2) : MALAS;

const rutaIndice = path.join(DIR_IMG, 'index.json');
const indice = JSON.parse(readFileSync(rutaIndice, 'utf8'));
for (const slug of quitar) {
  if (!indice[slug]) continue;
  try { unlinkSync(path.join(DIR_IMG, indice[slug].archivo)); } catch { /* ya no estaba */ }
  delete indice[slug];
  console.log('🧹 sin foto:', slug);
}
writeFileSync(rutaIndice, JSON.stringify(indice, null, 2));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const filas = Object.values(indice).sort((a, b) => a.archivo.localeCompare(b.archivo))
  .map((f) => `<li><a href="${esc(f.pagina)}" rel="noopener">${esc(f.titulo.replace(/^File:/, ''))}</a> — ${esc(f.autor)} — ${esc(f.licencia)}</li>`).join('\n    ');
writeFileSync(path.join(DIR_IMG, '..', 'creditos.html'), `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Créditos de las fotos · Ferretería El Clavo</title><link rel="stylesheet" href="/styles.css"></head>
<body><main class="wrap" style="padding:30px 16px 60px"><h1>Créditos de las fotos</h1>
<p class="sub">Imágenes de <a href="https://commons.wikimedia.org" rel="noopener">Wikimedia Commons</a>, con licencias libres. <a href="/">Volver a la tienda</a></p>
<ul style="line-height:1.7">
    ${filas}
</ul></main></body></html>
`);
console.log(`Listo: quedan ${Object.keys(indice).length} fotos reales; el resto usa ícono.`);
