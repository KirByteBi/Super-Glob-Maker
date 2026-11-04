/* Vista: ESTILOS DE SEMISÓLIDO DE FONDO por mapa (estilo SMM). AISLADO en su módulo.
   Sprites.drawTile llama, con guardas try/catch, a S.View.BgStyles.draw(...) en el case
   SEMIBG/BGFILL. Si el módulo falla, no existe, o el mapa no tiene estilo propio, devuelve
   false/throw y Sprites cae a su dibujo genérico (drawSemiBg). NUNCA debe romper el render.

   Cada estilo pinta UNA casilla del bloque. isTop = true -> es la fila superior (se pisa);
   isTop = false -> relleno/cuerpo (puro fondo). x,y en casillas; time en segundos (animación).
   El "bloque" es el grupo horizontal de casillas SEMIBG/BGFILL contiguas: x0 = su columna
   izquierda, para que ventanas, franjas y ruletas se alineen por bloque y no por casilla. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const TT = S.Model.Catalog.T;
  const INK = '#0a0a0a';

  // ---- helpers de dibujo locales (no dependen de Sprites) ----
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  const SB = TT.SEMIBG, BF = TT.BGFILL;
  const isBg = (q) => q === SB || q === BF;

  // columna izquierda del bloque horizontal al que pertenece (x,y)
  function blockX0(level, x, y) { let x0 = x; while (x0 > 0 && isBg(level.get(x0 - 1, y))) x0--; return x0; }
  // fila superior del bloque (primera SEMIBG/BGFILL subiendo) — para patrones verticales
  function blockY0(level, x, y) { let y0 = y; while (y0 > 0 && isBg(level.get(x, y0 - 1))) y0--; return y0; }
  const nL = (level, x, y) => isBg(level.get(x - 1, y));
  const nR = (level, x, y) => isBg(level.get(x + 1, y));

  // contorno de los lados exteriores del bloque + tapa pisable opcional
  function outline(ctx, px, py, l, r, isTop, capCol) {
    ink(ctx, 3); ctx.beginPath();
    if (!l) { ctx.moveTo(px + 1.5, py); ctx.lineTo(px + 1.5, py + T); }
    if (!r) { ctx.moveTo(px + T - 1.5, py); ctx.lineTo(px + T - 1.5, py + T); }
    ctx.stroke();
    if (isTop && capCol) {
      rr(ctx, px - (l ? 0 : 2), py, T + (l ? 0 : 2) + (r ? 0 : 2), 9, l && r ? 0 : 4);
      ctx.fillStyle = capCol; ctx.fill(); ink(ctx, 3); ctx.stroke();
    }
  }

  // ============================================================
  //  ESTILOS POR MAPA. Cada fn(ctx, level, x, y, isTop, pal, time)
  //  devuelve nada; pinta su casilla. draw() las despacha por tema.
  // ============================================================
  const STYLES = {};

  // ---------- CIUDAD: edificio de ladrillo con ventanas que se encienden ----------
  STYLES.city = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T, x0 = blockX0(level, x, y);
    const body = U.shade(pal.mid || pal.ground, -0.18);
    rect(ctx, px, py, T, T, body);
    // juntas de ladrillo
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py + 15, T, 2); ctx.fillRect(px + ((x + y) % 2 ? 0 : 16), py + 15, 2, 17); ctx.fillRect(px + ((x + y) % 2 ? 16 : 0), py, 2, 15);
    if (!isTop) {
      const lit = U.hash2(x, y) > 0.45, flick = Math.sin(time * 3 + x * 7 + y) > 0.96;
      ctx.fillStyle = lit && !flick ? U.rgba(pal.accent || '#ffd000', 0.9) : 'rgba(0,0,0,0.4)';
      ctx.fillRect(px + 6, py + 7, 8, 9); ctx.fillRect(px + 18, py + 7, 8, 9);
      if (lit && !flick) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 6, py + 7, 8, 2); ctx.fillRect(px + 18, py + 7, 8, 2); }
    }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(body, -0.35));
  };

  // ---------- CASINO: ruleta de fondo que gira (verde tapete + rojo/negro + oro) ----------
  STYLES.casino = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T, x0 = blockX0(level, x, y), y0 = blockY0(level, x, y);
    // tapete verde de fondo
    rect(ctx, px, py, T, T, U.shade(pal.near || '#1f7a3a', -0.08));
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px, py + (y % 2 ? 0 : 16), T, 1);
    // ancho/alto del bloque para centrar una ruleta grande por bloque
    let w = 1; while (isBg(level.get(x0 + w, y))) w++;
    let h = 1; while (isBg(level.get(x0, y0 + h))) h++;
    const bx = x0 * T, byy = y0 * T, cw = w * T, ch = h * T;
    const cx = bx + cw / 2, cy = byy + ch / 2, R = Math.min(cw, ch) * 0.42;
    if (R > 10) {
      ctx.save();
      // recortar a la casilla actual para que entre todos pinten la ruleta completa por partes
      ctx.beginPath(); ctx.rect(px, py, T, T); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(time * 0.8);
      // sectores rojo/negro
      const sectors = 12;
      for (let i = 0; i < sectors; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, (i / sectors) * 7.2832, ((i + 1) / sectors) * 7.2832); ctx.closePath();
        ctx.fillStyle = i % 2 ? (pal.top || '#e8323f') : '#15151a'; ctx.fill();
      }
      // aro dorado + centro
      ctx.lineWidth = 3; ctx.strokeStyle = pal.accent || '#ffd000'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.22, 0, 7); ctx.fillStyle = pal.accent || '#ffd000'; ctx.fill(); ink(ctx, 2); ctx.stroke();
      ctx.restore();
      // bolita fija (no gira) en el borde superior de la ruleta
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.save(); ctx.beginPath(); ctx.rect(px, py, T, T); ctx.clip(); ctx.arc(cx, cy - R + 4, 3, 0, 7); ctx.fill(); ctx.restore();
    }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, pal.accent || '#ffd000');
  };

  // ---------- EVENT HUB: cristal dimensional verde con rejilla energética ----------
  STYLES.hub = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade('#0a3d22', 0.04));
    // rejilla verde que pulsa
    const g = 0.4 + 0.3 * Math.sin(time * 2 + (x + y) * 0.6);
    ctx.strokeStyle = U.rgba('#3fffa0', 0.25 + g * 0.3); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py + 16); ctx.lineTo(px + T, py + 16); ctx.moveTo(px + 16, py); ctx.lineTo(px + 16, py + T); ctx.stroke();
    if (!isTop && U.hash2(x, y) > 0.6) { ctx.fillStyle = U.rgba('#7affd0', 0.5 + g * 0.5); ctx.beginPath(); ctx.arc(px + 16, py + 16, 2.5, 0, 7); ctx.fill(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.mix('#1a8a55', '#3fffa0', 0.4 + g));
  };

  // ---------- FÁBRICA: placa metálica con remaches y tira luminosa ----------
  STYLES.factory = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.mid || '#384357', 0.02));
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px, py + 15, T, 2);
    // remaches
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; [[6, 6], [26, 6], [6, 26], [26, 26]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(px + u, py + v, 1.8, 0, 7); ctx.fill(); });
    // tira luminosa (accent cian) que recorre
    const on = Math.sin(time * 2 + x * 0.8) > 0.2;
    ctx.fillStyle = on ? U.rgba(pal.accent || '#00e5ff', 0.85) : 'rgba(0,0,0,0.3)'; ctx.fillRect(px + 2, py + T - 5, T - 4, 2);
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(pal.mid || '#384357', -0.3));
  };

  // ---------- DISCO: panel con ecualizador de barras de colores ----------
  STYLES.disco = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, '#190f2e');
    if (!isTop) {
      for (let i = 0; i < 4; i++) {
        const hvar = Math.abs(Math.sin(time * 3 + x * 2 + i * 1.3));
        const bh = 4 + hvar * 20;
        ctx.fillStyle = `hsl(${((x * 40 + i * 50 + time * 60) % 360)},85%,62%)`;
        ctx.fillRect(px + 3 + i * 7, py + T - 2 - bh, 5, bh);
      }
    }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, pal.accent || '#ffe600');
  };

  // ---------- RELOJ (Time Attack): engranajes que giran en el relleno ----------
  STYLES.clock = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.mid || '#8a6a4a', -0.05));
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(px, py + 15, T, 2);
    if (!isTop) {
      const dir = (x + y) % 2 ? 1 : -1;
      ctx.save(); ctx.translate(px + 16, py + 16); ctx.rotate(time * 0.9 * dir);
      ctx.fillStyle = U.shade(pal.accent || '#ffd000', -0.1);
      for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -11, 4, 5); }
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fillStyle = '#2a2a2a'; ctx.fill();
      ctx.restore();
    }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(pal.mid || '#8a6a4a', -0.3));
  };

  // ---------- CIRCO: carpa a franjas; las franjas NO blancas cambian de color ----------
  STYLES.circus = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T, x0 = blockX0(level, x, y);
    const whiteStripe = ((x - x0) % 2) === 1;
    if (whiteStripe) {
      rect(ctx, px, py, T, T, '#f4f4f4');
    } else {
      // color que cicla lentamente por el arcoíris (y desfasado por columna)
      const hue = (time * 40 + (x - x0) * 55) % 360;
      rect(ctx, px, py, T, T, `hsl(${hue},80%,55%)`);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px, py, T, 3);
    }
    // costura entre franjas
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px, py, 1, T);
    // la tapa de arriba imita el pico de la carpa (festón)
    if (isTop) {
      ctx.fillStyle = whiteStripe ? '#f4f4f4' : `hsl(${(time * 40 + (x - x0) * 55) % 360},80%,55%)`;
      ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px + T / 2, py - 2); ctx.lineTo(px + T, py + 6); ctx.lineTo(px + T, py + 10); ctx.lineTo(px, py + 10); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    } else {
      outline(ctx, px, py, nL(level, x, y), nR(level, x, y), false);
    }
  };

  // ---------- PLAYA: caseta de tablones con ventana ----------
  STYLES.seaside = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T, x0 = blockX0(level, x, y);
    rect(ctx, px, py, T, T, '#d9a86a');
    ctx.fillStyle = 'rgba(90,50,20,0.3)'; for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8, T, 1.5); // tablones horizontales
    ctx.fillStyle = 'rgba(90,50,20,0.25)'; ctx.fillRect(px + 15, py, 2, T);
    if (!isTop && (x - x0) % 3 === 1) { rect(ctx, px + 6, py + 8, 20, 13, '#8fd3ff'); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(px + 7, py + 9, 7, 11); ink(ctx, 2); ctx.strokeRect(px + 6, py + 8, 20, 13); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade('#d9a86a', -0.25));
  };

  // ---------- RUINAS: sillería de piedra desgastada ----------
  STYLES.ruins = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.ground || '#b0703a', 0.08));
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px, py + 16, T, 2); ctx.fillRect(px + (y % 2 ? 0 : 16), py + 16, 2, 16); ctx.fillRect(px + (y % 2 ? 16 : 0), py, 2, 16);
    // grietas deterministas
    if (U.hash2(x, y) > 0.7) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px + 8, py + 6); ctx.lineTo(px + 14, py + 18); ctx.lineTo(px + 10, py + 26); ctx.stroke(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(pal.ground || '#b0703a', -0.2));
  };

  // ---------- VOLCÁN: roca ígnea con vetas de lava que laten ----------
  STYLES.volcano = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.ground || '#3d2c2c', -0.1));
    const g = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2 + U.hash2(x, y) * 6));
    if (U.hash2(x, y) > 0.5) { ctx.strokeStyle = U.rgba(U.mix('#7a2a10', '#ff6a1f', g), 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 4, py + 6); ctx.lineTo(px + 12, py + 16); ctx.lineTo(px + 8, py + 28); ctx.stroke(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.mix('#3d2c2c', '#ff6a1f', 0.3));
  };

  // ---------- VÓRTICE: piedra del vacío con runas tenues ----------
  STYLES.vortex = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.ground || '#140b20', 0.12));
    const g = 0.5 + 0.5 * Math.sin(time * 1.5 + (x + y));
    if (U.hash2(x, y) > 0.65) { ctx.strokeStyle = U.rgba(U.mix('#4a1f7a', '#c86bff', g), 0.8); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(px + 16, py + 16, 7, 0, 7); ctx.moveTo(px + 16, py + 9); ctx.lineTo(px + 16, py + 23); ctx.stroke(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.mix(pal.near || '#8a3fd1', '#ff4df0', 0.3));
  };

  // ---------- CIELO: nube esponjosa con bordes redondeados ----------
  STYLES.sky = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, '#f2f8ff');
    ctx.fillStyle = 'rgba(160,190,230,0.35)'; ctx.beginPath(); ctx.arc(px + 10, py + 24, 7, 0, 7); ctx.arc(px + 24, py + 26, 6, 0, 7); ctx.fill();
    const l = nL(level, x, y), r = nR(level, x, y);
    if (isTop) { // bultos de nube arriba
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px + 8, py + 8, 9, 0, 7); ctx.arc(px + 22, py + 7, 10, 0, 7); ctx.arc(px + 16, py + 10, 8, 0, 7); ctx.fill();
      ink(ctx, 2.5); ctx.beginPath(); ctx.arc(px + 8, py + 8, 9, Math.PI, 0); ctx.arc(px + 22, py + 7, 10, Math.PI, 0); ctx.stroke();
    }
    outline(ctx, px, py, l, r, false);
  };

  // ---------- ACUÁTICO: arrecife de coral rosado ----------
  STYLES.underwater = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.near || '#ff7ab8', -0.08));
    ctx.fillStyle = U.rgba('#ffffff', 0.18); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 5 + i * 11, py + 8 + U.hash2(x + i, y) * 16, 3, 0, 7); ctx.fill(); }
    // pólipos ondulando en el borde superior
    if (isTop) { ctx.strokeStyle = U.shade(pal.near || '#ff7ab8', 0.25); ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const u of [8, 16, 24]) { const sw = Math.sin(time * 2 + u + x) * 2; ctx.beginPath(); ctx.moveTo(px + u, py + 10); ctx.lineTo(px + u + sw, py - 3); ctx.stroke(); } }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(pal.near || '#ff7ab8', 0.2));
  };

  // ---------- LAGO: colina de gelatina translúcida con brillos ----------
  STYLES.lake = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.near || '#2fb36b', 0.05));
    ctx.fillStyle = U.rgba('#ffffff', 0.14); ctx.fillRect(px, py, T, 4);
    if (U.hash2(x, y) > 0.6) { ctx.fillStyle = U.rgba('#ffffff', 0.3); ctx.beginPath(); ctx.arc(px + 8 + U.hash2(x, y) * 16, py + 10 + U.hash2(y, x) * 14, 3, 0, 7); ctx.fill(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, U.shade(pal.top || '#5fd47a', 0.05));
  };

  // ---------- NIEVE: ventisquero con costra de hielo ----------
  STYLES.snow = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, '#dff0ff');
    ctx.fillStyle = U.rgba('#9fc6e8', 0.4); ctx.fillRect(px, py + 18, T, 2);
    if (U.hash2(x, y) > 0.7) { ctx.fillStyle = U.rgba('#ffffff', 0.9); ctx.beginPath(); ctx.arc(px + 8 + U.hash2(x, y) * 16, py + 12, 2, 0, 7); ctx.fill(); }
    outline(ctx, px, py, nL(level, x, y), nR(level, x, y), isTop, '#ffffff');
  };

  // ---------- BOSQUE: seto frondoso (en Corrupto se ve alucinógeno por la paleta) ----------
  STYLES.jungle = (ctx, level, x, y, isTop, pal, time) => {
    const px = x * T, py = y * T;
    rect(ctx, px, py, T, T, U.shade(pal.near || '#1b4f30', 0.06));
    ctx.fillStyle = U.rgba(pal.top || '#3fbf4f', 0.25); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 6 + i * 10, py + 10 + ((i + x) % 2) * 8, 5, 0, 7); ctx.fill(); }
    if (isTop) { ctx.fillStyle = pal.top || '#3fbf4f'; ctx.beginPath(); for (let i = 0; i <= 3; i++) ctx.arc(px + i * 10, py + 6, 7, Math.PI, 0); ctx.fill(); ink(ctx, 2.5); ctx.stroke(); }
    else outline(ctx, px, py, nL(level, x, y), nR(level, x, y), false);
  };

  // ============================================================
  S.View.BgStyles = {
    has(themeId) { return !!STYLES[themeId]; },
    // devuelve true si pintó; false si el mapa no tiene estilo propio (cae al genérico)
    draw(ctx, level, x, y, isTop, pal, time, themeId) {
      const fn = STYLES[themeId];
      if (!fn) return false;
      ctx.save();
      ctx.globalAlpha = 0.95;
      try { fn(ctx, level, x, y, isTop, pal, time || 0); } finally { ctx.restore(); }
      return true;
    }
  };
})(window.SGM);
