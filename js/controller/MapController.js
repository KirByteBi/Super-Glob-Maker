/* Controlador: escena del MAPAMUNDI (world-map del Modo Historia). AISLADO.
   Dibuja el mapa en el canvas y mueve el Glob por los nodos con las flechas.
   Enter/Espacio/Z entra al nivel del nodo; Esc vuelve al titulo.
   El AppController lo activa con mode='map' y lo actualiza en su loop. */
(function (S) {
  'use strict';
  const U = S.util, SM = S.Model.StoryMap, W = S.VIEW_W, H = S.VIEW_H;
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  class MapController {
    constructor(app, worldId, mode) {
      this.app = app; this.worldId = worldId || 'w1'; this.mode = mode || 'peace';
      this.world = SM.world(this.worldId);
      this.cursor = SM.firstNode(this.worldId); // id del nodo donde esta el Glob
      this.moveCd = 0; this.t = 0;
      S.View.SoundView && S.View.SoundView.playMusic && S.View.SoundView.playMusic(S.Model.Themes.get('lake'), 'peace');
    }
    destroy() { S.View.SoundView && S.View.SoundView.stopMusic && S.View.SoundView.stopMusic(); }

    // posicion en pixeles del centro de un nodo
    nodePos(n) {
      const w = this.world, padX = 70, padY = 90;
      const cw = (W - padX * 2) / Math.max(1, w.cols - 1), ch = (H - padY * 2) / Math.max(1, w.rows - 1);
      return { x: padX + n.x * cw, y: padY + n.y * ch };
    }
    // nodos alcanzables desde el cursor (vecinos conectados y desbloqueados)
    neighbors() {
      const cur = this.world.map[this.cursor], out = [];
      const add = (id) => { const n = this.world.map[id]; if (n && SM.isUnlocked(this.worldId, id)) out.push(n); };
      (cur.next || []).forEach(add);
      if (SM.isSecret(this.worldId, cur.id)) (cur.secretNext || []).forEach(add);
      // tambien se puede retroceder: cualquier nodo que apunte al actual y este desbloqueado
      this.world.nodes.forEach((n) => { if (((n.next || []).includes(cur.id) || ((n.secretNext || []).includes(cur.id) && SM.isSecret(this.worldId, n.id))) && SM.isUnlocked(this.worldId, n.id)) out.push(n); });
      return out;
    }

    update(dt, inp) {
      this.t += dt; this.moveCd = Math.max(0, this.moveCd - dt);
      if (inp.editExitPressed) { this.app.showTitle(); return; }      // Esc vuelve al titulo
      // M: alternar Paz/Corrupto (solo si la Historia Corrupta esta desbloqueada)
      if (inp.altmodePressed && this.moveCd <= 0) { this.toggleMode(); this.moveCd = 0.3; return; }
      // cambiar de mundo (entre los desbloqueados) con correr: Shift/X
      if (inp.runPressed && this.moveCd <= 0) { this.cycleWorld(); this.moveCd = 0.25; return; }
      // mover el cursor al vecino en la direccion pulsada
      let dir = null;
      if (inp.left) dir = 'left'; else if (inp.right) dir = 'right'; else if (inp.up) dir = 'up'; else if (inp.down) dir = 'down';
      if (dir && this.moveCd <= 0) { this.moveCursor(dir); this.moveCd = 0.18; }
      // entrar al nodo con salto/disparo, solo si NO se esta moviendo (evita que ↑ entre sin querer)
      if (!dir && (inp.jumpPressed || inp.shootPressed)) this.enter();
    }
    // pasa al siguiente mundo DESBLOQUEADO (ciclico). Si solo hay 1, no hace nada.
    cycleWorld() {
      const ids = SM.unlockedWorlds(); if (ids.length < 2) return;
      const i = ids.indexOf(this.worldId); const nx = ids[(i + 1) % ids.length];
      if (nx && nx !== this.worldId) this.app.showStoryMap(nx);
    }
    // alterna Historia Normal <-> Corrupta (solo si esta desbloqueada)
    toggleMode() {
      if (!SM.isCorruptUnlocked || !SM.isCorruptUnlocked()) { this.app.menu.toast('🔒 La Historia Corrupta se desbloquea al terminar la Historia Normal'); return; }
      const nm = this.mode === 'corrupt' ? 'peace' : 'corrupt';
      this.app.prefs.storyMode = nm; if (this.app.savePrefs) this.app.savePrefs();
      this.app.menu.toast(nm === 'corrupt' ? '☠ HISTORIA CORRUPTA' : '☀ Historia Normal', 1800);
      this.app.showStoryMap(this.worldId); // recrea el mapa en el nuevo modo
    }
    moveCursor(dir) {
      const cur = this.world.map[this.cursor], cp = this.nodePos(cur);
      let best = null, bestScore = Infinity;
      this.neighbors().forEach((n) => {
        const p = this.nodePos(n), dx = p.x - cp.x, dy = p.y - cp.y;
        const ok = dir === 'left' ? dx < -5 : dir === 'right' ? dx > 5 : dir === 'up' ? dy < -5 : dy > 5;
        if (!ok) return;
        // prioriza el vecino mas alineado con la direccion
        const along = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy);
        const cross = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
        const score = cross * 3 - along * 0.1;
        if (score < bestScore) { bestScore = score; best = n; }
      });
      if (best) { this.cursor = best.id; S.events.emit('ui:click'); }
    }
    enter() {
      const n = this.world.map[this.cursor];
      if (n.type === 'start' || n.type === 'castle' && false) return;
      if (n.type === 'start') return;
      this.app.playStoryNode(this.worldId, n.id, this.mode);
    }

    render(t) {
      const ctx = this.app.ctx;
      // fondo con el tema del nodo actual (ambiente)
      const cur = this.world.map[this.cursor];
      ctx.save();
      // cada capa protegida: un fallo de dibujo no debe tumbar el mapa entero
      try { this.drawScenery(ctx, t); } catch (e) { ctx.fillStyle = '#20406a'; ctx.fillRect(0, 0, W, H); }
      try { this.drawPaths(ctx); } catch (e) { /* sin caminos */ }
      try { this.drawNodes(ctx, t); } catch (e) { /* sin nodos */ }
      try { this.drawGlob(ctx, t, cur); } catch (e) { /* sin glob */ }
      try { this.drawHud(ctx, cur); } catch (e) { /* sin hud */ }
      ctx.restore();
    }

    // ---- paisaje de mapa (capas): cielo, montañas lejanas, terreno, agua/decoracion ----
    drawScenery(ctx, t) {
      const S0 = this.world.scenery;
      const P = {
        isle:      { sky1: '#8fd0ff', sky2: '#d6f3ff', far: '#9fd8bf', near: '#2fb36b', water: '#2f7bff', deco: 'tree' },
        wild:      { sky1: '#ffce8a', sky2: '#ffe9c2', far: '#d8a860', near: '#8a6a3a', water: '#4a9a5a', deco: 'cactus' },
        circus:    { sky1: '#2b0f4f', sky2: '#6a2f8f', far: '#4d2273', near: '#8a2e6a', water: '#9a2fd0', deco: 'tent' },
        volcano:   { sky1: '#2b0a0a', sky2: '#7a2a12', far: '#5c1b10', near: '#3a1010', water: '#ff4a00', deco: 'rock' },
        dimension: { sky1: '#0a0a1a', sky2: '#2a0a50', far: '#2a0a45', near: '#541c86', water: '#00e5cc', deco: 'star' }
      }[S0] || { sky1: '#8fd0ff', sky2: '#d6f3ff', far: '#9fd8bf', near: '#2fb36b', water: '#2f7bff', deco: 'tree' };
      // cielo
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sky1); g.addColorStop(1, P.sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // estrellas en mundos oscuros
      if (S0 === 'circus' || S0 === 'volcano' || S0 === 'dimension') { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 40; i++) { const x = (U.hash(i) * W), y = U.hash(i + 9) * H * 0.6; ctx.fillRect(x, y, 2, 2); } }
      // montañas lejanas
      const band = (yBase, amp, col, freq, ph) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, yBase + Math.sin(x * freq + ph) * amp); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
      band(H * 0.45, 30, P.far, 0.012, 1.3);
      band(H * 0.62, 24, U.mix(P.far, P.near, 0.5), 0.016, 3.1);
      // franja de agua/lava con brillo
      ctx.fillStyle = P.water; ctx.globalAlpha = 0.5; ctx.fillRect(0, H * 0.72, W, H * 0.1); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const x = ((i * 120 + t * 20) % (W + 60)) - 30; ctx.beginPath(); ctx.moveTo(x, H * 0.76 + Math.sin(t + i) * 2); ctx.lineTo(x + 50, H * 0.76 + Math.sin(t + i) * 2); ctx.stroke(); }
      // terreno cercano
      band(H * 0.8, 20, P.near, 0.02, 0.5);
      // decoracion ambiental repartida
      ctx.fillStyle = U.shade(P.near, -0.2);
      for (let i = 0; i < 7; i++) { const x = 60 + i * (W / 7) + Math.sin(i) * 20, y = H * 0.82 + Math.sin(i * 2) * 10; this.drawSceneryDeco(ctx, P.deco, x, y, t, i); }
      // vignette suave para que resalten los nodos
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    drawSceneryDeco(ctx, kind, x, y, t, i) {
      if (kind === 'tree') { ctx.fillStyle = '#6e4a26'; ctx.fillRect(x - 2, y - 4, 4, 14); ctx.fillStyle = '#2f8f5b'; ctx.beginPath(); ctx.arc(x, y - 10, 10, 0, 7); ctx.fill(); }
      else if (kind === 'cactus') { ctx.fillStyle = '#2f8f5b'; ctx.fillRect(x - 3, y - 14, 6, 18); ctx.fillRect(x - 10, y - 6, 7, 4); ctx.fillRect(x + 3, y - 10, 7, 4); }
      else if (kind === 'tent') { ctx.fillStyle = i % 2 ? '#e8323f' : '#ffd000'; ctx.beginPath(); ctx.moveTo(x - 12, y + 4); ctx.lineTo(x, y - 12); ctx.lineTo(x + 12, y + 4); ctx.closePath(); ctx.fill(); }
      else if (kind === 'rock') { ctx.fillStyle = '#3a2420'; ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, 0); ctx.fill(); const gl = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = U.mix('#3a2420', '#ff5a1f', gl); ctx.fillRect(x - 5, y - 2, 10, 2); }
      else if (kind === 'star') { const gl = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = U.mix('#541c86', '#b44dff', gl); ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 8, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    }

    // ---- senda solida tipo SMW ----
    drawPaths(ctx) {
      ctx.lineCap = 'round';
      const seg = (a, b, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
      // borde oscuro + relleno claro (efecto camino de tierra)
      [['#5a3a1a', 12], ['#d9b26a', 8]].forEach(([col, w]) => {
        this.world.nodes.forEach((n) => { const a = this.nodePos(n); (n.next || []).forEach((id) => { const m = this.world.map[id]; if (m) seg(a, this.nodePos(m), w, col); }); });
      });
      // caminos secretos (descubiertos): punteado violeta encima
      ctx.setLineDash([3, 10]);
      this.world.nodes.forEach((n) => { if (!SM.isSecret(this.worldId, n.id)) return; const a = this.nodePos(n); (n.secretNext || []).forEach((id) => { const m = this.world.map[id]; if (m) seg(a, this.nodePos(m), 5, '#c48bff'); }); });
      ctx.setLineDash([]);
    }

    // ---- nodos con icono/miniatura del tema ----
    drawNodes(ctx, t) {
      this.world.nodes.forEach((n) => {
        try { this.drawOneNode(ctx, t, n); } catch (e) { const p = this.nodePos(n); ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); }
      });
    }
    drawOneNode(ctx, t, n) {
      {
        const p = this.nodePos(n), unlocked = SM.isUnlocked(this.worldId, n.id), cleared = SM.isCleared(this.worldId, n.id);
        const sel = n.id === this.cursor;
        if (n.type === 'start') { // banderin de salida
          ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y + 12); ctx.lineTo(p.x - 8, p.y - 14); ctx.stroke();
          ctx.fillStyle = '#2fd46a'; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 14); ctx.lineTo(p.x + 10, p.y - 10); ctx.lineTo(p.x - 8, p.y - 6); ctx.closePath(); ctx.fill(); return;
        }
        const r = n.type === 'castle' ? 24 : n.type === 'palace' ? 20 : 18;
        // marco del nodo
        ctx.save(); ctx.translate(p.x, p.y);
        if (sel) { ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 16; }
        rr(ctx, -r, -r, r * 2, r * 2, 7);
        ctx.fillStyle = !unlocked ? '#3a3a44' : '#20232e'; ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = sel ? 4 : 3; ctx.strokeStyle = sel ? '#ffe600' : '#000'; ctx.stroke();
        if (!unlocked) { // candado
          ctx.fillStyle = '#9a9aa5'; rr(ctx, -7, -2, 14, 12, 2); ctx.fill(); ctx.strokeStyle = '#9a9aa5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -2, 5, Math.PI, 0); ctx.stroke();
          ctx.restore(); return;
        }
        // contenido segun tipo
        ctx.save(); rr(ctx, -r + 3, -r + 3, (r - 3) * 2, (r - 3) * 2, 5); ctx.clip();
        if (n.type === 'castle') {
          const th = S.Model.Themes.get(n.theme); ctx.fillStyle = th.pal.skyBot || '#555'; ctx.fillRect(-r, -r, r * 2, r * 2);
          ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-14, -4, 28, 18); ctx.fillStyle = '#4a3a2a'; for (const dx of [-12, -2, 8]) ctx.fillRect(dx, -12, 6, 10);
          ctx.fillStyle = '#c0453a'; for (const dx of [-14, -4, 6]) { ctx.beginPath(); ctx.moveTo(dx, -12); ctx.lineTo(dx + 3, -18); ctx.lineTo(dx + 6, -12); ctx.fill(); }
        } else if (n.type === 'palace') {
          ctx.fillStyle = '#2a1545'; ctx.fillRect(-r, -r, r * 2, r * 2);
          ctx.fillStyle = '#6a2fbf'; ctx.fillRect(-12, -6, 24, 18); ctx.fillStyle = '#b58cff'; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(0, -18); ctx.lineTo(14, -6); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 3); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        } else { // nivel: miniatura del fondo del tema
          const th = S.Model.Themes.get(n.theme);
          ctx.save(); ctx.translate(-r + 3, -r + 3); ctx.scale((r - 3) * 2 / W, (r - 3) * 2 / H);
          try { S.View.BackgroundView.draw(ctx, th, this.mode, 0, t); } catch (e) { ctx.fillStyle = th.pal.skyBot; ctx.fillRect(0, 0, W, H); }
          ctx.restore();
        }
        ctx.restore();
        // DOS HUECOS bajo el nodo: meta normal (oro) y, si el nivel la tiene, meta oculta (violeta).
        // Hueco vacío = aún no; relleno = conseguida.
        if (n.type === 'level' || n.type === 'castle') {
          const st = SM.nodeState(this.worldId, n.id) || {}, two = !!n.secretNext;
          const slot = (sx, col, on) => { ctx.beginPath(); ctx.arc(sx, r + 7, 4.5, 0, 7); ctx.fillStyle = on ? col : 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); };
          slot(two ? -6 : 0, '#ffd000', !!st.normal || (!!st.cleared && !st.secret));
          if (two) slot(6, '#c48bff', !!st.secret);
        }
        // insignia de completado
        if (cleared) { ctx.fillStyle = '#2fd46a'; ctx.beginPath(); ctx.arc(r - 4, -r + 4, 7, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', r - 4, -r + 5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
        ctx.restore();
      }
    }

    drawGlob(ctx, t, cur) {
      const cp = this.nodePos(cur), bob = Math.sin(t * 5) * 3;
      const ch = S.Model.Characters.get(this.app.prefs.character);
      const img = S.View.Assets.get(ch.paths[0]);
      if (img) ctx.drawImage(img, cp.x - 17, cp.y - 46 + bob, 34, 34);
      else { ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(cp.x, cp.y - 30 + bob, 14, 0, 7); ctx.fill(); }
    }

    drawHud(ctx, cur) {
      // barra superior: nombre del mundo
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = '#fff'; ctx.font = '900 20px "Trebuchet MS",sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const tr = S.tr || ((s) => s);
      ctx.fillText(tr(this.world.name), 16, 20);
      ctx.font = '600 13px "Trebuchet MS",sans-serif'; ctx.textAlign = 'right';
      const multi = SM.unlockedWorlds().length > 1;
      const corruptOn = SM.isCorruptUnlocked && SM.isCorruptUnlocked();
      ctx.fillText(tr('Flechas: mover · Z/Enter: entrar' + (multi ? ' · X: cambiar mundo' : '') + (corruptOn ? ' · M: Paz/Corrupto' : '') + ' · Esc: salir'), W - 16, 20);
      // indicador del modo (solo si la Corrupta esta desbloqueada)
      if (corruptOn) {
        const badge = this.mode === 'corrupt' ? '☠ CORRUPTO' : '☀ NORMAL';
        ctx.textAlign = 'center'; ctx.font = '900 14px "Trebuchet MS",sans-serif';
        ctx.fillStyle = this.mode === 'corrupt' ? '#ff4df0' : '#ffe600';
        ctx.fillText(badge, W / 2, 20);
      }
      // cartel inferior con el nombre del nodo seleccionado (estilo SMM2)
      let label = '';
      if (cur.type === 'castle') label = '🏰 ' + tr('Castillo') + ' · ' + S.Model.Themes.name(S.Model.Themes.get(cur.theme), this.mode);
      else if (cur.type === 'palace') label = tr('⚠ Palacio del interruptor "!"');
      else if (cur.type === 'start') label = tr('Salida');
      else { const idx = this.world.nodes.filter((n) => n.type === 'level').indexOf(cur) + 1; label = this.world.id.toUpperCase() + ' - ' + idx + ' · ' + S.Model.Themes.name(S.Model.Themes.get(cur.theme), this.mode); }
      ctx.font = '800 18px "Trebuchet MS",sans-serif'; const tw = ctx.measureText(label).width;
      rr(ctx, W / 2 - tw / 2 - 18, H - 46, tw + 36, 32, 8); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffe600'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, W / 2, H - 30);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }
  S.Controller.MapController = MapController;
})(window.SGM);
