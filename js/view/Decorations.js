/* Vista: DECORACIONES de terreno. Adornos puramente VISUALES, SIN COLISION (como la tuberia
   decorativa 1x1). AISLADO en su modulo: el renderer/editor solo llaman, con guardas, a
   S.View.Decorations. Si falla o no existe, no se dibuja nada y el resto del juego sigue igual.

   Una decoracion es un objeto del nivel { type:'deco', x, y, deco:<id> }. El tamaño (w x h en
   casillas) y el dibujo salen del catalogo DECOS. Se pintan DETRAS del terreno. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const INK = '#0a0a0a';
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }

  // ---- catalogo de decoraciones. Cada una: { name, w, h, map, draw(ctx, px, py, W, H, t, mode) }
  //      w,h = tamaño en casillas. map = id del mapa al que pertenece. ----
  const list = [];
  const add = (id, def) => { def.id = id; list.push(def); };

  // -------- Gelatin Lake --------
  add('gl_bushglob', { name: 'Arbusto Glob', map: 'lake', w: 1, h: 1, draw(ctx, px, py, W, H) {
    const cx = px + T * 0.5, by = py + T * 0.9;
    // sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx, by, T * 0.34, T * 0.08, 0, 0, 7); ctx.fill();
    // masa cohesiva del arbusto (una sola silueta ondulada, no circulos sueltos)
    ctx.beginPath();
    ctx.moveTo(px + T * 0.12, by);
    ctx.quadraticCurveTo(px + T * 0.02, py + T * 0.55, px + T * 0.22, py + T * 0.45);
    ctx.quadraticCurveTo(px + T * 0.26, py + T * 0.2, px + T * 0.5, py + T * 0.22);
    ctx.quadraticCurveTo(px + T * 0.74, py + T * 0.2, px + T * 0.78, py + T * 0.45);
    ctx.quadraticCurveTo(px + T * 0.98, py + T * 0.55, px + T * 0.88, by);
    ctx.closePath();
    ctx.fillStyle = '#2fb36b'; ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    // volumen: lado claro arriba-izquierda
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(px + T * 0.4, py + T * 0.42, T * 0.28, T * 0.18, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px, py + T * 0.72, T, T * 0.3); // base en sombra
    ctx.restore();
    // carita de Glob (ojos redondeados + sonrisa), bien definida
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.roundRect(px + T * 0.38, py + T * 0.42, T * 0.08, T * 0.11, 2); ctx.roundRect(px + T * 0.54, py + T * 0.42, T * 0.08, T * 0.11, 2); ctx.fill();
    ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.56, T * 0.09, 0.15, Math.PI - 0.15); ctx.stroke();
  } });
  add('gl_sign', { name: 'Cartel roto', map: 'lake', w: 1, h: 2, draw(ctx, px, py, W, H) {
    // poste con vetas
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(px + T * 0.43, py + T * 0.5, 6, H * T - T * 0.5); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px + T * 0.44, py + T * 0.5, 2, H * T - T * 0.5);
    ctx.save(); ctx.translate(px + T * 0.5, py + T * 0.52); ctx.rotate(-0.12);
    // tabla de madera con tablones y esquina rota
    ctx.fillStyle = '#c9a26a'; ctx.beginPath(); ctx.moveTo(-T * 0.4, -T * 0.32); ctx.lineTo(T * 0.4, -T * 0.32); ctx.lineTo(T * 0.4, T * 0.1); ctx.lineTo(T * 0.12, T * 0.18); ctx.lineTo(T * 0.02, T * 0.05); ctx.lineTo(-T * 0.4, T * 0.12); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    ctx.strokeStyle = U.shade('#c9a26a', -0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-T * 0.4, -T * 0.12); ctx.lineTo(T * 0.4, -T * 0.12); ctx.moveTo(-T * 0.4, 0); ctx.lineTo(T * 0.3, 0); ctx.stroke();
    // flecha pintada
    ctx.fillStyle = '#e8434f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('→', 0, -T * 0.1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
    // clavos
    ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(px + T * 0.18, py + T * 0.28, 1.4, 0, 7); ctx.arc(px + T * 0.82, py + T * 0.28, 1.4, 0, 7); ctx.fill();
  } });
  add('gl_fruit', { name: 'Frutos', map: 'lake', w: 1, h: 1, draw(ctx, px, py) {
    // ramita con hojas y tres frutos con brillo (no bolas sueltas)
    ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.18); ctx.lineTo(px + T * 0.5, py + T * 0.5); ctx.stroke();
    ctx.strokeStyle = '#2f8f5b'; ctx.lineWidth = 2; // tallitos
    [[0.32, 0.56], [0.68, 0.6], [0.5, 0.72]].forEach(([u, v]) => { ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.3); ctx.lineTo(px + u * T, py + v * T - 5); ctx.stroke(); });
    // hojita
    ctx.fillStyle = '#2f8f5b'; ctx.beginPath(); ctx.ellipse(px + T * 0.62, py + T * 0.28, T * 0.12, T * 0.06, -0.6, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
    const cols = ['#ff4d4d', '#ffd000', '#ff7ac8'];
    [[0.32, 0.6], [0.68, 0.64], [0.5, 0.76]].forEach(([u, v], i) => {
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(px + u * T, py + v * T, T * 0.13, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(px + u * T - 2, py + v * T - 3, 2, 0, 7); ctx.fill(); // brillo
    });
  } });
  add('gl_bush', { name: 'Arbusto', map: 'lake', w: 2, h: 1, draw(ctx, px, py, W) {
    const by = py + T * 0.92, w = W * T;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(px + w / 2, by + 2, w * 0.4, T * 0.07, 0, 0, 7); ctx.fill();
    // silueta ondulada continua
    ctx.beginPath(); ctx.moveTo(px + T * 0.1, by);
    const bumps = W * 2; const topY = py + T * 0.28;
    ctx.quadraticCurveTo(px + T * 0.02, py + T * 0.6, px + T * 0.18, py + T * 0.5);
    for (let i = 0; i < bumps; i++) { const x0 = px + T * 0.18 + (w - T * 0.36) * (i / bumps); const x1 = px + T * 0.18 + (w - T * 0.36) * ((i + 1) / bumps); ctx.quadraticCurveTo((x0 + x1) / 2, topY - (i % 2 ? 0 : T * 0.08), x1, py + T * 0.5); }
    ctx.quadraticCurveTo(px + w - T * 0.02, py + T * 0.6, px + w - T * 0.1, by);
    ctx.closePath();
    ctx.fillStyle = '#2f8f5b'; ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(px, py + T * 0.3, w, T * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(px, by - T * 0.25, w, T * 0.25);
    ctx.restore();
  } });

  // -------- Urbanistic Road --------
  add('ur_lamp', { name: 'Farol', map: 'city', w: 1, h: 3, draw(ctx, px, py, W, H, t, mode) {
    const topH = H * T;
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(px + T * 0.44, py, 5, topH - T * 0.2); // poste
    ctx.fillStyle = '#2a2d34'; ctx.fillRect(px + T * 0.3, py, T * 0.4, T * 0.3);   // cabeza
    // de noche (mapa city es night) / modo corrupto, la luz parpadea
    const night = mode === 'corrupt';
    const on = !night || Math.sin(t * 6) > -0.3;
    ctx.fillStyle = on ? '#fff2a8' : '#5a5030';
    ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.18, 5, 0, 7); ctx.fill();
    if (on && night) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.18, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ink(ctx, 2); ctx.stroke();
  } });
  add('ur_beam', { name: 'Viga rota', map: 'city', w: 3, h: 1, draw(ctx, px, py, W) {
    ctx.save(); ctx.translate(px + W * T / 2, py + T / 2); ctx.rotate(0.08);
    ctx.fillStyle = '#8a1a20'; ctx.fillRect(-W * T / 2 + 2, -4, W * T - 10, 8); ink(ctx, 2.5); ctx.strokeRect(-W * T / 2 + 2, -4, W * T - 10, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < W; i++) { ctx.beginPath(); ctx.arc(-W * T / 2 + 8 + i * T, 0, 1.5, 0, 7); ctx.fill(); }
    ctx.restore();
  } });

  // helper breve para figuras
  const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const circle = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const rr2 = (ctx, x, y, w, h, r, c) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); ink(ctx, 2); ctx.stroke(); };

  // -------- Sunlight Seaside --------
  add('ss_palm', { name: 'Palmera', map: 'seaside', w: 1, h: 3, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.44, py + T * 0.3, 5, H * T - T * 0.3, '#9a6a3a'); // tronco
    ctx.fillStyle = '#2fb36b'; for (const a of [-0.9, -0.3, 0.3, 0.9]) { ctx.save(); ctx.translate(px + T * 0.5, py + T * 0.3); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -8, 4, 13, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ink(ctx, 2); ctx.stroke();
  } });
  add('ss_umbrella', { name: 'Sombrilla', map: 'seaside', w: 1, h: 2, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.47, py + T * 0.4, 3, H * T - T * 0.4, '#b5884f');
    ctx.fillStyle = '#ff5f5f'; ctx.beginPath(); ctx.moveTo(px + T * 0.1, py + T * 0.4); ctx.quadraticCurveTo(px + T * 0.5, py - T * 0.1, px + T * 0.9, py + T * 0.4); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
  } });
  add('ss_shell', { name: 'Concha', map: 'seaside', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = '#ffd0e8'; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.7, T * 0.3, Math.PI, 0); ctx.fill(); ink(ctx, 2);
    ctx.strokeStyle = '#d88ab0'; ctx.lineWidth = 1.5; for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.7); ctx.lineTo(px + T * 0.5 + Math.sin(a) * T * 0.28, py + T * 0.7 - Math.cos(a) * T * 0.28); ctx.stroke(); }
  } });

  // -------- Spooktacular Ruins --------
  add('ru_cactus', { name: 'Cactus', map: 'ruins', w: 1, h: 2, draw(ctx, px, py, W, H) {
    const cx = px + T * 0.5, botY = py + H * T - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, botY, T * 0.24, T * 0.05, 0, 0, 7); ctx.fill();
    const limb = (bx, by, w, h) => { rr2(ctx, bx, by, w, h, w / 2, '#2f8f5b'); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(bx + 2, by + 3, w * 0.3, h - 6); ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(bx + w * 0.62, by + 3, w * 0.3, h - 6); };
    // tronco
    limb(cx - T * 0.1, py + T * 0.2, T * 0.2, H * T - T * 0.2);
    // brazo izquierdo (sube) y derecho
    limb(cx - T * 0.3, py + T * 0.72, T * 0.12, T * 0.4); rr2(ctx, cx - T * 0.3, py + T * 0.62, T * 0.12, T * 0.22, T * 0.06, '#2f8f5b');
    limb(cx + T * 0.18, py + T * 0.95, T * 0.12, T * 0.35); rr2(ctx, cx + T * 0.18, py + T * 0.86, T * 0.12, T * 0.2, T * 0.06, '#2f8f5b');
    // espinas y flor
    ctx.strokeStyle = '#1c5e38'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const yy = py + T * 0.35 + i * T * 0.3; ctx.beginPath(); ctx.moveTo(cx - 2, yy); ctx.lineTo(cx - 5, yy - 2); ctx.moveTo(cx + 2, yy); ctx.lineTo(cx + 5, yy - 2); ctx.stroke(); }
    ctx.fillStyle = '#ff5fa8'; ctx.beginPath(); ctx.arc(cx, py + T * 0.2, 3.5, 0, 7); ctx.fill(); ink(ctx, 1.3); ctx.stroke();
  } });
  add('ru_skull', { name: 'Calavera', map: 'ruins', w: 1, h: 1, draw(ctx, px, py) {
    const cx = px + T * 0.5, cy = py + T * 0.46;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.9, T * 0.26, T * 0.06, 0, 0, 7); ctx.fill();
    // cráneo + mandíbula como una silueta
    ctx.fillStyle = '#ece4d4'; ctx.beginPath(); ctx.arc(cx, cy, T * 0.26, Math.PI, 0); ctx.lineTo(cx + T * 0.26, cy + T * 0.1); ctx.quadraticCurveTo(cx + T * 0.2, cy + T * 0.22, cx + T * 0.12, cy + T * 0.2); ctx.lineTo(cx + T * 0.12, cy + T * 0.3); ctx.lineTo(cx - T * 0.12, cy + T * 0.3); ctx.lineTo(cx - T * 0.12, cy + T * 0.2); ctx.quadraticCurveTo(cx - T * 0.2, cy + T * 0.22, cx - T * 0.26, cy + T * 0.1); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
    // sombra inferior
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.arc(cx, cy, T * 0.26, 0.3, Math.PI - 0.3); ctx.fill();
    // cuencas hundidas
    ctx.fillStyle = '#1e1e1e'; ctx.beginPath(); ctx.ellipse(cx - T * 0.1, cy, T * 0.08, T * 0.09, 0, 0, 7); ctx.ellipse(cx + T * 0.1, cy, T * 0.08, T * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(cx - T * 0.1, cy - 2, 1.5, 0, 7); ctx.arc(cx + T * 0.1, cy - 2, 1.5, 0, 7); ctx.fill();
    // nariz + dientes
    ctx.fillStyle = '#1e1e1e'; ctx.beginPath(); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx - 2.5, cy + 7); ctx.lineTo(cx + 2.5, cy + 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a8070'; ctx.lineWidth = 1; for (const dx of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(cx + dx, cy + T * 0.2); ctx.lineTo(cx + dx, cy + T * 0.3); ctx.stroke(); }
  } });
  add('ru_pillar', { name: 'Columna rota', map: 'ruins', w: 1, h: 3, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.3, py + T * 0.3, T * 0.4, H * T - T * 0.3, '#c9a26a'); ink(ctx, 2.5); ctx.strokeRect(px + T * 0.3, py + T * 0.3, T * 0.4, H * T - T * 0.3);
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.5; for (const u of [0.42, 0.58]) { ctx.beginPath(); ctx.moveTo(px + u * T, py + T * 0.3); ctx.lineTo(px + u * T, py + H * T); ctx.stroke(); }
  } });

  // -------- Pumpkin Circus --------
  add('ci_balloon', { name: 'Globos', map: 'circus', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const cols = ['#ff4d4d', '#ffd000', '#2f7bff'];
    const knot = px + T * 0.5, ky = py + T * 0.62;
    // cuerdas que se juntan en un nudo
    ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 1.2;
    const pos = [[0.3, 0.26], [0.52, 0.2], [0.72, 0.28]];
    pos.forEach(([u, v], i) => { const bx = px + u * T + Math.sin((t || 0) * 1.5 + i) * 1.5; ctx.beginPath(); ctx.moveTo(bx, py + v * T + 7); ctx.quadraticCurveTo((bx + knot) / 2, (py + v * T + ky) / 2, knot, ky); ctx.stroke(); });
    pos.forEach(([u, v], i) => {
      const bx = px + u * T + Math.sin((t || 0) * 1.5 + i) * 1.5, by = py + v * T, r = T * 0.19;
      // globo con degradado y brillo
      const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.4, 1, bx, by, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, cols[i]); g.addColorStop(1, U.shade(cols[i], -0.3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, r, r * 1.15, 0, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke();
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(bx, by + r * 1.1); ctx.lineTo(bx - 2.5, by + r * 1.3); ctx.lineTo(bx + 2.5, by + r * 1.3); ctx.closePath(); ctx.fill(); // nudito
    });
  } });
  add('ci_pumpkin', { name: 'Calabaza', map: 'circus', w: 1, h: 1, draw(ctx, px, py) {
    const cx = px + T * 0.5, cy = py + T * 0.62, r = T * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.92, r * 0.9, T * 0.06, 0, 0, 7); ctx.fill();
    // cuerpo con gajos (varias elipses)
    ctx.fillStyle = '#ff7a00';
    for (const dx of [-0.6, -0.3, 0, 0.3, 0.6]) { ctx.beginPath(); ctx.ellipse(cx + dx * r, cy, r * (0.5 - Math.abs(dx) * 0.18), r, 0, 0, 7); ctx.fill(); }
    ink(ctx, 2.5); ctx.beginPath(); ctx.ellipse(cx, cy, r, r, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = U.shade('#ff7a00', -0.3); ctx.lineWidth = 1.5; for (const dx of [-0.35, 0, 0.35]) { ctx.beginPath(); ctx.ellipse(cx + dx * r * 1.6, cy, r * 0.22, r * 0.95, 0, -0.9, 0.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy - r * 0.4, r * 0.25, r * 0.4, -0.5, 0, 7); ctx.fill();
    // rabito verde
    ctx.fillStyle = '#2f8f3b'; ctx.beginPath(); ctx.moveTo(cx - 3, cy - r + 2); ctx.lineTo(cx + 3, cy - r + 2); ctx.lineTo(cx + 2, cy - r - 6); ctx.lineTo(cx - 2, cy - r - 5); ctx.closePath(); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
  } });
  add('ci_banner', { name: 'Banderines', map: 'circus', w: 3, h: 1, draw(ctx, px, py, W, H, t) {
    const w = W * T;
    // cuerda colgante en guirnalda
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + 5); ctx.quadraticCurveTo(px + w / 2, py + 14, px + w, py + 5); ctx.stroke();
    const cols = ['#e8323f', '#ffd000', '#2f7bff', '#2fb36b', '#9a4dff'];
    const n = W * 3;
    for (let i = 0; i < n; i++) {
      const fx = i / (n - 1 || 1), bx = px + 6 + (w - 12) * fx;
      const sag = Math.sin(fx * Math.PI) * 9; const by = py + 5 + sag + Math.sin((t || 0) * 2 + i) * 0.6;
      const c = cols[i % cols.length];
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.lineTo(bx, by + 13); ctx.closePath(); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx - 1, by); ctx.lineTo(bx - 3, by + 6); ctx.closePath(); ctx.fill(); // brillo
    }
  } });

  // -------- Frosty Christmas --------
  add('sn_tree', { name: 'Árbol nevado', map: 'snow', w: 1, h: 3, draw(ctx, px, py, W, H) {
    const cx = px + T * 0.5, botY = py + H * T;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(cx, botY - 2, T * 0.28, T * 0.06, 0, 0, 7); ctx.fill();
    rr2(ctx, cx - 3, botY - T * 0.4, 6, T * 0.4, 1, '#6e4a26');
    // tres pisos con relleno y nieve encima de cada uno
    for (let i = 0; i < 3; i++) {
      const yy = py + T * 0.18 + i * T * 0.72, halfW = T * (0.42 - i * 0.03);
      ctx.fillStyle = '#237a44'; ctx.beginPath(); ctx.moveTo(cx - halfW, yy + T * 0.72); ctx.lineTo(cx, yy); ctx.lineTo(cx + halfW, yy + T * 0.72); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
      // nieve posada
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx - halfW * 0.7, yy + T * 0.42); ctx.quadraticCurveTo(cx, yy + T * 0.2, cx + halfW * 0.7, yy + T * 0.42); ctx.quadraticCurveTo(cx, yy + T * 0.36, cx - halfW * 0.7, yy + T * 0.42); ctx.fill();
    }
    // estrella arriba
    ctx.fillStyle = '#ffd000'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 5, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * r, py + T * 0.14 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ink(ctx, 1); ctx.stroke();
    // bolitas de adorno
    ['#e8434f', '#2f7bff', '#ffd000'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + (i - 1) * T * 0.22, py + T * (0.9 + i * 0.5), 2.5, 0, 7); ctx.fill(); });
  } });
  add('sn_snowman', { name: 'Muñeco de nieve', map: 'snow', w: 1, h: 2, draw(ctx, px, py) {
    circle(ctx, px + T * 0.5, py + T * 1.3, T * 0.3, '#fff'); circle(ctx, px + T * 0.5, py + T * 0.75, T * 0.22, '#fff'); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; circle(ctx, px + T * 0.44, py + T * 0.72, 1.5, '#2a2a2a'); circle(ctx, px + T * 0.56, py + T * 0.72, 1.5, '#2a2a2a');
    ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.78); ctx.lineTo(px + T * 0.66, py + T * 0.8); ctx.lineTo(px + T * 0.5, py + T * 0.82); ctx.fill();
  } });
  add('sn_gift', { name: 'Regalo', map: 'snow', w: 1, h: 1, draw(ctx, px, py) {
    const x0 = px + T * 0.22, y0 = py + T * 0.42, s = T * 0.56;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(px + T * 0.5, py + T * 0.96, T * 0.3, T * 0.05, 0, 0, 7); ctx.fill();
    // tapa (un poco más ancha) y caja
    rr2(ctx, x0, y0, s, s, 3, '#e8434f');
    ctx.fillStyle = U.shade('#e8434f', 0.18); ctx.fillRect(x0 + 2, y0 + 2, s - 4, 4); // brillo tapa
    rr2(ctx, x0 - 2, y0 - 4, s + 4, 7, 2, '#c0282f'); // reborde tapa
    // lazo
    ctx.fillStyle = '#ffd000'; ctx.fillRect(px + T * 0.46, y0 - 4, 5, s + 4);
    ctx.fillStyle = '#ffd000'; ctx.fillRect(x0 - 2, y0 + s * 0.42, s + 4, 5);
    // moño
    ctx.fillStyle = '#ffe24a'; ctx.beginPath(); ctx.ellipse(px + T * 0.42, y0 - 6, 4, 3, -0.5, 0, 7); ctx.ellipse(px + T * 0.58, y0 - 6, 4, 3, 0.5, 0, 7); ctx.fill(); ink(ctx, 1.2); ctx.stroke();
  } });

  // -------- Vórtice Oscuro --------
  add('vo_crystal', { name: 'Cristal del vacío', map: 'vortex', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, top = py + T * 0.08, bot = py + T * 1.56, midY = py + T * 0.95, lx = px + T * 0.26, rx = px + T * 0.74;
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 2);
    ctx.fillStyle = U.rgba('#c86bff', 0.15 + g * 0.18); ctx.beginPath(); ctx.ellipse(cx, midY, T * 0.32, T * 0.7, 0, 0, 7); ctx.fill();
    // cuerpo alargado
    ctx.fillStyle = '#8a3fd1'; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(rx, midY); ctx.lineTo(cx + T * 0.08, bot); ctx.lineTo(cx - T * 0.08, bot); ctx.lineTo(lx, midY); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    ctx.fillStyle = U.shade('#8a3fd1', 0.25); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - T * 0.08, bot); ctx.lineTo(lx, midY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade('#8a3fd1', -0.25); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(rx, midY); ctx.lineTo(cx + T * 0.08, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba('#ffffff', 0.4 + g * 0.3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke();
  } });
  add('vo_rune', { name: 'Runa flotante', map: 'vortex', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, cy = py + T * 0.5 + Math.sin((t || 0) * 1.5) * 2, g = 0.5 + 0.5 * Math.sin((t || 0) * 2);
    // disco de piedra flotante con glifo brillante
    ctx.fillStyle = U.rgba('#2fe0c0', 0.12 + g * 0.2); ctx.beginPath(); ctx.arc(cx, cy, T * 0.34, 0, 7); ctx.fill(); // aura
    ctx.fillStyle = '#2a1a3a'; ctx.beginPath(); ctx.arc(cx, cy, T * 0.27, 0, 7); ctx.fill();
    ctx.strokeStyle = U.shade('#6a2fbf', 0.1); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, T * 0.27, 0, 7); ctx.stroke();
    // glifo que late
    ctx.strokeStyle = U.mix('#1a6a5a', '#5bffe0', g); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - T * 0.16); ctx.lineTo(cx, cy + T * 0.16);
    ctx.moveTo(cx - T * 0.12, cy - T * 0.04); ctx.lineTo(cx, cy - T * 0.16); ctx.lineTo(cx + T * 0.12, cy - T * 0.04);
    ctx.moveTo(cx - T * 0.1, cy + T * 0.08); ctx.lineTo(cx + T * 0.1, cy + T * 0.08);
    ctx.stroke();
    // chispitas orbitando
    for (let k = 0; k < 3; k++) { const a = (t || 0) * 1.2 + k * 2.1; ctx.fillStyle = U.rgba('#5bffe0', 0.5 + g * 0.5); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * T * 0.32, cy + Math.sin(a) * T * 0.32, 1.4, 0, 7); ctx.fill(); }
  } });

  // -------- Abismo Gelatinoso --------
  add('uw_seaweed', { name: 'Alga', map: 'underwater', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const botY = py + H * T;
    // 3 frondas con grosor (hojas, no líneas), que ondulan
    const frond = (baseX, hue, amp, phase) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) { const fy = botY - i * (H * T) / 6; const sway = Math.sin(i * 0.6 + (t || 0) * 2 + phase) * amp * (i / 6); pts.push([baseX + sway, fy]); }
      const wNow = 6;
      ctx.beginPath(); ctx.moveTo(pts[0][0] - wNow / 2, pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - (wNow * (1 - i / 6)) / 2, pts[i][1]);
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] + (wNow * (1 - i / 6)) / 2, pts[i][1]);
      ctx.closePath(); ctx.fillStyle = hue; ctx.fill(); ink(ctx, 1.5); ctx.stroke();
    };
    frond(px + T * 0.35, '#2f8f5b', 7, 0);
    frond(px + T * 0.65, '#3fae6a', 6, 1.5);
    frond(px + T * 0.5, '#247a44', 8, 0.7);
  } });
  add('uw_bubble', { name: 'Burbujas', map: 'underwater', w: 1, h: 1, draw(ctx, px, py) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; [[0.35, 0.6, 4], [0.6, 0.4, 3], [0.5, 0.75, 2]].forEach(([u, v, r]) => { ctx.beginPath(); ctx.arc(px + u * T, py + v * T, r, 0, 7); ctx.stroke(); });
  } });
  add('uw_starfish', { name: 'Estrella de mar', map: 'underwater', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = '#ff9a55'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? T * 0.1 : T * 0.3, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(px + T * 0.5 + Math.cos(a) * r, py + T * 0.55 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
  } });

  // -------- Darkness Forest --------
  add('ju_tree', { name: 'Árbol', map: 'jungle', w: 1, h: 3, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.42, py + T * 0.8, 6, H * T - T * 0.8, '#6b3f22');
    circle(ctx, px + T * 0.5, py + T * 0.6, T * 0.4, '#2f7a4a'); circle(ctx, px + T * 0.3, py + T * 0.9, T * 0.28, '#2f7a4a'); circle(ctx, px + T * 0.72, py + T * 0.9, T * 0.28, '#2f7a4a'); ink(ctx, 2); ctx.stroke();
  } });
  add('ju_mushroom', { name: 'Seta', map: 'jungle', w: 1, h: 1, draw(ctx, px, py) {
    rect(ctx, px + T * 0.44, py + T * 0.5, 5, T * 0.4, '#e8e0d0');
    ctx.fillStyle = '#e8434f'; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.5, T * 0.28, Math.PI, 0); ctx.fill(); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#fff'; circle(ctx, px + T * 0.4, py + T * 0.42, 1.5, '#fff'); circle(ctx, px + T * 0.6, py + T * 0.45, 1.5, '#fff');
  } });
  add('ju_fern', { name: 'Helecho', map: 'jungle', w: 2, h: 1, draw(ctx, px, py, W) {
    ctx.strokeStyle = '#3fbf4f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < W * 2; i++) { const bx = px + i * T * 0.5 + T * 0.25; ctx.beginPath(); ctx.moveTo(bx, py + T); ctx.quadraticCurveTo(bx - 6, py + T * 0.5, bx, py + T * 0.2); ctx.stroke(); }
  } });

  // -------- Enredados Nublasticos --------
  add('sk_cloud', { name: 'Nubecita', map: 'sky', w: 2, h: 1, draw(ctx, px, py, W) {
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < W * 2; i++) circle(ctx, px + (0.25 + i * 0.5) * T, py + T * 0.55, T * 0.28, '#ffffff'); ink(ctx, 2); ctx.stroke();
  } });
  add('sk_rainbow', { name: 'Arcoíris', map: 'sky', w: 3, h: 2, draw(ctx, px, py, W, H) {
    const cols = ['#ff4d4d', '#ff9a55', '#ffd000', '#2fb36b', '#2f7bff', '#9a4dff'];
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + W * T / 2, py + H * T, W * T / 2 - 4 - i * 4, Math.PI, 0); ctx.stroke(); });
  } });

  // -------- Núcleo Fundido --------
  add('vl_rock', { name: 'Roca', map: 'volcano', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(px + T * 0.5, py + T * 0.9, T * 0.33, T * 0.06, 0, 0, 7); ctx.fill();
    // bloque de roca con caras (facetas) para dar volumen
    ctx.fillStyle = '#4a342e'; ctx.beginPath(); ctx.moveTo(px + T * 0.16, py + T * 0.88); ctx.lineTo(px + T * 0.24, py + T * 0.42); ctx.lineTo(px + T * 0.52, py + T * 0.28); ctx.lineTo(px + T * 0.82, py + T * 0.5); ctx.lineTo(px + T * 0.86, py + T * 0.88); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    // faceta iluminada
    ctx.fillStyle = '#5c433a'; ctx.beginPath(); ctx.moveTo(px + T * 0.24, py + T * 0.42); ctx.lineTo(px + T * 0.52, py + T * 0.28); ctx.lineTo(px + T * 0.52, py + T * 0.6); ctx.lineTo(px + T * 0.3, py + T * 0.7); ctx.closePath(); ctx.fill();
    // faceta en sombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(px + T * 0.52, py + T * 0.28); ctx.lineTo(px + T * 0.82, py + T * 0.5); ctx.lineTo(px + T * 0.86, py + T * 0.88); ctx.lineTo(px + T * 0.52, py + T * 0.6); ctx.closePath(); ctx.fill();
    // chispitas de mineral
    ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.arc(px + T * 0.4, py + T * 0.55, 1.5, 0, 7); ctx.arc(px + T * 0.6, py + T * 0.7, 1.2, 0, 7); ctx.fill();
  } });
  add('vl_crystal', { name: 'Cristal ígneo', map: 'volcano', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, top = py + T * 0.12, bot = py + H * T - 1, g = 0.5 + 0.5 * Math.sin((t || 0) * 2);
    ctx.fillStyle = U.rgba('#ff6a1f', 0.12 + g * 0.18); ctx.beginPath(); ctx.ellipse(cx, py + H * T * 0.6, T * 0.3, T * 0.6, 0, 0, 7); ctx.fill();
    const base = U.mix('#7a3a2a', '#ff6a1f', 0.3 + g * 0.3);
    // prisma con dos facetas
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(px + T * 0.72, bot); ctx.lineTo(px + T * 0.28, bot); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    ctx.fillStyle = U.shade(base, 0.2); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.lineTo(px + T * 0.28, bot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade(base, -0.25); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(px + T * 0.72, bot); ctx.lineTo(cx, bot); ctx.closePath(); ctx.fill();
    // brasa interna que late
    ctx.fillStyle = U.rgba('#ffdf8a', 0.4 + g * 0.5); ctx.beginPath(); ctx.ellipse(cx, bot - T * 0.3, 3, 8, 0, 0, 7); ctx.fill();
    // cristalitos pequeños a los pies
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(px + T * 0.2, bot); ctx.lineTo(px + T * 0.28, bot - T * 0.2); ctx.lineTo(px + T * 0.36, bot); ctx.closePath(); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
  } });

  // -------- Gambling Gaming --------
  add('ca_slot', { name: 'Tragaperras', map: 'casino', w: 1, h: 2, draw(ctx, px, py, W, H) {
    const left = px + T * 0.18, w = T * 0.64, botY = py + H * T - 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(px + T * 0.5, botY + 1, w * 0.55, T * 0.05, 0, 0, 7); ctx.fill();
    // carcasa roja con cúpula
    rr2(ctx, left, py + T * 0.28, w, botY - (py + T * 0.28), 5, '#c0282f');
    ctx.fillStyle = U.shade('#c0282f', 0.18); ctx.fillRect(left + 2, py + T * 0.3, 4, botY - py - T * 0.3); // brillo
    ctx.fillStyle = '#e8323f'; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.28, w / 2, Math.PI, 0); ctx.fill(); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.2, 4, 0, 7); ctx.fill(); ink(ctx, 1.3); ctx.stroke(); // luz superior
    // pantalla de rodillos (3 símbolos)
    rr2(ctx, left + 3, py + T * 0.42, w - 6, T * 0.42, 3, '#120a1e');
    const syms = ['7', '★', '7']; const sw = (w - 8) / 3;
    syms.forEach((s, i) => { ctx.fillStyle = i === 1 ? '#ffd000' : '#ff4d4d'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, left + 5 + sw * (i + 0.5), py + T * 0.63); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // palanca lateral
    ctx.strokeStyle = '#8a8f9a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(left + w, py + T * 0.55); ctx.lineTo(left + w + 6, py + T * 0.42); ctx.stroke(); ctx.fillStyle = '#e8323f'; ctx.beginPath(); ctx.arc(left + w + 6, py + T * 0.4, 3, 0, 7); ctx.fill();
    // ranura de monedas
    ctx.fillStyle = '#ffd000'; ctx.fillRect(px + T * 0.42, py + T * 1.0, T * 0.16, 3);
  } });
  add('ca_dice', { name: 'Dados', map: 'casino', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(px + T * 0.5, py + T * 0.88, T * 0.32, T * 0.06, 0, 0, 7); ctx.fill();
    // dado grande en perspectiva: cara frontal + cara superior (3D)
    const s = T * 0.34, bx = px + T * 0.3, byy = py + T * 0.42, d = 6;
    // cara superior (rombo)
    ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.moveTo(bx, byy); ctx.lineTo(bx + d, byy - d); ctx.lineTo(bx + s + d, byy - d); ctx.lineTo(bx + s, byy); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
    // cara lateral derecha
    ctx.fillStyle = '#bdbdbd'; ctx.beginPath(); ctx.moveTo(bx + s, byy); ctx.lineTo(bx + s + d, byy - d); ctx.lineTo(bx + s + d, byy - d + s); ctx.lineTo(bx + s, byy + s); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
    // cara frontal
    rr2(ctx, bx, byy, s, s, 3, '#ffffff');
    // pips (5) frontal
    ctx.fillStyle = '#c0282f'; const p5 = [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]];
    p5.forEach(([u, v]) => { ctx.beginPath(); ctx.arc(bx + u * s, byy + v * s, 2.2, 0, 7); ctx.fill(); });
    // pips (3) cara superior
    ctx.fillStyle = '#2a2a2a'; [[0.3, 0.35], [0.5, 0.5], [0.7, 0.65]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(bx + d * 0.5 + u * s, byy - d * 0.5 - d * (1 - v) + 1, 1.4, 0, 7); ctx.fill(); });
  } });
  add('ca_neon', { name: 'Neón', map: 'casino', w: 3, h: 1, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 4); ctx.strokeStyle = U.mix('#7a1515', '#ff4d4d', g); ctx.lineWidth = 3;
    ctx.strokeRect(px + 3, py + 3, W * T - 6, T - 6); ctx.fillStyle = '#ffd000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.6 + g * 0.4; ctx.fillText('★ CASINO ★', px + W * T / 2, py + T * 0.62); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  } });

  // -------- Time Attack --------
  add('tk_clock', { name: 'Reloj', map: 'clock', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, cy = py + T * 0.5, R = T * 0.32;
    // carcasa dorada
    ctx.fillStyle = '#c99a4a'; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 7); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    // esfera
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 1, cx, cy, R); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4e8ee');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke();
    // marcas horarias
    ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 1.5; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82); ctx.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); ctx.stroke(); }
    // agujas (hora y minuto) que giran a ritmos distintos
    const am = (t || 0) * 1.6, ah = (t || 0) * 0.5;
    ctx.strokeStyle = '#2a2a2a'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah - Math.PI / 2) * R * 0.5, cy + Math.sin(ah - Math.PI / 2) * R * 0.5); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am - Math.PI / 2) * R * 0.78, cy + Math.sin(am - Math.PI / 2) * R * 0.78); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill();
  } });
  add('tk_hourglass', { name: 'Reloj de arena', map: 'clock', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, topY = py + T * 0.28, botY = py + T * 1.72, midY = py + T;
    // marcos de madera arriba y abajo
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(px + T * 0.24, topY - 5, T * 0.52, 5); ctx.fillRect(px + T * 0.24, botY, T * 0.52, 5); ink(ctx, 1.5); ctx.strokeRect(px + T * 0.24, topY - 5, T * 0.52, 5); ctx.strokeRect(px + T * 0.24, botY, T * 0.52, 5);
    // vidrio (dos bulbos)
    ctx.fillStyle = 'rgba(180,220,255,0.25)';
    ctx.beginPath(); ctx.moveTo(px + T * 0.3, topY); ctx.lineTo(px + T * 0.7, topY); ctx.lineTo(px + T * 0.54, midY); ctx.lineTo(px + T * 0.46, midY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + T * 0.46, midY); ctx.lineTo(px + T * 0.54, midY); ctx.lineTo(px + T * 0.7, botY); ctx.lineTo(px + T * 0.3, botY); ctx.closePath(); ctx.fill();
    // arena: nivel que baja con el tiempo (ciclo)
    const ph = ((t || 0) * 0.3) % 1;
    ctx.fillStyle = '#ffce6a';
    // arena arriba (mengua)
    const topFill = (1 - ph);
    ctx.beginPath(); ctx.moveTo(px + T * 0.5 - (T * 0.2) * topFill, midY - (midY - topY) * topFill); ctx.lineTo(px + T * 0.5 + (T * 0.2) * topFill, midY - (midY - topY) * topFill); ctx.lineTo(px + T * 0.52, midY); ctx.lineTo(px + T * 0.48, midY); ctx.closePath(); ctx.fill();
    // arena abajo (crece)
    ctx.beginPath(); ctx.moveTo(px + T * 0.32, botY); ctx.lineTo(px + T * 0.68, botY); ctx.lineTo(px + T * 0.5, botY - (botY - midY) * 0.5 * ph - 3); ctx.closePath(); ctx.fill();
    // chorro
    ctx.strokeStyle = '#ffce6a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, midY); ctx.lineTo(cx, midY + (botY - midY) * 0.4); ctx.stroke();
    // contorno del vidrio
    ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + T * 0.3, topY); ctx.lineTo(px + T * 0.7, topY); ctx.lineTo(px + T * 0.46, midY); ctx.lineTo(px + T * 0.7, botY); ctx.lineTo(px + T * 0.3, botY); ctx.lineTo(px + T * 0.54, midY); ctx.closePath(); ctx.stroke();
  } });

  // -------- Sound Discotech --------
  add('di_speaker', { name: 'Altavoz', map: 'disco', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, left = px + T * 0.18, w = T * 0.64, g = 0.5 + 0.5 * Math.sin((t || 0) * 6);
    // caja con bisel
    rr2(ctx, left, py + T * 0.1, w, H * T - T * 0.2, 4, '#211436');
    ctx.strokeStyle = '#3a2a5a'; ctx.lineWidth = 1.5; ctx.strokeRect(left + 3, py + T * 0.14, w - 6, H * T - T * 0.28);
    // woofer grande (abajo) con cono y vibración
    const woof = (cy, r) => {
      ctx.fillStyle = '#0d0820'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke();
      ctx.fillStyle = U.mix('#120a22', '#ff2fd6', 0.3 + g * 0.3); ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff6ae0'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22 + g * 1.5, 0, 7); ctx.fill(); // tapa central que late
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.18, 0, 7); ctx.fill();
    };
    woof(py + T * 1.45, T * 0.22);
    // tweeter (arriba)
    woof(py + T * 0.5, T * 0.13);
    // ondas de sonido saliendo
    ctx.strokeStyle = U.rgba('#00e5ff', 0.3 + g * 0.5); ctx.lineWidth = 2; for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.arc(cx, py + T * 1.45, T * 0.22 + k * 5 + g * 3, -0.7, 0.7); ctx.stroke(); }
  } });
  add('di_note', { name: 'Nota musical', map: 'disco', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const bob = Math.sin((t || 0) * 2) * 1.5, hue = ((t || 0) * 80) % 360, col = `hsl(${hue},90%,62%)`;
    // corchea doble (dos cabezas unidas por corchete)
    const headA = [px + T * 0.3, py + T * 0.72 + bob], headB = [px + T * 0.62, py + T * 0.62 + bob];
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(headA[0] + 5, headA[1]); ctx.lineTo(headA[0] + 5, py + T * 0.28 + bob); ctx.lineTo(headB[0] + 5, py + T * 0.2 + bob); ctx.lineTo(headB[0] + 5, headB[1]); ctx.stroke();
    // corchete/bandera
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(headA[0] + 5, py + T * 0.3 + bob); ctx.lineTo(headB[0] + 5, py + T * 0.22 + bob); ctx.lineTo(headB[0] + 5, py + T * 0.34 + bob); ctx.lineTo(headA[0] + 5, py + T * 0.42 + bob); ctx.stroke();
    // cabezas con brillo
    [headA, headB].forEach(([hx, hy]) => { ctx.fillStyle = col; ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.4); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 4, 0, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-1.5, -1.5, 1.5, 1, 0, 0, 7); ctx.fill(); ctx.restore(); });
  } });

  // -------- Event Hub --------
  add('hu_portal', { name: 'Portal', map: 'hub', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 3); ctx.strokeStyle = U.mix('#1a8a55', '#3fffa0', g); ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px + T * 0.5, py + T, T * (0.22 - i * 0.05), T * (0.8 - i * 0.2), 0, 0, 7); ctx.stroke(); }
  } });
  add('hu_crystal', { name: 'Cristal verde', map: 'hub', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, top = py + T * 0.16, bot = py + T * 0.86, midY = py + T * 0.5, lx = px + T * 0.28, rx = px + T * 0.72;
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 2.5);
    // halo
    ctx.fillStyle = U.rgba('#3fffa0', 0.18 + g * 0.15); ctx.beginPath(); ctx.ellipse(cx, midY, T * 0.3, T * 0.4, 0, 0, 7); ctx.fill();
    // cuerpo del cristal
    ctx.fillStyle = '#2fc47a'; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(rx, midY); ctx.lineTo(cx, bot); ctx.lineTo(lx, midY); ctx.closePath(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    // faceta clara (mitad izquierda) y oscura (derecha)
    ctx.fillStyle = U.shade('#2fc47a', 0.22); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.lineTo(lx, midY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade('#2fc47a', -0.22); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(rx, midY); ctx.lineTo(cx, bot); ctx.closePath(); ctx.fill();
    // arista central y destello
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke();
    ctx.fillStyle = U.rgba('#ffffff', 0.5 + g * 0.4); ctx.beginPath(); ctx.ellipse(cx - 3, midY - 6, 2, 5, -0.4, 0, 7); ctx.fill();
  } });

  // ---- referencias al ORIGEN de los Pyces (compartidas Gambling Gaming + Event Hub) ----
  // Varita rosa con medalla en forma de corazon en la punta
  function drawWand(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, topY = py + T * 0.42, bob = Math.sin((t || 0) * 2) * 2;
    // vara con degradado rosa
    const g = ctx.createLinearGradient(cx, topY, cx, py + H * T);
    g.addColorStop(0, '#ff9ad5'); g.addColorStop(1, '#d94fa0');
    ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, topY + bob); ctx.lineTo(cx, py + H * T - T * 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 1.5, topY + T * 0.15 + bob); ctx.lineTo(cx - 1.5, py + H * T - T * 0.2); ctx.stroke();
    // corazon (medalla) en la punta
    const hy = topY - T * 0.1 + bob, r = T * 0.17;
    ctx.save(); ctx.translate(cx, hy);
    const heart = () => { ctx.beginPath(); ctx.moveTo(0, r * 0.95); ctx.bezierCurveTo(-r * 1.4, -r * 0.2, -r * 0.5, -r * 1.1, 0, -r * 0.35); ctx.bezierCurveTo(r * 0.5, -r * 1.1, r * 1.4, -r * 0.2, 0, r * 0.95); ctx.closePath(); };
    // aro dorado de medalla
    ctx.fillStyle = '#ffd24a'; heart(); ctx.save(); ctx.scale(1.28, 1.28); heart(); ctx.fillStyle = '#f0b000'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#ff5fa8'; heart(); ctx.fill(); ink(ctx, 2.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.2, r * 0.3, r * 0.2, -0.5, 0, 7); ctx.fill(); // brillo
    ctx.restore();
    // destellos
    const sp = 0.5 + 0.5 * Math.sin((t || 0) * 5);
    ctx.fillStyle = `rgba(255,230,120,${0.4 + sp * 0.5})`;
    for (const [dx, dy] of [[-T * 0.32, -T * 0.05], [T * 0.3, T * 0.05]]) { ctx.beginPath(); ctx.moveTo(cx + dx, hy + dy - 4); ctx.lineTo(cx + dx + 1.5, hy + dy); ctx.lineTo(cx + dx, hy + dy + 4); ctx.lineTo(cx + dx - 1.5, hy + dy); ctx.closePath(); ctx.fill(); }
  }
  add('ca_wand', { name: 'Varita del corazón', map: 'casino', w: 1, h: 2, draw: drawWand });
  add('hu_wand', { name: 'Varita del corazón', map: 'hub', w: 1, h: 2, draw: drawWand });

  // Auriculares verdes flotando (referencia al origen de los Pyces)
  add('hu_headset', { name: 'Auriculares verdes', map: 'hub', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, cy = py + T * 0.5 + Math.sin((t || 0) * 1.8) * 2.5;
    // sombra flotante
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.92, T * 0.26, T * 0.06, 0, 0, 7); ctx.fill();
    // diadema
    ctx.strokeStyle = '#1f9e5a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.3, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.strokeStyle = '#7bf0ad'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy, T * 0.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // orejeras
    for (const s of [-1, 1]) {
      const ex = cx + s * T * 0.3, ey = cy + T * 0.04;
      rr2(ctx, ex - T * 0.12, ey - T * 0.14, T * 0.24, T * 0.3, 5, '#28c070');
      ctx.fillStyle = '#0f6a3a'; ctx.beginPath(); ctx.ellipse(ex, ey, T * 0.06, T * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(ex - 2, ey - 4, 2.5, 4, -0.4, 0, 7); ctx.fill();
    }
  } });

  // Orbes azules y cian (referencia al origen de los Pyces)
  add('hu_orbs', { name: 'Orbes azul y cian', map: 'hub', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const orbs = [[0.34, 0.4, '#2f7bff', 1], [0.66, 0.58, '#00e5ff', 1.4], [0.5, 0.72, '#4aa8ff', 0.7]];
    for (const [u, v, col, ph] of orbs) {
      const ox = px + u * T, oy = py + v * T + Math.sin((t || 0) * 2 + ph * 3) * 2.5, r = T * 0.13;
      ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(ox, oy, r * 1.7, 0, 7); ctx.fill(); ctx.globalAlpha = 1; // halo
      const rg = ctx.createRadialGradient(ox - r * 0.3, oy - r * 0.3, 1, ox, oy, r);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, col); rg.addColorStop(1, U.shade(col, -0.35));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.fill(); ink(ctx, 1.8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ox - r * 0.35, oy - r * 0.35, r * 0.28, 0, 7); ctx.fill();
    }
  } });

  // -------- Fábrica PixelStar --------
  add('fa_pipe', { name: 'Tubería industrial', map: 'factory', w: 1, h: 2, draw(ctx, px, py, W, H) {
    const cx = px + T * 0.5, w = T * 0.4;
    // tubo con degradado cilíndrico
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, '#454c58'); g.addColorStop(0.4, '#7a828f'); g.addColorStop(0.6, '#6a717d'); g.addColorStop(1, '#3a404a');
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, py, w, H * T); ink(ctx, 2); ctx.strokeRect(cx - w / 2, py, w, H * T);
    // bridas (anillos) con tornillos
    const flange = (yy) => { ctx.fillStyle = '#565f6e'; rr2(ctx, cx - w / 2 - 4, yy, w + 8, 7, 2, '#565f6e'); ctx.fillStyle = '#2a2f38'; for (const u of [-w / 2, 0, w / 2]) { ctx.beginPath(); ctx.arc(cx + u * 0.7, yy + 3.5, 1.3, 0, 7); ctx.fill(); } };
    flange(py + T * 0.05); flange(py + T * 0.9); flange(py + H * T - T * 0.2);
    // válvula redonda
    ctx.strokeStyle = '#c0282f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, py + T * 1.35, 6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 6, py + T * 1.35); ctx.lineTo(cx + 6, py + T * 1.35); ctx.moveTo(cx, py + T * 1.35 - 6); ctx.lineTo(cx, py + T * 1.35 + 6); ctx.stroke();
    // vapor
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(cx + w / 2 + 4, py + T * 0.3, 3, 0, 7); ctx.arc(cx + w / 2 + 7, py + T * 0.2, 2, 0, 7); ctx.fill();
  } });
  add('fa_star', { name: 'Estrella PixelStar', map: 'factory', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const cx = px + T * 0.5, cy = py + T * 0.5, g = 0.6 + 0.4 * Math.sin((t || 0) * 3);
    // resplandor
    ctx.fillStyle = U.rgba('#fff2a8', 0.2 + g * 0.3); ctx.beginPath(); ctx.arc(cx, cy, T * 0.42, 0, 7); ctx.fill();
    const starPath = (ro, ri) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); };
    // cuerpo con degradado
    const grd = ctx.createRadialGradient(cx, cy - 3, 1, cx, cy, T * 0.3); grd.addColorStop(0, '#fff6c2'); grd.addColorStop(0.6, '#ffd000'); grd.addColorStop(1, '#f0a800');
    starPath(T * 0.3, T * 0.13); ctx.fillStyle = grd; ctx.fill(); ink(ctx, 2); ctx.stroke();
    // carita PixelStar (dos puntos) + brillo
    ctx.fillStyle = '#5a4300'; ctx.beginPath(); ctx.arc(cx - 4, cy, 1.6, 0, 7); ctx.arc(cx + 4, cy, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = U.rgba('#ffffff', 0.5 + g * 0.4); ctx.beginPath(); ctx.ellipse(cx - 3, cy - 7, 2, 3, -0.4, 0, 7); ctx.fill();
  } });

  // Índice por mapa para el editor/paleta
  function forMap(mapId) { return list.filter((d) => d.map === mapId); }
  const byId = {}; list.forEach((d) => { byId[d.id] = d; });

  // -------- tamaños que faltaban (2x1, 3x1, 1x3) en varios mapas --------
  // valla con postes redondeados (cabeza biselada) y dos travesaños con sombra
  const fence = (ctx, px, py, W, wood, top) => {
    const w = W * T, topY = py + T * 0.28;
    for (let i = 0; i <= W * 2; i++) { const x = px + i * T * 0.5 - 2.5; rr2(ctx, x, topY, 5, T * 0.72, 2, wood); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, topY + 2, 1.5, T * 0.6); }
    [0.42, 0.72].forEach((f) => { rr2(ctx, px, py + T * f, w, 5, 2, top || wood); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py + T * f + 4, w, 1.5); });
  };
  add('gl_fence', { name: 'Valla', map: 'lake', w: 3, h: 1, draw(ctx, px, py, W) { fence(ctx, px, py, W, '#c9a26a', '#e0bc84'); } });
  add('gl_tree', { name: 'Árbol gelatina', map: 'lake', w: 1, h: 3, draw(ctx, px, py, W, H) {
    const cx = px + T * 0.5, botY = py + H * T;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(cx, botY - 1, T * 0.3, T * 0.06, 0, 0, 7); ctx.fill();
    // tronco con textura
    rr2(ctx, cx - 4, py + T * 0.95, 8, H * T - T * 0.95, 2, '#9a6440'); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(cx + 1, py + T, 2, H * T - T);
    // copa gelatinosa: masa con brillos y goteo
    const copa = (ox, oy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + ox, py + T * 0.62 + oy, r, 0, 7); ctx.fill(); };
    copa(0, 0, T * 0.5, '#ff7ac8'); copa(-T * 0.28, T * 0.12, T * 0.3, '#ff7ac8'); copa(T * 0.28, T * 0.1, T * 0.3, '#ff7ac8');
    ink(ctx, 2.5); ctx.beginPath(); ctx.arc(cx, py + T * 0.62, T * 0.5, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(cx - T * 0.18, py + T * 0.45, T * 0.12, T * 0.07, -0.5, 0, 7); ctx.fill();
    // goteo de gelatina
    ctx.fillStyle = '#ff7ac8'; ctx.beginPath(); ctx.moveTo(cx + T * 0.3, py + T * 0.95); ctx.quadraticCurveTo(cx + T * 0.34, py + T * 1.2, cx + T * 0.3, py + T * 1.25); ctx.quadraticCurveTo(cx + T * 0.26, py + T * 1.2, cx + T * 0.3, py + T * 0.95); ctx.fill();
  } });
  add('ur_bench', { name: 'Banco', map: 'city', w: 2, h: 1, draw(ctx, px, py, W) {
    const w = W * T;
    // patas de hierro
    ctx.fillStyle = '#2a2d34'; for (const u of [10, w - 14]) { rr2(ctx, px + u, py + T * 0.45, 5, T * 0.5, 2, '#2a2d34'); }
    ctx.fillStyle = '#2a2d34'; ctx.fillRect(px + 12, py + T * 0.9, w - 24, 3);
    // listones del asiento y respaldo (madera con vetas)
    const plank = (yy) => { rr2(ctx, px + 6, yy, w - 12, 6, 2, '#9a6a35'); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(px + 7, yy + 1, w - 14, 1.5); ctx.strokeStyle = U.shade('#9a6a35', -0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 10, yy + 4); ctx.lineTo(px + w - 10, yy + 4); ctx.stroke(); };
    plank(py + T * 0.46); // asiento
    plank(py + T * 0.24); // respaldo alto
    plank(py + T * 0.35); // respaldo bajo
  } });
  add('ur_hydrant', { name: 'Boca de riego', map: 'city', w: 1, h: 1, draw(ctx, px, py) {
    const cx = px + T * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.95, T * 0.26, T * 0.05, 0, 0, 7); ctx.fill();
    // cuerpo
    rr2(ctx, cx - T * 0.17, py + T * 0.34, T * 0.34, T * 0.6, 5, '#e8323f');
    ctx.fillStyle = U.shade('#e8323f', 0.2); ctx.fillRect(cx - T * 0.14, py + T * 0.36, T * 0.1, T * 0.52); // brillo
    // cúpula
    ctx.fillStyle = '#c0282f'; ctx.beginPath(); ctx.arc(cx, py + T * 0.34, T * 0.17, Math.PI, 0); ctx.fill(); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, py + T * 0.28, 3, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke(); // tapón hexagonal (oro)
    // bocas laterales
    ctx.fillStyle = '#c0282f'; for (const s of [-1, 1]) { rr2(ctx, cx + s * T * 0.22 - (s < 0 ? 5 : 0), py + T * 0.52, 7, 8, 2, '#c0282f'); }
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, py + T * 0.56, 3, 0, 7); ctx.fill(); // tuerca frontal
  } });
  add('ss_dockpost', { name: 'Noray', map: 'seaside', w: 1, h: 1, draw(ctx, px, py) {
    const cx = px + T * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.95, T * 0.24, T * 0.05, 0, 0, 7); ctx.fill();
    // bolardo metálico con forma de seta
    const g = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0); g.addColorStop(0, '#4a4f5a'); g.addColorStop(0.5, '#6a7080'); g.addColorStop(1, '#3a3f4a');
    ctx.fillStyle = g; rr2(ctx, cx - T * 0.15, py + T * 0.45, T * 0.3, T * 0.5, 4, '#3a3f4a');
    ctx.fillStyle = '#6a7080'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.42, T * 0.22, T * 0.12, 0, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke(); // cabeza
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(cx - 4, py + T * 0.4, 5, 2.5, -0.3, 0, 7); ctx.fill();
    // cabo de cuerda enrollado
    ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const yy of [0.58, 0.68]) { ctx.beginPath(); ctx.ellipse(cx, py + T * yy, T * 0.17, 4, 0, 0, 7); ctx.stroke(); }
  } });
  add('ss_net', { name: 'Red de pesca', map: 'seaside', w: 3, h: 1, draw(ctx, px, py, W) {
    const w = W * T;
    // palo de colgar
    rr2(ctx, px, py + 2, w, 5, 2, '#8a5a2b');
    // red colgando en forma de guirnalda (malla romboidal dentro de arcos)
    ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 1.3;
    const segs = W * 2; const sag = T * 0.6;
    for (let s = 0; s < segs; s++) {
      const x0 = px + (w) * s / segs, x1 = px + (w) * (s + 1) / segs, mx = (x0 + x1) / 2;
      ctx.beginPath(); ctx.moveTo(x0, py + 6); ctx.quadraticCurveTo(mx, py + 6 + sag, x1, py + 6); ctx.stroke();
    }
    // malla cruzada
    for (let i = 0; i <= segs * 2; i++) { const xx = px + w * i / (segs * 2); ctx.beginPath(); ctx.moveTo(xx, py + 6); ctx.lineTo(xx + 6, py + 6 + sag * 0.7); ctx.moveTo(xx + 6, py + 6); ctx.lineTo(xx, py + 6 + sag * 0.7); ctx.stroke(); }
    // un par de corchos/boyas
    ctx.fillStyle = '#ff5f5f'; for (const u of [0.2, 0.55, 0.85]) { ctx.beginPath(); ctx.arc(px + w * u, py + 6 + sag * 0.5, 3, 0, 7); ctx.fill(); ink(ctx, 1.2); ctx.stroke(); }
  } });
  add('ru_wall', { name: 'Muro en ruinas', map: 'ruins', w: 3, h: 1, draw(ctx, px, py, W) { for (let i = 0; i < W * 2; i++) { const h = T * (0.4 + U.hash2(i, 3) * 0.6); rr2(ctx, px + i * T * 0.5 + 1, py + T - h, T * 0.5 - 2, h, 2, '#c69257'); } } });
  add('ci_ticket', { name: 'Taquilla', map: 'circus', w: 1, h: 3, draw(ctx, px, py, W, H) { rr2(ctx, px + 3, py + T, T - 6, H * T - T, 4, '#9a4dff'); ctx.fillStyle = '#e8323f'; ctx.beginPath(); ctx.moveTo(px, py + T); ctx.lineTo(px + T / 2, py + 6); ctx.lineTo(px + T, py + T); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke(); rect(ctx, px + 8, py + T * 1.4, T - 16, 10, '#ffd000'); } });
  add('sn_fence', { name: 'Valla nevada', map: 'snow', w: 3, h: 1, draw(ctx, px, py, W) { fence(ctx, px, py, W, '#8a5a2b'); rect(ctx, px, py + T * 0.25, W * T, 5, '#ffffff'); } });
  add('vo_chain', { name: 'Cadena rota', map: 'vortex', w: 1, h: 3, draw(ctx, px, py, W, H) {
    const cx = px + T / 2, n = Math.round(H * 3) - 1;
    // eslabones entrelazados (alternando orientación) con sombra y brillo, rota al final
    for (let i = 0; i < n; i++) {
      const yy = py + 8 + i * T / 3; const horiz = i % 2 === 0;
      ctx.lineWidth = 3.5; ctx.strokeStyle = U.shade('#6a2fbf', -0.2);
      ctx.beginPath(); ctx.ellipse(cx, yy, horiz ? 7 : 4, horiz ? 4 : 7, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#a66bff';
      ctx.beginPath(); ctx.ellipse(cx - 1, yy - 1, horiz ? 7 : 4, horiz ? 4 : 7, 0, 0, 7); ctx.stroke();
    }
    // eslabón roto abierto al final
    const yy = py + 8 + n * T / 3; ctx.lineWidth = 3.5; ctx.strokeStyle = U.shade('#6a2fbf', -0.2);
    ctx.beginPath(); ctx.arc(cx, yy, 5, 0.6, Math.PI * 1.8); ctx.stroke();
  } });
  add('uw_coralfan', { name: 'Coral abanico', map: 'underwater', w: 2, h: 1, draw(ctx, px, py, W, H, t) {
    const bx = px + W * T / 2, by = py + T * 0.98;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(bx, by, T * 0.4, T * 0.05, 0, 0, 7); ctx.fill();
    // ramas gruesas en abanico que se bifurcan, ondulando suave
    const branch = (a0, len, depth) => {
      if (depth <= 0) return;
      const sway = Math.sin((t || 0) * 1.5 + a0 * 2) * 0.08;
      const ex = bx + Math.sin(a0 + sway) * len, ey = by - Math.cos(a0 + sway) * len;
      ctx.lineWidth = depth * 1.6; ctx.strokeStyle = U.shade('#ff7ab8', depth * -0.03);
      ctx.beginPath(); ctx.moveTo(bx + Math.sin(a0) * len * 0.0, by); ctx.lineTo(ex, ey); ctx.stroke();
      return [ex, ey];
    };
    // tronco + ramas (dibujo recursivo simple en 1 nivel para no pasarse)
    for (let a = -1.1; a <= 1.1; a += 0.28) {
      const sway = Math.sin((t || 0) * 1.5 + a * 2) * 3;
      const len = T * (0.95 - Math.abs(a) * 0.2);
      const ex = bx + Math.sin(a) * len + sway, ey = by - Math.cos(a) * len;
      ctx.lineWidth = 4; ctx.strokeStyle = '#e85fa0'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(a) * len * 0.5, by - len * 0.5, ex, ey); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ff9ecb';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(a) * len * 0.5, by - len * 0.5, ex, ey); ctx.stroke();
      // pólipos en las puntas
      ctx.fillStyle = '#ffd0e8'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, 7); ctx.fill();
    }
  } });
  add('ju_vine', { name: 'Liana', map: 'jungle', w: 1, h: 3, draw(ctx, px, py, W, H, t) {
    const cx = px + T / 2, h = H * T;
    // tallo grueso serpenteante
    const pts = [];
    for (let i = 0; i <= 8; i++) { const fy = py + (h) * i / 8; pts.push([cx + Math.sin(i * 0.7 + (t || 0) * 1.2) * 5, fy]); }
    ctx.lineWidth = 5; ctx.strokeStyle = '#2f8f5b'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#4fc07a'; ctx.beginPath(); ctx.moveTo(pts[0][0] - 1, pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - 1, pts[i][1]); ctx.stroke();
    // hojas a los lados
    for (let i = 1; i < pts.length; i += 2) {
      const [hx, hy] = pts[i]; const s = i % 4 < 2 ? -1 : 1;
      ctx.fillStyle = '#3fbf4f'; ctx.save(); ctx.translate(hx, hy); ctx.rotate(s * 0.8 + Math.sin((t || 0) + i) * 0.1); ctx.beginPath(); ctx.ellipse(s * 6, 0, 7, 3.5, 0, 0, 7); ctx.fill(); ink(ctx, 1.2); ctx.stroke(); ctx.restore();
    }
  } });
  add('sk_balloon', { name: 'Globo aerostático', map: 'sky', w: 1, h: 3, draw(ctx, px, py, W, H, t) { const b = Math.sin((t || 0) * 1.5) * 3; ctx.fillStyle = '#ff5f5f'; ctx.beginPath(); ctx.arc(px + T / 2, py + T * 0.8 + b, T * 0.5, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke(); rect(ctx, px + T * 0.3, py + T * 2.3 + b, T * 0.4, T * 0.4, '#9a6440'); } });
  add('vl_vent', { name: 'Fumarola', map: 'volcano', w: 2, h: 1, draw(ctx, px, py, W, H, t) { rr2(ctx, px + 4, py + T * 0.5, W * T - 8, T * 0.5, 4, '#3d2c2c'); for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4; circle(ctx, px + T + Math.sin((t || 0) * 2 + i) * 4, py + T * 0.4 - (((t || 0) * 20 + i * 10) % 24), 5 + i, '#9a9a9a'); } ctx.globalAlpha = 1; } });
  add('fa_crate', { name: 'Cajas apiladas', map: 'factory', w: 2, h: 1, draw(ctx, px, py, W) {
    const box = (bx, by, s, c) => {
      rr2(ctx, bx, by, s, s, 2, c);
      // vetas de madera + aspas metálicas
      ctx.strokeStyle = U.shade(c, -0.3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + 2, by + 2); ctx.lineTo(bx + s - 2, by + s - 2); ctx.moveTo(bx + s - 2, by + 2); ctx.lineTo(bx + 2, by + s - 2); ctx.stroke();
      ctx.strokeRect(bx + 3, by + 3, s - 6, s - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(bx + 2, by + 2, s - 4, 3); // brillo arriba
      ctx.fillStyle = '#5a5f6a'; [[bx + 4, by + 4], [bx + s - 6, by + 4], [bx + 4, by + s - 6], [bx + s - 6, by + s - 6]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(u, v, 1.3, 0, 7); ctx.fill(); }); // tornillos
    };
    box(px + 2, py + 7, T - 5, '#c99a4a');
    box(px + T + 3, py + 11, T - 8, '#b07a2a');
  } });
  add('ca_chips', { name: 'Pila de fichas', map: 'casino', w: 1, h: 1, draw(ctx, px, py) {
    const cx = px + T / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.95, 13, 3.5, 0, 0, 7); ctx.fill();
    const cols = ['#e8323f', '#2f7bff', '#2fd46a', '#ffd000', '#e8323f'];
    cols.forEach((c, i) => {
      const cy = py + T - 6 - i * 4.5, rx = 11, ry = 4.2;
      // canto de la ficha (cilindro)
      ctx.fillStyle = U.shade(c, -0.25); ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, Math.PI); ctx.rect(cx - rx, cy, rx * 2, 2); ctx.fill();
      // cara superior
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill(); ink(ctx, 1.3); ctx.stroke();
      // marcas blancas del borde
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.3; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rx * 0.72, cy + Math.sin(a) * ry * 0.72); ctx.lineTo(cx + Math.cos(a) * rx * 0.98, cy + Math.sin(a) * ry * 0.98); ctx.stroke(); }
    });
  } });
  add('tk_gears', { name: 'Engranajes', map: 'clock', w: 3, h: 1, draw(ctx, px, py, W, H, t) { [[0.6, 9, 1], [1.6, 12, -1], [2.5, 8, 1]].forEach(([u, r, s]) => { ctx.save(); ctx.translate(px + u * T, py + T * 0.55); ctx.rotate((t || 0) * s); ctx.fillStyle = '#c99a4a'; for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -r - 3, 4, 5); } ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ink(ctx, 1.5); ctx.stroke(); ctx.restore(); }); } });
  add('di_ball', { name: 'Bola de discoteca', map: 'disco', w: 1, h: 3, draw(ctx, px, py, W, H, t) { rect(ctx, px + T / 2 - 1, py, 2, T * 1.6, '#888'); circle(ctx, px + T / 2, py + T * 2.1, T * 0.4, '#c0c6d0'); ctx.fillStyle = `hsla(${((t || 0) * 120) % 360},90%,70%,0.8)`; for (let k = 0; k < 6; k++) ctx.fillRect(px + T * 0.3 + (k % 3) * 6, py + T * 1.9 + Math.floor(k / 3) * 7, 4, 4); } });
  add('hu_sign', { name: 'Cartel dimensional', map: 'hub', w: 2, h: 1, draw(ctx, px, py, W, H, t) { rr2(ctx, px + 2, py + 4, W * T - 4, T - 10, 4, '#0a3d22'); ctx.fillStyle = Math.sin((t || 0) * 4) > 0 ? '#3fffa0' : '#1f7a44'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('HUB', px + 18, py + 20); } });

  // Re-mapea las decoraciones YA COLOCADAS cuando el nivel cambia de mapa.
  // Cada deco del mapa viejo se cambia por una del mapa nuevo RESPETANDO la dimensión
  // (w x h en casillas): primero busca candidatas del nuevo mapa con el mismo tamaño;
  // si no hay exacto, usa las de dimensión más parecida. Si hay varias, se reparten de
  // forma determinista (por posición x,y) para que no "bailen" en cada cambio. Si el mapa
  // nuevo no tiene NINGUNA decoración, se quitan las colocadas.
  //   objects = array L.objects (se modifica in situ: cambia o.deco o elimina el objeto).
  //   Devuelve el nº de decoraciones re-mapeadas.
  function remap(oldTheme, newTheme, objects) {
    if (!objects || oldTheme === newTheme) return 0;
    const dest = forMap(newTheme);
    // sin decos destino: quitar las colocadas
    if (!dest.length) { for (let i = objects.length - 1; i >= 0; i--) if (objects[i].type === 'deco') objects.splice(i, 1); return 0; }
    // agrupar candidatas por dimensión "wxh"
    const byDim = {}; dest.forEach((d) => { const k = d.w + 'x' + d.h; (byDim[k] = byDim[k] || []).push(d.id); });
    const dims = dest.map((d) => ({ w: d.w, h: d.h, k: d.w + 'x' + d.h }));
    // elige la dimensión destino más cercana a (w,h) si no hay exacta
    const nearestDim = (w, h) => {
      if (byDim[w + 'x' + h]) return w + 'x' + h;
      let best = dims[0], bd = Infinity;
      for (const d of dims) { const diff = Math.abs(d.w - w) + Math.abs(d.h - h); if (diff < bd) { bd = diff; best = d; } }
      return best.k;
    };
    let n = 0;
    objects.forEach((o) => {
      if (o.type !== 'deco') return;
      const src = byId[o.deco];
      const w = src ? src.w : 1, h = src ? src.h : 1;
      const pool = byDim[nearestDim(w, h)];
      // reparto determinista por posición (no aleatorio puro, para que sea estable)
      const idx = Math.abs(U.hash2(o.x | 0, o.y | 0) * pool.length) % pool.length | 0;
      o.deco = pool[idx];
      n++;
    });
    return n;
  }

  S.View.Decorations = {
    list, forMap, remap,
    get(id) { return byId[id] || null; },
    size(id) { const d = byId[id]; return d ? { w: d.w, h: d.h } : { w: 1, h: 1 }; },
    // Dibuja una decoracion (objeto { x, y, deco }) en coordenadas de mundo. Protegido por el llamador.
    drawObject(ctx, o, t, mode) {
      const d = byId[o.deco];
      if (!d) return;
      ctx.save();
      // Aislamiento: empezar con un path LIMPIO y estado neutro. Sin esto, si un 'draw'
      // deja un sub-path abierto, el siguiente ctx.stroke() encadena una linea fantasma
      // (el "palo" que cruzaba la pantalla). save/restore no resetea el path actual.
      ctx.beginPath();
      ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.textAlign = 'left'; ctx.lineDashOffset = 0;
      try { d.draw(ctx, o.x * T, o.y * T, d.w, d.h, t || 0, mode); } catch (e) { /* adorno fallido: ignorar */ }
      ctx.beginPath(); // dejar el path limpio al salir, por si acaso
      ctx.restore();
    }
  };
})(window.SGM);
