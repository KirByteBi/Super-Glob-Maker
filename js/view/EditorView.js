/* Vista: lienzo del editor (rejilla, bloques, objetos y cursor) y barra de herramientas DOM */
(function (S) {
  'use strict';
  const T = S.TILE;
  const W = S.VIEW_W, H = S.VIEW_H;
  const C = S.Model.Catalog;

  class EditorView {
    constructor(canvas, root) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.root = root;
      this.hover = null; this.cat = 'terrain';
    }

    // ---------- lienzo ----------
    render(ed, t) {
      const ctx = this.ctx, L = ed.level;
      const theme = S.Model.Themes.get(L.theme), pal = S.Model.Themes.palette(theme, L.mode);
      const ch = S.Model.Characters.get(L.character);
      const cam = { x: ed.camX, y: ed.camY, w: W, h: H };
      ctx.save();
      S.View.BackgroundView.draw(ctx, theme, L.mode, cam.x, t);
      ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
      // zona fuera del nivel
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      if (cam.x + W > L.width * T) ctx.fillRect(L.width * T, cam.y, cam.x + W - L.width * T, H);
      // rejilla
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
      const x0 = Math.floor(cam.x / T), x1 = Math.min(L.width, Math.ceil((cam.x + W) / T));
      const y0 = Math.floor(cam.y / T), y1 = Math.min(L.height, Math.ceil((cam.y + H) / T));
      for (let x = x0; x <= x1; x++) { ctx.moveTo(x * T + 0.5, y0 * T); ctx.lineTo(x * T + 0.5, y1 * T); }
      for (let y = y0; y <= y1; y++) { ctx.moveTo(x0 * T, y * T + 0.5); ctx.lineTo(x1 * T, y * T + 0.5); }
      ctx.stroke();
      // Decoraciones (sin colisión): detrás del terreno
      if (S.View.Decorations) { try { L.objects.forEach((o) => { if (o.type === 'deco') S.View.Decorations.drawObject(ctx, o, t, L.mode); }); } catch (e) { /* no romper el editor */ } }
      S.View.WorldRenderer.drawTiles(ctx, L, pal, cam, t, { editor: true, contents: L.contents, ch });
      // objetos (las decoraciones ya se pintaron detrás del terreno)
      L.objects.forEach((o) => { if (o.type !== 'deco') this.drawObject(ctx, o, pal, ch, t); });
      // cursor
      if (this.hover && L.inBounds(this.hover.x, this.hover.y)) {
        const hx = this.hover.x * T, hy = this.hover.y * T;
        ctx.globalAlpha = 0.55;
        if (ed.tool.kind !== 'erase' && !this.hover.erase) { ctx.save(); ctx.translate(hx, hy); S.View.Sprites.drawIcon(ctx, ed.tool, T, pal, ch, S.Model.Themes.get(L.theme)); ctx.restore(); }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.hover.erase || ed.tool.kind === 'erase' ? '#ff4f6b' : '#ffe600'; ctx.lineWidth = 3;
        ctx.strokeRect(hx + 1.5, hy + 1.5, T - 3, T - 3);
      }
      ctx.restore();
      // minimapa de posición
      const mw = 220, mx = W - mw - 12, my = H - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(mx, my, mw, 8);
      ctx.fillStyle = '#ffe600'; ctx.fillRect(mx + (cam.x / (L.width * T)) * mw, my, Math.max(6, (W / (L.width * T)) * mw), 8);
    }

    drawObject(ctx, o, pal, ch, t) {
      const Sp = S.View.Sprites;
      if (o.type === 'start') {
        const e = { x: o.x * T + 4, y: o.y * T + 10, w: 24, h: 22 };
        Sp.drawStartMarker(ctx, e, ch);
        ctx.font = '900 11px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
        ctx.strokeText('INICIO', o.x * T + T / 2, o.y * T - 22); ctx.fillText('INICIO', o.x * T + T / 2, o.y * T - 22);
        return;
      }
      if (o.type === 'goal') {
        Sp.goal(ctx, { x: o.x * T + T / 2 - 4, y: (o.y + 1) * T - 192, w: 8, h: 192, medalY: 0 }, t, ch.color);
        return;
      }
      if (o.type === 'goalhidden') {
        ctx.save(); ctx.globalAlpha = 0.6; Sp.goal(ctx, { x: o.x * T + T / 2 - 4, y: (o.y + 1) * T - 192, w: 8, h: 192, medalY: 0 }, t, '#b44dff'); ctx.restore();
        return;
      }
      const e = S.Model.Entities.create(o.type, o.x, o.y, o);
      if (!e) return;
      e.onGround = true; e.taken = true;
      Sp.drawEntity(ctx, e, t, { pal, color: ch.color });
      if (o.type === 'platform' || o.type === 'platformV' || o.type === 'platformD1' || o.type === 'platformD2') {
        const rr = (o.r != null ? o.r : 3) * T;
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath();
        if (o.type === 'platform') { ctx.moveTo(e.cx() - rr, e.cy()); ctx.lineTo(e.cx() + rr, e.cy()); }
        else if (o.type === 'platformV') { ctx.moveTo(e.cx(), e.cy() - rr); ctx.lineTo(e.cx(), e.cy() + rr); }
        else if (o.type === 'platformD1') { ctx.moveTo(e.cx() - rr, e.cy() + rr); ctx.lineTo(e.cx() + rr, e.cy() - rr); }
        else { ctx.moveTo(e.cx() - rr, e.cy() - rr); ctx.lineTo(e.cx() + rr, e.cy() + rr); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // ---------- barra de herramientas ----------
    buildToolbar(ed, handlers) {
      const root = this.root;
      root.innerHTML = '';
      const top = el('div', 'ed-top');
      const cats = el('div', 'ed-cats');
      C.PALETTE.forEach((cat) => {
        const b = el('button', 'ed-cat' + (cat.id === this.cat ? ' on' : ''), cat.name);
        b.onclick = () => { this.cat = cat.id; S.events.emit('ui:click'); this.refreshItems(ed); this.buildToolbarCats(cats); };
        b.dataset.cat = cat.id; cats.appendChild(b);
      });
      this.items = el('div', 'ed-items');
      top.appendChild(cats); top.appendChild(this.items);
      const side = el('div', 'ed-side');
      const btn = (label, title, fn, cls) => { const b = el('button', 'ed-btn ' + (cls || ''), label); b.title = title; b.onclick = () => { S.events.emit('ui:click'); fn(); }; side.appendChild(b); return b; };
      btn('▶ Jugar', 'Probar el nivel (P)', handlers.play, 'play');
      btn('↶', 'Deshacer (Ctrl+Z)', handlers.undo);
      btn('↷', 'Rehacer (Ctrl+Y)', handlers.redo);
      btn('🗺 Mapa', 'Cambiar mapa', handlers.theme);
      this.modeBtn = btn('', 'Cambiar entre modo Paz y modo Corrupto', handlers.mode, 'mode');
      btn('🟢 Glob', 'Personaje del nivel', handlers.character);
      btn('⚙ Ajustes', 'Nombre, tamaño y tiempo', handlers.settings);
      btn('💾 Guardar', 'Guardar el nivel (Ctrl+S)', handlers.save);
      btn('✖ Salir', 'Volver al menú', handlers.exit, 'exit');
      // Pestañas de zona (base + hasta 2 subzonas)
      this.zones = el('div', 'ed-zones');
      side.appendChild(this.zones);
      this.handlers = handlers;
      this.info = el('div', 'ed-info');
      root.appendChild(top); root.appendChild(side); root.appendChild(this.info);
      this.buildZoneTabs(ed); this.refreshItems(ed); this.refreshInfo(ed);
    }
    buildZoneTabs(ed) {
      if (!this.zones) return;
      this.zones.innerHTML = '';
      const names = ['Base', 'Sub 1', 'Sub 2'];
      const rebuild = () => this.buildToolbar(ed, this.handlers);
      for (let z = 0; z < ed.zoneCount(); z++) {
        const b = el('button', 'ed-zone' + (z === ed.activeZone ? ' on' : ''), names[z]);
        b.onclick = () => { S.events.emit('ui:click'); ed.setZone(z); rebuild(); };
        if (z > 0 && z === ed.activeZone) { const x = el('span', 'ed-zone-x', '✕'); x.title = 'Borrar esta subzona'; x.onclick = (e) => { e.stopPropagation(); ed.removeZone(z); rebuild(); }; b.appendChild(x); }
        this.zones.appendChild(b);
      }
      if (ed.zoneCount() < 3) { const add = el('button', 'ed-zone add', '+'); add.title = 'Añadir subzona'; add.onclick = () => { S.events.emit('ui:click'); ed.addZone(); rebuild(); }; this.zones.appendChild(add); }
    }
    buildToolbarCats(cats) { [...cats.children].forEach((b) => b.classList.toggle('on', b.dataset.cat === this.cat)); }

    refreshItems(ed) {
      const L = ed.level;
      const theme = S.Model.Themes.get(L.theme), pal = S.Model.Themes.palette(theme, L.mode);
      const ch = S.Model.Characters.get(L.character);
      const cat = C.PALETTE.find((c) => c.id === this.cat);
      this.items.innerHTML = '';
      // Decoración: items dinámicos según el mapa (set temático de S.View.Decorations)
      let items = cat.items;
      if (cat.dynamic === 'deco' && S.View.Decorations) {
        items = S.View.Decorations.forMap(L.theme).map((d) => ({ kind: 'obj', type: 'deco', deco: d.id, name: d.name }));
        if (!items.length) { this.items.appendChild(el('p', 'empty', 'Este mapa no tiene decoraciones todavía.')); return; }
      }
      items.forEach((it) => {
        const b = el('button', 'ed-item');
        const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44;
        const x = cv.getContext('2d'); x.translate(4, 4);
        if (it.deco && S.View.Decorations) { try { S.View.Decorations.drawObject(x, { x: 0, y: 0, deco: it.deco }, 0, L.mode); } catch (e) { /* icono fallido */ } }
        else S.View.Sprites.drawIcon(x, it, 36, pal, ch, theme);
        b.appendChild(cv);
        const name = it.name || C.itemName(it);
        b.title = name;
        const sel = ed.tool.kind === it.kind && (ed.tool.id === it.id && it.kind === 'tile' || ed.tool.type === it.type && it.kind === 'obj' || it.kind === 'erase') && (!it.deco || ed.tool.deco === it.deco);
        if (sel) b.classList.add('on');
        b.onclick = () => { ed.setTool(it); S.events.emit('ui:click'); this.refreshItems(ed); };
        this.items.appendChild(b);
      });
    }

    refreshInfo(ed) {
      const L = ed.level, theme = S.Model.Themes.get(L.theme);
      const corrupt = L.mode === 'corrupt';
      this.modeBtn.textContent = corrupt ? '☠ Corrupto' : '☀ Paz';
      this.modeBtn.classList.toggle('corrupt', corrupt);
      const ch = S.Model.Characters.get(L.character);
      this.info.innerHTML = '';
      this.info.appendChild(el('b', '', L.name + (ed.dirty ? ' *' : '')));
      this.info.appendChild(el('span', '', S.Model.Themes.name(theme, L.mode) + ' · ' + ch.name + ' · ' + L.width + '×' + L.height + ' · ⏱' + L.time));
      this.info.appendChild(el('span', 'hint', 'Clic: colocar · Clic der.: borrar · Rueda / flechas: mover · Objeto sobre caja = contenido'));
      this.info.appendChild(el('span', 'tool', 'Herramienta: ' + C.itemName(ed.tool)));
    }
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  S.View.el = el;
  S.View.EditorView = EditorView;
})(window.SGM);
