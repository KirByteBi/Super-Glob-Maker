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
      this.offs.push(S.events.on('editor:npcLink', (d) => app.menu.toast(d.text, 2600)));
      this.offs.push(S.events.on('editor:linkDone', (d) => app.menu.toast('Enlazado a ' + (d.z === 0 ? 'Base' : 'Sub ' + d.z) + ' (#' + (d.i + 1) + ')', 1500)));
      this.offs.push(S.events.on('editor:linkBad', () => app.menu.toast('Para enlazar, clica dos tuberías (o dos puertas).', 1600)));
    }

    handlers() {
      const m = this.model, menu = this.app.menu;
      return {
        play: () => this.play(),
        undo: () => m.undo(),
        redo: () => m.redo(),
        theme: () => menu.themePicker(m.level.theme, m.level.mode, (id) => { m.mutate((L) => { const old = L.theme; L.theme = id; if (S.View.Decorations && S.View.Decorations.remap) { try { S.View.Decorations.remap(old, id, L.objects); } catch (e) { /* re-mapeo opcional */ } } }); this.view.refreshItems(m); }),
        mode: () => { m.mutate((L) => { L.mode = L.mode === 'corrupt' ? 'peace' : 'corrupt'; }); this.view.refreshItems(m); const th = S.Model.Themes.get(m.level.theme); menu.toast(m.level.mode === 'corrupt' ? '☠ Modo Corrupto: ' + th.effectLabel : '☀ Modo Paz'); },
        character: () => menu.characterPicker(m.level.character, (id) => { m.mutate((L) => { L.character = id; }); this.view.refreshItems(m); }, () => {}, 'Glob del nivel'),
        settings: () => menu.levelSettings(m.level, (v) => { m.mutate((L) => { L.name = v.name; L.time = U.clamp(v.time | 0, 10, 500); L.win = S.Model.Level.normWin(v.win); L.scroll = v.scroll ? 1 : 0; L.scrollSpeed = U.clamp(v.scrollSpeed | 0 || 40, 15, 120); L.noPowers = v.noPowers ? 1 : 0; L.resize(v.width, v.height); }); this.clampCam(); }, {
          exportLevel: () => { menu.closeModal(); this.app.exportLevel(m.full().toJSON()); },
          importLevel: () => { menu.closeModal(); this.app.importDialog((lvl) => { lvl.id = m.level.id; m.setLevel(lvl); m.dirty = true; this.view.buildToolbar(m, this.handlers()); }, true); },
          clearLevel: () => { m.mutate((L) => { const d = Level.createDefault(); d.resize(L.width, L.height); L.tiles = d.tiles; L.objects = d.objects; L.contents = {}; }); }
        }),
        save: () => this.save(),
        exit: () => {
          // editando un nivel de la Historia: se vuelve a su mapamundi
          const back = this.story ? () => this.app.showStoryMap(this.story.world) : () => this.app.showTitle();
          if (m.dirty) menu.confirm('Hay cambios sin guardar. ¿Salir igualmente?', back);
          else back();
        }
      };
    }

    // Antes de guardar se comprueba (a grandes rasgos) que se puede llegar a la Medalla.
    // Si no, avisa y deja guardar igualmente (puede haber trucos que la comprobación no ve).
    save(force) {
      if (this.story && !this.app.canEditStory()) {
        this.app.menu.toast('Solo kirbytebi puede editar los niveles de la Historia');
        return;
      }
      if (!force && S.Model.LevelCheck) {
        let chk = null;
        try { chk = S.Model.LevelCheck.check(this.model.full()); } catch (e) { chk = null; }
        if (chk && !chk.ok) {
          const b = this.app.menu.openModal('¿Se puede superar?');
          b.appendChild(S.View.el('p', 'result-line', chk.problems.join(' ')));
          b.appendChild(S.View.el('p', 'small', 'La comprobación mira si se puede ir saltando desde la salida (sin contar enemigos). Pruébalo con ▶ Jugar antes de publicarlo.'));
          const row = S.View.el('div', 'row');
          row.appendChild(S.View.button('Guardar igualmente', 'primary', () => { this.app.menu.closeModal(); this.save(true); }));
          row.appendChild(S.View.button('▶ Probarlo', '', () => { this.app.menu.closeModal(); this.play(); }));
          row.appendChild(S.View.button('Cancelar', '', () => this.app.menu.closeModal()));
          b.appendChild(row);
          return;
        }
      }
      // Nivel del Modo Historia (admin): va a la lista oculta de la Historia, no a Mis niveles
      if (this.story) {
        const st = this.story, ok = S.Model.StoryPack.saveLocal(st.world, st.node, st.mode, this.model.full().toJSON());
        if (ok) { this.model.dirty = false; this.view.refreshInfo(this.model); }
        if (!ok) { this.app.menu.toast('No se pudo guardar localmente (almacenamiento del navegador lleno)', 3200); return; }
        S.Model.Gld.storyPackSave(st.world, st.node, st.mode, this.model.full().toJSON()).then((r) => {
          if (r.ok) {
            S.Model.StoryPack.setCloudLevel(st.world, st.node, st.mode, S.Model.Level.content(this.model.full().toJSON()));
            this.app.menu.toast('🌐 Guardado globalmente en la Historia (' + st.world.toUpperCase() + ' · ' + st.node + ')', 3200);
          } else {
            const reason = r.error === 'no-story-pack' ? 'Falta aplicar kiro/supabase_story_pack.sql en Supabase'
              : r.error === 'offline' ? 'sin conexión o sesión de cuenta'
                : r.error;
            this.app.menu.toast('📖 Guardado solo en este navegador; no se pudo sincronizar (' + reason + ')', 4200);
          }
        }).catch((e) => {
          console.error('No se pudo sincronizar el nivel de Historia:', e);
          this.app.menu.toast('📖 Guardado solo en este navegador; falló la sincronización', 4200);
        });
        return;
      }
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
      // Doble clic sobre un NPC: cuadro de frases y enlaces (ver al final de este archivo)
      on(cv, 'dblclick', (e) => {
        if (this.app.menu.modal.style.display === 'flex') return;
        S.Controller.NpcDialog.open(this.app.menu, m, this.cellAt(e));
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
        // Esc con un modal abierto lo CIERRA (si no, el modal quedaba bloqueando los clics de
        // colocar: no se podia pintar pero Guardar si funcionaba).
        if (this.app.menu.modal.style.display === 'flex') { if (e.code === 'Escape') { this.app.menu.closeModal(); this.painting = false; this.keys = {}; } return; }
        // Mientras se prueba el nivel el editor está suspendido: sus atajos (P = jugar) no deben
        // seguir activos o cada P en la partida relanzaría la prueba.
        if (this.suspended) return;
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
      // (salvo al arrastrar una tubería: así se alarga / acorta siguiendo el ratón)
      if ((this.model.tool.kind === 'obj' || this.model.tool.kind === 'link') && !this.erasing && !this.model.pipeDrag) this.painting = false;
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

    suspend() { this.suspended = true; this.app.editorUI.style.display = 'none'; this.view.hover = null; this.painting = false; this.keys = {}; }
    resume() { this.suspended = false; this.app.editorUI.style.display = 'block'; this.view.buildToolbar(this.model, this.handlers()); }
    destroy() { this.offs.forEach((f) => f()); this.app.editorUI.style.display = 'none'; this.app.editorUI.innerHTML = ''; }
  }
  S.Controller.EditorController = EditorController;
})(window.SGM);

// Cuadro de frases y enlaces de un NPC (doble clic en el editor). Usa los botones de la app.
(function (S) {
  'use strict';
  S.Controller = S.Controller || {};

  // ¿El destino del enlace existe en el nivel? Si no, no se muestra (sigue guardado).
  function exists(L, l) {
    const k = String(l.key);
    if (k.indexOf('type:') === 0) return L.objects.some((q) => q.type === k.slice(5));
    if (l.ev === 'kills') return true;
    if (l.ev === 'hit' || l.ev === 'brick') { const p = k.split(','); return !!L.get(+p[0], +p[1]); }
    const p = k.split(',');
    return L.objects.some((q) => q.x === +p[0] && q.y === +p[1]);
  }

  function open(menu, m, c) {
    const L = m.level;
    const npc = L.objectAt(c.x, c.y);
    if (!npc || npc.type !== 'npc') return;
    const def = S.View.Npcs.get(npc.npc);
    const box = menu.openModal('NPC: ' + (def ? def.name : 'sin imagen'));
    box.appendChild(S.View.el('p', 'small', 'Primera línea: frase de proximidad (siempre). Cada enlace tiene su propia frase.'));
    const ta = document.createElement('textarea');
    ta.rows = 2; ta.maxLength = 240; ta.style.width = '100%';
    ta.value = (npc.say && npc.say[0]) || '';
    box.appendChild(ta);

    const opts = S.Model.NpcLinks.options(L);
    const C = S.Model.Catalog;
    const links = (npc.lk || []).map((l) => ({ ev: l.ev, key: l.key, t: l.t || '', o: !!l.o }));
    const enemyTypes = [...new Set(L.objects.map((q) => q.type).filter((t) => C.ENEMY_TYPES.indexOf(t) !== -1))];
    const list = S.View.el('div', 'npc-links');
    const addBox = S.View.el('div', 'npc-add');
    box.appendChild(list);
    box.appendChild(addBox);

    const add = (ev, key) => {
      if (links.length >= 10 || links.some((l) => l.ev === ev && l.key === key)) return;
      links.push({ ev, key, t: '', o: false });
      draw();
    };

    const draw = () => {
      list.innerHTML = '';
      const shown = links.filter((l) => exists(L, l));
      if (!shown.length) list.appendChild(S.View.el('p', 'small', 'Sin enlaces: solo dice la frase de proximidad. Para enlazar, usa la herramienta de enlace: clic en el NPC y luego en el destino.'));
      shown.forEach((l) => {
        const r = S.View.el('div', 'row');
        r.appendChild(S.View.el('span', '', S.Model.NpcLinks.label(opts, l)));
        const inp = document.createElement('input');
        inp.type = 'text'; inp.maxLength = 120; inp.size = 26; inp.placeholder = 'frase de este enlace';
        inp.value = l.t;
        inp.oninput = () => { l.t = inp.value; };
        r.appendChild(inp);
        r.appendChild(S.View.button('Solo una vez', l.o ? 'primary' : '', () => { l.o = !l.o; draw(); }));
        if (l.ev === 'defeat' || l.ev === 'hurt') {
          r.appendChild(S.View.button(l.ev === 'defeat' ? 'Cambiar a daño' : 'Cambiar a derrota', '', () => {
            l.ev = l.ev === 'defeat' ? 'hurt' : 'defeat'; draw();
          }));
        }
        r.appendChild(S.View.button('Quitar', 'danger', () => { links.splice(links.indexOf(l), 1); draw(); }));
        list.appendChild(r);
      });
      // Botones para añadir: solo lo que hay en el nivel
      addBox.innerHTML = '';
      if (enemyTypes.length) {
        const row = S.View.el('div', 'row');
        enemyTypes.forEach((t) => {
          const nm = C.OBJECTS[t].name;
          row.appendChild(S.View.button('Derrotar cualquier ' + nm, '', () => add('defeat', 'type:' + t)));
          row.appendChild(S.View.button('Daño de ' + nm, '', () => add('hurt', 'type:' + t)));
        });
        addBox.appendChild(row);
      }
      const kills = S.View.el('div', 'row');
      kills.appendChild(S.View.el('span', 'small', 'Al derrotar enemigos:'));
      [3, 5, 10, 20].forEach((n) => kills.appendChild(S.View.button(String(n), '', () => add('kills', String(n)))));
      addBox.appendChild(kills);
    };

    draw();
    const bar = S.View.el('div', 'row');
    bar.appendChild(S.View.button('Guardar', 'primary', () => {
      const first = ta.value.split('\n')[0].trim();
      m.mutate((LL) => {
        const o = LL.objectAt(c.x, c.y);
        if (!o || o.type !== 'npc') return;
        if (first) o.say = [S.Model.TextFilter.clean(first)]; else delete o.say;
        // se guardan también los enlaces que no se muestran (su destino no está en este nivel/zona)
        if (links.length) o.lk = links.map((l) => ({ ev: l.ev, key: l.key, t: S.Model.TextFilter.clean(l.t || ''), o: !!l.o })); else delete o.lk;
      });
      menu.closeModal();
    }));
    bar.appendChild(S.View.button('Cancelar', '', () => menu.closeModal()));
    box.appendChild(bar);
  }

  S.Controller.NpcDialog = { open };
})(window.SGM);
