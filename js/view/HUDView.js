/* Vista: interfaz en partida (monedas, puntos, tiempo, vidas, forma actual, jefe) */
(function (S) {
  'use strict';
  const W = S.VIEW_W, H = S.VIEW_H;

  function txt(ctx, s, x, y, size, color, align) {
    ctx.font = `900 ${size}px "Trebuchet MS", sans-serif`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText(s, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
  }
  function pill(ctx, x, y, w, h) { const Sp = S.View.Sprites; Sp.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); }

  S.View.HUDView = {
    draw(ctx, g, t) {
      const Sp = S.View.Sprites, p = g.player;
      // forma actual
      pill(ctx, 12, 10, 250, 44);
      const img = S.View.Assets.get(p.formPath());
      if (img) ctx.drawImage(img, 14, 6, 48, 48);
      txt(ctx, p.formName(), 66, 25, 16, p.special ? '#ffe600' : '#fff');
      txt(ctx, p.special ? 'ESPECIAL' : S.Model.Characters.evoLabel(p.evo), 66, 42, 12, p.ch.color);
      if (!g.testMode) { txt(ctx, '×' + g.lives, 250, 32, 18, '#fff', 'right'); }
      // monedas
      pill(ctx, 272, 10, 120, 44); Sp.coin(ctx, 296, 32, 11, t * 3); txt(ctx, '×' + String(g.coins).padStart(2, '0'), 314, 32, 20);
      // puntos
      pill(ctx, W / 2 - 90, 10, 180, 44); txt(ctx, String(g.score).padStart(8, '0'), W / 2, 32, 22, '#fff', 'center');
      // tiempo
      pill(ctx, W - 140, 10, 128, 44);
      const low = g.time < 60 && g.state === 'play';
      txt(ctx, '⏱ ' + Math.ceil(g.time), W - 76, 32, 22, low && Math.floor(t * 4) % 2 ? '#ff4f4f' : '#fff', 'center');
      // Ranuras de Monedas Estrella del nivel (como las Star Coins de New SMB)
      if (g.starTotal > 0) {
        const n = Math.min(3, g.starTotal), sw = 34, bx = W - 12 - n * sw, by = 60;
        pill(ctx, bx - 6, by, n * sw + 12, 32);
        for (let i = 0; i < n; i++) {
          const cx = bx + i * sw + sw / 2, cy = by + 16, got = i < g.stars;
          if (got) { Sp.star(ctx, cx, cy, 12, 5.5, 5, -Math.PI / 2 + t * 0.5); ctx.fillStyle = '#ffd000'; ctx.fill(); ctx.strokeStyle = '#c99a00'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(); }
          else { Sp.star(ctx, cx, cy, 12, 5.5, 5, -Math.PI / 2); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.lineJoin = 'round'; ctx.stroke(); ctx.setLineDash([]); }
        }
      }
      // potenciadores con tiempo
      if (p.star > 0) { pill(ctx, 12, 60, 150, 26); txt(ctx, '★ Brillo ' + Math.ceil(p.star) + 's', 22, 73, 13, '#ffe600'); }
      if (g.mode === 'corrupt') { pill(ctx, W - 300, 60, 288, 26); txt(ctx, '☠ ' + g.theme.effectLabel, W - 290, 73, 12, '#ff7af0'); }
      // jefe
      const boss = g.entities.find((e) => e.boss && e.active && !e.remove);
      if (boss) {
        // nombre real del jefe (sin el paréntesis del catálogo), y barra según su HP máximo
        const def = S.Model.Catalog.OBJECTS[boss.type] || {};
        const name = (def.name || 'Jefe').replace(/\s*\(.*\)$/, '');
        const maxHp = boss.maxHp || boss.hp || 1;
        pill(ctx, W / 2 - 160, H - 50, 320, 36); txt(ctx, name, W / 2 - 145, H - 32, 16, '#ffd000');
        Sp.rr(ctx, W / 2 - 60, H - 40, 205, 16, 8); ctx.fillStyle = '#333'; ctx.fill();
        Sp.rr(ctx, W / 2 - 60, H - 40, 205 * Math.max(0, boss.hp) / maxHp, 16, 8); ctx.fillStyle = '#ff2fd6'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
      }
      // cartel de inicio
      if (g.t < 2.6 && g.state === 'play') {
        const a = Math.min(1, (2.6 - g.t) * 2);
        ctx.globalAlpha = a;
        pill(ctx, W / 2 - 260, H / 2 - 70, 520, 110);
        txt(ctx, S.Model.Themes.name(g.theme, g.mode), W / 2, H / 2 - 35, 32, g.mode === 'corrupt' ? '#ff7af0' : '#ffe600', 'center');
        txt(ctx, g.level.name, W / 2, H / 2 + 5, 18, '#fff', 'center');
        ctx.globalAlpha = 1;
      }
      if (g.state === 'clear' || g.state === 'done') {
        pill(ctx, W / 2 - 230, 110, 460, 70);
        txt(ctx, '¡Medalla conseguida!', W / 2, 145, 34, '#ffc400', 'center');
      }
      if (g.state === 'dying' && g.stateT > 0.6) {
        txt(ctx, g.testMode ? '¡Ups!' : 'Vidas: ' + Math.max(0, g.lives - 1), W / 2, H / 2, 30, '#fff', 'center');
      }
    }
  };
})(window.SGM);
