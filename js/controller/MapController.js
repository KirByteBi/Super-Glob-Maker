/* Controlador: escena del MAPAMUNDI (world-map del Modo Historia). AISLADO.
   Dibuja el mapa en el canvas y mueve el Glob por los nodos con las flechas.
   Enter/Espacio/Z entra al nivel del nodo; Esc vuelve al titulo.
   El AppController lo activa con mode='map' y lo actualiza en su loop. */
(function (S) {
  'use strict';
  const U = S.util, SM = S.Model.StoryMap, W = S.VIEW_W, H = S.VIEW_H;

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
      // mover el cursor al vecino en la direccion pulsada
      let dir = null;
      if (inp.left) dir = 'left'; else if (inp.right) dir = 'right'; else if (inp.up) dir = 'up'; else if (inp.down) dir = 'down';
      if (dir && this.moveCd <= 0) { this.moveCursor(dir); this.moveCd = 0.18; }
      // entrar al nodo con salto/disparo, solo si NO se esta moviendo (evita que ↑ entre sin querer)
      if (!dir && (inp.jumpPressed || inp.shootPressed)) this.enter();
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
      const theme = S.Model.Themes.get(cur.theme || 'lake');
      ctx.save();
      S.View.BackgroundView.draw(ctx, theme, this.mode, t * 20, t);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
      // caminos entre nodos
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([2, 14]);
      this.world.nodes.forEach((n) => {
        const a = this.nodePos(n);
        (n.next || []).forEach((id) => { const m = this.world.map[id]; if (!m) return; const b = this.nodePos(m); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
        // camino secreto: punteado violeta, solo si ya se descubrio
        if (SM.isSecret(this.worldId, n.id)) { ctx.strokeStyle = 'rgba(180,77,255,0.8)'; (n.secretNext || []).forEach((id) => { const m = this.world.map[id]; if (!m) return; const b = this.nodePos(m); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; }
      });
      ctx.setLineDash([]);
      // nodos
      this.world.nodes.forEach((n) => {
        const p = this.nodePos(n), unlocked = SM.isUnlocked(this.worldId, n.id), cleared = SM.isCleared(this.worldId, n.id);
        const r = n.type === 'castle' ? 22 : n.type === 'palace' ? 18 : n.type === 'start' ? 12 : 15;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
        ctx.fillStyle = !unlocked ? '#4a4a55' : n.type === 'castle' ? '#7a3a2a' : n.type === 'palace' ? '#6a2fbf' : '#ffd000';
        ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
        if (n.type === 'castle') { ctx.fillStyle = '#c0453a'; ctx.fillRect(p.x - 12, p.y - 4, 24, 14); ctx.fillStyle = '#2a2a2a'; for (const dx of [-9, 0, 9]) ctx.fillRect(p.x + dx - 2, p.y - 10, 4, 8); }
        else if (n.type === 'palace') { ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', p.x, p.y + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
        if (cleared) { ctx.fillStyle = '#2fd46a'; ctx.beginPath(); ctx.arc(p.x + r - 2, p.y - r + 2, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✓', p.x + r - 2, p.y - r + 5); ctx.textAlign = 'left'; }
      });
      // Glob en el nodo cursor
      const cp = this.nodePos(cur), bob = Math.sin(t * 4) * 3;
      const ch = S.Model.Characters.get(this.app.prefs.character);
      const img = S.View.Assets.get(ch.paths[0]);
      if (img) ctx.drawImage(img, cp.x - 16, cp.y - 40 + bob, 32, 32);
      // HUD / ayuda
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = '#fff'; ctx.font = '900 20px "Trebuchet MS",sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(this.world.name, 16, 20);
      ctx.font = '600 14px "Trebuchet MS",sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('Flechas: mover · Z/Enter: entrar · Esc: salir', W - 16, 20);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  }
  S.Controller.MapController = MapController;
})(window.SGM);
