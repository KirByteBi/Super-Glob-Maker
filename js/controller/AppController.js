/* Controlador principal: navegación entre pantallas y bucle del juego */
(function (S) {
  'use strict';
  const Storage = S.Model.LevelStorage;
  const PROG = 'sgm.progress.v1';
  const prefs = () => { try { return JSON.parse(localStorage.getItem('sgm.prefs') || '{}'); } catch (e) { return {}; } };
  const savePrefs = (p) => { try { localStorage.setItem('sgm.prefs', JSON.stringify(p)); } catch (e) { /* nada */ } };

  class AppController {
    constructor() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.editorUI = document.getElementById('editor-ui');
      this.menu = new S.View.MenuView(document.getElementById('screen'), document.getElementById('modal'), document.getElementById('toast'));
      this.input = new S.Controller.InputController();
      this.game = null; this.editor = null; this.mode = 'menu';
      this.prefs = Object.assign({ character: 'green', storyMode: 'peace' }, prefs());
      this.t = 0; this.last = performance.now();
      S.View.SoundView.init();
      const unlock = () => S.View.SoundView.unlock();
      window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
      this.fit(); window.addEventListener('resize', () => this.fit());
    }

    start() {
      this.menu.loading(0);
      S.View.Assets.loadAll((p) => this.menu.loading(p)).then(() => this.showTitle());
      requestAnimationFrame((ts) => this.loop(ts));
    }

    fit() {
      const wrap = document.getElementById('stage');
      const k = Math.min(window.innerWidth / S.VIEW_W, window.innerHeight / S.VIEW_H);
      wrap.style.width = Math.floor(S.VIEW_W * k) + 'px'; wrap.style.height = Math.floor(S.VIEW_H * k) + 'px';
      wrap.style.setProperty('--k', k);
    }

    loop(ts) {
      let dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
      if (!(dt >= 0)) dt = 0; // primer fotograma / reloj raro: sin NaN (rompía el fondo del menú)
      this.t = (this.t || 0) + dt;
      const inp = this.input.poll();
      if (this.mode === 'game' && this.game) { this.game.update(dt, inp); this.game.render(this.t); }
      else if (this.mode === 'editor' && this.editor) { this.editor.update(dt); this.editor.render(this.t); }
      else if (this.mode === 'map' && this.worldmap) { this.worldmap.update(dt, inp); this.worldmap.render(this.t); }
      else this.drawMenuBackdrop();
      requestAnimationFrame((t) => this.loop(t));
    }

    drawMenuBackdrop() {
      const themes = S.Model.Themes.list;
      const t = this.t || 0, i = Math.floor(t / 8) % themes.length;
      const mode = Math.floor(t / 8) % 2 ? 'corrupt' : 'peace';
      S.View.BackgroundView.draw(this.ctx, themes[i] || themes[0], mode, t * 60, t);
    }

    // ---------- navegación ----------
    clearAll() {
      if (this.game) { this.game.destroy(); this.game = null; }
      if (this.editor) { this.editor.destroy(); this.editor = null; }
      if (this.worldmap) { this.worldmap.destroy(); this.worldmap = null; }
      this.menu.closeModal(); this.menu.clear(); this.mode = 'menu';
    }

    showTitle() {
      this.clearAll();
      this.menu.title({
        story: () => this.showStory(),
        create: () => this.newLevel(),
        levels: () => this.showLevels(),
        online: () => this.showOnline('home'),
        controls: () => this.menu.controls(),
        account: () => this.accountDialog()
      });
    }

    accountDialog(onDone) {
      const Gld = S.Model.Gld, Storage = S.Model.LevelStorage;
      const open = (username) => this.menu.accountDialog({
        linked: Storage.isLinked(), username,
        login: (u, p, cb) => { Gld.login(u, p).then((r) => { cb(r); if (r.ok && onDone) onDone(); }); },
        logout: (cb) => { Gld.logout().then(() => { cb(); this.showTitle(); }); }
      });
      // si hay sesión, intenta leer el nombre de usuario antes de abrir
      if (Storage.isLinked() && Gld.configured()) { Gld.username().then((n) => open(n)).catch(() => open(null)); }
      else open(null);
    }

    showStory() {
      // World-map (mapamundi). Si el modulo no cargo, cae al grid clasico (fallback seguro).
      if (S.Controller.MapController && S.Model.StoryMap) { this.showStoryMap(); return; }
      this.clearAll();
      const mode = this.prefs.storyMode;
      this.menu.story(mode, this.prefs.character, {
        back: () => this.showTitle(),
        toggleMode: () => { this.prefs.storyMode = mode === 'corrupt' ? 'peace' : 'corrupt'; savePrefs(this.prefs); this.showStory(); },
        character: () => this.menu.characterPicker(this.prefs.character, (id) => { this.prefs.character = id; savePrefs(this.prefs); this.showStory(); }, () => {}),
        cleared: (id, m) => !!this.progress()[id + ':' + m],
        play: (themeId) => {
          const L = S.Model.SampleLevels.build(themeId, mode);
          this.playLevel(L.toJSON(), { character: this.prefs.character, story: { theme: themeId, mode } });
        }
      });
    }

    // Mapamundi del Modo Historia
    showStoryMap(worldId) {
      this.clearAll();
      this.worldmap = new S.Controller.MapController(this, worldId || 'w1', this.prefs.storyMode);
      this.mode = 'map';
    }

    // Lanzar el nivel de un nodo del mapamundi
    playStoryNode(worldId, nodeId, mode) {
      const node = S.Model.StoryMap.world(worldId).map[nodeId];
      const L = S.Model.SampleLevels.build(node.theme, mode);
      this.playLevel(L.toJSON(), { character: this.prefs.character, story: { theme: node.theme, mode, world: worldId, node: nodeId } });
    }

    showLevels() {
      this.clearAll();
      this.menu.myLevels(Storage.list(), {
        back: () => this.showTitle(),
        create: () => this.newLevel(),
        importLevel: () => this.importDialog((L) => {
          const r = Storage.save(L.toJSON());
          this.showLevels();
          this.menu.toast(r === 'ok' ? 'Nivel importado' : r === 'full' ? 'Máximo de ' + Storage.limit() + ' niveles alcanzado' : 'No se pudo importar');
        }),
        play: (l) => this.playLevel(l, {}),
        edit: (l) => this.openEditor(new S.Model.Level(l)),
        remove: (l) => { Storage.remove(l.id); this.showLevels(); },
        // Publicar en la nube de Glob Defenders (una sola vez por nivel; requiere sesión)
        publish: (l) => this.publishLocal(l, () => this.showLevels()),
        // Copiar: nivel nuevo editable que recuerda de dónde viene
        copy: (l) => {
          const c = S.Model.Level.copy(l), r = Storage.save(c.toJSON());
          if (r !== 'ok') { this.menu.toast(r === 'full' ? 'Máximo de ' + Storage.limit() + ' niveles alcanzado' : 'No se pudo copiar'); return; }
          this.showLevels();
          this.menu.toast('📄 Copia creada. Para publicarla cambia el tema o el modo, o modifícala bastante.', 3800);
        },
        // Exportar: el nivel como texto para compartirlo / guardarlo fuera del juego
        exportLevel: (l) => this.exportLevel(l)
      });
    }

    // Texto exportable de un nivel (sin marcas de publicación ni historial de copias)
    exportLevel(l) {
      const txt = JSON.stringify(S.Model.Level.content(l));
      this.menu.textBox('Exportar "' + l.name + '"', txt, null);
      const box = this.menu.modal.querySelector('.modal-box'), row = box && box.querySelector('.row');
      if (row) {
        row.insertBefore(S.View.button('📋 Copiar al portapapeles', 'primary', () => {
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => this.menu.toast('Copiado'), () => this.menu.toast('Selecciona el texto y usa Ctrl+C'));
        }), row.firstChild);
        row.insertBefore(S.View.button('💾 Descargar archivo', '', () => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
          a.download = (String(l.name || 'nivel').replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, '').trim() || 'nivel') + '.sgm.json';
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        }), row.children[1]);
      }
    }

    // Publica un nivel guardado. Avisa si ya estaba publicado (Glob Cometa) o si es una copia
    // demasiado parecida a su original. done() se llama tras publicar con éxito.
    publishLocal(l, done) {
      const Gld = S.Model.Gld;
      const can = Gld.canPublish(l);
      if (!can.ok && can.error === 'already') {
        this.menu.notice('☄ Nivel ya publicado', 'Este nivel ya está publicado y no se puede volver a publicar. Si quieres otra versión, haz una COPIA (📄) y cámbiale el tema, el modo o bastantes cosas.', S.Model.Characters.get('black').paths[0]);
        return;
      }
      if (!can.ok && can.error === 'too-similar') {
        this.menu.notice('📄 Copia demasiado parecida', 'Esta copia se parece demasiado a "' + (can.origName || 'su original') + '" (solo un ' + Math.round(can.ratio * 100) + '% distinto). Para publicarla cámbiale el tema o el modo (por ejemplo, su versión Corrupta), o modifica al menos un ' + Math.round(S.Model.Level.COPY_MIN_RATIO * 100) + '% del nivel.');
        return;
      }
      const go = () => {
        this.menu.confirm('¿Publicar "' + l.name + '"? Una vez publicado no podrás volver a publicarlo ni cambiar la versión online.', () => {
          this.menu.toast('Publicando…', 1200);
          Gld.publish(l).then((r) => {
            if (r.ok) {
              const cur = Storage.get(l.id) || l;
              Storage.save(Object.assign({}, cur, { publishedAt: Date.now(), cloudId: r.id }));
              this.menu.toast('☄ ¡Publicado! Míralo en 🌐 Online', 2600);
              if (done) done();
            } else this.menu.toast(r.error === 'offline' ? 'Sin conexión' : r.error === 'pub-limit' ? 'Ya tienes 120 niveles publicados' : r.error === 'duplicate' ? 'Ya hay un nivel publicado idéntico a este' : r.error === 'already' ? 'Este nivel ya está publicado' : 'No se pudo publicar');
          });
        }, 'Publicar');
      };
      if (!Storage.isLinked()) { this.accountDialog(() => { if (Storage.isLinked()) go(); }); return; }
      go();
    }

    // ---------- ONLINE ----------
    // tab: home | top | new | plays | hard | search | me | author. arg = texto buscado o autor
    showOnline(tab, arg) {
      const Gld = S.Model.Gld;
      this.clearAll(); this.mode = 'menu';
      const tok = this.onlineTok = (this.onlineTok || 0) + 1; // descarta respuestas de pestañas viejas
      const st = { tab, rows: [], loading: true, user: null, v2: Gld.v2, search: tab === 'search' ? arg || '' : '', author: tab === 'author' ? arg : null, localLevels: Storage.list() };
      const err = (e) => ({ 'pub-limit': 'Ya tienes 120 niveles publicados (el máximo).', limit: 'Límite de 258 niveles en la nube.', 'no-session': 'Inicia sesión primero.', offline: 'Sin conexión.', own: 'No puedes votar tus propios niveles.', 'no-v2': 'Los "no me gusta" llegarán cuando se aplique el SQL online v2.' }[e] || 'Error: ' + e);
      const h = {
        back: () => this.showTitle(),
        tab: (id) => this.showOnline(id),
        author: (name) => this.showOnline('author', name),
        search: (q) => (q && q[0] === '@' ? this.showOnline('author', q.slice(1)) : this.showOnline('search', q)),
        account: () => this.accountDialog(() => this.showOnline(tab, arg)),
        play: (row) => this.playOnline(row, () => this.showOnline(tab, arg)),
        publish: (l) => this.publishLocal(l, () => this.showOnline('me')),
        setPublic: (m, on) => Gld.setPublic(m.id, on).then((r) => { this.menu.toast(r.ok ? (on ? '🌐 Publicado' : '🙈 Ahora es privado') : err(r.error)); this.showOnline('me'); }),
        removeCloud: (m) => Gld.removeCloud(m.id).then((r) => { if (r.ok && m.local) Gld.setCloudId(m.local, null); this.menu.toast(r.ok ? 'Borrado de la nube' : err(r.error)); this.showOnline('me'); })
      };
      const render = () => { if (tok === this.onlineTok && this.mode === 'menu') this.menu.online(st, h); };
      render();
      if (!Gld.configured()) { st.loading = false; st.error = 'offline'; render(); return; }
      const done = (r) => { st.loading = false; if (r && r.ok === false) st.error = r.error; st.v2 = Gld.v2; render(); };
      const userP = Storage.isLinked() ? Gld.username().catch(() => null) : Promise.resolve(null);
      userP.then((u) => {
        st.user = u;
        if (tab === 'me') return st.user ? Gld.mine().then((r) => { st.mine = r.rows; done(r); }) : done();
        if (tab === 'search' && !st.search) return done();
        if (tab === 'home') {
          return Gld.browse({ sort: 'top', limit: 50 }).then((r) => {
            st.rows = r.rows.slice(0, 5);
            // Nivel del día: uno de los 50 mejores, el mismo para todos durante el día
            if (r.rows.length) { const d = new Date(), seed = d.getUTCFullYear() * 400 + d.getUTCMonth() * 31 + d.getUTCDate(); st.featured = r.rows[Math.floor(S.util.hash(seed) * r.rows.length)]; }
            done(r);
          });
        }
        const q = tab === 'author' ? { sort: 'top', author: st.author, limit: 60 } : tab === 'search' ? { sort: 'top', search: st.search, limit: 40 } : { sort: tab, limit: tab === 'top' ? 10 : 30 };
        return Gld.browse(q).then((r) => { st.rows = r.rows; done(r); });
      }).catch((e) => done({ ok: false, error: String(e && e.message || e) }));
    }
    // Descarga y juega un nivel publicado; al acabar cuenta la partida y deja votar
    playOnline(row, back) {
      this.menu.toast('Cargando "' + row.name + '"…', 1500);
      S.Model.Gld.getLevel(row.id).then((data) => {
        if (!data) { this.menu.toast('No se pudo cargar el nivel'); return; }
        this.playLevel(data, { online: { id: row.id, name: row.name, author: row.author, back } });
      });
    }

    importDialog(cb) {
      this.menu.textBox('Importar nivel (pega el texto)', '', (txt) => {
        try {
          const d = JSON.parse(txt);
          if (!d || typeof d !== 'object' || !d.tiles) throw new Error('formato');
          const L = new S.Model.Level(d); L.id = S.util.uid();
          cb(L);
        } catch (e) { this.menu.toast('Ese texto no es un nivel válido'); }
      }, 'Importar');
    }

    // Nivel nuevo: primero se elige cómo empieza (Campo de Pruebas, Clásico o Aireado)
    newLevel() {
      this.menu.startStyle((style) => {
        const level = S.Model.Level.createDefault(style);
        level.character = this.prefs.character;
        this.openEditor(level);
      });
    }

    openEditor(level, style) {
      this.clearAll();
      if (!level) { level = S.Model.Level.createDefault(style); level.character = this.prefs.character; }
      this.editor = new S.Controller.EditorController(this, level);
      this.mode = 'editor';
    }

    // ---------- partidas ----------
    playLevel(data, opts) {
      this.clearAll();
      this.lastPlay = { data, opts };
      this.game = new S.Controller.GameController(this, data, opts);
      this.mode = 'game';
    }

    testLevel(editorCtrl) {
      editorCtrl.suspend();
      this.suspendedEditor = editorCtrl; this.editor = null;
      const data = editorCtrl.model.level.toJSON();
      this.lastPlay = { data, opts: { testMode: true, character: data.character } };
      this.game = new S.Controller.GameController(this, data, this.lastPlay.opts);
      this.mode = 'game';
      this.input.swallow();
      this.menu.toast('Probando nivel · Esc: volver al editor · P: pausa');
    }

    backToEditor() {
      if (this.game) { this.game.destroy(); this.game = null; }
      this.menu.closeModal();
      this.editor = this.suspendedEditor; this.suspendedEditor = null;
      if (!this.editor) { this.showTitle(); return; }
      this.editor.resume(); this.mode = 'editor';
      this.input.swallow();
    }

    restartGame() {
      const lp = this.lastPlay; if (!lp) return;
      const keep = this.suspendedEditor;
      if (this.game) { this.game.destroy(); this.game = null; }
      this.suspendedEditor = keep;
      this.game = new S.Controller.GameController(this, lp.data, lp.opts);
      this.mode = 'game';
    }

    exitGame() {
      if (this.suspendedEditor) { this.backToEditor(); return; }
      const online = this.lastPlay && this.lastPlay.opts.online;
      if (online && online.back) { online.back(); return; }
      const story = this.lastPlay && this.lastPlay.opts.story;
      if (story && story.world) this.showStoryMap(story.world); // vuelve al mapamundi
      else if (story) this.showStory();
      else this.showTitle();
    }

    progress() { try { return JSON.parse(localStorage.getItem(PROG) || '{}'); } catch (e) { return {}; } }

    // ¿El nivel (base + subzonas) esconde meta oculta o interruptor "!"? Para la pantalla de resultado.
    levelSecrets(data) {
      const out = { hidden: false, exSwitch: false };
      const scan = (objs) => {
        if (!Array.isArray(objs)) return;
        for (const o of objs) {
          if (o.type === 'goalhidden') out.hidden = true;
          else if (o.type === 'exswitch0' || o.type === 'exswitch1' || o.type === 'exswitch2') out.exSwitch = true;
        }
      };
      if (data) { scan(data.objects); if (Array.isArray(data.subs)) data.subs.forEach((s) => scan(s && s.objects)); }
      return out;
    }

    onGameFinished(kind, g) {
      const lp = this.lastPlay, testing = !!this.suspendedEditor;
      if (kind === 'clear' && lp.opts.story) {
        const p = this.progress(); p[lp.opts.story.theme + ':' + lp.opts.story.mode] = Math.max(p[lp.opts.story.theme + ':' + lp.opts.story.mode] || 0, g.score);
        try { localStorage.setItem(PROG, JSON.stringify(p)); } catch (e) { /* nada */ }
        // Mapamundi: marca el nodo como completado (y por meta oculta si aplica) para desbloquear
        if (lp.opts.story.world && lp.opts.story.node && S.Model.StoryMap) {
          S.Model.StoryMap.markCleared(lp.opts.story.world, lp.opts.story.node, !!g.secretClear);
        }
      }
      const img = g.player.formPath();
      let lines;
      if (kind === 'clear') {
        // ¿superado por meta oculta / interruptor "!" o por la meta normal?
        lines = [g.secretClear ? '🏅 ¡Medalla por META OCULTA!' : '🏅 ¡Has conseguido la Medalla!',
          'Puntos: ' + g.score, 'Globins: ' + g.coins, 'Forma final: ' + g.player.formName()];
        // Monedas Estrella conseguidas (si el nivel tiene)
        if (g.starTotal > 0) lines.push('⭐ Monedas Estrella: ' + g.stars + ' / ' + g.starTotal + (g.stars >= g.starTotal ? ' ¡todas!' : ''));
        // ¿el nivel esconde una salida secreta que NO usaste? (meta oculta o interruptor "!")
        const secretInfo = this.levelSecrets(lp.data);
        if (!g.secretClear && (secretInfo.hidden || secretInfo.exSwitch)) {
          lines.push(secretInfo.hidden && secretInfo.exSwitch ? '🔍 Este nivel esconde una META OCULTA y un interruptor "!"'
            : secretInfo.hidden ? '🔍 Este nivel esconde una META OCULTA'
              : '🔍 Este nivel esconde un interruptor "!"');
        }
      } else {
        lines = ['Te has quedado sin vidas…', 'Puntos: ' + g.score];
      }
      if (kind === 'gameover') S.events.emit('game:gameover_sfx');
      const online = lp.opts.online;
      if (online) {
        lines.unshift('🌐 ' + online.name + (online.author ? ' · por @' + online.author : ''));
        S.Model.Gld.play(online.id, kind === 'clear').catch(() => {}); // cuenta la partida (y si lo superaste)
      }
      const btns = [['Reintentar', () => { this.menu.closeModal(); this.restartGame(); }, kind === 'clear' ? '' : 'primary']];
      if (testing) btns.push(['Volver al editor', () => this.backToEditor(), 'primary']);
      else btns.push(['Continuar', () => this.exitGame(), kind === 'clear' ? 'primary' : '']);
      this.menu.result({ title: kind === 'clear' ? '¡Nivel superado!' : 'Fin de la partida', img, lines }, btns);
      // Nivel online: votar me gusta / no me gusta (afecta a su puntuación)
      if (online) {
        const box = this.menu.modal.querySelector('.modal-box'), Gld = S.Model.Gld;
        if (!Storage.isLinked()) { box.appendChild(S.View.el('p', 'small', 'Inicia sesión en 🌐 Online para votar este nivel.')); return; }
        let bar = null;
        const draw = (cur) => { if (bar) bar.remove(); bar = this.menu.voteBar(box, cur, (v) => Gld.vote(online.id, v).then((r) => { if (r.ok) { draw(v); this.menu.toast(v === 1 ? '👍 ¡Te gusta!' : v === -1 ? '👎 Anotado' : 'Voto quitado', 1200); } else this.menu.toast(r.error === 'own' ? 'No puedes votar tus propios niveles' : r.error === 'no-v2' ? 'Los 👎 llegarán con el SQL online v2' : 'No se pudo votar'); })); };
        Gld.myVote(online.id).then(draw).catch(() => draw(0));
      }
    }
  }
  S.Controller.AppController = AppController;
})(window.SGM);
