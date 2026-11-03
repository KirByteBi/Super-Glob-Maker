/* Vista: dibujo procedural al estilo Glob (contorno negro grueso, colores planos, ojos cuadrados) */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const TT = S.Model.Catalog.T;
  const INK = '#0a0a0a';
  // Color de la superficie de cada semisólido temático (si falta, usa pal.top)
  const SEMI_COLOR = {
    grass: '#3fbf4f', logs: '#9a6a3a', building: '#b0b4bc', girder: '#d98a2a', dock: '#a9763f', awning: '#ff6f6f',
    column: '#d8c49a', tomb: '#8a8f9a', drum: '#e8434f', pumpkins: '#ff8a00', house: '#e8e8f0', gifts: '#ff5fa8',
    voidrock: '#6a2fbf', deck: '#8a6a4a', coral: '#ff7ab8', wreck: '#7a6a55', stump: '#8a5a2b', branch: '#3fbf4f',
    cotton: '#ffffff', rainbow: '#9a4dff', basalt: '#5a4343', grate: '#8a8f9a', scaffold: '#d98a2a',
    pokertable: '#1f7a3a', chips: '#ffd000', hourglass: '#e8d08a', cog: '#8a94a8', speaker: '#2b2440', piano: '#f0f0f0',
    portalpad: '#3fffa0', crystalpad: '#2fd46a'
  };

  // ---------- utilidades de trazo ----------
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function fillStroke(ctx, fill, w) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } ink(ctx, w); ctx.stroke(); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // Silueta de Glob: cúpula central con dos "bultos" laterales (como los dibujos originales)
  function globPath(ctx, x, y, w, h, wob) {
    wob = wob || 0;
    const P = (u, v) => [x + u * w, y + v * h];
    ctx.beginPath();
    ctx.moveTo(...P(0.16, 0.55));
    ctx.bezierCurveTo(...P(0.17 - wob, 0.12), ...P(0.24, -0.01 + wob), ...P(0.5, -0.01 + wob));
    ctx.bezierCurveTo(...P(0.76, -0.01 + wob), ...P(0.83 + wob, 0.12), ...P(0.84, 0.55));
    ctx.bezierCurveTo(...P(0.87, 0.63), ...P(0.91, 0.55), ...P(0.96, 0.62));
    ctx.bezierCurveTo(...P(1.03, 0.76), ...P(1.0, 0.92), ...P(0.88, 0.98));
    ctx.bezierCurveTo(...P(0.62, 1.03), ...P(0.38, 1.03), ...P(0.12, 0.98));
    ctx.bezierCurveTo(...P(0.0, 0.92), ...P(-0.03, 0.76), ...P(0.04, 0.62));
    ctx.bezierCurveTo(...P(0.09, 0.55), ...P(0.13, 0.63), ...P(0.16, 0.55));
    ctx.closePath();
  }
  // Ojos cuadrados en diagonal + boca de línea, igual que los Globs
  function globFace(ctx, x, y, w, h, opt) {
    opt = opt || {};
    const s = Math.max(3, w * 0.13);
    ctx.fillStyle = opt.eye || INK;
    const blink = opt.blink ? 0.25 : 1;
    rr(ctx, x + w * 0.28, y + h * 0.28, s, s * blink, s * 0.25); ctx.fill();
    rr(ctx, x + w * 0.42, y + h * 0.42, s * 1.12, s * 1.12 * blink, s * 0.25); ctx.fill();
    if (opt.angry) {
      ink(ctx, Math.max(2, w * 0.06)); ctx.strokeStyle = opt.eye || INK;
      ctx.beginPath(); ctx.moveTo(x + w * 0.24, y + h * 0.2); ctx.lineTo(x + w * 0.4, y + h * 0.27); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.62, y + h * 0.33); ctx.lineTo(x + w * 0.46, y + h * 0.37); ctx.stroke();
    }
    ink(ctx, Math.max(2, w * 0.07)); ctx.strokeStyle = opt.eye || INK;
    ctx.beginPath();
    if (opt.mouth === 'o') { ctx.arc(x + w * 0.3, y + h * 0.78, w * 0.06, 0, Math.PI * 2); ctx.stroke(); }
    else if (opt.mouth === 'zig') { ctx.moveTo(x + w * 0.16, y + h * 0.78); for (let i = 1; i <= 4; i++) ctx.lineTo(x + w * (0.16 + i * 0.07), y + h * (i % 2 ? 0.72 : 0.8)); ctx.stroke(); }
    else { ctx.moveTo(x + w * 0.18, y + h * 0.75); ctx.lineTo(x + w * 0.43, y + h * 0.77); ctx.stroke(); }
  }
  function star(ctx, cx, cy, r1, r2, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath();
  }
  function shine(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, x, y, w, h, Math.min(w, h) / 2); ctx.fill(); }

  // ---------- enemigos y objetos ----------
  const D = {};
  D.gloopy = (ctx, e, t) => {
    const sq = e.squashed ? 0.35 : 1 + Math.sin(t * 8) * 0.06;
    const h = e.h * sq, y = e.y + e.h - h;
    globPath(ctx, e.x - 2, y, e.w + 4, h, Math.sin(t * 6) * 0.03); fillStroke(ctx, '#8e5bd6', 3.5);
    ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.ellipse(e.x + e.w * 0.62, y + h * 0.3, 3, 2, 0, 0, 7); ctx.fill();
    if (!e.squashed) globFace(ctx, e.x, y, e.w, h, { angry: true, mouth: 'zig' });
  };
  D.pinchoglob = (ctx, e, t) => {
    const by = e.y + 6;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const px = e.x + 4 + i * (e.w - 8) / 3;
      ctx.beginPath(); ctx.moveTo(px - 5, by + 6); ctx.lineTo(px + Math.sin(t * 4 + i) * 1.5, by - 10); ctx.lineTo(px + 5, by + 6); ctx.closePath(); fillStroke(ctx, '#ffffff', 3);
    }
    globPath(ctx, e.x - 2, by, e.w + 4, e.h - 6); fillStroke(ctx, '#ff7a00', 3.5);
    globFace(ctx, e.x, by, e.w, e.h - 6, { angry: true });
  };
  D.saltagel = (ctx, e, t) => {
    const s = e.squash || 0;
    const air = !e.onGround ? -0.12 : 0;
    const w = e.w * (1 + s * 0.25 + air * -0.6), h = e.h * (1 - s * 0.3 - air);
    const x = e.x + (e.w - w) / 2, y = e.y + e.h - h;
    rr(ctx, x, y, w, h, 7); fillStroke(ctx, 'rgba(255,90,170,0.92)', 3.5);
    shine(ctx, x + 4, y + 4, w * 0.35, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, x + w * 0.65, y + h * 0.55, 4, 4, 2); ctx.fill();
    globFace(ctx, x, y, w, h, { mouth: 'o' });
  };
  D.burbujo = (ctx, e, t) => {
    const r = e.w / 2 * (e.squashed ? 1.3 : 1 + Math.sin(t * 5) * 0.04);
    ctx.globalAlpha = e.squashed ? 0.4 : 1;
    ctx.beginPath(); ctx.arc(e.cx(), e.cy(), r, 0, Math.PI * 2); fillStroke(ctx, 'rgba(140,220,255,0.55)', 3);
    ctx.strokeStyle = 'rgba(255,120,240,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.cx(), e.cy(), r - 4, 3.6, 4.6); ctx.stroke();
    shine(ctx, e.cx() - r * 0.55, e.cy() - r * 0.6, r * 0.5, r * 0.3);
    globPath(ctx, e.cx() - 8, e.cy() - 4, 16, 11); fillStroke(ctx, '#7fd6ff', 2.2);
    globFace(ctx, e.cx() - 8, e.cy() - 4, 16, 11, { angry: true });
    ctx.globalAlpha = 1;
  };
  D.tornibot = (ctx, e, t) => {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    ink(ctx, 3); ctx.beginPath(); ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2, y, 3, 0, 7); fillStroke(ctx, e.aim ? '#ff2f2f' : '#ffd000', 2);
    globPath(ctx, x - 2, y + 7, w + 4, h - 7); fillStroke(ctx, '#5a5f6b', 3.5);
    ctx.fillStyle = '#4a0d0d';
    [[0.2, 0.55], [0.8, 0.6], [0.15, 0.85], [0.85, 0.85], [0.5, 0.92]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(x + u * w, y + 7 + v * (h - 7), 1.6, 0, 7); ctx.fill(); });
    rr(ctx, x + w * 0.2, y + 13, w * 0.6, 7, 3); fillStroke(ctx, e.aim ? '#ff2f2f' : '#ff4040', 2.5);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.24 + ((t * 30) % (w * 0.45)), y + 15, 3, 3);
    ink(ctx, 2.5); ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h - 6); ctx.lineTo(x + w * 0.55, y + h - 6); ctx.stroke();
  };
  D.glitchy = (ctx, e, t) => {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    const j = e.flicker ? U.rand(-3, 3) : Math.sin(t * 20) * 0.6;
    ctx.globalAlpha = 0.7;
    rr(ctx, x - 3 + j, y, w, h, 3); ctx.fillStyle = '#00e5ff'; ctx.fill();
    rr(ctx, x + 3 - j, y, w, h, 3); ctx.fillStyle = '#ff2fd6'; ctx.fill();
    ctx.globalAlpha = 1;
    rr(ctx, x, y, w, h, 3); fillStroke(ctx, '#1a0a2a', 3);
    for (let i = 0; i < 4; i++) { const hx = U.hash2(i, Math.floor(t * 8)); ctx.fillStyle = hx > 0.5 ? '#00e5ff' : '#ff2fd6'; ctx.fillRect(x + 3 + hx * (w - 9), y + 3 + U.hash(i + Math.floor(t * 8)) * (h - 9), 5, 3); }
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.25, y + h * 0.3, 5, 5); ctx.fillRect(x + w * 0.55, y + h * 0.42, 6, 6);
  };
  D.gotero = (ctx, e, t) => {
    if (e.state === 'walk') {
      ctx.beginPath(); ctx.ellipse(e.cx(), e.y + e.h - 6, e.w / 2 + Math.sin(t * 9) * 2, 8, 0, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#1a1033', 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(e.cx() - 6, e.y + 2, 4, 4); ctx.fillRect(e.cx() + 1, e.y + 4, 4, 4);
      return;
    }
    const x = e.cx(), y = e.y, h = e.h, wob = e.state === 'hang' ? Math.sin(t * 3) * 1.5 : 0;
    ctx.beginPath(); ctx.moveTo(x, y - 2);
    ctx.bezierCurveTo(x + 4, y + h * 0.3, x + 11 + wob, y + h * 0.55, x + 10, y + h * 0.78);
    ctx.bezierCurveTo(x + 8, y + h + 2, x - 8, y + h + 2, x - 10, y + h * 0.78);
    ctx.bezierCurveTo(x - 11 - wob, y + h * 0.55, x - 4, y + h * 0.3, x, y - 2);
    fillStroke(ctx, '#1a1033', 3);
    ctx.fillStyle = '#fff'; rr(ctx, x - 6, y + h * 0.55, 4, 4, 1); ctx.fill(); rr(ctx, x + 1, y + h * 0.62, 5, 5, 1); ctx.fill();
    shine(ctx, x - 6, y + h * 0.35, 3, 6);
  };
  D.canon = (ctx, e, t) => {
    const x = e.x, y = e.y, w = e.w, h = e.h, rec = (e.recoil || 0) * 3 * -(e.dir || 1);
    rr(ctx, x + 2, y + 4, w - 4, h - 4, 6); fillStroke(ctx, '#2b2440', 3.5);
    rr(ctx, x + w / 2 - 12 + rec + (e.dir || -1) * 6, y + 7, 24, 14, 5); fillStroke(ctx, '#3d3557', 3);
    star(ctx, x + w / 2, y + h * 0.62, 7, 3.2, 5, -Math.PI / 2 + t); fillStroke(ctx, '#ffe600', 2);
  };
  D.starbullet = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy(), d = e.dir || Math.sign(e.vx) || 1;
    ctx.fillStyle = 'rgba(255,230,0,0.35)';
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx - d * i * 8, cy + Math.sin(t * 20 + i) * 2, 6 - i, 0, 7); ctx.fill(); }
    star(ctx, cx, cy, 13, 6, 5, t * 6 * d); fillStroke(ctx, '#ffe600', 3);
    ctx.fillStyle = INK; ctx.fillRect(cx + d * 1 - 2, cy - 4, 3, 4); ctx.fillRect(cx + d * 5 - 2, cy - 3, 3, 4);
  };
  D.bolt = (ctx, e) => { rr(ctx, e.x, e.y, e.w, e.h, 3); fillStroke(ctx, '#c0c6d0', 2.5); ink(ctx, 1.5); ctx.beginPath(); ctx.moveTo(e.x + 4, e.y + 2); ctx.lineTo(e.x + 6, e.y + e.h - 2); ctx.moveTo(e.x + 8, e.y + 2); ctx.lineTo(e.x + 10, e.y + e.h - 2); ctx.stroke(); };
  D.medusa = (ctx, e, t) => {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    ink(ctx, 3);
    for (let i = 0; i < 4; i++) {
      const tx = x + 5 + i * (w - 10) / 3;
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tx, y + h * 0.5);
      ctx.quadraticCurveTo(tx + Math.sin(t * 5 + i) * 5, y + h * 0.8, tx + Math.sin(t * 5 + i + 1) * 4, y + h + 4); ctx.stroke();
      ctx.strokeStyle = '#d199ff'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.55); ctx.bezierCurveTo(x - 1, y - 2, x + w + 1, y - 2, x + w, y + h * 0.55);
    ctx.quadraticCurveTo(x + w * 0.75, y + h * 0.48, x + w / 2, y + h * 0.58); ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.48, x, y + h * 0.55);
    fillStroke(ctx, 'rgba(180,110,255,0.9)', 3.5);
    shine(ctx, x + 6, y + 5, 7, 4);
    ctx.fillStyle = INK; rr(ctx, x + w * 0.35, y + h * 0.22, 4, 4, 1); ctx.fill(); rr(ctx, x + w * 0.52, y + h * 0.3, 5, 5, 1); ctx.fill();
  };
  D.madstar = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy() + 4;
    if (e.inv > 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255,47,214,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, 40 + Math.sin(t * 6) * 3, 0, 7); ctx.fill();
    star(ctx, cx, cy, 34, 16, 5, -Math.PI / 2 + Math.sin(t * 3) * 0.1); fillStroke(ctx, e.hp <= 1 ? '#ff5a2f' : '#ffd000', 5);
    // visor robótico de MadStars
    rr(ctx, cx - 18, cy - 9, 36, 12, 4); fillStroke(ctx, '#2b2440', 3);
    ctx.fillStyle = '#ff2fd6'; ctx.fillRect(cx - 14 + (e.dir > 0 ? 14 : 0), cy - 6, 12, 6);
    ink(ctx, 3); ctx.beginPath(); ctx.moveTo(cx - 10, cy + 10); for (let i = 1; i <= 5; i++) ctx.lineTo(cx - 10 + i * 4, cy + (i % 2 ? 6 : 10)); ctx.stroke();
    // corona de antenas
    ink(ctx, 3); ctx.beginPath(); ctx.moveTo(cx - 6, cy - 30); ctx.lineTo(cx - 10, cy - 42); ctx.moveTo(cx + 6, cy - 30); ctx.lineTo(cx + 10, cy - 42); ctx.stroke();
    ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(cx - 10, cy - 43, 3.5, 0, 7); ctx.arc(cx + 10, cy - 43, 3.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  };
  // Objetos
  function drop(ctx, cx, cy, s, fill) {
    ctx.beginPath(); ctx.moveTo(cx, cy - s);
    ctx.bezierCurveTo(cx + s * 0.4, cy - s * 0.4, cx + s * 0.8, cy, cx + s * 0.75, cy + s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.65, cy + s * 0.95, cx - s * 0.65, cy + s * 0.95, cx - s * 0.75, cy + s * 0.35);
    ctx.bezierCurveTo(cx - s * 0.8, cy, cx - s * 0.4, cy - s * 0.4, cx, cy - s);
    fillStroke(ctx, fill, 3);
  }
  D.evo = (ctx, e, t, o) => {
    const c = (o && o.color) || '#00ff66';
    drop(ctx, e.cx(), e.cy() + 1, 13, c);
    shine(ctx, e.cx() - 6, e.cy() - 2, 4, 7);
    ink(ctx, 3); ctx.beginPath(); ctx.moveTo(e.cx() + 1, e.cy() + 1); ctx.lineTo(e.cx() + 1, e.cy() + 9); ctx.moveTo(e.cx() - 3, e.cy() + 5); ctx.lineTo(e.cx() + 5, e.cy() + 5); ctx.stroke();
    star(ctx, e.cx() + 9, e.y + 2, 4, 1.6, 4, t * 3); ctx.fillStyle = '#fff'; ctx.fill();
  };
  // Flor Estelar (power-up EVO3)
  D.flor = (ctx, e, t, o) => {
    const cx = e.cx(), cy = e.cy() + 2;
    ink(ctx, 3); ctx.strokeStyle = '#2f8f4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, e.y + e.h); ctx.stroke();
    // pétalos
    const pet = (o && o.color) || '#ff5fa8';
    for (let k = 0; k < 6; k++) { const a = t * 1.5 + k * Math.PI / 3; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 6, 4, a, 0, 7); fillStroke(ctx, pet, 2.5); }
    // centro con estrella
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); fillStroke(ctx, '#ffd000', 2.5);
    star(ctx, cx, cy, 4, 1.8, 5, -Math.PI / 2 + t * 2); ctx.fillStyle = '#fff'; ctx.fill();
  };
  D.caca = (ctx, e, t) => {
    const cx = e.cx(), b = e.y + e.h;
    [[0, 9, 13], [0, 17, 10], [1, 23, 6]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(cx + dx, b - dy, r, r * 0.6, 0, 0, 7); fillStroke(ctx, '#8a5a2b', 3); });
    ctx.fillStyle = INK; ctx.fillRect(cx - 6, b - 13, 3, 3); ctx.fillRect(cx + 1, b - 11, 3, 3);
    star(ctx, cx + 11, e.y + 2, 4, 1.6, 4, t * 3); ctx.fillStyle = '#ffe600'; ctx.fill();
  };
  D.vacio = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy() + Math.sin(t * 3) * 2;
    ctx.fillStyle = 'rgba(180,77,255,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 10, cy - 2); ctx.lineTo(cx + 4, cy + 13); ctx.lineTo(cx - 9, cy + 7); ctx.lineTo(cx - 8, cy - 6); ctx.closePath(); fillStroke(ctx, '#0a0010', 3);
    ink(ctx, 1.2); ctx.strokeStyle = '#fff'; star(ctx, cx - 1, cy, 4, 1.7, 5, t); ctx.stroke();
    star(ctx, cx + 5, cy - 16, 4, 1.8, 4, t * 2); ctx.fillStyle = '#ffe600'; ctx.fill();
  };
  D.brillo = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy();
    ctx.fillStyle = U.rgba('#ffe600', 0.3); ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
    star(ctx, cx, cy, 14, 6.5, 4, t * 2); fillStroke(ctx, `hsl(${(t * 300) % 360},100%,65%)`, 3);
    ctx.fillStyle = INK; ctx.fillRect(cx - 4, cy - 3, 3, 3); ctx.fillRect(cx + 1, cy - 1, 3, 3);
  };
  D.miniglob = (ctx, e, t, o) => {
    globPath(ctx, e.x - 1, e.y + 2, e.w + 2, e.h - 2, Math.sin(t * 8) * 0.03); fillStroke(ctx, (o && o.color) || '#00ff66', 3);
    globFace(ctx, e.x, e.y + 2, e.w, e.h - 2);
    ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.textAlign = 'center';
    ctx.strokeText('1UP', e.cx(), e.y - 2); ctx.fillText('1UP', e.cx(), e.y - 2);
  };
  D.coinpop = (ctx, e, t) => coin(ctx, e.cx(), e.cy(), 10, t * 4);
  D.spring = (ctx, e) => {
    const s = e.squash || 0, h = e.h * (1 - s * 0.45), y = e.y + e.h - h;
    rr(ctx, e.x, e.y + e.h - 7, e.w, 7, 3); fillStroke(ctx, '#3d3557', 3);
    ink(ctx, 3); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(e.cx() + (i % 2 ? 8 : -8), y + 6 + (h - 13) * (i / 4));
    ctx.stroke(); ctx.strokeStyle = '#ff5fa8'; ctx.lineWidth = 3; ctx.stroke();
    rr(ctx, e.x - 1, y, e.w + 2, 7, 3); fillStroke(ctx, '#ff5fa8', 3);
  };
  D.platform = D.platformV = D.platformD1 = D.platformD2 = (ctx, e, t, o) => {
    const p = (o && o.pal) || {};
    rr(ctx, e.x, e.y, e.w, e.h, 7); fillStroke(ctx, p.top || '#ffd000', 3.5);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; rr(ctx, e.x + 4, e.y + e.h - 6, e.w - 8, 3, 2); ctx.fill();
    ctx.fillStyle = INK;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(e.x + e.w * (0.25 + i * 0.25), e.y + e.h / 2 - 1, 2, 0, 7); ctx.fill(); }
    ink(ctx, 2.5); ctx.beginPath();
    const cx = e.cx(), cy = e.y + e.h / 2;
    if (e.type === 'platformV') { ctx.moveTo(e.x + 8, e.y + 4); ctx.lineTo(e.x + 8, e.y + e.h - 4); }
    else if (e.type === 'platformD1') { ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx + 6, cy - 4); }
    else if (e.type === 'platformD2') { ctx.moveTo(cx - 6, cy - 4); ctx.lineTo(cx + 6, cy + 4); }
    else { ctx.moveTo(e.x + 4, cy); ctx.lineTo(e.x + 12, cy); }
    ctx.stroke();
  };
  D.checkpoint = (ctx, e, t, o) => {
    const px = e.cx();
    rr(ctx, px - 3, e.y, 6, e.h, 3); fillStroke(ctx, '#e8e8e8', 3);
    const col = e.taken ? ((o && o.color) || '#00ff66') : '#888';
    const wv = Math.sin((e.wave || t) * 4) * 3;
    ctx.beginPath(); ctx.moveTo(px + 3, e.y + 4); ctx.quadraticCurveTo(px + 18, e.y + 4 + wv, px + 30, e.y + 10 + wv); ctx.lineTo(px + 3, e.y + 24); ctx.closePath(); fillStroke(ctx, col, 3);
    ctx.fillStyle = INK; ctx.fillRect(px + 10, e.y + 9, 3, 3); ctx.fillRect(px + 15, e.y + 12, 3, 3);
  };
  D.shot = (ctx, e, t) => { drop(ctx, e.cx(), e.cy(), 7, e.color || '#00ff66'); };
  D.poop = (ctx, e, t) => { ctx.beginPath(); ctx.arc(e.cx(), e.cy(), 7, 0, 7); fillStroke(ctx, '#8a5a2b', 3); ctx.fillStyle = '#5c3a18'; ctx.beginPath(); ctx.arc(e.cx() + Math.cos(t * 12) * 2, e.cy() - 2, 2, 0, 7); ctx.fill(); };
  D.goo = (ctx, e) => { ctx.globalAlpha = Math.min(1, e.life); ctx.beginPath(); ctx.ellipse(e.cx(), e.y + e.h - 2, e.w / 2 + 4, 5, 0, 0, 7); fillStroke(ctx, '#8a5a2b', 2.5); ctx.globalAlpha = 1; };
  D.starwave = (ctx, e, t) => {
    ctx.globalAlpha = Math.max(0, 1 - e.t / 0.6);
    star(ctx, e.cx(), e.cy(), 11, 5, 5, t * 10); fillStroke(ctx, '#ffe600', 2.5);
    ctx.globalAlpha = 1;
  };
  // Proyectiles enemigos (eshot), según su 'kind'
  D.eshot = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy(), k = e.kind;
    switch (k) {
      case 'bullet': ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); fillStroke(ctx, '#3a3f4a', 2.5); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill(); break;
      case 'bone': ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 8); ctx.fillStyle = '#f0ece0'; ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(ctx, -2, -7, 4, 14, 2); ctx.fill(); ctx.stroke(); [[-7, 0], [7, 0]].forEach(([u]) => { ctx.beginPath(); ctx.arc(u * 0 + (u < 0 ? -1 : 1) * 0, -7, 3, 0, 7); ctx.fill(); }); ctx.restore(); break;
      case 'gift': rr(ctx, cx - 7, cy - 7, 14, 14, 2); fillStroke(ctx, '#e8323f', 2.5); ctx.fillStyle = '#ffd000'; ctx.fillRect(cx - 7, cy - 1.5, 14, 3); ctx.fillRect(cx - 1.5, cy - 7, 3, 14); break;
      case 'petal': drop(ctx, cx, cy, 6, '#ff9de0'); break;
      case 'bubble': ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); fillStroke(ctx, 'rgba(140,220,255,0.6)', 2.5); shine(ctx, cx - 3, cy - 3, 3, 2); break;
      case 'eye': ctx.beginPath(); ctx.ellipse(cx, cy, 8, 6, 0, 0, 7); fillStroke(ctx, '#fff', 2.5); ctx.beginPath(); ctx.arc(cx + Math.sign(e.vx) * 2, cy, 3, 0, 7); ctx.fillStyle = '#ff3b3b'; ctx.fill(); ctx.beginPath(); ctx.arc(cx + Math.sign(e.vx) * 2, cy, 1.4, 0, 7); ctx.fillStyle = INK; ctx.fill(); break;
      case 'tear': drop(ctx, cx, cy, 6, '#6ad0ff'); break;
      case 'slash': ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 16, -1, 1.2); ctx.stroke(); ctx.restore(); break;
      case 'shock': ctx.fillStyle = '#ffe600'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx + (i - 1) * 6, cy + Math.sin(t * 20 + i) * 3, 3, 0, 7); ctx.fill(); } break;
      case 'fire': ctx.beginPath(); ctx.arc(cx, cy, 7 + Math.sin(t * 20) * 1.5, 0, 7); fillStroke(ctx, '#ff6a00', 2.5); ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 7); ctx.fillStyle = '#ffe066'; ctx.fill(); break;
      case 'gust': {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#cfefff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const d = e.push || Math.sign(e.vx) || 1;
        for (let i = 0; i < 3; i++) { const yy = cy + (i - 1) * 9; ctx.beginPath(); ctx.moveTo(cx - d * 14, yy); ctx.quadraticCurveTo(cx, yy - 5, cx + d * 14, yy); ctx.stroke(); }
        ctx.restore(); break;
      }
      default: ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); fillStroke(ctx, '#ff5a5a', 2.5);
    }
  };

  function coin(ctx, cx, cy, r, phase, color) {
    const sx = Math.abs(Math.cos(phase)) * 0.85 + 0.15;
    const fill = color || '#ffd000', ring = color ? U.shade(color, -0.3) : '#ff9a00';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); fillStroke(ctx, fill, 3);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.stroke();
    if (sx > 0.5) { ctx.fillStyle = INK; ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.28, r * 0.28); ctx.fillRect(-r * 0.02, -r * 0.05, r * 0.32, r * 0.32); }
    ctx.restore();
  }

  // ---------- la Medalla (meta) ----------
  function goal(ctx, g, t, color) {
    const px = g.x + g.w / 2, top = g.y;
    rr(ctx, px - 4, top, 8, g.h, 4); fillStroke(ctx, '#f0f0f0', 3.5);
    ctx.beginPath(); ctx.arc(px, top, 8, 0, 7); fillStroke(ctx, color || '#00ff66', 3);
    rr(ctx, px - 22, g.y + g.h - 10, 44, 12, 4); fillStroke(ctx, '#7a8494', 3);
    medal(ctx, px - 20, top + 20 + (g.medalY || 0), 18, t);
  }
  function medal(ctx, cx, cy, r, t) {
    // cinta
    ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 1.6); ctx.lineTo(cx - r * 0.1, cy - r * 0.5); ctx.lineTo(cx + r * 0.3, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy - r * 1.6); ctx.closePath(); fillStroke(ctx, '#ff3b6b', 3);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); fillStroke(ctx, '#ffc400', 3.5);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, 7); ctx.strokeStyle = '#ff9a00'; ctx.lineWidth = 2.5; ctx.stroke();
    globPath(ctx, cx - r * 0.55, cy - r * 0.42, r * 1.1, r * 0.8); fillStroke(ctx, '#fff3a0', 2);
    ctx.fillStyle = INK; ctx.fillRect(cx - r * 0.25, cy - r * 0.2, r * 0.16, r * 0.16); ctx.fillRect(cx - r * 0.04, cy - r * 0.02, r * 0.18, r * 0.18);
    const sh = (t * 1.5) % 3; if (sh < 1) { star(ctx, cx + r * 0.5, cy - r * 0.5, r * 0.4, r * 0.12, 4, 0); ctx.fillStyle = '#fff'; ctx.fill(); }
  }

  // ---------- Monedas Estrella (coleccionables) ----------
  // skin: star (estándar), giga (rosa grande), rgstar (verde/roja), moon (lunar),
  //       noeye (lunar reskin), magic (lunar reskin, guiño a MoonStar)
  // Las coleccionables son ESTRELLAS (no monedas). La reskin solo cambia color/forma.
  //   body = color de relleno, edge = borde, inner = detalle, kind = variante de forma
  // Coleccionables. shape: 'star' = estrella de verdad; 'coin' = moneda; 'traitor' = estrella-ojo (daña).
  const STARCOIN_SKIN = {
    star: { body: '#ffd000', edge: '#c99a00', inner: '#fff3a0', shape: 'coin' },
    giga: { body: '#ff6fd0', edge: '#c0308f', inner: '#ffd0ee', shape: 'coin' },
    moon: { body: '#bcd0ff', edge: '#5f7cff', inner: '#eef3ff', shape: 'coin' },
    rgstar: { body: '#2fd46a', edge: '#ff3b3b', inner: '#eaffea', shape: 'star' },
    magic: { body: '#b44dff', edge: '#6a1fb0', inner: '#ffe600', shape: 'star' },
    traitor: { body: '#ff3b3b', edge: '#7a1515', inner: '#fff', pupil: '#2f7cff', shape: 'traitor' }
  };
  function drawStarCoin(ctx, e, t) {
    const s = STARCOIN_SKIN[e.skin] || STARCOIN_SKIN.star;
    const cx = e.cx(), cy = e.cy() + Math.sin(t * 2) * 2, R = Math.max(10, e.w * 0.46);
    ctx.save();
    ctx.fillStyle = U.rgba(s.body, 0.22); ctx.beginPath(); ctx.arc(cx, cy, R + 6 + Math.sin(t * 4) * 2, 0, 7); ctx.fill();
    if (s.shape === 'coin') {
      const sx = Math.abs(Math.cos(t * 2)) * 0.6 + 0.4;
      ctx.translate(cx, cy); ctx.scale(sx, 1); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); fillStroke(ctx, s.body, 3.5);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, 7); ctx.strokeStyle = s.edge; ctx.lineWidth = 2; ctx.stroke();
      if (sx > 0.45) { star(ctx, cx, cy, R * 0.5, R * 0.22, 5, -Math.PI / 2 + t); ctx.fillStyle = s.inner; ctx.fill(); }
    } else if (s.shape === 'traitor') {
      // estrella-ojo de la traición (pupila azul): daña pero cuenta como coleccionable
      star(ctx, cx, cy, R, R * 0.44, 5, -Math.PI / 2 + Math.sin(t) * 0.12);
      ctx.fillStyle = s.body; ctx.fill(); ctx.strokeStyle = s.edge; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.44, R * 0.32, 0, 0, 7); ctx.fillStyle = s.inner; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.17, 0, 7); ctx.fillStyle = s.pupil; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.08, 0, 7); ctx.fillStyle = INK; ctx.fill();
    } else {
      star(ctx, cx, cy, R, R * 0.44, 5, -Math.PI / 2 + Math.sin(t) * 0.1);
      ctx.fillStyle = s.body; ctx.fill(); ctx.strokeStyle = s.edge; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
      star(ctx, cx, cy, R * 0.5, R * 0.22, 5, -Math.PI / 2 + Math.sin(t) * 0.1); ctx.fillStyle = s.inner; ctx.fill();
    }
    ctx.restore();
  }
  ['starcoin', 'starcoin_giga', 'starcoin_rg', 'starcoin_moon', 'starcoin_magic', 'starcoin_traitor'].forEach((k) => { D[k] = drawStarCoin; });

  // Moneda de valor múltiple (objeto 2×2): moneda grande con su número
  const VALUE_COIN = { coin10: ['#ffd000', '10'], coin30: ['#ffb000', '30'], coin50: ['#ff8a00', '50'], coin100: ['#ff5a2f', '100'] };
  function drawValueCoin(ctx, e, t) {
    const v = VALUE_COIN[e.type] || VALUE_COIN.coin10;
    const cx = e.cx(), cy = e.cy() + Math.sin(t * 2.6) * 2, r = Math.max(10, e.w * 0.46);
    const sx = Math.abs(Math.cos(t * 2)) * 0.6 + 0.4;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); fillStroke(ctx, v[0], 3.5);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, 7); ctx.strokeStyle = U.shade(v[0], -0.3); ctx.lineWidth = 2; ctx.stroke();
    if (sx > 0.45) { ctx.fillStyle = INK; ctx.font = 'bold ' + (v[1].length > 2 ? r * 0.7 : r * 0.9) + 'px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v[1], 0, 1); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; }
    ctx.restore();
  }
  ['coin10', 'coin30', 'coin50', 'coin100'].forEach((k) => { D[k] = drawValueCoin; });

  // Botón pulsable genérico: base ancha + cúpula con un símbolo. col = color de la cúpula.
  function pushButton(ctx, x, y, w, h, col, label, pressed) {
    // base (pedestal)
    rr(ctx, x + 2, y + h * 0.55, w - 4, h * 0.45, 5); fillStroke(ctx, '#3a3f4a', 3.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, x + 5, y + h * 0.8, w - 10, 3, 2); ctx.fill();
    // cúpula del botón (si está pulsado, más baja)
    const ph = pressed ? 0.12 : 0.24, cy = y + h * (pressed ? 0.5 : 0.42);
    rr(ctx, x + 6, y + h * 0.1, w - 12, h * (0.5 + ph), (w - 12) / 2); fillStroke(ctx, col, 3.5);
    shine(ctx, x + 10, y + h * 0.18, (w - 20) * 0.5, h * 0.1);
    // símbolo
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (h * 0.42) + 'px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText(label, x + w / 2, cy); ctx.fillText(label, x + w / 2, cy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  // Interruptor "!" (objeto 2×2): botón grande del color
  function drawExSwitch(ctx, e, t) {
    const k = { exswitch0: 0, exswitch1: 1, exswitch2: 2 }[e.type] || 0;
    const col = ['#ffd000', '#2fd46a', '#ff4fd8'][k];
    pushButton(ctx, e.x, e.y, e.w, e.h, col, '!', e.pressed);
  }
  ['exswitch0', 'exswitch1', 'exswitch2'].forEach((k) => { D[k] = drawExSwitch; });
  S.View.Sprites_pushButton = pushButton;

  // ---------- mecanismos que faltaban por dibujar ----------
  // Colores de tubería (el índice 0 es el verde clásico). El color debe coincidir con su destino.
  const PIPE_COL = [['#2fa84a', '#34b852', '#1e7a33'], ['#e8323f', '#ff5a5a', '#b0282a'], ['#3b8bff', '#6aa8ff', '#245fb0'], ['#ffd000', '#ffe066', '#c99a00']];
  // Entrada de tubería (y con tapa). e.col = índice de color (0-3)
  function pipeMouth(ctx, e, locked) {
    const x = e.x, y = e.y, w = e.w, h = e.h, c = PIPE_COL[(e.col | 0) % 4] || PIPE_COL[0];
    if (e.hdir) {
      // Tubería HORIZONTAL: cuerpo tumbado + boca (collar) en el lado izquierdo
      rr(ctx, x + 6, y + 2, w - 6, h - 4, 4); fillStroke(ctx, c[0], 3.5);
      rr(ctx, x, y - 1, 12, h + 2, 4); fillStroke(ctx, c[1], 3.5);
      ctx.fillStyle = c[2]; ctx.fillRect(x + 14, y + 5, 4, h - 10);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 12, y + h - 10, w - 14, 5);
      if (locked) { rr(ctx, x + w * 0.5 - 7, y + h / 2 - 6, 14, 12, 3); fillStroke(ctx, '#ffd000', 2.5); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h / 2, 2, 0, 7); ctx.fill(); }
      return;
    }
    rr(ctx, x + 2, y + 6, w - 4, h - 6, 4); fillStroke(ctx, c[0], 3.5);
    rr(ctx, x - 1, y, w + 2, 12, 4); fillStroke(ctx, c[1], 3.5);
    ctx.fillStyle = c[2]; ctx.fillRect(x + 5, y + 14, w - 10, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + w - 10, y + 12, 5, h - 14);
    if (locked) { rr(ctx, x + w / 2 - 7, y + h * 0.45, 14, 12, 3); fillStroke(ctx, '#ffd000', 2.5); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.5, 2, 0, 7); ctx.fill(); }
  }
  D.warp = (ctx, e) => pipeMouth(ctx, e, false);
  D.lockwarp = (ctx, e) => pipeMouth(ctx, e, true);
  // Puerta (y con llave)
  function doorArt(ctx, e, locked) {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    rr(ctx, x, y, w, h, [8, 8, 0, 0]); fillStroke(ctx, locked ? '#8a5a2b' : '#b06a3a', 3.5);
    rr(ctx, x + 4, y + 4, w - 8, h - 6, [6, 6, 0, 0]); ctx.strokeStyle = U.shade('#b06a3a', -0.3); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(x + w - 8, y + h / 2, 2.5, 0, 7); ctx.fill();
    if (locked) { rr(ctx, x + w / 2 - 6, y + h * 0.4, 12, 11, 3); fillStroke(ctx, '#ffd000', 2.5); ctx.fillStyle = INK; ctx.fillRect(x + w / 2 - 1, y + h * 0.45, 2, 4); }
  }
  D.door = (ctx, e) => doorArt(ctx, e, false);
  D.lockdoor = (ctx, e) => doorArt(ctx, e, true);
  // Llave
  D.key = (ctx, e, t) => {
    const cx = e.cx(), cy = e.y + e.h * 0.4;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); fillStroke(ctx, '#ffd000', 3);
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fillStyle = INK; ctx.fill();
    ctx.fillStyle = '#ffd000'; ctx.fillRect(cx - 2, cy + 5, 4, e.h * 0.42);
    ctx.fillRect(cx - 2, e.y + e.h - 6, 7, 3); ctx.fillRect(cx - 2, e.y + e.h - 11, 5, 3);
    ink(ctx, 2); ctx.strokeStyle = INK; ctx.strokeRect(cx - 2, cy + 5, 4, e.h * 0.42);
  };
  // Setas móviles (semisólido con tallo y sombrero)
  function shroomArt(ctx, e) {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(e.cx() - 5, y + h * 0.4, 10, h * 0.6);
    rr(ctx, x, y, w, h * 0.5, [h * 0.3, h * 0.3, 6, 6]); fillStroke(ctx, '#ff4f6b', 3.5);
    ctx.fillStyle = '#fff'; [[0.25, 0.22], [0.5, 0.16], [0.72, 0.24]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(x + u * w, y + v * h, 3, 0, 7); ctx.fill(); });
  }
  D.shroomH = D.shroomV = (ctx, e) => shroomArt(ctx, e);
  // Barra Estelar (cadena giratoria de estrellas)
  D.firebar = (ctx, e, t) => {
    const cx = e.cx(), cy = e.cy(), ang = e.ang || 0, r = e.r || 5;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); fillStroke(ctx, '#2b2440', 3);
    for (let i = 1; i <= r; i++) { const bx = cx + Math.cos(ang) * i * 14, by = cy + Math.sin(ang) * i * 14; star(ctx, bx, by, 7, 3, 5, t * 4 + i); fillStroke(ctx, '#ffe600', 2); }
  };
  // Carámbano (cae cuando pasas por debajo)
  D.icicle = (ctx, e, t) => {
    const x = e.x, y = e.y, w = e.w, h = e.h, sh = e.state === 'shake' ? Math.sin(t * 40) * 1.5 : 0;
    ctx.beginPath(); ctx.moveTo(x + sh, y); ctx.lineTo(x + w + sh, y); ctx.lineTo(x + w / 2 + sh, y + h); ctx.closePath(); fillStroke(ctx, '#bfeaff', 3);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(x + w * 0.35 + sh, y + 4); ctx.lineTo(x + w * 0.55 + sh, y + 4); ctx.lineTo(x + w / 2 + sh, y + h * 0.6); ctx.closePath(); ctx.fill();
  };
  // Cápsulas de personaje: cápsula con el color del Glob
  S.Model.Characters.list.forEach((c) => {
    D['cap_' + c.id] = (ctx, e) => {
      const cx = e.cx(), cy = e.cy();
      ctx.beginPath(); ctx.arc(cx, cy, 13, Math.PI, 0); ctx.lineTo(cx + 13, cy + 6); ctx.lineTo(cx - 13, cy + 6); ctx.closePath(); fillStroke(ctx, c.color, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(ctx, cx - 11, cy - 10, 22, 7, 4); ctx.fill();
      rr(ctx, cx - 14, cy + 4, 28, 5, 2); fillStroke(ctx, '#e8e8f0', 2.5);
    };
  });

  // ---------- bloques ----------
  function edges(level, x, y, same) {
    return { up: !same(level.get(x, y - 1)), down: !same(level.get(x, y + 1)), left: !same(level.get(x - 1, y)), right: !same(level.get(x + 1, y)) };
  }
  const isGround = (t) => t === TT.GROUND || t === TT.WALL;

  // Plataforma semisólida con estilo temático. style = 2ª col de theme.semis (grass, logs,
  // building, girder, dock, awning, column, tomb, drum, pumpkins, house, gifts, voidrock, deck,
  // coral, wreck, stump, branch, cotton, rainbow, basalt, grate, scaffold, pokertable, chips,
  // hourglass, cog, speaker, piano, portalpad, crystalpad). mush = en Darkness Forest Corrupto,
  // los semisólidos se ven como setas alucinógenas.
  function semiTile(ctx, px, py, l, r, pal, style, mush, time, x) {
    // cuerpo bajo la superficie
    ctx.fillStyle = U.rgba(pal.groundDark, 0.55); ctx.fillRect(px + (l ? 6 : 0), py + 12, T - (l ? 6 : 0) - (r ? 6 : 0), T - 12);
    if (mush) {
      // seta alucinógena: tallo + sombrero con lunares
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px + T / 2 - 4, py + 12, 8, T - 12);
      rr(ctx, px + (l ? 1 : -2), py + 1, T + (l ? -1 : 2) + (r ? -1 : 2), 14, [l ? 7 : 0, r ? 7 : 0, r ? 7 : 0, l ? 7 : 0]);
      ctx.fillStyle = pal.accent || '#ff2fd6'; ctx.fill(); ink(ctx, 3.5); ctx.stroke();
      ctx.fillStyle = '#fff'; [[0.3, 7], [0.6, 6]].forEach(([u, rr2]) => { ctx.beginPath(); ctx.arc(px + u * T, py + 7, 2.2, 0, 7); ctx.fill(); });
      return;
    }
    // superficie con reborde
    rr(ctx, px + (l ? 1 : -2), py + 1, T + (l ? -1 : 2) + (r ? -1 : 2), 13, [l ? 6 : 0, r ? 6 : 0, r ? 6 : 0, l ? 6 : 0]);
    const surf = SEMI_COLOR[style] || pal.top;
    ctx.fillStyle = surf; ctx.fill(); ink(ctx, 3.5); ctx.stroke();
    // detalle según el estilo
    ctx.fillStyle = INK;
    switch (style) {
      case 'girder': case 'scaffold': case 'grate':
        ctx.fillRect(px + 4, py + 4, 3, 6); ctx.fillRect(px + T - 7, py + 4, 3, 6); break; // remaches/vigas
      case 'logs': case 'deck': case 'piano':
        ctx.fillRect(px + T / 3, py + 2, 1.5, 10); ctx.fillRect(px + 2 * T / 3, py + 2, 1.5, 10); break; // tablones/teclas
      case 'chips': case 'pumpkins': case 'drum':
        ctx.beginPath(); ctx.arc(px + T / 2, py + 7, 2, 0, 7); ctx.fill(); break;
      case 'cog': case 'hourglass':
        ctx.beginPath(); ctx.arc(px + T / 2, py + 7, 2.2, 0, 7); ctx.fill(); break;
      default:
        ctx.beginPath(); ctx.arc(px + T / 2, py + 7, 1.8, 0, 7); ctx.fill();
    }
  }

  function drawTile(ctx, level, x, y, t, pal, time, o) {
    o = o || {};
    const px = x * T, py = y * T + (o.bump || 0);
    switch (t) {
      case TT.GROUND2: {
        // Segundo suelo: estilo tematico por mapa (modulo aislado GroundStyles). Protegido:
        // si el modulo falla o el mapa no tiene estilo, cae al dibujo del suelo base.
        const edg = edges(level, x, y, (q) => q === TT.GROUND2);
        if (o.theme && S.View.GroundStyles) {
          try { if (S.View.GroundStyles.draw(ctx, level, x, y, pal, edg, time, o.theme)) break; } catch (e) { /* cae al generico */ }
        }
        /* falls through al dibujo del suelo base si no hay estilo */
      }
      case TT.GROUND: {
        const ed = edges(level, x, y, isGround);
        ctx.fillStyle = pal.ground; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = pal.groundDark;
        for (let i = 0; i < 3; i++) { const hx = U.hash2(x * 3 + i, y); if (hx > 0.45) { rr(ctx, px + 3 + hx * 20, py + 5 + U.hash2(y, x + i) * 20, 6, 4, 2); ctx.fill(); } }
        ink(ctx, 4);
        ctx.beginPath();
        if (ed.left) { ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py + T); }
        if (ed.right) { ctx.moveTo(px + T - 2, py); ctx.lineTo(px + T - 2, py + T); }
        if (ed.down) { ctx.moveTo(px, py + T - 2); ctx.lineTo(px + T, py + T - 2); }
        ctx.stroke();
        if (ed.up) {
          ctx.fillStyle = pal.top;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + T, py); ctx.lineTo(px + T, py + 9);
          const k = U.hash2(x, y) * 3;
          ctx.quadraticCurveTo(px + T * 0.75, py + 15 + k, px + T / 2, py + 10); ctx.quadraticCurveTo(px + T * 0.25, py + 15 - k, px, py + 9); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = pal.topDark; ctx.lineWidth = 2; ctx.stroke();
          ink(ctx, 4); ctx.beginPath(); ctx.moveTo(px - (ed.left ? 0 : 1), py + 2); ctx.lineTo(px + T + (ed.right ? 0 : 1), py + 2); ctx.stroke();
          if (ed.left) { ctx.beginPath(); ctx.moveTo(px + 2, py + 2); ctx.lineTo(px + 2, py + 12); ctx.stroke(); }
          if (ed.right) { ctx.beginPath(); ctx.moveTo(px + T - 2, py + 2); ctx.lineTo(px + T - 2, py + 12); ctx.stroke(); }
        }
        break;
      }
      case TT.BRICK:
        rr(ctx, px + 2, py + 2, T - 4, T - 4, 6); fillStroke(ctx, pal.brick, 3.5);
        ctx.strokeStyle = U.shade(pal.brick, -0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 6, py + T / 2); ctx.lineTo(px + T - 6, py + T / 2); ctx.moveTo(px + T / 2, py + 6); ctx.lineTo(px + T / 2, py + T / 2); ctx.stroke();
        shine(ctx, px + 6, py + 5, 8, 3);
        break;
      case TT.BOX: {
        const b = Math.sin(time * 4 + x) * 1;
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 7); fillStroke(ctx, '#ffd000', 3.5);
        ctx.fillStyle = '#ff9a00'; ctx.fillRect(px + 5, py + T - 9, T - 10, 3);
        drop(ctx, px + T / 2, py + T / 2 + b, 8, '#ffffff');
        ctx.fillStyle = INK; ctx.fillRect(px + T / 2 - 3, py + T / 2 + b - 1, 2.5, 2.5); ctx.fillRect(px + T / 2 + 0.5, py + T / 2 + b + 1.5, 3, 3);
        break;
      }
      case TT.USED:
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 7); fillStroke(ctx, U.mix(pal.ground, '#777777', 0.5), 3.5);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; [[8, 8], [T - 10, 8], [8, T - 10], [T - 10, T - 10]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(px + a + 1, py + b + 1, 2, 0, 7); ctx.fill(); });
        break;
      case TT.HARD:
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 4); fillStroke(ctx, U.mix(pal.groundDark, '#8a8f9a', 0.6), 3.5);
        ctx.fillStyle = '#4a0d0d'; [[7, 7], [T - 7, 7], [7, T - 7], [T - 7, T - 7]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(px + a, py + b, 2, 0, 7); ctx.fill(); });
        shine(ctx, px + 9, py + 5, 10, 3);
        break;
      case TT.SEMI: {
        const l = level.get(x - 1, y) !== TT.SEMI, r = level.get(x + 1, y) !== TT.SEMI;
        semiTile(ctx, px, py, l, r, pal, (o.semi && o.semi[0]) || null, o.mush, time, x);
        break;
      }
      case TT.SEMI2: {
        const l = level.get(x - 1, y) !== TT.SEMI2, r = level.get(x + 1, y) !== TT.SEMI2;
        semiTile(ctx, px, py, l, r, pal, (o.semi && o.semi[1]) || null, o.mush, time, x);
        break;
      }
      case TT.SPIKE:
        rr(ctx, px + 6, py + 6, T - 12, T - 12, 3); fillStroke(ctx, '#5a5f6b', 3);
        ctx.fillStyle = '#fff';
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
          const cx = px + T / 2, cy = py + T / 2;
          ctx.beginPath();
          if (dy) { ctx.moveTo(cx - 9, cy + dy * 8); ctx.lineTo(cx, cy + dy * 16); ctx.lineTo(cx + 9, cy + dy * 8); }
          else { ctx.moveTo(cx + dx * 8, cy - 9); ctx.lineTo(cx + dx * 16, cy); ctx.lineTo(cx + dx * 8, cy + 9); }
          ctx.closePath(); fillStroke(ctx, '#ffffff', 2.5);
        });
        break;
      case TT.BOUNCE: {
        const w = Math.sin(time * 6 + x) * 1.5;
        rr(ctx, px + 1 - w / 2, py + 1 + w, T - 2 + w, T - 2 - w, 9); fillStroke(ctx, 'rgba(255,79,160,0.92)', 3.5);
        shine(ctx, px + 6, py + 6 + w, 10, 4);
        ctx.fillStyle = INK; ctx.fillRect(px + 10, py + 14, 4, 4); ctx.fillRect(px + 16, py + 17, 4, 4);
        break;
      }
      case TT.ICE:
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 5); fillStroke(ctx, '#bfeaff', 3.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 7, py + T - 9); ctx.lineTo(px + T - 9, py + 7); ctx.moveTo(px + 13, py + T - 7); ctx.lineTo(px + T - 7, py + 13); ctx.stroke();
        break;
      case TT.LIQUID: {
        // solo hay superficie si arriba está el aire (si toca techo/bloque, no sale superficie)
        const top = level.get(x, y - 1) === TT.EMPTY;
        // Sound Discotech pasa un color cambiante en o.liquidCol/o.liquidTopCol
        const liqCol = o.liquidCol || pal.liquid, liqTop = o.liquidTopCol || pal.liquidTop;
        ctx.fillStyle = liqCol; ctx.fillRect(px, py + (top ? 8 : 0), T, T - (top ? 8 : 0));
        if (top) {
          ctx.beginPath(); ctx.moveTo(px, py + 10);
          for (let i = 0; i <= 8; i++) ctx.lineTo(px + i * 4, py + 8 + Math.sin(time * 3 + (x * 8 + i) * 0.8) * 2.5);
          ctx.lineTo(px + T, py + 14); ctx.lineTo(px, py + 14); ctx.closePath(); ctx.fillStyle = liqTop; ctx.fill();
        }
        ctx.fillStyle = U.rgba(liqTop, 0.6);
        const bx = U.hash2(x, Math.floor(time + x)) * 24; ctx.beginPath(); ctx.arc(px + 4 + bx, py + T - ((time * 20 + x * 9) % T), 2, 0, 7); ctx.fill();
        break;
      }
      case TT.CLOUD: {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(px + 9, py + 13, 9, 0, 7); ctx.arc(px + 20, py + 9, 11, 0, 7); ctx.arc(px + 27, py + 15, 7, 0, 7); ctx.rect(px + 2, py + 12, T - 4, 10);
        ink(ctx, 6); ctx.stroke(); ctx.fill();
        ctx.fillStyle = INK; ctx.fillRect(px + 12, py + 10, 3, 3); ctx.fillRect(px + 17, py + 12, 3, 3);
        break;
      }
      case TT.COIN: coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4); break;
      case TT.RCOIN: coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4, '#ff3b3b'); break;
      case TT.BCOIN: coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4, '#3b8bff'); break;
      case TT.GCOIN: coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4, '#00d45a'); break;
      case TT.KCOIN: coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4, '#ff4fd8'); break;
      case TT.GHID: // verde oculta: en el editor se ve tenue; en juego casi invisible
        ctx.globalAlpha = o.editor ? 0.5 : 0.12; coin(ctx, px + T / 2, py + T / 2, 9, time * 3 + x, '#00d45a'); ctx.globalAlpha = 1; break;
      case TT.SWG:
        pushButton(ctx, px + 1, py + 2, T - 2, T - 3, '#00c24a', 'G', false);
        break;
      case TT.PSW:
        pushButton(ctx, px + 1, py + 2, T - 2, T - 3, '#2f6fd0', 'P', !!(level && level.pActive));
        break;
      // Bloques del Interruptor P. PBLK: moneda por defecto -> bloque con P activo.
      // PCOIN: bloque por defecto -> moneda con P activo. Se dibuja según level.pActive.
      case TT.PBLK: case TT.PCOIN: {
        const pOn = !!(level && level.pActive);
        const asBlock = (t === TT.PBLK) ? pOn : !pOn; // ¿se muestra como bloque sólido?
        if (asBlock) {
          rr(ctx, px + 1, py + 1, T - 2, T - 2, 5); fillStroke(ctx, '#4a6fb0', 3.5);
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 15px "Trebuchet MS",sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', px + T / 2, py + T / 2 + 1);
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        } else {
          coin(ctx, px + T / 2, py + T / 2, 10, time * 4 + x * 0.4, '#8fb6ff');
          if (o.editor) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#2f6fd0'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P', px + T / 2, py + T - 3); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
        }
        break;
      }
      // Tubería pequeña decorativa (fondo, no sólida): dos tubitos
      case TT.PIPEDECO:
        ctx.fillStyle = '#3a6a44'; ctx.fillRect(px + 7, py, 8, T); ctx.fillRect(px + 18, py, 8, T);
        ctx.fillStyle = '#2a5033'; ctx.fillRect(px + 7, py, 2, T); ctx.fillRect(px + 18, py, 2, T);
        ctx.fillStyle = '#4f8a5c'; ctx.fillRect(px + 12, py, 2, T); ctx.fillRect(px + 23, py, 2, T);
        break;
      case TT.HIDDEN:
        if (o.editor) { ctx.setLineDash([4, 4]); ink(ctx, 2); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeRect(px + 3, py + 3, T - 6, T - 6); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,208,0,0.25)'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6); }
        break;
      case TT.EX0: case TT.EX1: case TT.EX2: {
        const k = t - TT.EX0, col = ['#ffd000', '#2fd46a', '#ff4fd8'][k];
        const on = level.ex ? !!level.ex[k] : false;
        if (on) { rr(ctx, px + 1, py + 1, T - 2, T - 2, 5); fillStroke(ctx, col, 3.5); ctx.fillStyle = 'rgba(255,255,255,0.85)'; }
        else { ctx.setLineDash([4, 3]); rr(ctx, px + 3, py + 3, T - 6, T - 6, 5); ctx.strokeStyle = U.rgba(col, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = U.rgba(col, 0.9); }
        ctx.font = 'bold 16px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', px + T / 2, py + T / 2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        break;
      }
      case TT.LIGHT: {
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 6); fillStroke(ctx, '#3a3f4a', 3.5);
        const gl = ctx.createRadialGradient(px + T / 2, py + T / 2, 2, px + T / 2, py + T / 2, T * 0.55);
        gl.addColorStop(0, 'rgba(255,240,170,0.95)'); gl.addColorStop(1, 'rgba(255,240,170,0.1)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, T * 0.42 + Math.sin(time * 3 + x) * 1.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, 5, 0, 7); fillStroke(ctx, '#fffbe0', 2);
        break;
      }
      case TT.CONV_L: case TT.CONV_R: {
        const dir = (t === TT.CONV_R ? 1 : -1) * (o.convDir || 1);
        rr(ctx, px, py + 2, T, T - 4, 8); fillStroke(ctx, '#2b2b33', 3.5);
        ctx.fillStyle = pal.top; const off = ((time * 40 * dir) % 16 + 16) % 16;
        for (let i = -1; i < 3; i++) { const ax = px + i * 16 + off; if (ax < px - 2 || ax > px + T - 6) continue; ctx.beginPath(); ctx.moveTo(ax + (dir > 0 ? 0 : 8), py + 10); ctx.lineTo(ax + (dir > 0 ? 8 : 0), py + 16); ctx.lineTo(ax + (dir > 0 ? 0 : 8), py + 22); ctx.fill(); }
        break;
      }
      case TT.WATER: {
        // En Sunlight Seaside Corrupto el agua se vuelve veneno: se tiñe de morado tóxico
        const wcol = o.poison ? '#9b2fd6' : (pal.water || '#3c8cff');
        ctx.fillStyle = U.rgba(wcol, o.poison ? 0.5 : 0.5); ctx.fillRect(px, py, T, T);
        // superficie solo si arriba está el aire (si toca techo no sale superficie)
        if (level.get(x, y - 1) === TT.EMPTY) {
          ctx.strokeStyle = o.poison ? 'rgba(220,160,255,0.9)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(px + i * 4, py + 2 + Math.sin(time * 3 + x * 8 + i) * 1.5); ctx.stroke();
        }
        // burbujas tóxicas subiendo
        if (o.poison) { ctx.fillStyle = 'rgba(180,120,255,0.6)'; const bx = U.hash2(x, Math.floor(time + x)) * 20; ctx.beginPath(); ctx.arc(px + 6 + bx, py + T - ((time * 18 + x * 7) % T), 2, 0, 7); ctx.fill(); }
        break;
      }
      // Tubería
      case TT.PIPE: {
        const topPipe = level.get(x, y - 1) !== TT.PIPE;
        ctx.fillStyle = '#2fa84a'; ctx.fillRect(px + 2, py, T - 4, T);
        ctx.fillStyle = '#1e7a33'; ctx.fillRect(px + T - 8, py, 6, T);
        ctx.fillStyle = '#5fd47a'; ctx.fillRect(px + 5, py, 4, T);
        if (topPipe) { rr(ctx, px - 2, py, T + 4, 12, 4); fillStroke(ctx, '#2fa84a', 3.5); } else { ink(ctx, 3.5); ctx.strokeStyle = INK; ctx.strokeRect(px + 2, py, T - 4, T); }
        break;
      }
      // Rosquilla (cae si te quedas encima)
      case TT.DONUT: {
        rr(ctx, px + 2, py + 2, T - 4, T - 4, 8); fillStroke(ctx, '#e8a85a', 3.5);
        ctx.fillStyle = '#b56a2a'; [[9, 9], [T - 9, 10], [11, T - 9], [T - 11, T - 8]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(px + a, py + b, 2, 0, 7); ctx.fill(); });
        ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, 4, 0, 7); ctx.fillStyle = '#7a4a1f'; ctx.fill();
        break;
      }
      // Bloque Nota
      case TT.NOTE: {
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 5); fillStroke(ctx, '#e8e8f4', 3.5);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px + 11, py + T - 10, 3.5, 0, 7); ctx.fill();
        ctx.fillRect(px + 13, py + 8, 2.5, T - 18); ctx.fillRect(px + 13, py + 8, 8, 3);
        break;
      }
      // Bloque POW
      case TT.POW: {
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 5); fillStroke(ctx, '#2fa0c4', 3.5);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText('POW', px + T / 2, py + T / 2 + 1); ctx.fillText('POW', px + T / 2, py + T / 2 + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        break;
      }
      // Bloques A/B (6) e interruptores A/B (3)
      case TT.A0: case TT.A1: case TT.A2: case TT.B0: case TT.B1: case TT.B2: {
        const ab = S.Model.Catalog.abInfo(t), AB = S.Model.Catalog.AB[ab.k];
        const col = ab.b ? AB.b : AB.a;
        const active = S.Model.Catalog.isSolid(t, level);
        if (active) { rr(ctx, px + 1, py + 1, T - 2, T - 2, 4); fillStroke(ctx, col, 3.5); ctx.fillStyle = '#fff'; }
        else { ctx.setLineDash([4, 3]); rr(ctx, px + 3, py + 3, T - 6, T - 6, 4); ctx.strokeStyle = U.rgba(col, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = U.rgba(col, 0.9); }
        ctx.font = 'bold 15px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ab.b ? 'B' : 'A', px + T / 2, py + T / 2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        break;
      }
      case TT.SW0: case TT.SW1: case TT.SW2: {
        // Bloque ON/OFF (estilo SMM): bloque sólido que al golpearlo alterna A<->B
        const kk = t - TT.SW0, AB = S.Model.Catalog.AB[kk];
        const on = level.ab ? !!level.ab[kk] : false;
        rr(ctx, px + 1, py + 1, T - 2, T - 2, 4); fillStroke(ctx, '#3a3f4a', 3.5);
        rr(ctx, px + 5, py + 5, T - 10, T - 10, 3); fillStroke(ctx, on ? AB.b : AB.a, 2.5);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = INK; ctx.lineWidth = 3; const lbl = on ? 'ON' : 'OFF';
        ctx.strokeText(lbl, px + T / 2, py + T / 2 + 1); ctx.fillText(lbl, px + T / 2, py + T / 2 + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        break;
      }
      // Pendientes (empinadas 45° y suaves de 2 casillas)
      case TT.S45U: case TT.S45D: case TT.G1U: case TT.G2U: case TT.G1D: case TT.G2D: {
        const TS = T;
        const yl = S.Model.Catalog.slopeY(t, 0, TS), yr = S.Model.Catalog.slopeY(t, 1, TS);
        ctx.beginPath(); ctx.moveTo(px, py + TS); ctx.lineTo(px, py + yl); ctx.lineTo(px + TS, py + yr); ctx.lineTo(px + TS, py + TS); ctx.closePath();
        ctx.fillStyle = pal.ground; ctx.fill();
        // franja de superficie
        ctx.strokeStyle = pal.top; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, py + yl); ctx.lineTo(px + TS, py + yr); ctx.stroke();
        ink(ctx, 3.5); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(px, py + yl); ctx.lineTo(px + TS, py + yr); ctx.stroke();
        break;
      }
    }
  }

  // Icono para la paleta del editor
  function drawIcon(ctx, item, size, pal, ch, theme) {
    ctx.save();
    const s = size / T;
    if (item.kind === 'tile') {
      const fake = { get: (x, y) => (x === 0 && y === 0 ? item.id : 0) };
      ctx.scale(s, s);
      // para los semisólidos, muestra el estilo del mapa (si se pasó el tema)
      const sm = (theme && theme.semis) || [];
      const semi = [sm[0] && sm[0][1], sm[1] && sm[1][1]];
      // el suelo temático (GROUND2) muestra en el icono el sprite del MAPA actual
      const themeId = theme && theme.id;
      if (item.id === TT.HIDDEN) { drawTile(ctx, fake, 0, 0, item.id, pal, 0, { editor: true, semi, theme: themeId }); }
      else drawTile(ctx, fake, 0, 0, item.id, pal, 0, { semi, theme: themeId });
    } else if (item.kind === 'erase') {
      ctx.scale(s, s);
      rr(ctx, 6, 8, 20, 14, 4); ctx.save(); ctx.translate(16, 16); ctx.rotate(-0.5); ctx.translate(-16, -16); fillStroke(ctx, '#ff7ab8', 3); ctx.restore();
    } else if (item.kind === 'link') {
      ctx.scale(s, s);
      // dos nodos unidos por una cadena (icono de enlazar)
      ctx.beginPath(); ctx.arc(9, 16, 5, 0, 7); fillStroke(ctx, '#00e5ff', 3);
      ctx.beginPath(); ctx.arc(23, 16, 5, 0, 7); fillStroke(ctx, '#ffd000', 3);
      ink(ctx, 3); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(13, 16); ctx.lineTo(19, 16); ctx.stroke(); ctx.setLineDash([]);
    } else {
      const def = S.Model.Catalog.OBJECTS[item.type];
      const w = def.w, h = Math.min(def.h, 64);
      const sc = Math.min(size / (Math.max(w, h) + 10), 1.4);
      ctx.translate(size / 2, size / 2); ctx.scale(sc, sc);
      const e = { type: item.type, x: -w / 2, y: -h / 2, w, h, t: 0, dir: -1, onGround: true, hp: 3, state: 'hang', skin: (S.Model.Catalog.OBJECTS[item.type] || {}).skin, cx() { return this.x + this.w / 2; }, cy() { return this.y + this.h / 2; } };
      if (item.type === 'start') drawStartMarker(ctx, e, ch);
      else if (item.type === 'goal') { medal(ctx, 0, 6, 16, 0); }
      else if (item.type === 'goalhidden') { ctx.globalAlpha = 0.6; medal(ctx, 0, 6, 16, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#b44dff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, 10); ctx.textAlign = 'left'; }
      else if (item.type === 'checkpoint') { e.h = h; D.checkpoint(ctx, Object.assign(e, { taken: true, x: -10 }), 0, { color: ch && ch.color }); }
      else if (D[item.type]) D[item.type](ctx, e, 0, { pal, color: ch && ch.color });
      else { // Pyce sin dibujo procedural: usar su PNG
        const img = S.View.Assets && S.View.Assets.pyce(item.type);
        if (img) { const ar = img.width / img.height; let dw = w, dh = w / ar; if (dh > h) { dh = h; dw = h * ar; } ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); }
      }
    }
    ctx.restore();
  }
  function drawStartMarker(ctx, e, ch) {
    const img = ch && S.View.Assets.get(ch.paths[0]);
    if (img) ctx.drawImage(img, e.x - 8, e.y + e.h - 40, 40, 40);
    else { globPath(ctx, e.x, e.y, e.w, e.h); fillStroke(ctx, '#00ff66', 3); }
  }

  // Pyce dibujado con su PNG (recortado y escalado por Assets). Los dibujos
  // originales miran a la derecha; los enemigos arrancan con dir = -1 (izquierda),
  // así que se voltea igual que el player: se dibuja normal al ir a la derecha.
  // Dibuja el PNG de un Pyce, apoyado en el suelo de su casilla.
  // Metadatos opcionales en PyceArt[id]:
  //   faceLeft: true  -> el dibujo original mira a la IZQUIERDA (por defecto miran a la derecha)
  //   rot: grados      -> corrección de ángulo del arte (p. ej. el Cannon viene inclinado)
  function drawPyce(ctx, e, t, img) {
    const art = (S.View.PyceArt && S.View.PyceArt[e.type]) || {};
    const sq = e.squashed ? 0.4 : 1;
    const w = e.w, h = e.h * sq;
    const cx = e.cx(), by = e.y + e.h;
    let extra = 1;
    if (e.onGround && Math.abs(e.vx) > 10 && !e.squashed) extra = 1 + Math.sin(t * 16 + e.spawnX) * 0.05;
    const ar = img.width / img.height;
    let dw = w * 1.25, dh = dw / ar;
    if (dh > h * 1.25) { dh = h * 1.25; dw = dh * ar; }
    // ¿voltear? El original mira a la derecha (o a la izquierda si faceLeft).
    // Queremos que mire hacia e.dir (-1 izq, 1 der).
    const originalRight = !art.faceLeft;
    const flip = (e.dir > 0) !== originalRight;
    const dhE = dh * extra;
    ctx.save();
    ctx.translate(cx, by);
    if (flip) ctx.scale(-1, 1);
    // La rotación de corrección gira sobre el CENTRO del sprite, no sobre los pies,
    // para no descolocarlo (el arte del Cannon viene inclinado).
    if (art.rot) { ctx.translate(0, -dhE / 2); ctx.rotate(art.rot * Math.PI / 180); ctx.translate(0, dhE / 2); }
    ctx.drawImage(img, -dw / 2, -dhE, dw, dhE);
    ctx.restore();
  }

  function drawEntity(ctx, e, t, opt) {
    const f = D[e.type];
    const img = !f && S.View.Assets ? S.View.Assets.pyce(e.type) : null;
    if (!f && !img) return;
    ctx.save();
    // Volteo vertical: al morir (flipDie) o por orientación elegida en el editor (flipV)
    if (e.flipDie || e.flipV) { ctx.translate(e.cx(), e.cy()); ctx.scale(1, -1); ctx.translate(-e.cx(), -e.cy()); }
    if (img) { drawPyce(ctx, e, e.t || t, img); ctx.restore(); return; }
    const facing = e.dir > 0 && ['gloopy', 'pinchoglob', 'saltagel', 'tornibot', 'medusa'].includes(e.type);
    if (facing) { ctx.translate(e.cx(), 0); ctx.scale(-1, 1); ctx.translate(-e.cx(), 0); }
    f(ctx, e, e.t || t, opt);
    ctx.restore();
  }

  S.View.Sprites = { ink, fillStroke, rr, globPath, globFace, star, drop, coin, medal, goal, drawTile, drawEntity, drawIcon, drawStartMarker, INK };
})(window.SGM);
