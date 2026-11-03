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

  // =====================================================================
  //  PERSONALIDAD DEL MODO CORRUPTO, una por mapa (sustituye a los ojos genéricos).
  //  back(): detrás del mundo, sobre el fondo normal del mapa.
  //  front(): por delante de todo (lluvia, ceniza, destellos...). Sin destellos fuertes:
  //  los flashes van con alfa baja para no molestar a la vista.
  // =====================================================================
  const wrapX = (x) => ((x % W) + W) % W;
  function rays(ctx, x, y, n, r, rot, a, b) {
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a1); ctx.closePath(); ctx.fillStyle = i % 2 ? a : b; ctx.fill();
    }
  }
  function beam(ctx, x, y, ang, len, w, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-w, -len); ctx.lineTo(w, -len); ctx.lineTo(6, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  function veil(ctx, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function clockFace(ctx, x, y, r, a1, a2, col) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = U.rgba(col, 0.18); ctx.fill(); ctx.strokeStyle = U.rgba(col, 0.7); ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = U.rgba(col, 0.9); ctx.lineCap = 'round';
    [[a1, r * 0.8, 3], [a2, r * 0.55, 5]].forEach(([a, l, w]) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); });
  }
  // Ciclo día/noche (Enredados Nublásticos Corrupto): 0 = día, 1 = noche
  const dayNight = (t) => U.clamp(0.5 - Math.cos(t * (Math.PI * 2 / 24)) * 0.7, 0, 1);

  const CORRUPT = {
    // Gelatina loca: el fondo tiembla como gelatina, burbujas rosas suben y gotas gigantes botan
    lake: {
      pre(ctx, t) { const k = Math.sin(t * 5.2) * 0.018; ctx.translate(0, H); ctx.scale(1 - k * 0.5, 1 + k); ctx.translate(0, -H); },
      back(ctx, p, cx, t) {
        veil(ctx, 'rgba(255,60,170,0.05)', 'rgba(120,0,90,0.3)');
        layer(ctx, cx, 0.25, 260, (x, i, h) => { const by = H - 150 - Math.abs(Math.sin(t * 2.4 + i)) * (60 + h * 80), s = 1 - Math.max(0, Math.cos(t * 2.4 + i)) * 0.25; Sp().globPath(ctx, x, by - 30 * s, 50, 30 * s); Sp().fillStroke(ctx, U.rgba('#ff4fa0', 0.75), 3); });
        for (let i = 0; i < 24; i++) { const x = wrapX(U.hash(i) * 1600 - cx * 0.2 + Math.sin(t + i) * 10), y = H - ((t * (30 + U.hash(i + 5) * 40) + U.hash(i + 9) * H) % H); ctx.beginPath(); ctx.arc(x, y, 3 + U.hash(i + 3) * 6, 0, 7); ctx.strokeStyle = 'rgba(255,170,220,0.7)'; ctx.lineWidth = 2; ctx.stroke(); }
      }
    },
    // Apagón: focos de búsqueda que barren el cielo y carteles de neón que se funden
    city: {
      back(ctx, p, cx, t) {
        for (let i = 0; i < 3; i++) beam(ctx, wrapX(200 + i * 340 - cx * 0.15), H - 40, Math.sin(t * 0.6 + i * 2) * 0.6, H, 70, 'rgba(255,240,170,0.22)');
        layer(ctx, cx, 0.3, 330, (x, i, h) => {
          const on = Math.sin(t * (3 + h * 5) + i * 7) > -0.2 || (t * 10 + i) % 7 < 0.3;
          if (!on) return; const col = ['#ff2fd6', '#00e5ff', '#ffd000'][i % 3 < 0 ? 0 : Math.abs(i) % 3];
          ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.strokeStyle = col; ctx.lineWidth = 4; Sp().rr(ctx, x + 20, 190 + h * 80, 70, 26, 8); ctx.stroke();
          ctx.fillStyle = col; ctx.font = 'bold 14px "Trebuchet MS",sans-serif'; ctx.fillText(['OPEN', 'GLOB', '24h', 'PYCE'][Math.abs(i) % 4], x + 32, 208 + h * 80); ctx.shadowBlur = 0;
        });
      }
    },
    // Marejada: tormenta en el mar, relámpagos y lluvia (los relámpagos van con destello suave)
    seaside: {
      back(ctx, p, cx, t) {
        veil(ctx, 'rgba(10,20,50,0.35)', 'rgba(20,40,80,0.2)');
        layer(ctx, cx, 0.1, 240, (x, i, h) => cloud(ctx, x, 50 + h * 60, 1.2 + h * 0.6, '#2b3048', false));
        const ph = t % 6.5;
        if (ph < 0.25) { ctx.strokeStyle = 'rgba(230,240,255,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); let bx = 300 + (Math.floor(t / 6.5) * 337) % 500, by = 80; ctx.moveTo(bx, by); while (by < H - 160) { bx += U.rand(-30, 30); by += U.rand(20, 40); ctx.lineTo(bx, by); } ctx.stroke(); }
        ctx.fillStyle = 'rgba(40,70,120,0.8)'; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H - 160 - Math.max(0, Math.sin((x + cx * 0.3) * 0.012 - t * 2.2)) * 50); ctx.lineTo(W, H); ctx.fill();
      },
      front(ctx, cx, t) {
        ctx.strokeStyle = 'rgba(180,200,255,0.45)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 70; i++) { const x = wrapX(U.hash(i) * W * 3 - t * 300 - cx * 0.4), y = (U.hash(i + 50) * H + t * 900) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18); ctx.stroke(); }
        if (t % 6.5 < 0.25) { ctx.fillStyle = 'rgba(220,230,255,0.12)'; ctx.fillRect(0, 0, W, H); }
      }
    },
    // Aridez Escalofriante: tormenta de arena y fantasmas que cruzan el horizonte
    ruins: {
      back(ctx, p, cx, t) {
        layer(ctx, cx, 0.18, 300, (x, i, h) => {
          const gx = x + Math.sin(t * 0.8 + i) * 30, gy = 160 + h * 120 + Math.sin(t * 1.6 + i) * 12;
          ctx.globalAlpha = 0.35 + Math.sin(t + i) * 0.15; ctx.fillStyle = '#e8f0ff';
          ctx.beginPath(); ctx.arc(gx, gy, 22, Math.PI, 0); for (let k = 0; k <= 4; k++) ctx.lineTo(gx + 22 - k * 11, gy + 30 + (k % 2) * 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#0a0a0a'; ctx.fillRect(gx - 9, gy - 6, 5, 7); ctx.fillRect(gx + 4, gy - 6, 5, 7); ctx.globalAlpha = 1;
        });
      },
      front(ctx, cx, t) {
        ctx.fillStyle = 'rgba(230,180,120,0.35)';
        for (let i = 0; i < 40; i++) { const x = wrapX(U.hash(i) * W * 2 + t * 260 - cx * 0.5), y = U.hash(i + 30) * H; ctx.fillRect(x, y, 14 + U.hash(i + 2) * 20, 1.5); }
        veil(ctx, 'rgba(160,110,60,0.08)', 'rgba(120,70,30,0.18)');
      }
    },
    // Pesadilla en el Circo: rayos giratorios rojos y morados, focos y confeti
    circus: {
      back(ctx, p, cx, t) {
        ctx.globalAlpha = 0.45; rays(ctx, W / 2 - cx * 0.05 % 200, H * 0.55, 18, W, t * 0.9, '#ff2f4f', '#4a0f6a'); ctx.globalAlpha = 1;
        [0.2, 0.8].forEach((u, i) => beam(ctx, W * u, H, Math.sin(t * 2.2 + i * 3) * 0.7, H * 1.1, 90, 'rgba(255,230,120,0.25)'));
      },
      front(ctx, cx, t) {
        const cols = ['#ff2f4f', '#ffd000', '#2fd46a', '#3b8bff', '#ff4fd8'];
        for (let i = 0; i < 40; i++) { const x = wrapX(U.hash(i) * W * 2 + Math.sin(t * 2 + i) * 30 - cx * 0.6), y = (U.hash(i + 9) * H + t * (60 + U.hash(i) * 60)) % H; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4 + i); ctx.fillStyle = cols[i % 5]; ctx.globalAlpha = 0.8; ctx.fillRect(-3, -1.5, 6, 3); ctx.restore(); }
      }
    },
    // Ventisca: aurora boreal ondulante sobre la noche
    snow: {
      back(ctx, p, cx, t) {
        ['rgba(80,255,180,0.22)', 'rgba(120,160,255,0.2)', 'rgba(220,120,255,0.16)'].forEach((col, k) => {
          ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 80 + k * 34 + Math.sin(x * 0.008 + t * 0.7 + k) * 30 + Math.sin(x * 0.02 - t * 1.3) * 10; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, 150 + k * 34 + Math.sin(x * 0.008 + t * 0.7 + k) * 30);
          ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        });
      }
    },
    // Vórtice del Vacío: un remolino gigante que gira y escombros que suben (gravedad lunar)
    vortex: {
      back(ctx, p, cx, t) {
        const x = W * 0.6 - (cx * 0.04) % 300, y = H * 0.4;
        for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.4 + k * 0.15)); ctx.strokeStyle = U.rgba(k % 2 ? '#b58cff' : '#ff4df0', 0.35); ctx.lineWidth = 6 - k * 0.6; ctx.beginPath(); for (let a = 0; a < 9; a += 0.15) ctx.lineTo(Math.cos(a + k) * a * (12 + k * 3), Math.sin(a + k) * a * (12 + k * 3) * 0.6); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 26, 16, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 16; i++) { const rx = wrapX(U.hash(i) * W * 2 - cx * 0.25), ry = H - ((t * (14 + U.hash(i + 1) * 20) + U.hash(i + 2) * H) % (H + 60)); ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 0.5 + i); Sp().rr(ctx, -8 - U.hash(i) * 8, -6, 16 + U.hash(i) * 16, 12, 3); Sp().fillStroke(ctx, '#2a0a45', 2.5); ctx.restore(); }
      }
    },
    // Abismo sin Fondo: cuanto más abajo más oscuro; medusas bioluminiscentes y cebos de rape
    underwater: {
      back(ctx, p, cx, t) {
        veil(ctx, 'rgba(0,0,20,0.15)', 'rgba(0,0,10,0.7)');
        layer(ctx, cx, 0.2, 220, (x, i, h) => {
          const jx = x + Math.sin(t * 0.5 + i) * 20, jy = 120 + h * 260 - ((t * 12 + i * 40) % 80);
          const glow = ctx.createRadialGradient(jx, jy, 0, jx, jy, 40); glow.addColorStop(0, 'rgba(120,255,230,0.5)'); glow.addColorStop(1, 'rgba(120,255,230,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(jx, jy, 40, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(150,255,235,0.7)'; ctx.beginPath(); ctx.arc(jx, jy, 14, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(150,255,235,0.5)'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(jx + k * 5, jy); ctx.quadraticCurveTo(jx + k * 5 + Math.sin(t * 3 + k) * 6, jy + 16, jx + k * 5, jy + 30); ctx.stroke(); }
        });
        for (let i = 0; i < 5; i++) { const on = Math.sin(t * 1.3 + i * 2) > 0.3; if (!on) continue; const x = wrapX(U.hash(i + 70) * 2200 - cx * 0.35), y = H - 140 + U.hash(i + 71) * 80; ctx.fillStyle = '#fff6a0'; ctx.shadowColor = '#fff6a0'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      }
    },
    // Setas Alucinógenas: anillos de colores que laten, esporas y el color del mundo que cambia
    jungle: {
      back(ctx, p, cx, t) {
        const x = W / 2, y = H * 0.45;
        for (let r = 520; r > 0; r -= 40) { ctx.beginPath(); ctx.arc(x, y, r + Math.sin(t * 3 - r * 0.02) * 12, 0, 7); ctx.fillStyle = `hsla(${(t * 60 + r) % 360},90%,60%,0.13)`; ctx.fill(); }
      },
      front(ctx, cx, t) {
        for (let i = 0; i < 30; i++) { const x = wrapX(U.hash(i) * W * 2 + Math.sin(t + i) * 40 - cx * 0.5), y = (U.hash(i + 4) * H - t * 25) % H; ctx.fillStyle = `hsla(${(i * 40 + t * 90) % 360},100%,70%,0.6)`; ctx.beginPath(); ctx.arc(x, y < 0 ? y + H : y, 2.5, 0, 7); ctx.fill(); }
        ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `hsla(${(t * 40) % 360},90%,50%,0.18)`; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
    },
    // Espejo: el cielo pasa del día a la noche y vuelta (ciclo de ~24 s)
    sky: {
      back(ctx, p, cx, t) {
        const n = dayNight(t); if (n <= 0.01) return;
        ctx.fillStyle = `rgba(8,12,40,${n * 0.75})`; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = n; stars(ctx, cx, t, 70); moon(ctx, W * 0.75, 100 + (1 - n) * 120, 40, t); ctx.globalAlpha = 1;
      }
    },
    // Erupción Total: cielo rojo que late, volcán al fondo escupiendo lava y lluvia de ceniza
    volcano: {
      back(ctx, p, cx, t) {
        const beat = 0.5 + 0.5 * Math.sin(t * 2.2);
        ctx.fillStyle = `rgba(255,60,0,${0.08 + beat * 0.12})`; ctx.fillRect(0, 0, W, H);
        const vx = W * 0.5 - (cx * 0.06) % 400;
        ctx.beginPath(); ctx.moveTo(vx - 260, H - 120); ctx.lineTo(vx - 50, H - 330); ctx.lineTo(vx + 50, H - 330); ctx.lineTo(vx + 260, H - 120); ctx.closePath(); Sp().fillStroke(ctx, '#2a0f0a', 4);
        for (let i = 0; i < 26; i++) { const k = ((t * 0.7 + U.hash(i)) % 1), ang = -Math.PI / 2 + (U.hash(i + 3) - 0.5) * 1.2, sp = 260 + U.hash(i + 5) * 120; const x = vx + Math.cos(ang) * sp * k, y = H - 330 + Math.sin(ang) * sp * k + 300 * k * k; ctx.fillStyle = k < 0.6 ? '#ffb000' : '#ff4a00'; ctx.beginPath(); ctx.arc(x, y, 5 - k * 3, 0, 7); ctx.fill(); }
      },
      front(ctx, cx, t) { ctx.fillStyle = 'rgba(60,50,50,0.55)'; for (let i = 0; i < 50; i++) { const x = wrapX(U.hash(i) * W * 2 - cx * 0.5 + Math.sin(t + i) * 20), y = (U.hash(i + 7) * H + t * 50) % H; ctx.fillRect(x, y, 2.5, 2.5); } }
    },
    // Fábrica MadStars: rojo, negro y blanco. Balizas de alarma giratorias, franjas de peligro
    // y estrellas furiosas en los monitores del fondo.
    factory: {
      back(ctx, p, cx, t) {
        layer(ctx, cx, 0.2, 260, (x, i, h) => { beam(ctx, x + 60, 70, Math.sin(t * 3 + i) * 1.4, 420, 60, 'rgba(255,31,58,0.28)'); ctx.beginPath(); ctx.arc(x + 60, 70, 14, Math.PI, 0); Sp().fillStroke(ctx, '#ff1f3a', 3); });
        const sy = H - 205; ctx.save(); ctx.beginPath(); ctx.rect(0, sy, W, 26); ctx.clip(); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, sy, W, 26);
        ctx.fillStyle = '#0a0a0a'; const off = (cx * 0.3 + t * 40) % 52; for (let x = -52; x < W + 52; x += 52) { ctx.beginPath(); ctx.moveTo(x - off, sy + 26); ctx.lineTo(x - off + 26, sy); ctx.lineTo(x - off + 52, sy); ctx.lineTo(x - off + 26, sy + 26); ctx.closePath(); ctx.fill(); } ctx.restore();
        ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 4; ctx.strokeRect(-4, sy, W + 8, 26);
        layer(ctx, cx, 0.35, 300, (x, i, h) => { if (h < 0.4) return; const y = 260 + h * 60; Sp().rr(ctx, x, y, 90, 64, 6); Sp().fillStroke(ctx, '#0a0a0a', 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 8, y + 8, 74, 48); Sp().star(ctx, x + 45, y + 32, 18, 8, 5, -Math.PI / 2 + Math.sin(t * 6 + i) * 0.2); Sp().fillStroke(ctx, '#ff1f3a', 3); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x + 36, y + 28, 5, 3); ctx.fillRect(x + 49, y + 28, 5, 3); });
      },
      front(ctx, cx, t) { const a = Math.max(0, Math.sin(t * 3)) * 0.08; if (a > 0) { ctx.fillStyle = `rgba(255,31,58,${a})`; ctx.fillRect(0, 0, W, H); } }
    },
    // Ruleta Loca: ruleta gigante girando al fondo, bombillas de marquesina y cartas/fichas cayendo
    casino: {
      back(ctx, p, cx, t) {
        const x = W * 0.5 - (cx * 0.05) % 300, y = H * 0.42, R = 170;
        rays(ctx, x, y, 36, R, t * 1.6, '#c0282f', '#141414'); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 10; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 28, 0, 7); Sp().fillStroke(ctx, '#ffd000', 4);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + Math.cos(-t * 3) * (R - 22), y + Math.sin(-t * 3) * (R - 22), 7, 0, 7); ctx.fill();
        for (let i = 0; i < 26; i++) { const on = (Math.floor(t * 8) + i) % 3 === 0; ctx.fillStyle = on ? '#fff27a' : '#6a4a10'; ctx.beginPath(); ctx.arc(20 + i * 40, 26, 6, 0, 7); ctx.fill(); }
        for (let i = 0; i < 12; i++) { const fx = wrapX(U.hash(i) * W * 2 - cx * 0.3), fy = (U.hash(i + 3) * H + t * 70) % H; ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 2 + i); if (i % 2) { Sp().rr(ctx, -9, -13, 18, 26, 3); Sp().fillStroke(ctx, '#fff', 2); ctx.fillStyle = '#e8323f'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('♥', -5, 5); } else { ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); Sp().fillStroke(ctx, ['#2f7bff', '#2fd46a', '#e8323f'][i % 3], 2); } ctx.restore(); }
      }
    },
    // Paradoja: relojes que corren hacia atrás (unos rápido, otros lento) y ondas temporales
    clock: {
      back(ctx, p, cx, t) {
        layer(ctx, cx, 0.2, 260, (x, i, h) => { const sp = (h > 0.5 ? 3 : 0.4); clockFace(ctx, x + 80, 140 + h * 180, 40 + h * 30, -t * sp * 6, -t * sp * 0.5, '#ffd27a'); });
        for (let k = 0; k < 3; k++) { const r = ((t * 90 + k * 200) % 600); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.strokeStyle = `rgba(160,220,255,${0.35 * (1 - r / 600)})`; ctx.lineWidth = 3; ctx.stroke(); }
      },
      front(ctx, cx, t) { ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = `rgba(150,110,60,${0.15 + 0.12 * Math.sin(t * 0.8)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    },
    // A Todo Volumen: ecualizador gigante al ritmo, láseres y un pulso suave en cada golpe
    disco: {
      back(ctx, p, cx, t, theme) {
        const bps = ((theme && theme.music.tempo) || 140) / 60, beat = 1 - ((t * bps) % 1);
        for (let i = 0; i < 4; i++) beam(ctx, W * (0.15 + i * 0.23), H, Math.sin(t * 1.4 + i * 1.7) * 0.9, H * 1.2, 8, ['rgba(255,47,214,0.6)', 'rgba(0,229,255,0.6)', 'rgba(255,230,0,0.6)', 'rgba(47,212,106,0.6)'][i]);
        const n = 32, bw = W / n;
        for (let i = 0; i < n; i++) { const hh = (0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + t * 2.3)) * (0.5 + beat * 0.5)) * 220; ctx.fillStyle = `hsla(${(i * 11 + t * 50) % 360},90%,55%,0.55)`; for (let s = 0; s < hh; s += 14) ctx.fillRect(i * bw + 3, H - 90 - s, bw - 6, 10); }
      },
      front(ctx, cx, t, theme) { const bps = ((theme && theme.music.tempo) || 140) / 60, beat = 1 - ((t * bps) % 1); ctx.fillStyle = `rgba(255,255,255,${beat * beat * 0.06})`; ctx.fillRect(0, 0, W, H); }
    },
    // Dimensión Sellada: grietas dimensionales que brillan, cadenas y portales que fallan
    hub: {
      back(ctx, p, cx, t) {
        layer(ctx, cx, 0.15, 340, (x, i, h) => {
          const gx = x + 120, gy = 120 + h * 200, glitch = Math.sin(t * 9 + i * 5) > 0.85 ? U.rand(-8, 8) : 0;
          ctx.strokeStyle = `rgba(63,255,160,${0.5 + Math.sin(t * 3 + i) * 0.3})`; ctx.lineWidth = 4; ctx.shadowColor = '#3fffa0'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.moveTo(gx + glitch, gy - 60); for (let k = 1; k <= 5; k++) ctx.lineTo(gx + glitch + (k % 2 ? 14 : -10) * (1 + h), gy - 60 + k * 24); ctx.stroke(); ctx.shadowBlur = 0;
        });
        ctx.strokeStyle = 'rgba(30,40,35,0.9)'; ctx.lineWidth = 5;
        [[0, 140, W, 220], [0, 320, W, 250]].forEach(([a, b, c2, d], k) => { for (let s = 0; s <= 1.0001; s += 0.04) { const x = a + (c2 - a) * s - (cx * 0.2 % 30), y = b + (d - b) * s + Math.sin(s * Math.PI) * 30; ctx.beginPath(); ctx.ellipse(x, y, 10, 6, (s + k) * 0.6, 0, 7); ctx.stroke(); } });
      }
    }
  };

  S.View.BackgroundView = {
    draw(ctx, theme, mode, camX, t) {
      const pal = S.Model.Themes.palette(theme, mode);
      const c = mode === 'corrupt', P = c ? CORRUPT[theme.id] : null;
      sky(ctx, pal);
      ctx.save();
      if (P && P.pre) P.pre(ctx, t);
      (BG[theme.bg] || BG.hills)(ctx, pal, camX, t, c);
      ctx.restore();
      if (c && theme.night) {
        // noche: velo azul marino suave
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,10,40,0.0)'); g.addColorStop(1, 'rgba(5,10,40,0.3)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (P && P.back) { ctx.save(); try { P.back(ctx, pal, camX, t, theme); } catch (e) { /* un fondo roto no para el juego */ } ctx.restore(); }
    },
    // Capa delantera del Corrupto (lluvia, ceniza, confeti, destellos suaves...)
    front(ctx, theme, mode, camX, t) {
      if (mode !== 'corrupt') return;
      const P = CORRUPT[theme.id];
      if (P && P.front) { ctx.save(); try { P.front(ctx, camX, t, theme); } catch (e) { /* idem */ } ctx.restore(); }
    },
    dayNight
  };
})(window.SGM);
