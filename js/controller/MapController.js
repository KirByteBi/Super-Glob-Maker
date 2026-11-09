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
      this.onCanvasClick = (e) => {
        if (this.app.mode !== 'map') return;
        const rect = this.app.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * W / rect.width, y = (e.clientY - rect.top) * H / rect.height;
        if (x >= 14 && x <= 190 && y >= 46 && y <= 86) { e.preventDefault(); this.app.pickStoryCharacter(); }
      };
      this.app.canvas.addEventListener('pointerdown', this.onCanvasClick);
      // Confirmación directa: algunos navegadores pueden perder enterPressed entre dos frames.
      // Enter normal y Enter numérico entran siempre; durante un diálogo no hacen nada aquí.
      this.onConfirm = (e) => {
        if ((e.code !== 'Enter' && e.code !== 'NumpadEnter') || e.repeat || this.app.dialogOpen || this.app.mode !== 'map') return;
        e.preventDefault();
        // Enter también es Pausa en partida: marcarlo como ya consumido para que el nivel no
        // aparezca pausado en su primer fotograma.
        if (this.app.input && this.app.input.swallow) this.app.input.swallow();
        this.enter();
      };
      window.addEventListener('keydown', this.onConfirm);
      S.View.SoundView && S.View.SoundView.playMusic && S.View.SoundView.playMusic(S.Model.Themes.get('lake'), 'peace');
    }
    destroy() { window.removeEventListener('keydown', this.onConfirm); this.app.canvas.removeEventListener('pointerdown', this.onCanvasClick); S.View.SoundView && S.View.SoundView.stopMusic && S.View.SoundView.stopMusic(); }

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
      if (this.app.dialogOpen) return;                                // diálogo de la Historia abierto
      if (inp.editExitPressed) { this.app.showTitle(); return; }      // Esc vuelve al titulo
      if (inp.characterPressed) { this.app.pickStoryCharacter(); return; }
      // M: alternar Paz/Corrupto (solo si la Historia Corrupta esta desbloqueada)
      if (inp.altmodePressed && this.moveCd <= 0) { this.toggleMode(); this.moveCd = 0.3; return; }
      // ADMIN: E edita el nivel del nodo (lista oculta de la Historia) · B exporta esa lista
      const storyEditor = this.app.canEditStory();
      if (storyEditor && inp.editPressed) { this.app.editStoryNode(this.worldId, this.cursor, this.mode); return; }
      if (storyEditor && inp.packexpPressed) { this.app.exportStoryPack(); return; }
      // cambiar de mundo (entre los desbloqueados) con correr: Shift/X
      if (inp.runPressed && this.moveCd <= 0) { this.cycleWorld(); this.moveCd = 0.25; return; }
      // mover el cursor al vecino en la direccion pulsada
      let dir = null;
      if (inp.left) dir = 'left'; else if (inp.right) dir = 'right'; else if (inp.up) dir = 'up'; else if (inp.down) dir = 'down';
      if (dir && this.moveCd <= 0) { this.moveCursor(dir); this.moveCd = 0.18; }
      // entrar al nodo con Z/Espacio/Enter, solo si NO se está moviendo (evita que ↑ entre sin querer)
      if (!dir && (inp.jumpPressed || inp.shootPressed || inp.enterPressed)) this.enter();
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

    // ---- paisaje del mapa VISTO DESDE ARRIBA (estilo SMW): mar / lava / vacío de fondo y una
    // ISLA de tierra con acantilado debajo de los caminos y los niveles (nada flota en el aire) ----
    scenePal() {
      return {
        isle:      { sea: '#2f7bff', sea2: '#1f5fd0', top: '#5fd46a', top2: '#3fb357', cliff: '#c98a4a', cliff2: '#8a5a2b', deco: 'tree' },
        wild:      { sea: '#2fa0c8', sea2: '#1f7fa8', top: '#f2c879', top2: '#e0ad5a', cliff: '#b57a3a', cliff2: '#7a4f22', deco: 'cactus' },
        circus:    { sea: '#3a1660', sea2: '#24093f', top: '#a8407a', top2: '#86305f', cliff: '#4d2273', cliff2: '#2b0f4f', deco: 'tent' },
        volcano:   { sea: '#ff4a00', sea2: '#c22a00', top: '#6a4a44', top2: '#4f3530', cliff: '#3a2420', cliff2: '#1f1210', deco: 'rock' },
        dimension: { sea: '#0a0a1a', sea2: '#000008', top: '#6a2fbf', top2: '#4d1f8f', cliff: '#2a0a50', cliff2: '#140428', deco: 'star' }
      }[this.world.scenery] || null;
    }
    // Puntos de tierra: cada nodo y cada tramo de camino (muestreado), más bultos para que la costa
    // no sea un tubo. Se calcula una vez por mapa.
    landPoints() {
      if (this._land) return this._land;
      const pts = [], segs = [];
      this.world.nodes.forEach((n) => {
        const a = this.nodePos(n); pts.push({ x: a.x, y: a.y, r: 58 });
        [].concat(n.next || [], n.secretNext || []).forEach((id) => {
          const m = this.world.map[id]; if (!m) return; const b = this.nodePos(m); segs.push([a, b]);
          const len = Math.hypot(b.x - a.x, b.y - a.y), k = Math.max(1, Math.ceil(len / 22));
          for (let i = 1; i < k; i++) pts.push({ x: a.x + (b.x - a.x) * i / k, y: a.y + (b.y - a.y) * i / k, r: 46 });
        });
      });
      // bultos deterministas en la costa
      const base = pts.slice();
      base.forEach((p, i) => { if (U.hash(i * 3 + 1) < 0.45) { const an = U.hash(i * 7 + 2) * Math.PI * 2; pts.push({ x: p.x + Math.cos(an) * 34, y: p.y + Math.sin(an) * 30, r: 30 + U.hash(i + 5) * 22 }); } });
      // adornos repartidos por la isla, lejos de caminos y niveles
      const dSeg = (x, y) => segs.reduce((m, [a, b]) => { const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1; const tt = U.clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1); return Math.min(m, Math.hypot(x - a.x - vx * tt, y - a.y - vy * tt)); }, Infinity);
      const inLand = (x, y) => pts.some((p) => Math.hypot(x - p.x, y - p.y) < p.r - 14);
      const deco = [];
      for (let i = 0; i < 260 && deco.length < 34; i++) {
        const x = 40 + U.hash(i * 11 + 3) * (W - 80), y = 70 + U.hash(i * 13 + 7) * (H - 130);
        if (inLand(x, y) && dSeg(x, y) > 26 && this.world.nodes.every((n) => { const q = this.nodePos(n); return Math.hypot(q.x - x, q.y - y) > 34; }) && deco.every((d) => Math.hypot(d.x - x, d.y - y) > 26)) deco.push({ x, y, i });
      }
      this._land = { pts, deco };
      return this._land;
    }
    drawScenery(ctx, t) {
      const P = this.scenePal() || this.scenePal.call({ world: { scenery: 'isle' } });
      // fondo: mar / lava / vacío con brillos que se mueven
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sea); g.addColorStop(1, P.sea2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (this.world.scenery === 'dimension' || this.world.scenery === 'circus') { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 60; i++) { const s = 1 + (U.hash(i + 3) > 0.8 ? 1 : 0); ctx.fillRect(U.hash(i) * W, U.hash(i + 9) * H, s, s); } }
      else { ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = ((U.hash(i) * W + t * 12) % (W + 40)) - 20, y = U.hash(i + 4) * H; ctx.beginPath(); ctx.moveTo(x, y + Math.sin(t * 2 + i) * 2); ctx.lineTo(x + 18, y + Math.sin(t * 2 + i) * 2); ctx.stroke(); } }
      const L = this.landPoints(), blobs = (dy, grow, col) => { ctx.fillStyle = col; ctx.beginPath(); L.pts.forEach((p) => { ctx.moveTo(p.x + p.r + grow, p.y + dy); ctx.arc(p.x, p.y + dy, p.r + grow, 0, Math.PI * 2); }); ctx.fill(); };
      // espuma de la orilla, contorno, acantilado (más bajo) y la superficie de la isla
      blobs(16, 10, 'rgba(255,255,255,0.25)');
      blobs(16, 4, '#000');
      blobs(16, 0, P.cliff2);
      blobs(8, 0, P.cliff);
      blobs(0, 4, '#000');
      blobs(0, 0, P.top);
      // textura: manchas de un tono más oscuro
      ctx.fillStyle = P.top2;
      L.pts.forEach((p, i) => { if (U.hash(i * 5 + 9) < 0.35) { ctx.beginPath(); ctx.ellipse(p.x + (U.hash(i) - 0.5) * p.r, p.y + (U.hash(i + 1) - 0.5) * p.r * 0.6, 10 + U.hash(i + 2) * 10, 5, 0, 0, Math.PI * 2); ctx.fill(); } });
      // adornos (árboles, cactus, carpas, rocas o estrellas) encima de la isla
      L.deco.forEach((d) => this.drawSceneryDeco(ctx, P.deco, d.x, d.y, t, d.i));
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
        this.world.nodes.forEach((n) => {
          if (n.hidden && !SM.isUnlocked(this.worldId, n.id)) return;
          const a = this.nodePos(n);
          (n.next || []).forEach((id) => { const m = this.world.map[id]; if (m) seg(a, this.nodePos(m), w, col); });
        });
      });
      // Los caminos alternativos descubiertos se dibujan como puentes sobre el mar.
      this.world.nodes.forEach((n) => {
        if (!SM.isSecret(this.worldId, n.id)) return;
        const a = this.nodePos(n);
        (n.secretNext || []).forEach((id) => {
          const m = this.world.map[id]; if (!m) return;
          const b = this.nodePos(m), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          seg(a, b, 15, '#39234f');
          seg(a, b, 10, '#8a5a42');
          seg(a, b, 6, '#d6ad70');
          ctx.strokeStyle = '#51364f'; ctx.lineWidth = 2.5;
          for (let d = 0; d <= len; d += 10) {
            const x = a.x + dx * d / len, y = a.y + dy * d / len;
            ctx.beginPath(); ctx.moveTo(x - nx * 6, y - ny * 6); ctx.lineTo(x + nx * 6, y + ny * 6); ctx.stroke();
          }
          ctx.strokeStyle = '#f2d69b'; ctx.lineWidth = 2;
          [-1, 1].forEach((side) => {
            ctx.beginPath(); ctx.moveTo(a.x + nx * side * 6, a.y + ny * side * 6); ctx.lineTo(b.x + nx * side * 6, b.y + ny * side * 6); ctx.stroke();
          });
        });
      });
    }

    // ---- nodos con icono/miniatura del tema ----
    drawNodes(ctx, t) {
      this.world.nodes.forEach((n) => {
        if (n.hidden && !SM.isUnlocked(this.worldId, n.id)) return;
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
      const character = S.Model.Characters.get(this.app.prefs.character);
      rr(ctx, 14, 46, 176, 38, 9); ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = character.color; ctx.stroke();
      const characterImg = S.View.Assets.get(character.paths[0]);
      if (characterImg) ctx.drawImage(characterImg, 19, 49, 32, 32);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '900 14px "Trebuchet MS",sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(character.name + ' · G', 54, 65);
      ctx.font = '600 13px "Trebuchet MS",sans-serif'; ctx.textAlign = 'right';
      const multi = SM.unlockedWorlds().length > 1;
      const corruptOn = SM.isCorruptUnlocked && SM.isCorruptUnlocked();
      // admin: recordatorio de E / B y de dónde sale el nivel seleccionado
      if (this.app.canEditStory() && S.Model.StoryPack && cur.type !== 'start') {
        const src = S.Model.StoryPack.source(this.worldId, cur.id, this.mode);
        ctx.save(); ctx.font = '700 12px "Trebuchet MS",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe600';
        ctx.fillText('🛡 E: editar nivel · B: exportar lista · ' + (src === 'local' ? '✏ editado aquí' : src === 'cloud' ? '🌐 global' : src === 'pack' ? '📖 lista' : '⚙ generado'), 16, H - 14);
        ctx.restore();
      }
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
