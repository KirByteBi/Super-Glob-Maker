/* Vista: SUELO TEMATICO por mapa (autotiling visual). AISLADO en su propio modulo para no
   tocar el dibujo base: Sprites.js solo llama, con guardas, a S.View.GroundStyles.draw().
   La MECANICA del suelo NO cambia: solo el DIBUJO, segun la FORMA del tramo y el MAPA.
   Si este modulo falla o no existe, Sprites usa el suelo generico de siempre. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const TT = S.Model.Catalog.T;
  const INK = '#0a0a0a';
  // El suelo tematico (GROUND2) se autotilea contra SI MISMO: un tramo lo forman casillas GROUND2.
  const isG2 = (t) => t === TT.GROUND2;
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }

  // ---- medir la forma del tramo de suelo tematico contiguo ----
  // Bucles ACOTADOS a 0..width-1 / height-1 (nunca se fian de get() fuera de rango -> no cuelgan).
  function runW(level, x, y) {
    let w = 1;
    for (let i = x - 1; i >= 0 && isG2(level.get(i, y)); i--) w++;
    for (let i = x + 1; i < level.width && isG2(level.get(i, y)); i++) w++;
    return w;
  }
  function runH(level, x, y) {
    let h = 1;
    for (let j = y - 1; j >= 0 && isG2(level.get(x, j)); j--) h++;
    for (let j = y + 1; j < level.height && isG2(level.get(x, j)); j++) h++;
    return h;
  }
  // Lados expuestos del tile (no hay GROUND2 pegado) -> para dibujar bordes/curvas
  function edgesG2(level, x, y) {
    return { up: !isG2(level.get(x, y - 1)), down: !isG2(level.get(x, y + 1)), left: !isG2(level.get(x - 1, y)), right: !isG2(level.get(x + 1, y)) };
  }
  // 'col' = columna fina (ancho 1, alto >=2); 'row' = fila fina (alto 1, ancho >=2);
  // 'piece' = pieza pequeña (<=2 en ambas); 'fill' = masa / bloque
  function shapeOf(level, x, y) {
    const w = runW(level, x, y), h = runH(level, x, y);
    if (w === 1 && h >= 2) return 'col';
    if (h === 1 && w >= 2) return 'row';
    if (w <= 2 && h <= 2) return 'piece';
    return 'fill';
  }

  // ----- Urbanistic Road: viga roja ligera (pieza/columna) + carretera (relleno) -----
  function pieceBeam(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#c0282f'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#e8434f'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    // alma de la viga: horizontal si hay viga al lado, vertical si hay viga arriba/abajo
    ctx.fillStyle = '#8a1a20';
    if (!ed.left || !ed.right) ctx.fillRect(px + (ed.left ? 4 : 0), py + T / 2 - 2, T - (ed.left ? 4 : 0) - (ed.right ? 4 : 0), 4);
    if (!ed.up || !ed.down) ctx.fillRect(px + T / 2 - 2, py + (ed.up ? 4 : 0), 4, T - (ed.up ? 4 : 0) - (ed.down ? 4 : 0));
    if (ed.left && ed.right && ed.up && ed.down) ctx.fillRect(px + 4, py + T / 2 - 2, T - 8, 4); // viga aislada 1x1
    // remaches solo en las esquinas expuestas
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; [[6, 6, ed.left || ed.up], [T - 6, 6, ed.right || ed.up], [6, T - 6, ed.left || ed.down], [T - 6, T - 6, ed.right || ed.down]].forEach(([a, b, show]) => { if (show) { ctx.beginPath(); ctx.arc(px + a, py + b, 2, 0, 7); ctx.fill(); } });
    // contorno solo en los lados que NO tocan otra viga (se ven continuas en fila/columna)
    ink(ctx, 3.5); ctx.beginPath();
    if (ed.up) { ctx.moveTo(px + 1.5, py + 1.5); ctx.lineTo(px + T - 1.5, py + 1.5); }
    if (ed.down) { ctx.moveTo(px + 1.5, py + T - 1.5); ctx.lineTo(px + T - 1.5, py + T - 1.5); }
    if (ed.left) { ctx.moveTo(px + 1.5, py + 1.5); ctx.lineTo(px + 1.5, py + T - 1.5); }
    if (ed.right) { ctx.moveTo(px + T - 1.5, py + 1.5); ctx.lineTo(px + T - 1.5, py + T - 1.5); }
    ctx.stroke();
  }
  function fillRoad(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#3b3f48'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#2a2d34'; for (let i = 0; i < 2; i++) { const hx = U.hash2(x * 3 + i, y); if (hx > 0.5) { ctx.beginPath(); ctx.arc(px + 6 + hx * 18, py + 6 + U.hash2(y, x + i) * 18, 1.6, 0, 7); ctx.fill(); } }
    if (ed.up) { ctx.fillStyle = '#4a4f5a'; ctx.fillRect(px, py, T, 4); ctx.fillStyle = '#ffd000'; if ((Math.floor(x / 2) % 2) === 0) ctx.fillRect(px + 4, py + T / 2 - 1.5, T - 8, 3); ink(ctx, 3); ctx.beginPath(); ctx.moveTo(px, py + 2); ctx.lineTo(px + T, py + 2); ctx.stroke(); }
  }

  // ----- Enredados Nublasticos: enredaderas -----
  function fillVine(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#2f9a4a'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#227a38'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = '#1b5e2a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px + T / 2, py); for (let i = 0; i <= 4; i++) ctx.lineTo(px + T / 2 + Math.sin(i * 1.6 + x + y) * 6, py + i * T / 4); ctx.stroke();
    ctx.fillStyle = '#6fd47a'; const hx = U.hash2(x, y);
    [[0.3, 0.3], [0.72, 0.55], [0.4, 0.78]].forEach(([u, v], i) => { if ((hx * 3 + i) % 1 > 0.2) { ctx.beginPath(); ctx.ellipse(px + u * T, py + v * T, 5, 3, (i + x) * 0.8, 0, 7); ctx.fill(); } });
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Gambling Gaming: tablero de ruleta (relleno) + arcade (pieza 1-2) -----
  function fillRoulette(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    const cells = ['#c0282f', '#1a1a1a', '#e8e8e8'];
    const c = cells[Math.floor(U.hash2(x * 3 + 1, y * 3 + 2) * 3) % 3];
    ctx.fillStyle = c; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 2; ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
    if (c !== '#e8e8e8') { ctx.fillStyle = '#ffd000'; ctx.font = 'bold 12px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((Math.floor(U.hash2(x, y) * 36) + 1).toString(), px + T / 2, py + T / 2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
  }
  const ARCADE_COLS = ['#3b8bff', '#ff3b3b', '#ffd000', '#2fd46a', '#b44dff'];
  function arcadeColor(x, y) {
    let i = Math.floor(U.hash2(x * 2 + 7, y * 3 + 1) * ARCADE_COLS.length) % ARCADE_COLS.length;
    const left = Math.floor(U.hash2((x - 1) * 2 + 7, y * 3 + 1) * ARCADE_COLS.length) % ARCADE_COLS.length;
    if (i === left) i = (i + 1) % ARCADE_COLS.length;
    return ARCADE_COLS[i];
  }
  // ARCADES: todo tramo de suelo temático de 1 o 2 de ancho (cualquier alto) es UNA máquina
  // arcade entera (cartel, pantalla, mandos, monedero). 3+ de ancho = masa (tablero de ruleta).
  // Cada casilla pinta su trozo de la máquina recortando (clip) el dibujo completo.
  const narrow = (level, cx, j) => isG2(level.get(cx, j)) && runW(level, cx, j) <= 2;
  function cabinetOf(level, x, y) {
    let x0 = x; while (x0 - 1 >= 0 && isG2(level.get(x0 - 1, y))) x0--;
    const top = (cx) => { let j = y; while (j - 1 >= 0 && narrow(level, cx, j - 1)) j--; return j; };
    const bot = (cx) => { let j = y; while (j + 1 < level.height && narrow(level, cx, j + 1)) j++; return j; };
    let w = runW(level, x, y);
    // dos columnas = una máquina ancha solo si ocupan exactamente las mismas filas
    if (w === 2 && (top(x0) !== top(x0 + 1) || bot(x0) !== bot(x0 + 1))) { w = 1; x0 = x; }
    if (w === 1) x0 = x;
    const y0 = top(x0);
    return { x0, y0, w, h: bot(x0) - y0 + 1 };
  }
  function drawCabinet(ctx, X, Y, W, H, col, time, seed) {
    const tall = H >= 2 * T, k = W / T;
    const dark = '#1c1f2a', trim = U.shade(col, -0.25);
    // cuerpo
    ctx.beginPath(); ctx.roundRect(X + 1.5, Y + 1.5, W - 3, H - 3, 4); ctx.fillStyle = dark; ctx.fill();
    ctx.fillStyle = trim; ctx.fillRect(X + 3, Y + 4, 3, H - 8); ctx.fillRect(X + W - 6, Y + 4, 3, H - 8);
    // cartel luminoso
    const mh = tall ? 12 : 7;
    ctx.beginPath(); ctx.roundRect(X + 4, Y + 3, W - 8, mh, 3); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(X + 7, Y + 5, W - 14, tall ? 3 : 2);
    if (tall) { ctx.fillStyle = U.shade(col, -0.45); for (let i = 0; i < 3 * k; i++) ctx.fillRect(X + 9 + i * 6, Y + 9, 4, 3); }
    // pantalla con un minijuego pixelado (un Glob que bota y estrellitas)
    const sy = Y + mh + (tall ? 5 : 2);
    const sh = tall ? Math.min(34, Math.max(20, H * 0.36)) : Math.max(8, H - mh - 13);
    const sx = X + 7, sw = W - 14;
    ctx.beginPath(); ctx.roundRect(sx - 2, sy - 2, sw + 4, sh + 4, 3); ctx.fillStyle = '#05060a'; ctx.fill();
    ctx.fillStyle = '#0b1638'; ctx.fillRect(sx, sy, sw, sh);
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    const tt = (time || 0) + seed * 7;
    ctx.fillStyle = '#ffe600';
    for (let i = 0; i < 3 * k; i++) { const st = (seed * 13 + i * 7) % 1; ctx.fillRect(sx + ((st * sw + tt * 10 * (i + 1)) % sw), sy + 2 + (i * 5) % Math.max(1, sh - 4), 1.5, 1.5); }
    const gx = sx + sw / 2 + Math.sin(tt * 1.7) * (sw / 2 - 5), gy = sy + sh - 4 - Math.abs(Math.sin(tt * 3.2)) * (sh * 0.5);
    ctx.fillStyle = ['#00ff66', '#ff3b3b', '#3b8bff'][Math.floor(seed * 3) % 3]; ctx.fillRect(gx - 3, gy - 3, 6, 3); ctx.fillRect(gx - 2, gy - 4, 4, 1);
    ctx.fillStyle = '#05060a'; ctx.fillRect(gx - 1, gy - 2, 1, 1); ctx.fillRect(gx + 1, gy - 2, 1, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let j = sy; j < sy + sh; j += 2) ctx.fillRect(sx, j, sw, 1);
    ctx.restore();
    // panel de mandos (sobresale un poco): joystick + botones
    const py = sy + sh + 3, ph = tall ? 9 : 6;
    ctx.beginPath(); ctx.moveTo(X + 1, py + ph); ctx.lineTo(X + W - 1, py + ph); ctx.lineTo(X + W - 5, py); ctx.lineTo(X + 5, py); ctx.closePath();
    ctx.fillStyle = trim; ctx.fill(); ink(ctx, 2); ctx.stroke();
    const jx = X + 10;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(jx, py + 3); ctx.lineTo(jx + Math.sin(tt * 2) * 1.5, py - 2); ctx.stroke();
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(jx + Math.sin(tt * 2) * 1.5, py - 3, 2.6, 0, 7); ctx.fill();
    ['#ffd000', '#2fd46a', '#3b8bff'].slice(0, W > T ? 3 : 2).forEach((bc, i) => { ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(X + W - 9 - i * 6, py + ph / 2 + 0.5, 2, 0, 7); ctx.fill(); });
    // monedero y zócalo (si cabe)
    const rest = Y + H - (py + ph);
    if (rest >= 16) {
      const cy = py + ph + Math.min(10, rest * 0.3), cw = 10;
      ctx.fillStyle = '#2b2f3c'; ctx.fillRect(X + W / 2 - cw, cy, cw * 2, 12);
      ctx.fillStyle = '#ff9a2f'; ctx.fillRect(X + W / 2 - cw + 3, cy + 3, 4, 6); ctx.fillRect(X + W / 2 + cw - 7, cy + 3, 4, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(X + W / 2 - cw, cy, cw * 2, 12);
    }
    if (rest >= 6) { ctx.fillStyle = '#0e1016'; ctx.fillRect(X + 4, Y + H - 7, W - 8, 4); }
    ink(ctx, 3); ctx.beginPath(); ctx.roundRect(X + 1.5, Y + 1.5, W - 3, H - 3, 4); ctx.stroke();
  }
  function pieceArcade(ctx, level, x, y, pal, ed, shape, time) {
    const cab = cabinetOf(level, x, y);
    const col = arcadeColor(cab.x0, cab.y0);
    ctx.save();
    ctx.beginPath(); ctx.rect(x * T, y * T, T, T); ctx.clip();
    drawCabinet(ctx, cab.x0 * T, cab.y0 * T, cab.w * T, cab.h * T, col, time, U.hash2(cab.x0, cab.y0));
    ctx.restore();
  }

  // ----- Sound Discotech: pista de baile -----
  function fillDanceFloor(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T;
    const DANCE = ['#ff2fd6', '#2f7bff', '#ffe02f', '#2fd46a', '#ff3b3b'];
    const phase = (time || 0) * 1.5 + (x + y) * 0.6;
    const c = DANCE[Math.floor(Math.abs(phase)) % DANCE.length];
    ctx.fillStyle = '#12101c'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = c; ctx.globalAlpha = 0.65; ctx.fillRect(px + 3, py + 3, T - 6, T - 6); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Sunlight Seaside: poste de muelle (col) + tablones de puerto (relleno) -----
  function colDockPost(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(px + 8, py, T - 16, T);
    ctx.fillStyle = '#6e4a26'; ctx.fillRect(px + 8, py, 3, T);
    ctx.fillStyle = '#c08a52'; ctx.fillRect(px + T - 11, py, 3, T);
    if (ed.up) { ctx.fillStyle = '#b5884f'; ctx.fillRect(px + 4, py, T - 8, 5); }
    ink(ctx, 2.5); ctx.strokeRect(px + 8.5, py + 0.5, T - 17, T - 1);
  }
  function fillDock(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#b5884f'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#946a38'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + T / 3, py); ctx.lineTo(px + T / 3, py + T); ctx.moveTo(px + 2 * T / 3, py); ctx.lineTo(px + 2 * T / 3, py + T); ctx.stroke();
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Time Attack: relojes / engranajes girando -----
  function fillClock(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#5a6b7a'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#3d4a57'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    if (Math.floor(U.hash2(x, y) * 2) === 0) {
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, T / 2 - 6, 0, 7); ctx.stroke();
      const a = (time || 0) * 1.5; ctx.strokeStyle = '#ffe9b0'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a * 0.3) * 4, cy + Math.sin(a * 0.3) * 4); ctx.stroke();
    } else {
      const a = (time || 0) * (x % 2 ? -1 : 1); ctx.fillStyle = '#8a6a4a';
      for (let k = 0; k < 8; k++) { const ang = a + k * Math.PI / 4; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * (T / 2 - 4), cy + Math.sin(ang) * (T / 2 - 4), 2, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cx, cy, T / 2 - 8, 0, 7); ctx.fill();
    }
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Spooktacular Ruins: pilares de piedra -----
  function fillPillar(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#c9a26a'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#a6823f'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
    for (const fx of [T * 0.32, T * 0.5, T * 0.68]) { ctx.beginPath(); ctx.moveTo(px + fx, py); ctx.lineTo(px + fx, py + T); ctx.stroke(); }
    if (ed.up) { ctx.fillStyle = '#d8b47a'; ctx.fillRect(px - 1, py, T + 2, 6); ink(ctx, 2.5); ctx.strokeRect(px - 0.5, py + 0.5, T + 1, 6); }
    ink(ctx, 2.5); if (ed.left) { ctx.beginPath(); ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py + T); ctx.stroke(); } if (ed.right) { ctx.beginPath(); ctx.moveTo(px + T - 2, py); ctx.lineTo(px + T - 2, py + T); ctx.stroke(); }
  }

  // ----- Pumpkin Circus: atraccion (col) + montaña rusa azul (row) + carpa (relleno) -----
  function colAttraction(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T, cx = px + T / 2;
    ctx.fillStyle = '#9a2fd0'; ctx.fillRect(px + 9, py, T - 18, T);
    if (ed.up) { ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(cx, py + 9, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8323f'; ctx.fillRect(cx - 9, py + 8, 18, 3); ink(ctx, 2); ctx.beginPath(); ctx.arc(cx, py + 9, 7, Math.PI, 0); ctx.stroke(); }
    ctx.fillStyle = '#ff7a00'; for (let j = py + 14; j < py + T; j += 8) ctx.fillRect(px + 9, j, T - 18, 3);
    ink(ctx, 2.5); ctx.strokeRect(px + 9.5, py + 0.5, T - 19, T - 1);
  }
  function rowCoaster(ctx, level, x, y, pal, ed) {
    // Montaña rusa azul: ocupa TODO el bloque (no un raíl fino). Via gruesa arriba + estructura
    // de armazon debajo. Recta y continua entre casillas; borde solo en los extremos de la fila.
    const px = x * T, py = y * T;
    ctx.fillStyle = '#245fb0'; ctx.fillRect(px, py, T, T);                 // cuerpo del bloque
    ctx.fillStyle = '#2f7bff'; ctx.fillRect(px, py + 3, T, T * 0.38);      // via azul (franja gruesa arriba)
    ctx.fillStyle = '#8fc0ff'; ctx.fillRect(px, py + 4, T, 3);            // brillo del raíl
    // dos carriles de la via
    ctx.fillStyle = '#1a3f7a'; ctx.fillRect(px, py + 7, T, 2); ctx.fillRect(px, py + Math.round(T * 0.33), T, 2);
    // armazon diagonal debajo (estructura de montaña rusa)
    ctx.strokeStyle = '#1a3f7a'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 1; i++) { const bx = px + i * T * 0.5; ctx.moveTo(bx, py + T * 0.42); ctx.lineTo(bx + T * 0.5, py + T); ctx.moveTo(bx + T * 0.5, py + T * 0.42); ctx.lineTo(bx, py + T); }
    ctx.stroke();
    // contorno: lados expuestos (los extremos de la fila cierran, los internos quedan continuos)
    ink(ctx, 3); ctx.beginPath();
    ctx.moveTo(px + (ed.left ? 1.5 : 0), py + 1.5); ctx.lineTo(px + T - (ed.right ? 1.5 : 0), py + 1.5); // borde superior siempre
    ctx.moveTo(px + (ed.left ? 1.5 : 0), py + T - 1.5); ctx.lineTo(px + T - (ed.right ? 1.5 : 0), py + T - 1.5); // borde inferior
    if (ed.left) { ctx.moveTo(px + 1.5, py + 1.5); ctx.lineTo(px + 1.5, py + T - 1.5); }
    if (ed.right) { ctx.moveTo(px + T - 1.5, py + 1.5); ctx.lineTo(px + T - 1.5, py + T - 1.5); }
    ctx.stroke();
  }
  function fillTent(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    const red = (Math.floor(x) % 2) === 0;
    ctx.fillStyle = red ? '#e8323f' : '#f5f0f0'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = red ? '#c0282f' : '#e0d8d8'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    if (ed.up) { ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.moveTo(px, py + 8); ctx.lineTo(px + T / 2, py); ctx.lineTo(px + T, py + 8); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke(); }
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Núcleo Fundido: roca caliente que late (pieza/columna) + cueva (relleno) -----
  function pieceHotRock(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T;
    const glow = 0.5 + 0.5 * Math.sin((time || 0) * 2 + U.hash2(x, y) * 6.28);
    ctx.fillStyle = '#2a1410'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = U.mix('#3a1d16', '#ff6a1f', glow); ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.fillStyle = U.mix('#5a2a1a', '#ffd000', glow * 0.8);
    for (let i = 0; i < 3; i++) { const hx = U.hash2(x + i, y); ctx.fillRect(px + 5 + hx * 14, py + 6 + U.hash2(y, x + i) * 16, 3, 3); }
    ink(ctx, 3); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }
  function fillCave(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#241414'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#3a2420'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    const glow = 0.3 + 0.3 * Math.sin((time || 0) * 1.5 + (x + y));
    ctx.fillStyle = U.mix('#3a2420', '#ff5a1f', glow); for (let i = 0; i < 2; i++) { const hx = U.hash2(x * 2 + i, y); if (hx > 0.5) { ctx.beginPath(); ctx.arc(px + 6 + hx * 18, py + 20, 1.6, 0, 7); ctx.fill(); } }
    if (ed.up) { ctx.fillStyle = '#4a2e28'; ctx.fillRect(px, py, T, 4); }
    ink(ctx, 3); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Gelatin Lake: CASA. Autotiling: una masa de casillas forma UNA casa grande
  //       (tejado continuo solo arriba, pared de ladrillo continua, ventanas/puerta repartidas). -----
  function fillHouse(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    // pared de ladrillo (continua entre casillas)
    ctx.fillStyle = '#e0b88a'; ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
    for (let ly = 0; ly < T; ly += 8) { const off = ((y * T + ly) / 8 % 2) ? 8 : 0; ctx.beginPath(); ctx.moveTo(px, py + ly); ctx.lineTo(px + T, py + ly); ctx.stroke(); for (let lx = off; lx < T; lx += 16) { ctx.beginPath(); ctx.moveTo(px + lx, py + ly); ctx.lineTo(px + lx, py + ly + 8); ctx.stroke(); } }
    if (ed.up) {
      // TEJADO solo en la fila superior de la casa: teja roja que sobresale a los lados
      ctx.fillStyle = '#c0453a'; ctx.fillRect(px - (ed.left ? 3 : 0), py, T + (ed.left ? 3 : 0) + (ed.right ? 3 : 0), T * 0.45);
      ctx.fillStyle = '#9a2f28'; ctx.fillRect(px - (ed.left ? 3 : 0), py + T * 0.42, T + (ed.left ? 3 : 0) + (ed.right ? 3 : 0), 3);
      ink(ctx, 2); ctx.beginPath(); ctx.moveTo(px - (ed.left ? 3 : 0), py + 1.5); ctx.lineTo(px + T + (ed.right ? 3 : 0), py + 1.5); ctx.stroke();
    } else {
      // ventana en el interior de la pared (una sí, una no, por posición -> reparte)
      if ((x + y) % 2 === 0) { ctx.fillStyle = '#9ad0ff'; ctx.fillRect(px + 8, py + 8, T - 16, T - 16); ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 2; ctx.strokeRect(px + 8, py + 8, T - 16, T - 16); ctx.beginPath(); ctx.moveTo(px + T / 2, py + 8); ctx.lineTo(px + T / 2, py + T - 8); ctx.moveTo(px + 8, py + T / 2); ctx.lineTo(px + T - 8, py + T / 2); ctx.stroke(); }
    }
    // puerta: en la base de una columna (fila inferior), al centro de la casa
    if (ed.down && !ed.up && (x % 3 === 1)) { ctx.fillStyle = '#6e4a26'; ctx.fillRect(px + 8, py + 6, T - 16, T - 6); ink(ctx, 2); ctx.strokeRect(px + 8, py + 6, T - 16, T - 6); ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(px + T - 12, py + T * 0.55, 1.6, 0, 7); ctx.fill(); }
    // contorno exterior de la casa (solo lados expuestos)
    ink(ctx, 2.5); ctx.beginPath();
    if (ed.left) { ctx.moveTo(px + 1.5, py); ctx.lineTo(px + 1.5, py + T); }
    if (ed.right) { ctx.moveTo(px + T - 1.5, py); ctx.lineTo(px + T - 1.5, py + T); }
    if (ed.down) { ctx.moveTo(px, py + T - 1.5); ctx.lineTo(px + T, py + T - 1.5); }
    ctx.stroke();
  }

  // ----- Event Hub: suelo azul dimensional -----
  function fillBlue(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#1f4fb0'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#2f7bff'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.fillStyle = 'rgba(160,210,255,0.5)'; const g = 0.5 + 0.5 * Math.sin((time || 0) * 2 + (x + y)); ctx.globalAlpha = 0.3 + g * 0.4; ctx.fillRect(px + 6, py + 6, T - 12, T - 12); ctx.globalAlpha = 1;
    if (ed.up) { ctx.fillStyle = '#8fc0ff'; ctx.fillRect(px, py, T, 4); }
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Vórtice Oscuro: runas antiguas verde-azuladas (estilo Dark Glob) sobre losa oscura -----
  function fillRunes(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#1a0f2a'; ctx.fillRect(px, py, T, T);                 // losa oscura violeta
    ctx.fillStyle = '#2a1545'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    const g = 0.45 + 0.55 * Math.sin((time || 0) * 1.6 + U.hash2(x, y) * 6.28); // runas que laten
    ctx.strokeStyle = U.mix('#1a6a5a', '#2fe0c0', g); ctx.lineWidth = 2; ctx.lineCap = 'round'; // verde azulado
    const k = Math.floor(U.hash2(x, y) * 3);
    ctx.beginPath();
    if (k === 0) { ctx.arc(cx, cy, 7, 0, 7); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); }       // ojo
    else if (k === 1) { ctx.moveTo(cx - 7, cy - 6); ctx.lineTo(cx + 7, cy - 6); ctx.lineTo(cx - 5, cy + 7); ctx.lineTo(cx + 6, cy + 7); } // zigzag
    else { ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy + 6); ctx.lineTo(cx - 7, cy + 6); ctx.closePath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx, cy + 3); } // triángulo rúnico
    ctx.stroke();
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Fábrica PixelStar: suelo azul cian con estrellas amarillas -----
  function fillPixelStar(ctx, level, x, y, pal, ed, shape, time) {
    const px = x * T, py = y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#0f8aa8'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#00c8e5'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    // estrella amarilla de 5 puntas en el centro
    const tw = 0.7 + 0.3 * Math.sin((time || 0) * 2 + U.hash2(x, y) * 6.28);
    ctx.fillStyle = '#ffd000'; ctx.globalAlpha = tw; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Frosty Christmas: hielo tallado / nieve apilada -----
  function fillIce(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#bfe4ff'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#9fd0f0'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 6, py + 6); ctx.lineTo(px + T - 6, py + T - 6); ctx.moveTo(px + T - 8, py + 8); ctx.lineTo(px + 10, py + T - 8); ctx.stroke(); // brillos de hielo
    if (ed.up) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, T, 5); }
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Frosty Christmas: REGALOS apilados -----
  // Cada bloque 2×2 alineado (x par, y par) que esté lleno es UN regalo grande; si no cabe, un
  // regalo pequeño de 1×1. Caja + cinta cruzada + lazo, con nieve encima si está al aire.
  // Colores [caja, cinta]: rojo/amarillo, azul/verde, gris oscuro/rosa, verde/rojo, morado/blanco, blanco/rojo.
  const GIFT_COLS = [['#e8323f', '#ffd000'], ['#3b8bff', '#2fd46a'], ['#3a3f4a', '#ff7ab8'], ['#2fa84a', '#e8323f'], ['#8a4dff', '#ffffff'], ['#f4f4f8', '#e8323f']];
  function giftOf(level, x, y) {
    const gx = x - (x & 1), gy = y - (y & 1);
    const big = [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => isG2(level.get(gx + dx, gy + dy)));
    return big ? { x0: gx, y0: gy, n: 2 } : { x0: x, y0: y, n: 1 };
  }
  function giftColor(level, g) {
    const pick = (q) => Math.floor(U.hash2(q.x0 * 3 + 11, q.y0 * 5 + 2) * GIFT_COLS.length) % GIFT_COLS.length;
    let i = pick(g);
    // que no coincida con el regalo de la izquierda ni el de arriba
    const near = [];
    if (isG2(level.get(g.x0 - 1, g.y0))) near.push(pick(giftOf(level, g.x0 - 1, g.y0)));
    if (isG2(level.get(g.x0, g.y0 - 1))) near.push(pick(giftOf(level, g.x0, g.y0 - 1)));
    for (let k = 0; k < GIFT_COLS.length && near.includes(i); k++) i = (i + 1) % GIFT_COLS.length;
    return GIFT_COLS[i];
  }
  function drawGift(ctx, X, Y, S2, box, rib, snow) {
    const lid = Math.max(7, S2 * 0.2), rw = Math.max(6, S2 * 0.16);
    // caja
    ctx.beginPath(); ctx.roundRect(X + 1.5, Y + lid - 1, S2 - 3, S2 - lid - 0.5, 3); ctx.fillStyle = box; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(X + S2 * 0.62, Y + lid, S2 * 0.34, S2 - lid - 3); // sombra lateral
    // cinta vertical (caja)
    ctx.fillStyle = rib; ctx.fillRect(X + S2 / 2 - rw / 2, Y + lid, rw, S2 - lid - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(X + S2 / 2 - rw / 2 + 1, Y + lid, 2, S2 - lid - 2);
    ink(ctx, 2.5); ctx.beginPath(); ctx.roundRect(X + 1.5, Y + lid - 1, S2 - 3, S2 - lid - 0.5, 3); ctx.stroke();
    // tapa (algo más ancha) con su cinta
    ctx.beginPath(); ctx.roundRect(X + 0.5, Y + 1.5, S2 - 1, lid, 3); ctx.fillStyle = U.shade(box, -0.12); ctx.fill();
    ctx.fillStyle = rib; ctx.fillRect(X + S2 / 2 - rw / 2, Y + 1.5, rw, lid);
    if (snow) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(X + 0.5, Y + 0.5, S2 - 1, Math.min(5, lid * 0.6), 3); ctx.fill(); }
    ink(ctx, 2.5); ctx.beginPath(); ctx.roundRect(X + 0.5, Y + 1.5, S2 - 1, lid, 3); ctx.stroke();
    // lazo encima de la tapa (dos lazadas y el nudo)
    const bx = X + S2 / 2, by = Y + lid * 0.55, br = Math.max(4, S2 * 0.11);
    ctx.fillStyle = rib;
    [-1, 1].forEach((d) => { ctx.beginPath(); ctx.ellipse(bx + d * br, by, br, br * 0.62, d * 0.35, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(bx, by, br * 0.45, 0, 7); ctx.fillStyle = U.shade(rib, -0.2); ctx.fill(); ink(ctx, 2); ctx.stroke();
  }
  function pieceGift(ctx, level, x, y, pal, ed) {
    const g = giftOf(level, x, y), [box, rib] = giftColor(level, g);
    const snow = !isG2(level.get(g.x0, g.y0 - 1)) && (g.n === 1 || !isG2(level.get(g.x0 + 1, g.y0 - 1)));
    ctx.save();
    ctx.beginPath(); ctx.rect(x * T, y * T, T, T); ctx.clip();
    drawGift(ctx, g.x0 * T, g.y0 * T, g.n * T, box, rib, snow);
    ctx.restore();
  }

  // ----- Abismo Gelatinoso: coral -----
  function fillCoral(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#ff7ab8'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#e85ba0'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.fillStyle = '#ffd0e8'; for (let i = 0; i < 4; i++) { const hx = U.hash2(x + i, y); ctx.beginPath(); ctx.arc(px + 5 + hx * 20, py + 6 + U.hash2(y, x + i) * 18, 2.2, 0, 7); ctx.fill(); } // pólipos
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // ----- Darkness Forest: raices / madera -----
  function fillRoot(ctx, level, x, y, pal, ed) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#6b3f22'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#4f2d17'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.strokeStyle = '#3a1f10'; ctx.lineWidth = 2; ctx.lineCap = 'round'; // vetas de raiz
    ctx.beginPath(); for (let i = 0; i <= 3; i++) ctx.lineTo(px + i * T / 3, py + T / 2 + Math.sin(i * 1.3 + x) * 5); ctx.stroke();
    if (ed.up) { ctx.fillStyle = '#3fbf4f'; ctx.fillRect(px, py, T, 4); } // musgo arriba
    ink(ctx, 2.5); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
  }

  // Registro por mapa. Los 16 mapas tienen suelo tematico (es un tile aparte, no toca el base).
  const STYLES = {
    // UR: viga ligera en pieza, columna Y fila; solo la masa grande (3+x3+) pasa a carretera.
    city: { fill: fillRoad, piece: pieceBeam, col: pieceBeam, row: pieceBeam },
    sky: { fill: fillVine },
    casino: { fill: fillRoulette, arcade: pieceArcade },
    disco: { fill: fillDanceFloor },
    seaside: { fill: fillDock, col: colDockPost },
    clock: { fill: fillClock },
    ruins: { fill: fillPillar },
    circus: { fill: fillTent, col: colAttraction, row: rowCoaster },
    volcano: { fill: fillCave, piece: pieceHotRock, col: pieceHotRock },
    lake: { fill: fillHouse },        // casas
    hub: { fill: fillBlue },          // suelo azul dimensional
    vortex: { fill: fillRunes },      // runas verde-azuladas (Dark Glob)
    factory: { fill: fillPixelStar }, // azul cian con estrellas amarillas
    snow: { fill: pieceGift, piece: pieceGift, col: pieceGift, row: pieceGift }, // regalos apilados (2×2 o 1×1)
    underwater: { fill: fillCoral },  // coral
    jungle: { fill: fillRoot }        // raices / madera
  };

  S.View.GroundStyles = {
    has(themeId) { return !!STYLES[themeId]; },
    // Dibuja el suelo tematico (tile GROUND2) de (x,y). Devuelve true si pinto. themeId = id del mapa.
    draw(ctx, level, x, y, pal, _ed, time, themeId) {
      const style = STYLES[themeId];
      if (!style) return false;
      const ed = edgesG2(level, x, y);          // bordes calculados contra GROUND2 (su propio tile)
      const shape = shapeOf(level, x, y);
      // Casino: cualquier tramo de 1-2 de ancho es una máquina arcade (aunque sea alto)
      if (style.arcade && runW(level, x, y) <= 2) { style.arcade(ctx, level, x, y, pal, ed, shape, time); return true; }
      const fn = (shape !== 'fill' && style[shape]) || style.fill;
      fn(ctx, level, x, y, pal, ed, shape, time);
      return true;
    }
  };
})(window.SGM);
