/* Íconos de Lucide (https://lucide.dev, licencia ISC) incluidos en el proyecto: no dependen de internet. */
(function () {
  'use strict';
  const P = {"hammer":"<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\" /> <path d=\"m18 15 4-4\" /> <path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\" />","drill":"<path d=\"M10 18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3 1 1 0 0 1 1-1z\" /> <path d=\"M13 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1l-.81 3.242a1 1 0 0 1-.97.758H8\" /> <path d=\"M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3\" /> <path d=\"M18 6h4\" /> <path d=\"m5 10-2 8\" /> <path d=\"m7 18 2-8\" />","wrench":"<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\" />","ruler":"<path d=\"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z\" /> <path d=\"m14.5 12.5 2-2\" /> <path d=\"m11.5 9.5 2-2\" /> <path d=\"m8.5 6.5 2-2\" /> <path d=\"m17.5 15.5 2-2\" />","paintbrush":"<path d=\"m14.622 17.897-10.68-2.913\" /> <path d=\"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z\" /> <path d=\"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15\" />","paint-roller":"<rect width=\"16\" height=\"6\" x=\"2\" y=\"2\" rx=\"2\" /> <path d=\"M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2\" /> <rect width=\"4\" height=\"6\" x=\"8\" y=\"16\" rx=\"1\" />","paint-bucket":"<path d=\"m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z\" /> <path d=\"m5 2 5 5\" /> <path d=\"M2 13h15\" /> <path d=\"M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z\" />","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","plug":"<path d=\"M12 22v-5\" /> <path d=\"M9 8V2\" /> <path d=\"M15 8V2\" /> <path d=\"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z\" />","cable":"<path d=\"M17 21v-2a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1\" /> <path d=\"M19 15V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V9\" /> <path d=\"M21 21v-2h-4\" /> <path d=\"M3 5h4V3\" /> <path d=\"M7 5a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1V3\" />","droplet":"<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\" />","droplets":"<path d=\"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z\" /> <path d=\"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97\" />","hard-hat":"<path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\" /> <path d=\"M14 6a6 6 0 0 1 6 6v3\" /> <path d=\"M4 15v-3a6 6 0 0 1 6-6\" /> <rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\" />","glasses":"<circle cx=\"6\" cy=\"15\" r=\"4\" /> <circle cx=\"18\" cy=\"15\" r=\"4\" /> <path d=\"M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2\" /> <path d=\"M2.5 13 5 7c.7-1.3 1.4-2 3-2\" /> <path d=\"M21.5 13 19 7c-.7-1.3-1.5-2-3-2\" />","hand":"<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\" /> <path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\" /> <path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\" /> <path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\" />","shovel":"<path d=\"M2 22v-5l5-5 5 5-5 5z\" /> <path d=\"M9.5 14.5 16 8\" /> <path d=\"m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0s0 0 0 0a3.53 3.53 0 0 1 0-5L17 2\" />","scissors":"<circle cx=\"6\" cy=\"6\" r=\"3\" /> <path d=\"M8.12 8.12 12 12\" /> <path d=\"M20 4 8.12 15.88\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <path d=\"M14.8 14.8 20 20\" />","sprout":"<path d=\"M7 20h10\" /> <path d=\"M10 20c5.5-2.5.8-6.4 3-10\" /> <path d=\"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z\" /> <path d=\"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z\" />","nut":"<path d=\"M12 4V2\" /> <path d=\"M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4\" /> <path d=\"M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z\" />","pipette":"<path d=\"m2 22 1-1h3l9-9\" /> <path d=\"M3 21v-3l9-9\" /> <path d=\"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z\" />","cylinder":"<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\" /> <path d=\"M3 5v14a9 3 0 0 0 18 0V5\" />","fan":"<path d=\"M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z\" /> <path d=\"M12 12v.01\" />","axe":"<path d=\"m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9\" /> <path d=\"M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z\" />","unplug":"<path d=\"m19 5 3-3\" /> <path d=\"m2 22 3-3\" /> <path d=\"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z\" /> <path d=\"M7.5 13.5 10 11\" /> <path d=\"M10.5 16.5 13 14\" /> <path d=\"m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z\" />","spray-can":"<path d=\"M3 3h.01\" /> <path d=\"M7 5h.01\" /> <path d=\"M11 7h.01\" /> <path d=\"M3 7h.01\" /> <path d=\"M7 9h.01\" /> <path d=\"M3 11h.01\" /> <rect width=\"4\" height=\"4\" x=\"15\" y=\"5\" /> <path d=\"m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2\" /> <path d=\"m13 14 8-2\" /> <path d=\"m13 19 8-2\" />","eraser":"<path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\" /> <path d=\"M22 21H7\" /> <path d=\"m5 11 9 9\" />","grip":"<circle cx=\"12\" cy=\"5\" r=\"1\" /> <circle cx=\"19\" cy=\"5\" r=\"1\" /> <circle cx=\"5\" cy=\"5\" r=\"1\" /> <circle cx=\"12\" cy=\"12\" r=\"1\" /> <circle cx=\"19\" cy=\"12\" r=\"1\" /> <circle cx=\"5\" cy=\"12\" r=\"1\" /> <circle cx=\"12\" cy=\"19\" r=\"1\" /> <circle cx=\"19\" cy=\"19\" r=\"1\" /> <circle cx=\"5\" cy=\"19\" r=\"1\" />","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />","bolt":"<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\" /> <circle cx=\"12\" cy=\"12\" r=\"4\" />","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /> <path d=\"m7.5 4.27 9 5.15\" />"};

  // Se prueba en orden contra el nombre del producto (sin tildes, minúsculas); el primero que coincide gana.
  const REGLAS = [
    [/martillo/, 'hammer'], [/destornillador|llaves? combinada|llave inglesa/, 'wrench'],
    [/alicate|tijera/, 'scissors'], [/pinza/, 'grip'], [/cinta metrica/, 'ruler'], [/nivel/, 'layers'],
    [/serrucho|sierra/, 'axe'], [/taladro|mecha|atornillador/, 'drill'], [/amoladora|disco/, 'fan'],
    [/rodillo/, 'paint-roller'], [/pincel|enmascarar/, 'paintbrush'], [/lija/, 'eraser'], [/aguarras/, 'spray-can'],
    [/latex|esmalte|enduido|pintura/, 'paint-bucket'],
    [/lampara/, 'lightbulb'], [/tomacorriente/, 'plug'], [/alargue/, 'unplug'], [/cable|aisladora/, 'cable'], [/termica/, 'zap'],
    [/teflon|canilla|manguera/, 'droplets'], [/cano|pvc/, 'cylinder'], [/silicona|adhesivo|epoxi/, 'pipette'],
    [/tarugo|tornillo/, 'nut'], [/clavo/, 'bolt'],
    [/guante/, 'hand'], [/lente/, 'glasses'], [/casco/, 'hard-hat'],
    [/pala/, 'shovel'], [/podar/, 'scissors'],
  ];
  const CATEGORIA = {
    'Herramientas manuales': 'hammer', 'Herramientas electricas': 'drill', 'Pintureria': 'paint-bucket', 'Electricidad': 'zap',
    'Plomeria': 'droplets', 'Fijaciones': 'nut', 'Seguridad': 'hard-hat', 'Jardin': 'sprout',
  };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function svg(nombre, tam) {
    const t = tam || 24;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + t + '" height="' + t + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[nombre] || P.package) + '</svg>';
  }
  function nombreIcono(p) {
    const n = norm(p && p.nombre);
    for (const [re, ic] of REGLAS) if (re.test(n)) return ic;
    return CATEGORIA[p && p.categoria] || 'package';
  }
  // Con foto: <img>; si no carga, el listener de abajo la reemplaza por el ícono.
  function producto(p, tam) {
    const ic = nombreIcono(p);
    if (p && p.foto) {
      return '<img class="foto-prod" src="' + String(p.foto).replace(/"/g, '') + '" alt="' + String(p.nombre || '').replace(/[<>"&]/g, '') + '" loading="lazy" data-ic="' + ic + '" data-t="' + (tam || 24) + '">';
    }
    return svg(ic, tam);
  }
  document.addEventListener('error', (ev) => {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG' || !img.classList.contains('foto-prod')) return;
    const caja = document.createElement('span');
    caja.innerHTML = svg(img.dataset.ic, Number(img.dataset.t) || 24);
    img.parentElement && img.parentElement.classList.remove('conFoto');
    img.replaceWith(caja.firstChild);
  }, true);

  window.iconos = {
    producto,
    categoria: (c, tam) => svg(CATEGORIA[c] || 'package', tam),
  };
})();
