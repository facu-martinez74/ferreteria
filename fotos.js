/* Fotos de producto: tabla única que usan el servidor y el script scripts/bajar-fotos.mjs.
   Cada tipo de producto tiene una búsqueda en Wikimedia Commons (en inglés, da mejores resultados). */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DIR_IMG = path.join(__dirname, 'public', 'img');
const INDICE = path.join(DIR_IMG, 'index.json');

// El primero que coincide con el nombre del producto (sin tildes, en minúsculas) gana: van de lo específico a lo general.
export const TIPOS = [
  { slug: 'martillo', re: /martillo/, q: 'claw hammer' },
  { slug: 'destornillador', re: /destornillador/, q: 'screwdriver' },
  { slug: 'llaves-combinadas', re: /llaves? combinada/, q: 'combination wrench set' },
  { slug: 'llave-inglesa', re: /llave inglesa/, q: 'adjustable spanner wrench' },
  { slug: 'pinza', re: /pinza/, q: 'combination pliers' },
  { slug: 'alicate', re: /alicate/, q: 'diagonal cutting pliers' },
  { slug: 'cinta-metrica', re: /cinta metrica/, q: 'tape measure' },
  { slug: 'nivel', re: /nivel/, q: 'spirit level tool' },
  { slug: 'serrucho', re: /serrucho/, q: 'hand saw' },
  { slug: 'taladro', re: /taladro/, q: 'hammer drill power tool' },
  { slug: 'amoladora', re: /amoladora/, q: 'angle grinder' },
  { slug: 'atornillador', re: /atornillador/, q: 'cordless drill driver' },
  { slug: 'caladora', re: /caladora|sierra/, q: 'jigsaw power tool' },
  { slug: 'mecha', re: /mecha/, q: 'drill bit' },
  { slug: 'disco-corte', re: /disco/, q: 'cutting disc grinder' },
  { slug: 'latex', re: /latex/, q: 'paint can' },
  { slug: 'esmalte', re: /esmalte/, q: 'enamel paint can' },
  { slug: 'rodillo', re: /rodillo/, q: 'paint roller' },
  { slug: 'pincel', re: /pincel/, q: 'paintbrush' },
  { slug: 'cinta-enmascarar', re: /enmascarar/, q: 'masking tape roll' },
  { slug: 'lija', re: /lija/, q: 'sandpaper' },
  { slug: 'enduido', re: /enduido/, q: 'joint compound bucket' },
  { slug: 'aguarras', re: /aguarras/, q: 'turpentine bottle' },
  { slug: 'cable', re: /cable unipolar/, q: 'electrical wire spool' },
  { slug: 'tomacorriente', re: /tomacorriente/, q: 'electrical outlet socket' },
  { slug: 'termica', re: /termica/, q: 'miniature circuit breaker' },
  { slug: 'cinta-aisladora', re: /aisladora/, q: 'electrical tape' },
  { slug: 'lampara', re: /lampara/, q: 'LED light bulb' },
  { slug: 'alargue', re: /alargue/, q: 'extension cord' },
  { slug: 'teflon', re: /teflon/, q: 'PTFE thread seal tape' },
  { slug: 'canilla', re: /canilla/, q: 'water tap faucet' },
  { slug: 'cano-pvc', re: /cano|pvc/, q: 'PVC pipe' },
  { slug: 'silicona', re: /silicona/, q: 'silicone sealant caulking gun' },
  { slug: 'tarugos', re: /tarugo/, q: 'wall plug anchor' },
  { slug: 'tornillos', re: /tornillo/, q: 'screws' },
  { slug: 'clavos', re: /clavo/, q: 'nails' },
  { slug: 'adhesivo', re: /adhesivo|epoxi/, q: 'epoxy adhesive' },
  { slug: 'guantes', re: /guante/, q: 'work gloves' },
  { slug: 'lentes', re: /lente/, q: 'safety glasses' },
  { slug: 'casco', re: /casco/, q: 'hard hat' },
  { slug: 'manguera', re: /manguera/, q: 'garden hose' },
  { slug: 'pala', re: /pala/, q: 'shovel' },
  { slug: 'tijera-podar', re: /podar|tijera/, q: 'pruning shears' },
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function slugDe(nombre) {
  const n = norm(nombre);
  return TIPOS.find((t) => t.re.test(n))?.slug || null;
}

let cache = { mtime: 0, mapa: {} };
function indice() {
  try {
    const m = statSync(INDICE).mtimeMs;
    if (m !== cache.mtime) cache = { mtime: m, mapa: JSON.parse(readFileSync(INDICE, 'utf8')) };
  } catch {
    cache = { mtime: 0, mapa: {} }; // todavía no se bajaron fotos
  }
  return cache.mapa;
}

// URL de la foto del producto, o null si no hay (el front usa el ícono).
export function fotoDe(nombre) {
  const slug = slugDe(nombre);
  const f = slug && indice()[slug];
  return f?.archivo ? `/img/${f.archivo}` : null;
}
