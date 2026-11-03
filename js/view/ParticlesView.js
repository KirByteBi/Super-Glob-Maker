/* Vista: partículas y textos flotantes. Reacciona a los eventos del modelo. */
(function (S) {
  'use strict';
  const U = S.util;

  class ParticlesView {
    constructor() {
      this.p = []; this.texts = []; this.shake = 0; this.flash = 0; this.flashColor = '#fff';
      this.banner = null;
      const on = (n, f) => S.events.on('game:' + n, f);
      on('start', () => { this.p = []; this.texts = []; });
      on('jump', (d) => this.dust(d.x, d.y, 4, '#ffffff'));
      on('doubleJump', (d) => { this.burst(d.x, d.y, 10, ['#ffe600', '#b44dff', '#ffffff'], 160, 'star'); });
      on('land', (d) => { if (d.v > 400) this.dust(d.x, d.y, 6, '#ffffff'); });
      on('stomp', (d) => { this.burst(d.x, d.y, 8, ['#ffffff', '#ffe600'], 160, 'star'); this.text(d.x, d.y - 10, '¡Plof!', '#fff'); });
      on('kill', (d) => this.burst(d.x, d.y, 10, ['#ffffff', '#ff7ab8'], 200));
      on('pop', (d) => this.burst(d.x, d.y, 12, ['#9fe8ff', '#ffffff'], 180, 'ring'));
      on('coin', (d) => this.burst(d.x, d.y, 5, ['#ffd000', '#fff3a0'], 90, 'star'));
      on('score', (d) => this.text(d.x, d.y, String(d.n), '#fff'));
      on('break', (d) => { this.debris(d.x, d.y, d.game.pal.brick); this.shake = Math.max(this.shake, 3); });
      on('bump', (d) => this.burst(d.x, d.y, 4, ['#ffffff'], 80));
      on('evolve', (d) => { this.burst(d.x, d.y, 24, ['#ffe600', '#ffffff', d.game.player.ch.color], 260, 'star'); this.text(d.x, d.y - 26, '¡' + d.name + '!', '#ffe600', 1.6, 18); this.flash = 0.35; this.flashColor = '#ffffff'; });
      on('powerup', (d) => this.burst(d.x, d.y, 12, ['#ffe600'], 160, 'star'));
      on('star', (d) => { this.burst(d.x, d.y, 30, ['#ff4f4f', '#ffe600', '#4fe36b', '#4fb2ff', '#b44dff'], 300, 'star'); this.text(d.x, d.y - 26, '¡Brillo Estelar!', '#ffe600', 1.6, 18); });
      on('oneUp', (d) => this.text(d.x, d.y - 16, '1UP', '#4fe36b', 1.4, 20));
      on('shrink', (d) => { this.burst(d.x + 15, d.y + 10, 12, ['#ffffff', '#ff4f4f'], 180); this.shake = 4; });
      on('die', (d) => { this.burst(d.x, d.y, 20, [d.game.player.ch.color, '#ffffff'], 260); this.shake = 6; });
      on('pound', (d) => { this.dust(d.x, d.y, 10, '#ffffff'); this.shake = d.heavy ? 6 : 3; });
      on('bounce', (d) => this.burst(d.x, d.y, 6, ['#ff7ab8', '#ffffff'], 120, 'ring'));
      on('spring', (d) => this.burst(d.x, d.y, 6, ['#ff5fa8'], 120));
      on('shotHit', (d) => this.burst(d.x, d.y, 6, [d.color || '#ffffff'], 120));
      on('splat', (d) => this.burst(d.x, d.y, 8, [d.color || '#1a1033'], 140));
      on('starWave', (d) => { this.burst(d.x, d.y, 18, ['#ffe600', '#b44dff', '#ffffff'], 260, 'star'); this.shake = 5; });
      on('glitchTp', (d) => this.burst(d.x, d.y, 10, ['#00e5ff', '#ff2fd6'], 160, 'pixel'));
      on('glitch', () => { this.flash = 0.25; this.flashColor = '#ff2fd6'; this.shake = 3; });
      on('checkpoint', (d) => { this.burst(d.x, d.y, 16, ['#ffe600', '#ffffff'], 200, 'star'); this.text(d.x, d.y - 10, '¡Punto de control!', '#fff', 1.6, 16); });
      on('bossHit', (d) => { this.burst(d.x, d.y, 18, ['#ffd000', '#ff2fd6'], 260, 'star'); this.shake = 6; });
      on('bossLand', (d) => { this.dust(d.x, d.y, 12, '#ffffff'); this.shake = 5; });
      on('bossDown', (d) => { this.burst(d.x, d.y, 50, ['#ffd000', '#ff2fd6', '#00e5ff', '#ffffff'], 400, 'star'); this.flash = 0.6; this.flashColor = '#ffffff'; });
      on('goal', (d) => { this.burst(d.x, d.y, 30, ['#ffc400', '#ff3b6b', '#ffffff'], 300, 'star'); this.text(d.x, d.y - 30, '+' + d.bonus, '#ffe600', 2, 22); });
      // Meta tocada sin cumplir la condición de victoria: aviso de lo que falta
      on('winLocked', (d) => { this.burst(d.x, d.y + 10, 8, ['#ff4f4f', '#ffffff'], 140, 'ring'); this.text(d.x, d.y - 18, '🔒 ' + (S.tr ? S.tr('¡Aún no!') : '¡Aún no!'), '#ff6b6b', 1.4, 20); this.text(d.x, d.y + 6, S.tr ? S.tr(d.text) : d.text, '#ffe600', 1.4, 15); this.shake = 2; });
      // Llaves y puertas/tuberías con llave
      const tr = (s) => (S.tr ? S.tr(s) : s);
      on('key', (d) => { this.burst(d.x, d.y, 12, ['#ffd000', '#ffffff'], 180, 'star'); this.text(d.x, d.y - 16, '🔑 ×' + d.keys, '#ffe600', 1.2, 18); });
      on('unlock', (d) => { this.burst(d.x, d.y, 18, ['#ffd000', '#ffffff'], 220, 'star'); this.text(d.x, d.y - 30, tr('🔓 ¡Abierta!'), '#8fff9a', 1.2, 18); });
      on('locked', (d) => { this.text(d.x, d.y - 14, tr('🔒 Necesitas una llave'), '#ff6b6b', 1.3, 16); this.shake = 2; });
      on('noLink', (d) => this.text(d.x, d.y - 14, tr(d.family === 'pipe' ? 'Esta tubería no lleva a ningún sitio' : 'Esta puerta no lleva a ningún sitio'), '#ffb347', 1.4, 14));
      on('cannon', (d) => this.dust(d.x, d.y, 5, '#888888'));
      S.events.on('render:sparkle', (d) => this.add({ x: d.x, y: d.y, vx: 0, vy: -30, g: 0, life: 0.4, max: 0.4, size: 3, color: `hsl(${Math.random() * 360},100%,70%)`, shape: 'star', rot: 0 }));
    }

    add(o) { if (this.p.length < 600) this.p.push(o); }
    burst(x, y, n, colors, sp, shape) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.6);
        this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.2, g: 500, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 3 + Math.random() * 4, color: colors[i % colors.length], shape: shape || 'dot', rot: Math.random() * 6 });
      }
    }
    dust(x, y, n, color) {
      for (let i = 0; i < n; i++) this.add({ x: x + U.rand(-10, 10), y, vx: U.rand(-90, 90), vy: U.rand(-60, -10), g: 0, life: 0.4, max: 0.4, size: U.rand(4, 8), color, shape: 'puff' });
    }
    debris(x, y, color) {
      [[-1, -1], [1, -1], [-1, 0], [1, 0]].forEach(([dx, dy]) => this.add({ x: x + dx * 6, y: y + dy * 6, vx: dx * 120, vy: -380 + dy * -80, g: 1500, life: 1, max: 1, size: 10, color, shape: 'chunk', rot: 0, vr: dx * 8 }));
    }
    text(x, y, s, color, life, size) { this.texts.push({ x, y, s, color, life: life || 0.9, max: life || 0.9, size: size || 14 }); }

    update(dt) {
      this.shake = Math.max(0, this.shake - dt * 20); this.flash = Math.max(0, this.flash - dt);
      this.p.forEach((p) => { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += (p.vr || 2) * dt; });
      this.p = this.p.filter((p) => p.life > 0);
      this.texts.forEach((t) => { t.y -= 40 * dt; t.life -= dt; });
      this.texts = this.texts.filter((t) => t.life > 0);
    }

    draw(ctx) {
      const Sp = S.View.Sprites;
      this.p.forEach((p) => {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = p.color;
        if (p.shape === 'star') { Sp.star(ctx, p.x, p.y, p.size, p.size * 0.45, 4, p.rot); ctx.fill(); }
        else if (p.shape === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.stroke(); }
        else if (p.shape === 'puff') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, 7); ctx.fill(); }
        else if (p.shape === 'chunk') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); Sp.rr(ctx, -p.size / 2, -p.size / 2, p.size, p.size, 3); Sp.fillStroke(ctx, p.color, 2.5); ctx.restore(); }
        else if (p.shape === 'pixel') ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, 7); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      this.texts.forEach((t) => {
        ctx.globalAlpha = Math.min(1, (t.life / t.max) * 2);
        ctx.font = `900 ${t.size}px "Trebuchet MS", sans-serif`;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText(t.s, t.x, t.y);
        ctx.fillStyle = t.color; ctx.fillText(t.s, t.x, t.y);
      });
      ctx.globalAlpha = 1;
    }
  }
  S.View.ParticlesView = ParticlesView;
})(window.SGM);
