/* Baja fotos de producto desde Wikimedia Commons (licencias libres) a public/img/.
   Uso (en tu notebook, Ventana A):
     node scripts/bajar-fotos.mjs                      -> baja las que falten
     node scripts/bajar-fotos.mjs --todas              -> vuelve a bajar todas
     node scripts/bajar-fotos.mjs --solo=martillo,pala -> solo esas
     node scripts/bajar-fotos.mjs martillo="File:Nombre exacto.jpg"  -> forzar una foto concreta de Commons
   Después mirá la tienda: si una foto no te gusta, forzá otra con la última forma. */
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { TIPOS, DIR_IMG } from '../fotos.js';

const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';
const UA = 'ElClavoHackathon/1.0 (ferreteria demo; github.com/facu-martinez74/ferreteria)';
const MAL_TITULO = /logo|diagram|icon|drawing|patent|poster|map\b|stamp|screenshot|flag|coat of arms|svg|sketch|illustration|catalog|advert|museum|exhibit|nara\b|industries of war|truck|saint |painting|church|court|statue|portrait|cathedral|battle|soldier|factory|worker|vintage|antique/i;

const args = process.argv.slice(2);
const todas = args.includes('--todas');
const solo = (args.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean);
const verCandidatos = (args.find((a) => a.startsWith('--candidatos=')) || '').slice(13);
const forzados = Object.fromEntries(args.filter((a) => /^[a-z-]+=File:/i.test(a)).map((a) => [a.split('=')[0], a.slice(a.indexOf('=') + 1)]));

mkdirSync(DIR_IMG, { recursive: true });
const rutaIndice = path.join(DIR_IMG, 'index.json');
let indice = {};
try { indice = JSON.parse(readFileSync(rutaIndice, 'utf8')); } catch { /* primera vez */ }

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sinHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function pedir(url, esJson = true) {
  let ultimo = 'sin respuesta';
  for (let i = 0; i < 7; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25_000) });
      if (r.status === 429 || r.status >= 500) {
        ultimo = 'HTTP ' + r.status + ' (Wikimedia pide ir más despacio)';
        const ra = Number(r.headers.get('retry-after'));
        await dormir(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2500 * (i + 1), 20_000));
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return esJson ? await r.json() : Buffer.from(await r.arrayBuffer());
    } catch (e) {
      ultimo = e.message;
      await dormir(1000 * (i + 1));
    }
  }
  throw new Error(ultimo + ' — probá de nuevo en un minuto');
}

const INFO = 'imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=520';

function aCandidato(p) {
  const ii = p.imageinfo?.[0];
  if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime)) return null;
  const meta = ii.extmetadata || {};
  const licencia = sinHtml(meta.LicenseShortName?.value) || 'Licencia libre';
  if (/\bNC\b|\bND\b|non-?commercial|fair use/i.test(licencia)) return null;
  return {
    titulo: p.title,
    url: ii.thumburl || ii.url,
    ancho: ii.width || 0,
    autor: sinHtml(meta.Artist?.value) || 'Autor desconocido',
    licencia,
    pagina: ii.descriptionurl,
  };
}

async function buscar(q) {
  const url = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=${INFO}`;
  const d = await pedir(url);
  const palabras = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const paginas = Object.values(d.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  return paginas
    .map(aCandidato)
    .filter((c) => c && c.ancho >= 400 && !MAL_TITULO.test(c.titulo))
    .map((c) => ({ ...c, puntos: palabras.filter((w) => c.titulo.toLowerCase().includes(w)).length }))
    .filter((c) => c.puntos >= 1) // el título tiene que mencionar lo que buscamos
    .sort((a, b) => b.puntos - a.puntos);
}

async function porTitulo(titulo) {
  const d = await pedir(`${API}?action=query&format=json&titles=${encodeURIComponent(titulo)}&prop=${INFO}`);
  const p = Object.values(d.query?.pages || {})[0];
  const c = p && aCandidato(p);
  if (!c) throw new Error('No encontré ese archivo en Commons (revisá el nombre exacto).');
  return [c];
}

if (verCandidatos) {
  const t = TIPOS.find((x) => x.slug === verCandidatos && x.q);
  if (!t) { console.log('Tipo desconocido. Opciones:', TIPOS.filter((x) => x.q).map((x) => x.slug).join(', ')); process.exit(1); }
  const lista = await buscar(t.q);
  console.log(`Candidatos para "${t.slug}" (búsqueda: ${t.q}):`);
  lista.slice(0, 8).forEach((c, i) => console.log(`${i + 1}. ${c.titulo}  (${c.licencia})`));
  console.log(`\nPara usar uno:  node scripts/bajar-fotos.mjs ${t.slug}="File:Nombre.jpg"   (copiá el título exacto, con comillas)`);
  process.exit(0);
}

let ok = 0, falta = 0;
for (const t of TIPOS) {
  if (t.como) continue; // reutiliza la foto de otro tipo
  if (solo.length && !solo.includes(t.slug)) continue;
  if (!todas && !forzados[t.slug] && indice[t.slug] && existsSync(path.join(DIR_IMG, indice[t.slug].archivo))) { ok++; continue; }
  try {
    const candidatos = forzados[t.slug] ? await porTitulo(forzados[t.slug]) : await buscar(t.q);
    if (!candidatos.length) throw new Error('sin resultados utilizables');
    const c = candidatos[0];
    const ext = /\.png(\?|$)/i.test(c.url) ? 'png' : 'jpg';
    const archivo = `${t.slug}.${ext}`;
    writeFileSync(path.join(DIR_IMG, archivo), await pedir(c.url, false));
    indice[t.slug] = { archivo, titulo: c.titulo, autor: c.autor, licencia: c.licencia, pagina: c.pagina };
    writeFileSync(rutaIndice, JSON.stringify(indice, null, 2));
    console.log(`✓ ${t.slug.padEnd(18)} ← ${c.titulo}  (${c.licencia})`);
    ok++;
  } catch (e) {
    console.log(`✗ ${t.slug.padEnd(18)} ${e.message}  -> se muestra el ícono`);
    falta++;
  }
  await dormir(800); // cortesía con Wikimedia (si no, responde 429)
}

// Limpieza: fotos de tipos que ya no se buscan (ahora reutilizan otra) salen del índice y de la carpeta.
for (const slug of Object.keys(indice)) {
  if (TIPOS.some((t) => t.slug === slug && t.q)) continue;
  try { unlinkSync(path.join(DIR_IMG, indice[slug].archivo)); } catch { /* ya no estaba */ }
  delete indice[slug];
  console.log(`🧹 ${slug}: foto descartada (reutiliza otra)`);
}
writeFileSync(rutaIndice, JSON.stringify(indice, null, 2));

// Página de créditos (algunas licencias piden atribución).
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
console.log(`\nListo: ${ok} fotos disponibles, ${falta} sin foto (usan ícono). Créditos en public/creditos.html`);
