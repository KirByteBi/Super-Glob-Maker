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
    ctx.fillStyle = '#2fb36b'; ctx.beginPath(); ctx.arc(px + T * 0.3, py + T * 0.65, T * 0.28, 0, 7); ctx.arc(px + T * 0.7, py + T * 0.65, T * 0.28, 0, 7); ctx.arc(px + T * 0.5, py + T * 0.42, T * 0.32, 0, 7); ctx.fill();
    ink(ctx, 2.5); ctx.stroke();
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(px + T * 0.42, py + T * 0.4, 3, 3); ctx.fillRect(px + T * 0.56, py + T * 0.4, 3, 3); // carita de Glob
  } });
  add('gl_sign', { name: 'Cartel roto', map: 'lake', w: 1, h: 2, draw(ctx, px, py, W, H) {
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(px + T * 0.44, py + T * 0.5, 5, H * T - T * 0.5); // poste
    ctx.fillStyle = '#c9a26a'; ctx.save(); ctx.translate(px + T * 0.5, py + T * 0.5); ctx.rotate(-0.15); ctx.fillRect(-T * 0.4, -T * 0.3, T * 0.8, T * 0.5); ink(ctx, 2.5); ctx.strokeRect(-T * 0.4, -T * 0.3, T * 0.8, T * 0.5); ctx.restore();
    ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + T * 0.3, py + T * 0.2); ctx.lineTo(px + T * 0.6, py + T * 0.35); ctx.stroke(); // grieta
  } });
  add('gl_fruit', { name: 'Frutos', map: 'lake', w: 1, h: 1, draw(ctx, px, py) {
    const cols = ['#ff4d4d', '#ffd000', '#ff7ac8'];
    [[0.32, 0.6], [0.6, 0.72], [0.5, 0.45]].forEach(([u, v], i) => { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(px + u * T, py + v * T, 5, 0, 7); ctx.fill(); ink(ctx, 2); ctx.stroke(); });
  } });
  add('gl_bush', { name: 'Arbusto', map: 'lake', w: 2, h: 1, draw(ctx, px, py, W) {
    ctx.fillStyle = '#2f8f5b'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(px + (0.25 + i * 0.5) * T, py + T * 0.6, T * 0.3, 0, 7); ctx.fill(); }
    ink(ctx, 2.5); ctx.stroke();
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
    rect(ctx, px + T * 0.4, py + T * 0.2, T * 0.2, H * T - T * 0.2, '#2f8f5b');
    rect(ctx, px + T * 0.15, py + T * 0.7, T * 0.25, 5, '#2f8f5b'); rect(ctx, px + T * 0.15, py + T * 0.5, 5, T * 0.25, '#2f8f5b');
    ink(ctx, 2); ctx.strokeRect(px + T * 0.4, py + T * 0.2, T * 0.2, H * T - T * 0.2);
  } });
  add('ru_skull', { name: 'Calavera', map: 'ruins', w: 1, h: 1, draw(ctx, px, py) {
    circle(ctx, px + T * 0.5, py + T * 0.5, T * 0.28, '#e8e0d0'); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; circle(ctx, px + T * 0.4, py + T * 0.45, 2.5, '#2a2a2a'); circle(ctx, px + T * 0.6, py + T * 0.45, 2.5, '#2a2a2a'); rect(ctx, px + T * 0.45, py + T * 0.58, T * 0.1, 4, '#2a2a2a');
  } });
  add('ru_pillar', { name: 'Columna rota', map: 'ruins', w: 1, h: 3, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.3, py + T * 0.3, T * 0.4, H * T - T * 0.3, '#c9a26a'); ink(ctx, 2.5); ctx.strokeRect(px + T * 0.3, py + T * 0.3, T * 0.4, H * T - T * 0.3);
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.5; for (const u of [0.42, 0.58]) { ctx.beginPath(); ctx.moveTo(px + u * T, py + T * 0.3); ctx.lineTo(px + u * T, py + H * T); ctx.stroke(); }
  } });

  // -------- Pumpkin Circus --------
  add('ci_balloon', { name: 'Globos', map: 'circus', w: 1, h: 2, draw(ctx, px, py) {
    const cols = ['#ff4d4d', '#ffd000', '#2f7bff'];
    cols.forEach((c, i) => { circle(ctx, px + T * (0.3 + i * 0.2), py + T * 0.3, 6, c); ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + T * (0.3 + i * 0.2), py + T * 0.3 + 6); ctx.lineTo(px + T * 0.5, py + T * 1.2); ctx.stroke(); });
  } });
  add('ci_pumpkin', { name: 'Calabaza', map: 'circus', w: 1, h: 1, draw(ctx, px, py) {
    circle(ctx, px + T * 0.5, py + T * 0.6, T * 0.3, '#ff7a00'); ink(ctx, 2); ctx.stroke();
    rect(ctx, px + T * 0.47, py + T * 0.25, 4, 6, '#2f8f3b');
  } });
  add('ci_banner', { name: 'Banderines', map: 'circus', w: 3, h: 1, draw(ctx, px, py, W) {
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(px + W * T, py + 4); ctx.stroke();
    const cols = ['#e8323f', '#ffd000', '#9a4dff', '#2fb36b'];
    for (let i = 0; i < W * 2; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(px + i * T * 0.5, py + 4); ctx.lineTo(px + i * T * 0.5 + T * 0.4, py + 4); ctx.lineTo(px + i * T * 0.5 + T * 0.2, py + 14); ctx.closePath(); ctx.fill(); }
  } });

  // -------- Frosty Christmas --------
  add('sn_tree', { name: 'Árbol nevado', map: 'snow', w: 1, h: 3, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.44, py + H * T - T * 0.4, 5, T * 0.4, '#6e4a26');
    ctx.fillStyle = '#2f8f5b'; for (let i = 0; i < 3; i++) { const yy = py + T * 0.2 + i * T * 0.7; ctx.beginPath(); ctx.moveTo(px + T * 0.15, yy + T * 0.7); ctx.lineTo(px + T * 0.5, yy); ctx.lineTo(px + T * 0.85, yy + T * 0.7); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) circle(ctx, px + T * (0.2 + (i % 3) * 0.3), py + T * (0.5 + i * 0.4), 2, '#fff');
    ink(ctx, 2); ctx.stroke();
  } });
  add('sn_snowman', { name: 'Muñeco de nieve', map: 'snow', w: 1, h: 2, draw(ctx, px, py) {
    circle(ctx, px + T * 0.5, py + T * 1.3, T * 0.3, '#fff'); circle(ctx, px + T * 0.5, py + T * 0.75, T * 0.22, '#fff'); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; circle(ctx, px + T * 0.44, py + T * 0.72, 1.5, '#2a2a2a'); circle(ctx, px + T * 0.56, py + T * 0.72, 1.5, '#2a2a2a');
    ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.78); ctx.lineTo(px + T * 0.66, py + T * 0.8); ctx.lineTo(px + T * 0.5, py + T * 0.82); ctx.fill();
  } });
  add('sn_gift', { name: 'Regalo', map: 'snow', w: 1, h: 1, draw(ctx, px, py) {
    rect(ctx, px + T * 0.25, py + T * 0.4, T * 0.5, T * 0.5, '#e8434f'); ink(ctx, 2); ctx.strokeRect(px + T * 0.25, py + T * 0.4, T * 0.5, T * 0.5);
    rect(ctx, px + T * 0.46, py + T * 0.4, 4, T * 0.5, '#ffd000'); rect(ctx, px + T * 0.25, py + T * 0.6, T * 0.5, 4, '#ffd000');
  } });

  // -------- Vórtice Oscuro --------
  add('vo_crystal', { name: 'Cristal del vacío', map: 'vortex', w: 1, h: 2, draw(ctx, px, py) {
    ctx.fillStyle = '#8a3fd1'; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.1); ctx.lineTo(px + T * 0.72, py + T * 1.2); ctx.lineTo(px + T * 0.5, py + T * 1.5); ctx.lineTo(px + T * 0.28, py + T * 1.2); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.1); ctx.lineTo(px + T * 0.5, py + T * 1.5); ctx.lineTo(px + T * 0.4, py + T * 1.1); ctx.closePath(); ctx.fill();
  } });
  add('vo_rune', { name: 'Runa flotante', map: 'vortex', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 2); ctx.strokeStyle = U.mix('#1a6a5a', '#2fe0c0', g); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.5, T * 0.25, 0, 7); ctx.moveTo(px + T * 0.5, py + T * 0.25); ctx.lineTo(px + T * 0.5, py + T * 0.75); ctx.moveTo(px + T * 0.3, py + T * 0.5); ctx.lineTo(px + T * 0.7, py + T * 0.5); ctx.stroke();
  } });

  // -------- Abismo Gelatinoso --------
  add('uw_seaweed', { name: 'Alga', map: 'underwater', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    ctx.strokeStyle = '#2f8f5b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const off of [-4, 4]) { ctx.beginPath(); ctx.moveTo(px + T * 0.5 + off, py + H * T); for (let i = 0; i <= 4; i++) ctx.lineTo(px + T * 0.5 + off + Math.sin(i + (t || 0) * 2) * 5, py + H * T - i * T * 0.5); ctx.stroke(); }
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
    ctx.fillStyle = '#3a2420'; ctx.beginPath(); ctx.moveTo(px + T * 0.2, py + T * 0.9); ctx.lineTo(px + T * 0.3, py + T * 0.4); ctx.lineTo(px + T * 0.6, py + T * 0.3); ctx.lineTo(px + T * 0.85, py + T * 0.6); ctx.lineTo(px + T * 0.8, py + T * 0.9); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
  } });
  add('vl_crystal', { name: 'Cristal ígneo', map: 'volcano', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 2); ctx.fillStyle = U.mix('#7a3a2a', '#ff6a1f', g);
    ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.2); ctx.lineTo(px + T * 0.7, py + H * T); ctx.lineTo(px + T * 0.3, py + H * T); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
  } });

  // -------- Gambling Gaming --------
  add('ca_slot', { name: 'Tragaperras', map: 'casino', w: 1, h: 2, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.2, py + T * 0.2, T * 0.6, H * T - T * 0.3, '#c0282f'); ink(ctx, 2); ctx.strokeRect(px + T * 0.2, py + T * 0.2, T * 0.6, H * T - T * 0.3);
    rect(ctx, px + T * 0.3, py + T * 0.4, T * 0.4, T * 0.3, '#fff'); ctx.fillStyle = '#ffd000'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7', px + T * 0.5, py + T * 0.63); ctx.textAlign = 'left';
  } });
  add('ca_dice', { name: 'Dados', map: 'casino', w: 1, h: 1, draw(ctx, px, py) {
    rect(ctx, px + T * 0.25, py + T * 0.35, T * 0.4, T * 0.4, '#fff'); ink(ctx, 2); ctx.strokeRect(px + T * 0.25, py + T * 0.35, T * 0.4, T * 0.4);
    ctx.fillStyle = '#2a2a2a'; [[0.33, 0.45], [0.57, 0.45], [0.45, 0.65]].forEach(([u, v]) => circle(ctx, px + u * T, py + v * T, 1.5, '#2a2a2a'));
  } });
  add('ca_neon', { name: 'Neón', map: 'casino', w: 3, h: 1, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 4); ctx.strokeStyle = U.mix('#7a1515', '#ff4d4d', g); ctx.lineWidth = 3;
    ctx.strokeRect(px + 3, py + 3, W * T - 6, T - 6); ctx.fillStyle = '#ffd000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.6 + g * 0.4; ctx.fillText('★ CASINO ★', px + W * T / 2, py + T * 0.62); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  } });

  // -------- Time Attack --------
  add('tk_clock', { name: 'Reloj', map: 'clock', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    circle(ctx, px + T * 0.5, py + T * 0.5, T * 0.3, '#eee'); ink(ctx, 2); ctx.stroke();
    const a = (t || 0) * 1.5; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.5); ctx.lineTo(px + T * 0.5 + Math.cos(a) * 6, py + T * 0.5 + Math.sin(a) * 6); ctx.stroke();
  } });
  add('tk_hourglass', { name: 'Reloj de arena', map: 'clock', w: 1, h: 2, draw(ctx, px, py, W, H) {
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px + T * 0.3, py + T * 0.3); ctx.lineTo(px + T * 0.7, py + T * 0.3); ctx.lineTo(px + T * 0.42, py + T); ctx.lineTo(px + T * 0.7, py + T * 1.7); ctx.lineTo(px + T * 0.3, py + T * 1.7); ctx.lineTo(px + T * 0.58, py + T); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(px + T * 0.33, py + T * 0.35); ctx.lineTo(px + T * 0.67, py + T * 0.35); ctx.lineTo(px + T * 0.5, py + T * 0.9); ctx.closePath(); ctx.fill();
  } });

  // -------- Sound Discotech --------
  add('di_speaker', { name: 'Altavoz', map: 'disco', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    rect(ctx, px + T * 0.2, py + T * 0.1, T * 0.6, H * T - T * 0.2, '#1a1030'); ink(ctx, 2); ctx.strokeRect(px + T * 0.2, py + T * 0.1, T * 0.6, H * T - T * 0.2);
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 6); circle(ctx, px + T * 0.5, py + T * 0.55, T * 0.18 + g * 2, '#ff2fd6'); circle(ctx, px + T * 0.5, py + T * 1.4, T * 0.12 + g * 2, '#00e5ff');
  } });
  add('di_note', { name: 'Nota musical', map: 'disco', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = '#ffe600'; circle(ctx, px + T * 0.4, py + T * 0.7, 5, '#ffe600'); rect(ctx, px + T * 0.52, py + T * 0.25, 3, T * 0.45, '#ffe600'); rect(ctx, px + T * 0.52, py + T * 0.25, T * 0.2, 4, '#ffe600'); ink(ctx, 1.5); ctx.stroke();
  } });

  // -------- Event Hub --------
  add('hu_portal', { name: 'Portal', map: 'hub', w: 1, h: 2, draw(ctx, px, py, W, H, t) {
    const g = 0.5 + 0.5 * Math.sin((t || 0) * 3); ctx.strokeStyle = U.mix('#1a8a55', '#3fffa0', g); ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px + T * 0.5, py + T, T * (0.22 - i * 0.05), T * (0.8 - i * 0.2), 0, 0, 7); ctx.stroke(); }
  } });
  add('hu_crystal', { name: 'Cristal verde', map: 'hub', w: 1, h: 1, draw(ctx, px, py) {
    ctx.fillStyle = '#2fc47a'; ctx.beginPath(); ctx.moveTo(px + T * 0.5, py + T * 0.2); ctx.lineTo(px + T * 0.7, py + T * 0.55); ctx.lineTo(px + T * 0.5, py + T * 0.85); ctx.lineTo(px + T * 0.3, py + T * 0.55); ctx.closePath(); ctx.fill(); ink(ctx, 2); ctx.stroke();
  } });

  // -------- Fábrica PixelStar --------
  add('fa_pipe', { name: 'Tubería industrial', map: 'factory', w: 1, h: 2, draw(ctx, px, py, W, H) {
    rect(ctx, px + T * 0.3, py, T * 0.4, H * T, '#565f6e'); ink(ctx, 2); ctx.strokeRect(px + T * 0.3, py, T * 0.4, H * T);
    ctx.fillStyle = '#384357'; rect(ctx, px + T * 0.25, py + T * 0.9, T * 0.5, 6, '#384357');
  } });
  add('fa_star', { name: 'Estrella PixelStar', map: 'factory', w: 1, h: 1, draw(ctx, px, py, W, H, t) {
    const g = 0.6 + 0.4 * Math.sin((t || 0) * 3); ctx.fillStyle = '#ffd000'; ctx.globalAlpha = g; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? T * 0.12 : T * 0.3, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(px + T * 0.5 + Math.cos(a) * r, py + T * 0.5 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ink(ctx, 1.5); ctx.stroke();
  } });

  // Índice por mapa para el editor/paleta
  function forMap(mapId) { return list.filter((d) => d.map === mapId); }
  const byId = {}; list.forEach((d) => { byId[d.id] = d; });

  S.View.Decorations = {
    list, forMap,
    get(id) { return byId[id] || null; },
    size(id) { const d = byId[id]; return d ? { w: d.w, h: d.h } : { w: 1, h: 1 }; },
    // Dibuja una decoracion (objeto { x, y, deco }) en coordenadas de mundo. Protegido por el llamador.
    drawObject(ctx, o, t, mode) {
      const d = byId[o.deco];
      if (!d) return;
      ctx.save();
      try { d.draw(ctx, o.x * T, o.y * T, d.w, d.h, t || 0, mode); } catch (e) { /* adorno fallido: ignorar */ }
      ctx.restore();
    }
  };
})(window.SGM);
