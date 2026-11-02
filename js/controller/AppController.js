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
      const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts; this.t += dt;
      const inp = this.input.poll();
      if (this.mode === 'game' && this.game) { this.game.update(dt, inp); this.game.render(this.t); }
      else if (this.mode === 'editor' && this.editor) { this.editor.update(dt); this.editor.render(this.t); }
      else this.drawMenuBackdrop();
      requestAnimationFrame((t) => this.loop(t));
    }

    drawMenuBackdrop() {
      const themes = S.Model.Themes.list;
      const i = Math.floor(this.t / 8) % themes.length;
      const mode = Math.floor(this.t / 8) % 2 ? 'corrupt' : 'peace';
      S.View.BackgroundView.draw(this.ctx, themes[i], mode, this.t * 60, this.t);
    }

    // ---------- navegación ----------
    clearAll() {
      if (this.game) { this.game.destroy(); this.game = null; }
      if (this.editor) { this.editor.destroy(); this.editor = null; }
      this.menu.closeModal(); this.menu.clear(); this.mode = 'menu';
    }

    showTitle() {
      this.clearAll();
      this.menu.title({
        story: () => this.showStory(),
        create: () => this.newLevel(),
        levels: () => this.showLevels(),
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
        // Publicar en la nube de Glob Defenders (requiere sesión iniciada)
        publish: (l) => {
          const Gld = S.Model.Gld;
          // Si no hay sesión, abrir directamente el login; al vincularse, reintenta publicar
          if (!Storage.isLinked()) { this.accountDialog(() => { if (Storage.isLinked()) { this.menu.toast('Publicando…', 1200); Gld.cloudSave(l, true).then((r) => this.menu.toast(r.ok ? '✅ Nivel publicado' : r.error === 'offline' ? 'Sin conexión' : 'No se pudo publicar')); } }); return; }
          this.menu.toast('Publicando…', 1200);
          Gld.cloudSave(l, true).then((r) => this.menu.toast(r.ok ? '✅ Nivel publicado' : r.error === 'offline' ? 'Sin conexión' : 'No se pudo publicar'));
        }
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
      this.menu.toast('Probando nivel · Esc para pausar / volver al editor');
    }

    backToEditor() {
      if (this.game) { this.game.destroy(); this.game = null; }
      this.menu.closeModal();
      this.editor = this.suspendedEditor; this.suspendedEditor = null;
      if (!this.editor) { this.showTitle(); return; }
      this.editor.resume(); this.mode = 'editor';
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
      const story = this.lastPlay && this.lastPlay.opts.story;
      if (story) this.showStory(); else this.showTitle();
    }

    progress() { try { return JSON.parse(localStorage.getItem(PROG) || '{}'); } catch (e) { return {}; } }

    onGameFinished(kind, g) {
      const lp = this.lastPlay, testing = !!this.suspendedEditor;
      if (kind === 'clear' && lp.opts.story) {
        const p = this.progress(); p[lp.opts.story.theme + ':' + lp.opts.story.mode] = Math.max(p[lp.opts.story.theme + ':' + lp.opts.story.mode] || 0, g.score);
        try { localStorage.setItem(PROG, JSON.stringify(p)); } catch (e) { /* nada */ }
      }
      const img = g.player.formPath();
      const lines = kind === 'clear'
        ? ['🏅 ¡Has conseguido la Medalla!', 'Puntos: ' + g.score, 'Globins: ' + g.coins, 'Forma final: ' + g.player.formName()]
        : ['Te has quedado sin vidas…', 'Puntos: ' + g.score];
      if (kind === 'gameover') S.events.emit('game:gameover_sfx');
      const btns = [['Reintentar', () => { this.menu.closeModal(); this.restartGame(); }, kind === 'clear' ? '' : 'primary']];
      if (testing) btns.push(['Volver al editor', () => this.backToEditor(), 'primary']);
      else btns.push(['Continuar', () => this.exitGame(), kind === 'clear' ? 'primary' : '']);
      this.menu.result({ title: kind === 'clear' ? '¡Nivel superado!' : 'Fin de la partida', img, lines }, btns);
    }
  }
  S.Controller.AppController = AppController;
})(window.SGM);
