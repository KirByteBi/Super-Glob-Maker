/* Vista: dibuja una partida (GameModel) en el canvas */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const W = S.VIEW_W, H = S.VIEW_H;
  const TT = S.Model.Catalog.T;

  function drawTiles(ctx, level, pal, cam, t, opt) {
    opt = opt || {};
    const Sp = S.View.Sprites;
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(level.width - 1, Math.ceil((cam.x + cam.w) / T) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(level.height - 1, Math.ceil((cam.y + cam.h) / T) + 1);
    const bumps = {};
    (opt.bumps || []).forEach((b) => { bumps[b.x + ',' + b.y] = -Math.sin((b.t / 0.25) * Math.PI) * 8; });
    // estilos de semisólido del tema (A = semis[0], B = semis[1]); en Darkness Forest Corrupto son setas
    const theme = S.Model.Themes.get(level.theme);
    const sm = (theme && theme.semis) || [];
    const semiStyle = [sm[0] && sm[0][1], sm[1] && sm[1][1]];
    // primero líquidos/agua (detrás), luego el resto
    for (let pass = 0; pass < 2; pass++) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const tt = level.get(x, y);
        if (!tt) continue;
        const back = tt === TT.WATER;
        if ((pass === 0) !== back) continue;
        Sp.drawTile(ctx, level, x, y, tt, pal, t, { bump: bumps[x + ',' + y] || 0, editor: opt.editor, convDir: opt.convDir, semi: semiStyle, mush: opt.mush, poison: opt.poison });
        if (opt.editor && opt.contents && opt.contents[x + ',' + y]) drawContentBadge(ctx, x, y, opt.contents[x + ',' + y], pal, opt.ch);
      }
    }
  }
  function drawContentBadge(ctx, x, y, type, pal, ch) {
    const Sp = S.View.Sprites;
    ctx.save(); ctx.translate(x * T + T - 12, y * T - 4);
    ctx.beginPath(); ctx.arc(6, 6, 9, 0, 7); Sp.fillStroke(ctx, '#ffffff', 2);
    ctx.translate(-3, -3);
    if (type === 'coin') { Sp.coin(ctx, 9, 9, 6, 0); }
    else Sp.drawIcon(ctx, { kind: 'obj', type }, 18, pal, ch);
    ctx.restore();
  }

  function drawPlayer(ctx, p, t, game) {
    const Sp = S.View.Sprites;
    if (p.inv > 0 && Math.floor(p.inv * 15) % 2 === 0 && !p.dead) return;
    const D = p.drawSize();
    let path = p.formPath();
    if (p.changeT > 0 && p.prevForm && Math.floor(p.changeT * 14) % 2) path = p.prevForm;
    const img = S.View.Assets.get(path);
    const cx = p.x + p.w / 2, by = p.y + p.h;
    let sx = 1 + p.squash * 0.3, sy = 1 - p.squash * 0.3;
    if (p.onGround && Math.abs(p.vx) > 20) { const w = Math.sin(p.anim * 22) * 0.06; sx += w; sy -= w; }
    if (!p.onGround && !p.swimming && p.pound <= 0) { sy += U.clamp(-p.vy / 2500, -0.08, 0.12); sx -= U.clamp(-p.vy / 2500, -0.08, 0.12); }
    if (p.pound > 0 && p.poundWait > 0) { sx = 0.85; sy = 1.15; }
    ctx.save();
    ctx.translate(cx, by);
    if (p.dead) { ctx.translate(0, -p.h / 2); ctx.scale(1, -1); ctx.translate(0, p.h / 2); }
    if (p.pound > 0 && p.poundWait > 0) ctx.rotate(p.face * (0.18 - p.poundWait) * 35);
    ctx.scale(sx * (p.face > 0 ? -1 : 1), sy);
    if (p.star > 0) {
      ctx.shadowColor = `hsl(${(t * 600) % 360},100%,60%)`; ctx.shadowBlur = 18;
    }
    if (img) ctx.drawImage(img, -D / 2, -D * 0.955, D, D);
    else { Sp.globPath(ctx, -p.w / 2, -p.h, p.w, p.h); Sp.fillStroke(ctx, p.ch.color, 3); Sp.globFace(ctx, -p.w / 2, -p.h, p.w, p.h); }
    ctx.restore();
    if (p.star > 0 && Math.random() < 0.5 && game) S.events.emit('render:sparkle', { x: cx + U.rand(-15, 15), y: by - U.rand(0, p.h) });
  }

  class WorldRenderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.snow = []; for (let i = 0; i < 120; i++) this.snow.push({ x: Math.random() * W, y: Math.random() * H, s: U.rand(1, 3.5), v: U.rand(40, 120) }); }

    render(g, particles, t) {
      const ctx = this.ctx, cam = g.camera, fx = g.fx;
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      // Transformaciones del modo Corrupto
      if (fx.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      if (fx.flip) { ctx.translate(0, H); ctx.scale(1, -1); }
      S.View.BackgroundView.draw(ctx, g.theme, g.mode, cam.x, t);
      const shake = particles ? particles.shake : 0;
      ctx.save();
      ctx.translate(-Math.round(cam.x) + U.rand(-shake, shake), -Math.round(cam.y) + U.rand(-shake, shake));
      drawTiles(ctx, g.level, g.pal, cam, t, { bumps: g.bumps, convDir: g.convDir * g.obstacleMul, mush: !!g.fx.movingShrooms, poison: !!g.fx.poisonWater });
      if (g.goal) S.View.Sprites.goal(ctx, g.goal, t, g.player.ch.color);
      if (g.goalHidden) { ctx.save(); ctx.globalAlpha = 0.55; S.View.Sprites.goal(ctx, g.goalHidden, t, '#b44dff'); ctx.restore(); }
      const opt = { pal: g.pal, color: g.player.ch.color };
      g.entities.forEach((e) => {
        if (e.x + e.w > cam.x - 64 && e.x < cam.x + cam.w + 64) {
          if (e.ghost != null && e.enemy) { if (e.ghost <= 0.01) return; ctx.globalAlpha = e.ghost * (0.75 + Math.sin(t * 6 + e.spawnX) * 0.25); }
          S.View.Sprites.drawEntity(ctx, e, t, opt);
          ctx.globalAlpha = 1;
        }
      });
      drawPlayer(ctx, g.player, t, g);
      if (g.liquidY < g.baseLiquid) {
        ctx.fillStyle = U.rgba(g.pal.liquid, 0.9); ctx.fillRect(cam.x - 10, g.liquidY + 6, cam.w + 20, g.level.height * T);
        ctx.fillStyle = g.pal.liquidTop; ctx.beginPath(); ctx.moveTo(cam.x - 10, g.liquidY + 12);
        for (let x = cam.x - 10; x <= cam.x + cam.w + 20; x += 16) ctx.lineTo(x, g.liquidY + 6 + Math.sin(x * 0.05 + t * 3) * 4);
        ctx.lineTo(cam.x + cam.w + 20, g.liquidY + 14); ctx.closePath(); ctx.fill();
      }
      if (particles) particles.draw(ctx);
      ctx.restore();
      this.overlays(ctx, g, t);
      ctx.restore();
      if (particles && particles.flash > 0) { ctx.fillStyle = U.rgba(particles.flashColor, Math.min(0.7, particles.flash)); ctx.fillRect(0, 0, W, H); }
    }

    // Urbanistic Road Apagón: oscuridad casi total. Solo dan luz tu Glob y los proyectiles luminosos.
    darkness(ctx, g, t) {
      if (!this.dark) { this.dark = document.createElement('canvas'); this.dark.width = W; this.dark.height = H; this.darkCtx = this.dark.getContext('2d'); }
      const d = this.darkCtx, cam = g.camera, p = g.player;
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, W, H);
      d.fillStyle = 'rgba(2,3,12,0.975)'; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const light = (x, y, r) => {
        x -= cam.x; y -= cam.y;
        if (x < -r || y < -r || x > W + r || y > H + r) return;
        const gr = d.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
      };
      if (!p.dead || g.state === 'dying') light(p.x + p.w / 2, p.y + p.h / 2, (p.star > 0 ? 230 : 120) + Math.sin(t * 3) * 4);
      // Bloques de luz: iluminan su zona en el Apagón
      const L = g.level, x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.width - 1, Math.ceil((cam.x + cam.w) / T));
      const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(L.height - 1, Math.ceil((cam.y + cam.h) / T));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (L.get(x, y) === TT.LIGHT) light(x * T + T / 2, y * T + T / 2, 90 + Math.sin(t * 3 + x) * 6);
      g.entities.forEach((e) => {
        if (e.remove) return;
        if (e.type === 'shot') light(e.cx(), e.cy(), 85);
        else if (e.type === 'starwave') light(e.cx(), e.cy(), 110);
        else if (e.type === 'starbullet') light(e.cx(), e.cy(), 70);
        else if (e.type === 'brillo') light(e.cx(), e.cy(), 60);
      });
      ctx.drawImage(this.dark, 0, 0);
    }

    overlays(ctx, g, t) {
      const fx = g.fx, p = g.player, cam = g.camera;
      if (g.theme.swim) { ctx.fillStyle = 'rgba(0,60,160,0.12)'; ctx.fillRect(0, 0, W, H); }
      if (fx.darkness) this.darkness(ctx, g, t);
      if (fx.ghosts) {
        // neblina nocturna y fuegos fatuos
        ctx.fillStyle = 'rgba(20,30,80,0.22)'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 10; i++) {
          const x = ((U.hash(i + 70) * W * 3 - cam.x * 0.6 + Math.sin(t * 0.7 + i) * 40) % W + W) % W, y = 120 + U.hash(i + 71) * (H - 200) + Math.sin(t * 1.3 + i) * 18;
          const gr = ctx.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, 'rgba(160,255,230,0.8)'); gr.addColorStop(1, 'rgba(160,255,230,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
        }
      }
      if (fx.slippery) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        this.snow.forEach((s) => { s.y += s.v * 0.016; s.x -= s.v * 0.02; if (s.y > H) s.y = -5; if (s.x < 0) s.x = W; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill(); });
        ctx.fillStyle = 'rgba(200,230,255,0.15)'; ctx.fillRect(0, 0, W, H);
      }
      if (fx.wind && Math.abs(g.wind) > 30) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; const d = Math.sign(g.wind);
        for (let i = 0; i < 20; i++) { const x = ((U.hash(i) * W + t * 900 * d) % W + W) % W, y = U.hash(i + 3) * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d * 50, y); ctx.stroke(); }
      }
      if (fx.flyEnemies) { ctx.fillStyle = 'rgba(160,80,255,0.08)'; ctx.fillRect(0, 0, W, H); }
      if (fx.glitch && g.glitchPulse > 0) {
        for (let i = 0; i < 8; i++) { const y = U.rand(0, H), h = U.rand(4, 24); ctx.drawImage(this.canvas, 0, y, W, h, U.rand(-20, 20), y, W, h); }
        ctx.fillStyle = `rgba(255,47,214,${g.glitchPulse * 0.15})`; ctx.fillRect(0, 0, W, H);
      }
    }
  }

  S.View.WorldRenderer = WorldRenderer;
  S.View.WorldRenderer.drawTiles = drawTiles;
  S.View.WorldRenderer.drawPlayer = drawPlayer;
})(window.SGM);
