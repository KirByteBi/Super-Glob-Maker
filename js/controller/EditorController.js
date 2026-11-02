/* Controlador: entrada del editor (ratón/teclado) -> EditorModel; refresca EditorView */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const Level = S.Model.Level;
  const Storage = S.Model.LevelStorage;

  class EditorController {
    constructor(app, level) {
      this.app = app;
      this.model = new S.Model.EditorModel(level);
      this.view = new S.View.EditorView(app.canvas, app.editorUI);
      this.painting = false; this.erasing = false; this.panning = null; this.dragObj = null; this.keys = {};
      this.lastCell = null;
      this.bind();
      this.view.buildToolbar(this.model, this.handlers());
      app.editorUI.style.display = 'block';
      this.offs.push(S.events.on('editor:change', () => this.view.refreshInfo(this.model)));
      this.offs.push(S.events.on('editor:tool', () => this.view.refreshInfo(this.model)));
      const nameOf = (t) => (S.Model.Catalog.OBJECTS[t] && S.Model.Catalog.OBJECTS[t].name) || (t === 'subzona' ? 'subzonas (máx 2)' : t);
      this.offs.push(S.events.on('editor:limit', (d) => app.menu.toast('Límite alcanzado para ' + nameOf(d.type))));
      this.offs.push(S.events.on('editor:filled', (d) => app.menu.toast('Caja rellenada con ' + nameOf(d.type), 1200)));
      this.offs.push(S.events.on('editor:collectMix', () => app.menu.toast('Usa un solo tipo de Moneda Estrella por nivel (mezclarlas sería muy confuso)', 1800)));
      this.offs.push(S.events.on('editor:linkFrom', () => app.menu.toast('Origen marcado. Clica el destino (puedes cambiar de zona).', 1800)));
      this.offs.push(S.events.on('editor:linkDone', (d) => app.menu.toast('Enlazado a ' + (d.z === 0 ? 'Base' : 'Sub ' + d.z) + ' (#' + (d.i + 1) + ')', 1500)));
      this.offs.push(S.events.on('editor:linkBad', () => app.menu.toast('Para enlazar, clica dos tuberías (o dos puertas).', 1600)));
    }

    handlers() {
      const m = this.model, menu = this.app.menu;
      return {
        play: () => this.play(),
        undo: () => m.undo(),
        redo: () => m.redo(),
        theme: () => menu.themePicker(m.level.theme, m.level.mode, (id) => { m.mutate((L) => { L.theme = id; }); this.view.refreshItems(m); }),
        mode: () => { m.mutate((L) => { L.mode = L.mode === 'corrupt' ? 'peace' : 'corrupt'; }); this.view.refreshItems(m); const th = S.Model.Themes.get(m.level.theme); menu.toast(m.level.mode === 'corrupt' ? '☠ Modo Corrupto: ' + th.effectLabel : '☀ Modo Paz'); },
        character: () => menu.characterPicker(m.level.character, (id) => { m.mutate((L) => { L.character = id; }); this.view.refreshItems(m); }, () => {}, 'Glob del nivel'),
        settings: () => menu.levelSettings(m.level, (v) => { m.mutate((L) => { L.name = v.name; L.time = U.clamp(v.time | 0, 10, 500); L.win = S.Model.Level.normWin(v.win); L.resize(v.width, v.height); }); this.clampCam(); }, {
          exportLevel: () => { menu.closeModal(); menu.textBox('Exportar nivel (copia este texto)', JSON.stringify(m.full().toJSON())); },
          importLevel: () => { menu.closeModal(); this.app.importDialog((lvl) => { lvl.id = m.level.id; m.setLevel(lvl); m.dirty = true; this.view.buildToolbar(m, this.handlers()); }); },
          clearLevel: () => { m.mutate((L) => { const d = Level.createDefault(); d.resize(L.width, L.height); L.tiles = d.tiles; L.objects = d.objects; L.contents = {}; }); }
        }),
        save: () => this.save(),
        exit: () => {
          if (m.dirty) menu.confirm('Hay cambios sin guardar. ¿Salir igualmente?', () => this.app.showTitle());
          else this.app.showTitle();
        }
      };
    }

    save() {
      const r = Storage.save(this.model.full().toJSON());
      if (r === 'ok') { this.model.dirty = false; this.view.refreshInfo(this.model); }
      this.app.menu.toast(r === 'ok' ? '💾 Nivel guardado (' + Storage.count() + '/' + Storage.limit() + ')'
        : r === 'full' ? 'Has llegado al máximo de ' + Storage.limit() + ' niveles. Borra alguno para guardar este.'
          : 'No se pudo guardar (almacenamiento del navegador lleno)');
    }

    play() {
      const errs = this.model.validate();
      if (errs.length) { this.app.menu.toast(errs.join(' ')); return; }
      Storage.saveDraft(this.model.full().toJSON());
      this.app.testLevel(this);
    }

    cellAt(ev) {
      const r = this.app.canvas.getBoundingClientRect();
      const x = (ev.clientX - r.left) * (S.VIEW_W / r.width) + this.model.camX;
      const y = (ev.clientY - r.top) * (S.VIEW_H / r.height) + this.model.camY;
      return { x: Math.floor(x / T), y: Math.floor(y / T) };
    }
    clampCam() {
      const m = this.model, L = m.level;
      m.camX = U.clamp(m.camX, 0, Math.max(0, L.width * T - S.VIEW_W + 4 * T));
      m.camY = U.clamp(m.camY, 0, Math.max(0, L.height * T - S.VIEW_H));
    }

    bind() {
      const cv = this.app.canvas, m = this.model;
      this.offs = [];
      const on = (target, ev, f, o) => { target.addEventListener(ev, f, o); this.offs.push(() => target.removeEventListener(ev, f, o)); };
      on(cv, 'contextmenu', (e) => e.preventDefault());
      on(cv, 'mousedown', (e) => {
        if (this.app.menu.modal.style.display === 'flex') return;
        const c = this.cellAt(e);
        if (e.button === 1 || (e.button === 0 && this.keys.Space)) { this.panning = { x: e.clientX, y: e.clientY, cx: m.camX, cy: m.camY }; e.preventDefault(); return; }
        // Arrastrar objetos con Alt+clic
        if (e.button === 0 && e.altKey && m.level.objectAt(c.x, c.y)) { m.beginStroke(); this.dragObj = c; return; }
        m.beginStroke();
        this.painting = true; this.erasing = e.button === 2;
        this.lastCell = null; this.paint(c);
      });
      on(window, 'mousemove', (e) => {
        if (this.panning) {
          const r = cv.getBoundingClientRect(), k = S.VIEW_W / r.width;
          m.camX = this.panning.cx - (e.clientX - this.panning.x) * k; m.camY = this.panning.cy - (e.clientY - this.panning.y) * k; this.clampCam(); return;
        }
        if (e.target !== cv && !this.painting && !this.dragObj) { this.view.hover = null; return; }
        const c = this.cellAt(e);
        this.view.hover = { x: c.x, y: c.y, erase: this.erasing };
        if (this.dragObj) { if (m.moveObject(this.dragObj.x, this.dragObj.y, c.x, c.y)) this.dragObj = c; return; }
        if (this.painting) this.paint(c);
      });
      on(window, 'mouseup', () => {
        if (m.stroke) m.endStroke();
        this.painting = false; this.erasing = false; this.panning = null; this.dragObj = null;
        if (this.view.hover) this.view.hover.erase = false;
      });
      on(cv, 'wheel', (e) => {
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (e.shiftKey) m.camY += d; else m.camX += d;
        this.clampCam();
      }, { passive: false });
      on(window, 'keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (this.app.menu.modal.style.display === 'flex') return;
        this.keys[e.code] = true;
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? m.redo() : m.undo(); }
        else if (ctrl && e.code === 'KeyY') { e.preventDefault(); m.redo(); }
        else if (ctrl && e.code === 'KeyS') { e.preventDefault(); this.save(); }
        else if (e.code === 'KeyP' && !e.repeat) this.play();
        else if (/^Digit[1-5]$/.test(e.code)) {
          const cat = S.Model.Catalog.PALETTE[+e.code.slice(5) - 1];
          if (cat) { this.view.cat = cat.id; this.view.buildToolbar(m, this.handlers()); }
        }
        // R = rotar horizontal (hacia dónde mira), E = rotar vertical (arriba/abajo); sobre el objeto del cursor
        else if (e.code === 'KeyR' || e.code === 'KeyE') {
          const h = this.view.hover;
          if (h) {
            const rotated = m.rotateObjectAt(h.x, h.y, e.code === 'KeyE' ? 'v' : 'h');
            if (!rotated) this.app.menu.toast('Eso no se puede girar', 900);
          }
        }
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      });
      on(window, 'keyup', (e) => { this.keys[e.code] = false; });
    }

    paint(c) {
      if (this.lastCell && this.lastCell.x === c.x && this.lastCell.y === c.y) return;
      // interpolar para no dejar huecos al arrastrar rápido
      const from = this.lastCell || c;
      const n = Math.max(Math.abs(c.x - from.x), Math.abs(c.y - from.y), 1);
      const before = this.model.changed;
      this.model.changed = false;
      for (let i = 1; i <= n; i++) {
        const x = Math.round(U.lerp(from.x, c.x, i / n)), y = Math.round(U.lerp(from.y, c.y, i / n));
        this.model.apply(x, y, this.erasing);
      }
      if (this.model.changed) S.events.emit(this.erasing ? 'ui:erase' : 'ui:place');
      this.model.changed = this.model.changed || before;
      this.lastCell = c;
      // los objetos (enemigos, etc.) y el enlace se aplican de uno en uno
      if ((this.model.tool.kind === 'obj' || this.model.tool.kind === 'link') && !this.erasing) this.painting = false;
    }

    update(dt) {
      const m = this.model, k = this.keys, sp = 700 * dt;
      if (k.ArrowLeft || k.KeyA) m.camX -= sp;
      if (k.ArrowRight || k.KeyD) m.camX += sp;
      if (k.ArrowUp || k.KeyW) m.camY -= sp;
      if (k.ArrowDown || k.KeyS) m.camY += sp;
      this.clampCam();
    }
    render(t) { this.view.render(this.model, t); }

    suspend() { this.app.editorUI.style.display = 'none'; this.view.hover = null; this.painting = false; this.keys = {}; }
    resume() { this.app.editorUI.style.display = 'block'; this.view.buildToolbar(this.model, this.handlers()); }
    destroy() { this.offs.forEach((f) => f()); this.app.editorUI.style.display = 'none'; this.app.editorUI.innerHTML = ''; }
  }
  S.Controller.EditorController = EditorController;
})(window.SGM);
