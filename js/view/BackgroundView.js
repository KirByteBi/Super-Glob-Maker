/* Vista: fondos con parallax para cada mapa (y su versión Corrupta) */
(function (S) {
  'use strict';
  const U = S.util;
  const W = S.VIEW_W, H = S.VIEW_H;
  const Sp = () => S.View.Sprites;

  // Repite una figura a lo largo del eje X con parallax
  function layer(ctx, camX, factor, spacing, fn) {
    const off = camX * factor;
    const first = Math.floor(off / spacing) - 1;
    for (let i = first; i < first + Math.ceil(W / spacing) + 3; i++) fn(i * spacing - off, i, U.hash(i * 7.13 + factor * 100));
  }
  function hillsBand(ctx, camX, factor, baseY, amp, color, freq, outline) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const wx = (x + camX * factor) * freq;
      ctx.lineTo(x, baseY - (Math.sin(wx) * 0.6 + Math.sin(wx * 2.3 + 1) * 0.3 + 0.5) * amp);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    if (outline) { ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function cloud(ctx, x, y, s, color, face) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 7); ctx.arc(x + 22 * s, y - 10 * s, 22 * s, 0, 7); ctx.arc(x + 46 * s, y, 16 * s, 0, 7); ctx.rect(x, y - 2 * s, 46 * s, 18 * s);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 4; ctx.stroke(); ctx.fill();
    if (face) { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x + 14 * s, y - 6 * s, 5 * s, 5 * s); ctx.fillRect(x + 21 * s, y - 2 * s, 6 * s, 6 * s); }
  }
  function sky(ctx, pal) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function stars(ctx, camX, t, n, color) {
    ctx.fillStyle = color || '#fff';
    for (let i = 0; i < n; i++) {
      const x = ((U.hash(i) * 2000 - camX * 0.05) % W + W) % W, y = U.hash(i + 99) * H * 0.7;
      const a = 0.4 + Math.sin(t * 2 + i) * 0.4; ctx.globalAlpha = Math.max(0, a); ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  function sun(ctx, x, y, r, color, t, corrupt) {
    ctx.fillStyle = U.rgba(color, 0.3); ctx.beginPath(); ctx.arc(x, y, r * 1.5 + Math.sin(t) * 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#0a0a0a';
    if (corrupt) { ctx.fillRect(x - r * 0.4, y - r * 0.2, r * 0.25, r * 0.12); ctx.fillRect(x + r * 0.05, y - r * 0.1, r * 0.3, r * 0.12); }
    else { ctx.fillRect(x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.22); ctx.fillRect(x - r * 0.05, y - r * 0.1, r * 0.26, r * 0.26); }
    ctx.fillRect(x - r * 0.5, y + r * 0.35, r * 0.45, r * 0.08);
  }

  // Luna-Glob para los mapas que se hacen de noche en modo Corrupto
  function moon(ctx, x, y, r, t) {
    ctx.fillStyle = 'rgba(220,235,255,0.18)'; ctx.beginPath(); ctx.arc(x, y, r * 1.6 + Math.sin(t) * 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#eef3ff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#c5d0e8';
    [[0.35, -0.3, 0.18], [0.2, 0.4, 0.12], [-0.45, 0.35, 0.1]].forEach(([u, v, s]) => { ctx.beginPath(); ctx.arc(x + u * r, y + v * r, s * r, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x - r * 0.42, y - r * 0.12, r * 0.24, r * 0.08); ctx.fillRect(x - r * 0.05, y - r * 0.02, r * 0.26, r * 0.08);
    ctx.fillRect(x - r * 0.5, y + r * 0.35, r * 0.4, r * 0.07);
  }

  const BG = {};
  BG.hills = (ctx, p, cx, t, c) => {
    c ? stars(ctx, cx, t, 60) : sun(ctx, W * 0.8, 90, 40, '#fff27a', t);
    layer(ctx, cx, 0.08, 280, (x, i, h) => cloud(ctx, x, 70 + h * 90, 0.8 + h * 0.5, c ? '#4d2a66' : '#ffffff', h > 0.6));
    hillsBand(ctx, cx, 0.2, H - 170, 120, p.far, 0.006);
    // lago de gelatina
    ctx.fillStyle = p.liquid; ctx.globalAlpha = 0.55; ctx.fillRect(0, H - 150, W, 30); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = ((i * 190 - cx * 0.3) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, H - 138 + Math.sin(t * 2 + i) * 2); ctx.lineTo(x + 40, H - 138 + Math.sin(t * 2 + i) * 2); ctx.stroke(); }
    hillsBand(ctx, cx, 0.4, H - 80, 90, p.mid, 0.009, true);
    layer(ctx, cx, 0.4, 230, (x, i, h) => { if (h < 0.5) return; const y = H - 80 - 40; Sp().globPath(ctx, x, y + 10, 40, 26); Sp().fillStroke(ctx, p.near, 3.5); });
  };
  BG.city = (ctx, p, cx, t, c) => {
    if (c) { stars(ctx, cx, t, 40); moon(ctx, W * 0.25, 110, 44, t); } else sun(ctx, W * 0.25, 120, 50, '#ffcf5a', t);
    layer(ctx, cx, 0.12, 90, (x, i, h) => { const bh = 120 + h * 160; ctx.fillStyle = p.far; ctx.fillRect(x, H - 120 - bh, 70, bh + 120); });
    layer(ctx, cx, 0.3, 130, (x, i, h) => {
      const bh = 90 + h * 200, y = H - 60 - bh;
      Sp().rr(ctx, x, y, 100, bh + 60, [10, 10, 0, 0]); Sp().fillStroke(ctx, p.mid, 4);
      for (let r = 0; r < bh / 34 - 1; r++) for (let k = 0; k < 3; k++) {
        const lit = U.hash2(i * 9 + k, r) > (c ? 0.75 : 0.5);
        ctx.fillStyle = lit ? (c ? '#ff2fd6' : '#ffe9a0') : 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 14 + k * 28, y + 16 + r * 34, 16, 18);
      }
      if (h > 0.7) { ctx.fillStyle = p.accent; Sp().rr(ctx, x + 20, y - 24, 60, 20, 6); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); }
    });
    ctx.fillStyle = p.near; ctx.fillRect(0, H - 50, W, 50);
    ctx.fillStyle = p.accent; layer(ctx, cx, 0.5, 80, (x) => ctx.fillRect(x, H - 28, 40, 6));
  };
  BG.sea = (ctx, p, cx, t, c) => {
    if (c) { stars(ctx, cx, t, 30); moon(ctx, W * 0.7, 100, 40, t); } else sun(ctx, W * 0.7, 110, 46, '#fff27a', t);
    layer(ctx, cx, 0.06, 320, (x, i, h) => cloud(ctx, x, 60 + h * 80, 0.9 + h * 0.4, c ? '#4a4a6a' : '#ffffff', false));
    ctx.fillStyle = p.mid; ctx.fillRect(0, H - 200, W, 200);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (let r = 0; r < 5; r++) { ctx.beginPath(); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H - 190 + r * 36 + Math.sin(x * 0.03 + t * 2 + r - cx * 0.004 * (r + 1)) * 4); ctx.stroke(); }
    // faro y barcos
    layer(ctx, cx, 0.15, 700, (x, i, h) => {
      Sp().rr(ctx, x + 40, H - 340, 40, 150, 6); Sp().fillStroke(ctx, '#ffffff', 4);
      ctx.fillStyle = '#ff5f5f'; ctx.fillRect(x + 42, H - 300, 36, 18); ctx.fillRect(x + 42, H - 250, 36, 18);
      Sp().rr(ctx, x + 34, H - 370, 52, 32, 8); Sp().fillStroke(ctx, c ? '#ff2fd6' : '#ffe600', 4);
    });
    layer(ctx, cx, 0.25, 420, (x, i, h) => { if (h < 0.4) return; const y = H - 170 + Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80, y); ctx.lineTo(x + 66, y + 18); ctx.lineTo(x + 12, y + 18); ctx.closePath(); Sp().fillStroke(ctx, '#ff8a5c', 3.5); ctx.beginPath(); ctx.moveTo(x + 40, y); ctx.lineTo(x + 40, y - 50); ctx.lineTo(x + 70, y - 8); ctx.closePath(); Sp().fillStroke(ctx, '#fff', 3); });
  };
  BG.ruins = (ctx, p, cx, t, c) => {
    if (c) { stars(ctx, cx, t, 70); moon(ctx, W * 0.5, 130, 60, t); } else sun(ctx, W * 0.5, 140, 70, '#ffb347', t);
    hillsBand(ctx, cx, 0.1, H - 140, 70, p.far, 0.004);
    layer(ctx, cx, 0.25, 360, (x, i, h) => {
      // pirámide-glob
      const s = 140 + h * 80, b = H - 90;
      ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x + s / 2, b - s * 0.8); ctx.lineTo(x + s, b); ctx.closePath(); Sp().fillStroke(ctx, p.mid, 4);
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x + s / 2 - 12, b - s * 0.5, 9, 9); ctx.fillRect(x + s / 2 + 1, b - s * 0.42, 11, 11);
    });
    layer(ctx, cx, 0.45, 260, (x, i, h) => {
      if (h < 0.3) return; const ph = 60 + h * 90;
      Sp().rr(ctx, x, H - 50 - ph, 26, ph + 50, 4); Sp().fillStroke(ctx, p.near, 4);
      if (h > 0.6) { Sp().rr(ctx, x - 8, H - 60 - ph, 42, 14, 4); Sp().fillStroke(ctx, p.near, 4); }
    });
    if (c) { ctx.fillStyle = 'rgba(155,77,255,0.35)'; for (let i = 0; i < 5; i++) { const x = ((i * 260 - cx * 0.5 + t * 30) % (W + 100)) - 50; ctx.beginPath(); ctx.ellipse(x, H - 160 + Math.sin(t + i) * 20, 14, 20, 0, 0, 7); ctx.fill(); } }
  };
  BG.circus = (ctx, p, cx, t, c) => {
    stars(ctx, cx, t, 50, '#ffcf8a');
    ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.arc(W * 0.8, 100, 40, 0, 7); ctx.fill(); ctx.fillStyle = p.skyTop; ctx.beginPath(); ctx.arc(W * 0.8 + 16, 92, 36, 0, 7); ctx.fill();
    layer(ctx, cx, 0.2, 520, (x, i, h) => {
      // carpa de circo
      const b = H - 100, w = 260, top = b - 220;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + w / 2, top); ctx.lineTo(x + k * w / 6, b); ctx.lineTo(x + (k + 1) * w / 6, b); ctx.closePath(); ctx.fillStyle = k % 2 ? '#fff2f2' : (c ? '#5b1080' : '#e8323f'); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(x + w / 2, top); ctx.lineTo(x, b); ctx.lineTo(x + w, b); ctx.closePath(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w / 2, top - 30); ctx.stroke(); ctx.fillStyle = p.accent; ctx.fillRect(x + w / 2, top - 30, 24, 14);
    });
    layer(ctx, cx, 0.4, 170, (x, i, h) => {
      // calabazas
      if (h < 0.35) return; const y = H - 80, s = 0.7 + h * 0.5;
      ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 24 * s, 0, 0, 7); Sp().fillStroke(ctx, '#ff8a00', 4);
      ctx.fillStyle = c ? '#ff2fd6' : '#2b0f4f'; ctx.fillRect(x - 14 * s, y - 8 * s, 8 * s, 8 * s); ctx.fillRect(x + 2 * s, y - 4 * s, 9 * s, 9 * s); ctx.fillRect(x - 14 * s, y + 8 * s, 22 * s, 4 * s);
      Sp().rr(ctx, x - 4, y - 32 * s, 8, 12, 3); Sp().fillStroke(ctx, '#2f8f5b', 3);
    });
    // banderines
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 30 + Math.sin((x + cx * 0.6) * 0.01) * 20); ctx.stroke();
    for (let x = 0; x < W; x += 40) { const y = 30 + Math.sin((x + cx * 0.6) * 0.01) * 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y); ctx.lineTo(x + 10, y + 20); ctx.closePath(); ctx.fillStyle = (x / 40) % 2 ? p.accent : '#9a4dff'; ctx.fill(); ctx.stroke(); }
  };
  BG.snow = (ctx, p, cx, t, c) => {
    if (c) { stars(ctx, cx, t, 60); moon(ctx, W * 0.75, 100, 42, t); }
    hillsBand(ctx, cx, 0.12, H - 160, 140, p.far, 0.005, false);
    hillsBand(ctx, cx, 0.3, H - 90, 90, p.mid, 0.008, true);
    layer(ctx, cx, 0.45, 150, (x, i, h) => {
      if (h < 0.3) return; const b = H - 60, s = 0.8 + h * 0.6;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - (34 - k * 8) * s, b - k * 30 * s); ctx.lineTo(x, b - (50 + k * 30) * s); ctx.lineTo(x + (34 - k * 8) * s, b - k * 30 * s); ctx.closePath(); Sp().fillStroke(ctx, p.near, 3.5); }
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 20 * s, b - 6 * s, 40 * s, 5);
      Sp().star(ctx, x, b - 112 * s, 9, 4, 5, -Math.PI / 2); Sp().fillStroke(ctx, '#ffe600', 2.5);
      ['#ff3b3b', '#3b8bff', '#ffd000'].forEach((col, k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + (k - 1) * 14 * s, b - (24 + k * 26) * s, 4, 0, 7); ctx.fill(); });
    });
  };
  BG.vortex = (ctx, p, cx, t, c) => {
    stars(ctx, cx, t, 90, '#d9b8ff');
    const vx = W * 0.6 - cx * 0.03, vy = 180;
    for (let r = 10; r > 0; r--) { ctx.beginPath(); ctx.arc(vx, vy, r * 26, 0, 7); ctx.fillStyle = r % 2 ? U.rgba(p.near, 0.25) : U.rgba('#000000', 0.25); ctx.fill(); }
    ctx.save(); ctx.translate(vx, vy); ctx.rotate(t * 0.4);
    ctx.strokeStyle = U.rgba(p.accent, 0.6); ctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); for (let a = 0; a < 6; a += 0.2) ctx.lineTo(Math.cos(a) * a * 40, Math.sin(a) * a * 40); ctx.stroke(); }
    ctx.restore();
    layer(ctx, cx, 0.3, 300, (x, i, h) => {
      const y = 260 + h * 160 + Math.sin(t + i) * 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y); ctx.lineTo(x + 60, y + 50); ctx.lineTo(x + 40, y + 70); ctx.lineTo(x + 20, y + 40); ctx.closePath(); Sp().fillStroke(ctx, '#140b20', 4);
      ctx.fillStyle = p.top; ctx.fillRect(x + 4, y + 2, 82, 6);
    });
  };
  BG.underwater = (ctx, p, cx, t, c) => {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; const x = ((i * 240 - cx * 0.1) % (W + 200)) - 100; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 80, 0); ctx.lineTo(x + 220, H); ctx.lineTo(x + 140, H); ctx.closePath(); ctx.fill(); }
    hillsBand(ctx, cx, 0.15, H - 110, 80, p.far, 0.006);
    layer(ctx, cx, 0.35, 120, (x, i, h) => {
      // corales/anémonas
      if (h < 0.3) return; const b = H - 40, n = 3 + Math.floor(h * 3);
      for (let k = 0; k < n; k++) { ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + k * 10, b); ctx.quadraticCurveTo(x + k * 10 + Math.sin(t * 2 + k) * 12, b - 50, x + k * 10 + Math.sin(t * 2 + k + 1) * 8, b - 70 - h * 40); ctx.stroke(); ctx.strokeStyle = k % 2 ? p.near : p.accent; ctx.lineWidth = 5; ctx.stroke(); }
    });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 25; i++) { const x = (U.hash(i) * W + Math.sin(t + i) * 10), y = H - ((t * 40 * (0.5 + U.hash(i + 3)) + U.hash(i + 7) * H) % H); ctx.beginPath(); ctx.arc(x, y, 2 + U.hash(i + 1) * 3, 0, 7); ctx.fill(); }
  };
  BG.jungle = (ctx, p, cx, t, c) => {
    if (c) stars(ctx, cx, t, 30, '#d199ff');
    hillsBand(ctx, cx, 0.12, H - 170, 100, p.far, 0.006);
    layer(ctx, cx, 0.3, 190, (x, i, h) => {
      // setas gigantes
      const sh = 120 + h * 160, b = H - 40, cw = 90 + h * 70;
      Sp().rr(ctx, x - 12, b - sh, 24, sh, 8); Sp().fillStroke(ctx, p.accent, 4);
      ctx.beginPath(); ctx.moveTo(x - cw / 2, b - sh + 10); ctx.bezierCurveTo(x - cw / 2, b - sh - cw * 0.55, x + cw / 2, b - sh - cw * 0.55, x + cw / 2, b - sh + 10); ctx.closePath();
      Sp().fillStroke(ctx, h > 0.5 ? p.top : p.brick, 4);
      ctx.fillStyle = '#fff'; [[-0.2, -0.25], [0.18, -0.18], [0, -0.38]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(x + u * cw, b - sh + v * cw, cw * 0.07, 0, 7); ctx.fill(); });
    });
    hillsBand(ctx, cx, 0.5, H - 40, 40, p.near, 0.02, true);
    if (c) { ctx.fillStyle = 'rgba(209,153,255,0.6)'; for (let i = 0; i < 30; i++) { const x = (U.hash(i) * W + t * 15 * (U.hash(i + 2) - 0.5) * 4 + W) % W, y = (U.hash(i + 5) * H + Math.sin(t + i) * 20); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } }
  };
  BG.sky = (ctx, p, cx, t, c) => {
    if (c) stars(ctx, cx, t, 50);
    layer(ctx, cx, 0.05, 260, (x, i, h) => cloud(ctx, x, 60 + h * 120, 0.6 + h * 0.4, p.far, false));
    layer(ctx, cx, 0.18, 340, (x, i, h) => cloud(ctx, x, 230 + h * 120, 1.3 + h * 0.6, p.mid, h > 0.5));
    // arcoíris
    const rx = W * 0.3 - cx * 0.04; ['#ff4f4f', '#ffae00', '#ffe600', '#4fe36b', '#4fb2ff', '#9a4dff'].forEach((col, k) => { ctx.strokeStyle = U.rgba(col, 0.5); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(rx, H, 380 - k * 12, Math.PI, 0); ctx.stroke(); });
    layer(ctx, cx, 0.4, 300, (x, i, h) => cloud(ctx, x, H - 40 + h * 20, 1.8, p.near, false));
  };
  BG.volcano = (ctx, p, cx, t, c) => {
    const vx = W * 0.55 - cx * 0.06;
    ctx.beginPath(); ctx.moveTo(vx - 360, H); ctx.lineTo(vx - 70, H - 330); ctx.lineTo(vx + 70, H - 330); ctx.lineTo(vx + 360, H); ctx.closePath(); Sp().fillStroke(ctx, p.far, 4);
    ctx.fillStyle = p.liquid; ctx.beginPath(); ctx.moveTo(vx - 70, H - 330); ctx.lineTo(vx + 70, H - 330); ctx.lineTo(vx + 40, H - 290); ctx.lineTo(vx + 10, H - 250); ctx.lineTo(vx - 30, H - 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(80,60,60,0.6)'; for (let i = 0; i < 6; i++) { const y = H - 360 - ((t * 30 + i * 60) % 300); ctx.beginPath(); ctx.arc(vx + Math.sin(t + i) * 30, y, 20 + (H - 360 - y) * 0.1, 0, 7); ctx.fill(); }
    hillsBand(ctx, cx, 0.3, H - 70, 70, p.mid, 0.01, true);
    ctx.fillStyle = p.liquidTop; for (let i = 0; i < 20; i++) { const x = (U.hash(i) * W + Math.sin(t + i) * 30), y = H - ((t * 60 * (0.5 + U.hash(i + 1)) + U.hash(i + 4) * H) % H); ctx.fillRect(x, y, 3, 3); }
  };
  BG.factory = (ctx, p, cx, t, c) => {
    layer(ctx, cx, 0.15, 160, (x, i, h) => {
      const bh = 150 + h * 200; ctx.fillStyle = p.far; ctx.fillRect(x, H - bh, 120, bh);
      ctx.fillStyle = p.mid; ctx.fillRect(x + 20, H - bh - 60, 24, 60);
      ctx.fillStyle = 'rgba(200,200,200,0.15)'; ctx.beginPath(); ctx.arc(x + 32 + Math.sin(t + i) * 6, H - bh - 80 - ((t * 20) % 40), 16, 0, 7); ctx.fill();
    });
    // engranajes
    layer(ctx, cx, 0.3, 340, (x, i, h) => {
      const gx = x + 100, gy = 140 + h * 220, r = 40 + h * 30;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * (i % 2 ? 0.5 : -0.5));
      ctx.beginPath(); for (let k = 0; k < 20; k++) { const rr = k % 2 ? r : r + 12, a = (k * Math.PI) / 10; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
      Sp().fillStroke(ctx, p.mid, 4); ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); Sp().fillStroke(ctx, p.far, 3.5);
      ctx.restore();
    });
    // logo PixelStar / MadStars
    layer(ctx, cx, 0.22, 900, (x) => {
      const y = 70; Sp().rr(ctx, x, y, 220, 60, 10); Sp().fillStroke(ctx, '#131820', 4);
      Sp().star(ctx, x + 32, y + 30, 18, 8, 5, -Math.PI / 2); Sp().fillStroke(ctx, c ? '#ff2fd6' : '#ffd000', 3);
      ctx.font = 'bold 24px "Trebuchet MS",sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = c ? '#ff2fd6' : '#00e5ff';
      ctx.fillText(c ? 'MadStars' : 'PixelStar', x + 60, y + 31);
    });
    ctx.fillStyle = p.near; ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = c ? '#ff2f4f' : '#ffd000';
    layer(ctx, cx, 0.5, 60, (x) => { ctx.beginPath(); ctx.moveTo(x, H - 40); ctx.lineTo(x + 30, H - 40); ctx.lineTo(x + 10, H); ctx.lineTo(x - 20, H); ctx.fill(); });
    if (c && Math.sin(t * 5) > 0.6) { ctx.fillStyle = 'rgba(255,47,79,0.1)'; ctx.fillRect(0, 0, W, H); }
  };
  // ----- fondos de los mapas nuevos -----
  BG.casino = (ctx, p, cx, t, c) => {
    stars(ctx, cx, t, 50, '#ffd27a');
    // letreros de neón al fondo
    layer(ctx, cx, 0.12, 300, (x, i, h) => {
      const on = (Math.sin(t * 3 + i) > (c ? 0.2 : -0.2));
      const neon = ['#ff3b3b', '#ffd000', '#2fd46a'];
      const col = on ? (c ? '#ff2fd6' : neon[((i % 3) + 3) % 3]) : 'rgba(80,40,40,0.5)';
      Sp().rr(ctx, x, 70 + h * 120, 120, 44, 10); Sp().fillStroke(ctx, '#140a28', 4);
      ctx.fillStyle = col; for (let k = 0; k < 4; k++) ctx.fillRect(x + 12 + k * 26, 84 + h * 120, 16, 16);
    });
    // casino edificio
    layer(ctx, cx, 0.3, 360, (x, i, h) => {
      const bh = 160 + h * 120, y = H - 50 - bh;
      Sp().rr(ctx, x, y, 180, bh + 50, [14, 14, 0, 0]); Sp().fillStroke(ctx, p.mid, 4);
      // ruleta girando en la fachada
      ctx.save(); ctx.translate(x + 90, y + 70); ctx.rotate(t * 1.2);
      for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = k % 2 ? (c ? '#ff2fd6' : '#e8323f') : '#140a28'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 40, 0, Math.PI / 6); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(x + 90, y + 70, 40, 0, 7); ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.stroke();
    });
    ctx.fillStyle = p.near; ctx.fillRect(0, H - 50, W, 50);
    // cartas flotando
    layer(ctx, cx, 0.5, 120, (x, i, h) => { if (h < 0.5) return; ctx.save(); ctx.translate(x, H - 70 + Math.sin(t * 2 + i) * 6); ctx.rotate(Math.sin(t + i) * 0.2); Sp().rr(ctx, -10, -14, 20, 28, 3); Sp().fillStroke(ctx, '#fff', 2.5); ctx.fillStyle = i % 2 ? '#e8323f' : '#140a28'; ctx.fillText(i % 2 ? '♥' : '♠', -5, -2); ctx.restore(); });
  };
  BG.clock = (ctx, p, cx, t, c) => {
    if (c) stars(ctx, cx, t, 40, '#bff0ff');
    // engranajes grandes de fondo
    layer(ctx, cx, 0.15, 300, (x, i, h) => {
      const gx = x + 80, gy = 120 + h * 200, r = 46 + h * 34;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * (c ? (i % 2 ? 1.1 : -1.1) : (i % 2 ? 0.4 : -0.4)));
      ctx.beginPath(); for (let k = 0; k < 20; k++) { const rr = k % 2 ? r : r + 12, a = (k * Math.PI) / 10; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
      Sp().fillStroke(ctx, p.mid, 4); ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); Sp().fillStroke(ctx, p.far, 3.5); ctx.restore();
    });
    // reloj grande con manecillas
    const rx = W * 0.72 - cx * 0.05, ry = 150, R = 90;
    ctx.beginPath(); ctx.arc(rx, ry, R, 0, 7); Sp().fillStroke(ctx, '#f0ead0', 5);
    ctx.fillStyle = '#140a28'; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.fillRect(rx + Math.cos(a) * (R - 12) - 2, ry + Math.sin(a) * (R - 12) - 2, 4, 4); }
    const hr = t * 0.5, mn = t * 2;
    ctx.strokeStyle = '#140a28'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(hr - Math.PI / 2) * R * 0.5, ry + Math.sin(hr - Math.PI / 2) * R * 0.5); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(mn - Math.PI / 2) * R * 0.8, ry + Math.sin(mn - Math.PI / 2) * R * 0.8); ctx.stroke();
    hillsBand(ctx, cx, 0.3, H - 80, 70, p.mid, 0.009, true);
  };
  BG.disco = (ctx, p, cx, t, c) => {
    // pista con focos de colores
    const cols = ['#ff2fd6', '#00e5ff', '#ffe600', '#4fe36b'];
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.globalAlpha = 0.18 + (Math.sin(t * 4 + k) * 0.5 + 0.5) * 0.22;
      const bx = W * (0.2 + k * 0.2); ctx.fillStyle = cols[k];
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx - 120, H); ctx.lineTo(bx + 120, H); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // bola de discoteca
    const bx = W * 0.5 - cx * 0.04;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, 50); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, 78, 30, 0, 7); Sp().fillStroke(ctx, '#aab4c8', 3);
    for (let a = 0; a < 7; a += 0.5) for (let b = 0.3; b < 3; b += 0.6) { ctx.fillStyle = (Math.sin(t * 6 + a + b) > 0 ? '#fff' : '#8a94a8'); ctx.fillRect(bx + Math.cos(a) * 26 * Math.sin(b), 78 + Math.cos(b) * 26, 5, 5); }
    // altavoces que laten (al ritmo ~tempo)
    const beat = 1 + Math.max(0, Math.sin(t * 7)) * 0.12;
    layer(ctx, cx, 0.3, 340, (x, i, h) => {
      const y = H - 60 - 120, w = 90, hh = 160; ctx.save(); ctx.translate(x + w / 2, y + hh); ctx.scale(beat, beat); ctx.translate(-(x + w / 2), -(y + hh));
      Sp().rr(ctx, x, y, w, hh, 8); Sp().fillStroke(ctx, p.mid, 4);
      [[0.5, 0.3, 24], [0.5, 0.7, 16]].forEach(([u, v, r]) => { ctx.beginPath(); ctx.arc(x + u * w, y + v * hh, r, 0, 7); Sp().fillStroke(ctx, '#140a28', 3); ctx.beginPath(); ctx.arc(x + u * w, y + v * hh, r * 0.5, 0, 7); ctx.fillStyle = p.accent; ctx.fill(); });
      ctx.restore();
    });
    ctx.fillStyle = p.near; ctx.fillRect(0, H - 50, W, 50);
  };
  BG.hub = (ctx, p, cx, t, c) => {
    stars(ctx, cx, t, 60, '#b0ffe8');
    // portales dimensionales
    layer(ctx, cx, 0.2, 320, (x, i, h) => {
      const gx = x + 100, gy = 150 + h * 140, R = 50 + h * 30;
      for (let r = R; r > 0; r -= 10) { ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fillStyle = (r / 10) % 2 ? U.rgba(p.accent, 0.18) : U.rgba(c ? '#ff2fd6' : p.top, 0.18); ctx.fill(); }
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.8); ctx.strokeStyle = U.rgba(p.top, 0.6); ctx.lineWidth = 3;
      for (let a = 0; a < 6; a += 0.3) ctx.lineTo(Math.cos(a) * a * 8, Math.sin(a) * a * 8); ctx.stroke(); ctx.restore();
    });
    // cristales verdes flotantes
    layer(ctx, cx, 0.4, 200, (x, i, h) => {
      if (h < 0.4) return; const y = H - 120 + Math.sin(t * 1.5 + i) * 14;
      ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 30); ctx.lineTo(x - 16, y); ctx.closePath(); Sp().fillStroke(ctx, c ? '#ff2fd6' : p.top, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x, y - 20); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill();
    });
    hillsBand(ctx, cx, 0.3, H - 70, 60, p.mid, 0.01, true);
  };

  S.View.BackgroundView = {
    draw(ctx, theme, mode, camX, t) {
      const pal = S.Model.Themes.palette(theme, mode);
      const c = mode === 'corrupt';
      sky(ctx, pal);
      ctx.save();
      (BG[theme.bg] || BG.hills)(ctx, pal, camX, t, c);
      ctx.restore();
      if (c && theme.night) {
        // noche: velo azul marino suave
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,10,40,0.0)'); g.addColorStop(1, 'rgba(5,10,40,0.3)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else if (c) {
        // velo corrupto: neblina violeta + ojos que parpadean en el fondo
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(60,0,90,0.0)'); g.addColorStop(1, 'rgba(60,0,90,0.35)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 4; i++) {
          const blink = Math.sin(t * 0.7 + i * 2) > 0.92;
          const x = ((U.hash(i + 40) * 3000 - camX * 0.1) % W + W) % W, y = 60 + U.hash(i + 41) * 200;
          if (!blink) { ctx.fillStyle = 'rgba(255,47,214,0.55)'; ctx.fillRect(x, y, 8, 8); ctx.fillRect(x + 12, y + 5, 9, 9); }
        }
      }
    }
  };
})(window.SGM);
