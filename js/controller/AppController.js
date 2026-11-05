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
      // Lee tu usuario de GlD al arrancar (si hay sesión): así tu cuenta se ve en el menú
      // y tus niveles descargados se pueden editar sin tener que entrar antes a Online.
      if (Storage.isLinked() && S.Model.Gld.configured()) {
        S.Model.Gld.username().then((u) => {
          if (!u) return;
          this._myUser = u; if (this.mode === 'menu' && !this.mp) this.showTitle();
          // invitaciones a salas del multijugador
          if (S.Model.Room) S.Model.Room.Invites.listen(u, (p) => this.onInvite(p)).catch(() => {});
        }).catch(() => {});
      }
      // "En línea" para tus amigos: avisa al servidor al abrir el juego y cada 3 minutos
      const ping = () => { if (Storage.isLinked() && S.Model.Gld.configured()) S.Model.Gld.touch().catch(() => {}); };
      // ¿eres admin? (lo decide el servidor) -> sin límites en el editor, Mis niveles y al publicar
      if (Storage.isLinked() && S.Model.Gld.configured()) S.Model.Gld.isAdmin().catch(() => false);
      setTimeout(ping, 3000); setInterval(ping, 180000);
      // Controles táctiles (móvil/tablet)
      if (S.View.TouchControls) S.View.TouchControls.init(this);
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
      // En try/catch: si una escena lanza, NO debe matar el bucle (si no, el juego entero se
      // congela y no responde ni al teclado). Se registra una vez y se sigue reprogramando el frame.
      try {
        const inp = this.input.poll();
        if (this.mode === 'game' && this.game) { this.game.update(dt, inp); this.game.render(this.t); }
        else if (this.mode === 'editor' && this.editor) { this.editor.update(dt); this.editor.render(this.t); }
        else if (this.mode === 'map' && this.worldmap) { this.worldmap.update(dt, inp); this.worldmap.render(this.t); }
        else this.drawMenuBackdrop();
      } catch (e) { if (!this._loopErr) { this._loopErr = true; console.error('Error en el bucle (' + this.mode + '):', e); } }
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
        multi: () => this.showMultiplayer(),
        messages: () => this.showMessages(),
        lang: () => { S.i18n.set(S.i18n.lang === 'es' ? 'en' : 'es'); this.showTitle(); },
        controls: () => this.menu.controls(),
        account: () => this.accountDialog()
      });
    }

    // Bandeja de ✉ Mensajes: noticias globales + (si estás sancionado) el correo rojo de disculpa.
    showMessages() {
      const Gld = S.Model.Gld, Storage = S.Model.LevelStorage;
      const st = { loading: true, rows: [], user: null, admin: false };
      const errTxt = (e) => (e === 'no-v4' ? 'no-v4' : e === 'offline' ? 'Sin conexión.' : e === 'no-session' ? 'Inicia sesión primero.' : 'Error: ' + e);
      const h = {
        apologize: (mail, text) => Gld.apologize(mail.id, text).then((r) => { this.menu.toast(r.ok ? '📨 Disculpa enviada. Espera la revisión de KirByte_Bi.' : errTxt(r.error)); this.showMessages(); }),
        news: (title, body, category) => Gld.adminNews(title, body, category).then((r) => { this.menu.toast(r.ok ? '📣 Noticia publicada para todos' : errTxt(r.error)); this.showMessages(); }),
        // formato rico: @usuario abre su perfil; las tarjetas de nivel dejan jugar / descargar
        rich: {
          author: (name) => this.showOnline('author', name),
          play: (row) => { this.menu.closeModal(); this.playOnline(row, () => this.showMessages()); },
          download: (row) => this.downloadOnline(row)
        }
      };
      const render = () => this.menu.messages(st, h);
      render();
      if (!Gld.configured()) { st.loading = false; st.error = 'offline'; render(); return; }
      if (!Storage.isLinked()) { st.loading = false; render(); return; }
      Gld.username().then(async (u) => {
        st.user = u;
        if (u) st.admin = await Gld.isAdmin().catch(() => false);
        const r = await Gld.mailInbox();
        st.loading = false; st.rows = r.rows || []; if (!r.ok) st.error = r.error;
        render();
      }).catch((e) => { st.loading = false; st.error = String(e && e.message || e); render(); });
    }

    // Muestra (una vez por sesión) los avisos de moderación sin ver: un modal con un Void Glob
    // y el texto del admin. Al cerrarlo, los marca como vistos. Seguro si falta el SQL v4.
    checkModerationWarning() {
      if (this._warnShown) return; const Gld = S.Model.Gld;
      Gld.unseenWarnings().then((ws) => {
        if (!ws || !ws.length || this._warnShown) return;
        this._warnShown = true;
        const txt = ws.map((w) => '• ' + w.reason).join('\n');
        const msg = (ws.length === 1 ? 'Has recibido un aviso de moderación:' : 'Has recibido ' + ws.length + ' avisos de moderación:') + '\n' + txt + '\n\nSi acumulas 15 sanciones no podrás publicar. Revisa ✉ Mensajes.';
        this.menu.notice('🕳 Aviso de moderación', msg, 'Globs/BlackRewamp _SKIN/Void Glob (EVO4).png');
        Gld.markWarningsSeen();
      }).catch(() => {});
    }

    accountDialog(onDone) {
      const Gld = S.Model.Gld, Storage = S.Model.LevelStorage;
      const open = (username) => this.menu.accountDialog({
        linked: Storage.isLinked(), username,
        login: (u, p, cb) => { Gld.login(u, p).then((r) => { cb(r); if (r.ok && onDone) onDone(); }); },
        signup: (u, p, cb) => { Gld.signup(u, p).then((r) => { cb(r); if (r.ok && onDone) onDone(); }).catch((e) => cb({ ok: false, error: String(e && e.message || e) })); },
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
      const SM = S.Model.StoryMap;
      let wid = worldId || 'w1';
      // no entrar a un mundo bloqueado (por si acaso): caer al primero disponible
      if (SM && !SM.isWorldUnlocked(wid)) wid = 'w1';
      this.worldmap = new S.Controller.MapController(this, wid, this.prefs.storyMode);
      this.mode = 'map';
      // Intro del mundo la PRIMERA vez que se abre (cinematica). Solo en Historia Normal.
      if (SM && SM.seen && this.prefs.storyMode !== 'corrupt' && !SM.seen(wid, 'intro') && S.Model.StoryDialogs && S.Model.StoryDialogs.has(wid + '/intro')) {
        SM.markSeen(wid, 'intro');
        setTimeout(() => this.showStoryDialog(wid + '/intro'), 300);
        return;
      }
      // ¿se acaba de desbloquear un mundo nuevo? avisar y ofrecer ir
      if (SM && this._worldUnlocked) {
        const nx = this._worldUnlocked; this._worldUnlocked = null;
        const w = SM.world(nx);
        setTimeout(() => {
          this.menu.confirm('🏰 ¡Mundo superado! Has desbloqueado:\n' + (S.tr ? S.tr(w.name) : w.name) + '\n\n¿Viajar al nuevo mundo?',
            () => this.showStoryMap(nx), '¡Vamos!');
        }, 400);
      }
    }

    // Muestra un dialogo/cinematica del Modo Historia (id p.ej. 'w1/intro'). onDone al cerrar.
    // Aislado: si falta el modulo o el guion, llama a onDone directamente (no rompe el flujo).
    showStoryDialog(id, onDone) {
      const cb = onDone || (() => {});
      const SD = S.Model.StoryDialogs;
      if (!SD || !SD.has(id) || !this.menu.storyDialog) { cb(); return; }
      const charPath = S.Model.Characters.get(this.prefs.character).paths[0];
      try { this.menu.storyDialog(SD.get(id), charPath, cb); } catch (e) { cb(); }
    }

    // Lanzar el nivel de un nodo del mapamundi
    playStoryNode(worldId, nodeId, mode) {
      const node = S.Model.StoryMap.world(worldId).map[nodeId];
      // Dialogo PRE-castillo (una vez por mundo, solo en Normal). Al cerrarlo, lanza el nivel.
      if (node && node.type === 'castle' && mode !== 'corrupt' && S.Model.StoryMap.seen && !S.Model.StoryMap.seen(worldId, 'castle') && S.Model.StoryDialogs && S.Model.StoryDialogs.has(worldId + '/castle')) {
        S.Model.StoryMap.markSeen(worldId, 'castle');
        this.showStoryDialog(worldId + '/castle', () => this._launchStoryNode(worldId, nodeId, mode));
        return;
      }
      this._launchStoryNode(worldId, nodeId, mode);
    }
    _launchStoryNode(worldId, nodeId, mode) {
      const node = S.Model.StoryMap.world(worldId).map[nodeId];
      // Nivel propio del nodo (lección del mundo); si el módulo falla, el genérico de su mapa
      let L = null;
      try { L = S.Model.StoryLevels && S.Model.StoryLevels.build(worldId, nodeId, mode); } catch (e) { console.warn('StoryLevels', e); }
      if (!L) L = S.Model.SampleLevels.build(node.theme, mode);
      // Los interruptores "!" del mundo (palacio) se conservan entre niveles
      this.playLevel(L.toJSON(), { character: this.prefs.character, exState: S.Model.StoryMap.exState(worldId).slice(), story: { theme: node.theme, mode, world: worldId, node: nodeId } });
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
        edit: (l) => { if (this.lockedDownload(l)) return; this.openEditor(new S.Model.Level(l)); },
        remove: (l) => { Storage.remove(l.id); this.showLevels(); },
        // "Es mío": desbloquea un nivel descargado para editar/publicar.
        //  - Admin (kirbytebi): reclama CUALQUIER nivel sin contraseña.
        //  - Resto: pide la contraseña de la cuenta de GlD del AUTOR (la verifica sin tocar
        //    tu sesión). Solo quien conoce la contraseña de @autor puede reclamarlo.
        claim: (l) => this.claimLevel(l, () => this.showLevels()),
        // Publicar en la nube de Glob Defenders (una sola vez por nivel; requiere sesión)
        publish: (l) => this.publishLocal(l, () => this.showLevels()),
        // Copiar: nivel nuevo editable que recuerda de dónde viene
        copy: (l) => {
          if (this.lockedDownload(l)) return;
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
    // Niveles descargados de Online: solo se juegan. Devuelve true (y avisa) si está bloqueado.
    lockedDownload(l) {
      if (!l || !l.downloaded) return false;
      if (S.Model.Gld && S.Model.Gld._admin) return false; // admin: puede editar/copiar/exportar cualquiera
      // Si el nivel descargado es TUYO (tu usuario == autor), no se bloquea: puedes editarlo,
      // copiarlo y exportarlo. Util para recuperar tus propios niveles publicados en otro
      // dispositivo. _myUser lo cachea el perfil/online al leer tu nombre.
      const me = (this._myUser || '').toLowerCase();
      if (me && String(l.downloaded.author || '').toLowerCase() === me) return false;
      this.menu.notice('🔒 Nivel de @' + l.downloaded.author, 'Este nivel lo descargaste de 🌐 Online y es de @' + l.downloaded.author + '. Puedes jugarlo, pero no editarlo, copiarlo ni exportarlo. Si quieres editarlo, su creador tiene que darte el nivel (desde 📤 Exportar) para que lo importes.');
      return true;
    }
    // Descarga un nivel publicado a "Mis niveles". Si es de otro autor queda bloqueado
    // (solo jugar); si es TUYO, se guarda como nivel normal EDITABLE (para recuperarlo en
    // otro dispositivo). Decide mirando tu usuario de GlD contra el autor del nivel.
    downloadOnline(row, done) {
      const Gld = S.Model.Gld, id = 'dl-' + row.id;
      if (Storage.get(id)) { this.menu.toast('Ya lo tienes en 📁 Mis niveles'); return; }
      // también si el nivel es tuyo y lo tienes en este dispositivo (publicado desde aquí)
      if (Storage.list().some((l) => (l.cloudId || Gld.cloudIdOf(l.id)) === row.id)) { this.menu.toast('Ya lo tienes en 📁 Mis niveles'); return; }
      this.menu.toast('Descargando…', 1200);
      const userP = (Storage.isLinked() && Gld.configured()) ? Gld.username().catch(() => null) : Promise.resolve(null);
      Promise.all([Gld.getLevel(row.id), userP]).then(([data, me]) => {
        if (!data) { this.menu.toast('No se pudo descargar'); return; }
        if (me) this._myUser = me;
        const mine = me && String(row.author || '').toLowerCase() === String(me).toLowerCase();
        const base = Object.assign({}, S.Model.Level.content(data), { id, name: row.name });
        const L = new S.Model.Level(base);
        // los niveles AJENOS quedan marcados (bloqueados); los TUYOS no, para poder editarlos
        if (!mine) L.downloaded = { author: row.author || 'desconocido', cloudId: row.id, at: Date.now() };
        const r = Storage.save(L.toJSON());
        const okMsg = mine ? '⬇ Recuperado en 📁 Mis niveles (tuyo, editable)' : '⬇ Guardado en 📁 Mis niveles (de @' + (row.author || 'desconocido') + ')';
        if (r === 'ok' && done) done();
        this.menu.toast(r === 'ok' ? okMsg : r === 'full' ? 'Máximo de ' + Storage.limit() + ' niveles alcanzado' : 'No se pudo guardar', 2600);
      }).catch(() => this.menu.toast('No se pudo descargar'));
    }

    // Reclamar un nivel descargado (quitar la marca 'downloaded' para poder editarlo/publicarlo).
    // Admin: directo. Resto: pide la contraseña de GlD del autor y la verifica.
    claimLevel(l, done) {
      if (!l || !l.downloaded) return;
      const Gld = S.Model.Gld, author = l.downloaded.author || '';
      const unlock = () => { const d = Object.assign({}, l); delete d.downloaded; Storage.save(d); if (done) done(); this.menu.toast('🔓 Desbloqueado: ya puedes editarlo y publicarlo', 2600); };
      const askPass = () => {
        this.menu.prompt('🔓 Reclamar "' + l.name + '"', 'Escribe la contraseña de la cuenta de Glob Defenders de @' + author + ' para demostrar que es tuyo.', (pass) => {
          if (pass == null) return; // cancelado
          if (!pass) { this.menu.toast('Escribe la contraseña'); return; }
          this.menu.toast('Comprobando…', 1200);
          Gld.verifyPassword(author, pass).then((r) => {
            if (r.ok) unlock();
            else this.menu.toast(r.error === 'offline' ? 'Sin conexión con Glob Defenders' : 'Contraseña incorrecta', 2400);
          });
        }, 'Desbloquear', 'password');
      };
      // ¿soy admin? entonces reclamo cualquier nivel sin contraseña
      if (Storage.isLinked() && Gld.configured()) {
        Gld.isAdmin().then((admin) => { if (admin) { this.menu.confirm('ADMIN: ¿desbloquear "' + l.name + '" (de @' + author + ')?', unlock, 'Desbloquear'); } else askPass(); }).catch(askPass);
      } else askPass();
    }

    // Código del nivel (estilo Super Mario Maker):
    //  - código corto GGNN-NGNN-GNGN si el nivel está publicado: sale de su id en la nube
    //  - código completo (el nivel entero comprimido) para compartirlo sin internet
    // (las SEEDS estilo Glob Defenders quedan para las salas del multijugador)
    exportLevel(l) {
      if (this.lockedDownload(l)) return;
      const Code = S.Model.LevelCode, Gld = S.Model.Gld;
      const cloud = l.cloudId || (Gld && Gld.cloudIdOf(l.id)) || null;
      const short = cloud ? Code.fromId(cloud) : null;
      Code.pack(S.Model.Level.content(l)).then((full) => {
        this.menu.seedOptions(l.name, short, full, {
          copy: (txt) => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => this.menu.toast(txt === short ? '📋 Código copiado: ' + short : '📋 Código completo copiado'), () => this.menu.toast('Selecciona el texto y usa Ctrl+C')),
          download: () => {
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([(short ? 'CÓDIGO: ' + short + '\n' : '') + full], { type: 'text/plain' }));
            a.download = (String(l.name || 'nivel').replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, '').trim() || 'nivel') + '.sgmcode';
            document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          }
        });
      });
    }

    // Publica un nivel guardado. Avisa si ya estaba publicado (Glob Cometa) o si es una copia
    // demasiado parecida a su original. done() se llama tras publicar con éxito.
    publishLocal(l, done) {
      const Gld = S.Model.Gld;
      if (this.lockedDownload(l)) return;
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
        const upd = can.ok && can.admin && can.update;
        const ask = can.admin
          ? (upd ? '🛡 ADMIN: ¿actualizar la versión online de "' + l.name + '" con lo que tienes ahora?' : '🛡 ADMIN: ¿publicar "' + l.name + '"? (sin límites: podrás volver a publicarlo y actualizarlo)')
          : '¿Publicar "' + l.name + '"? Una vez publicado no podrás volver a publicarlo ni cambiar la versión online.';
        this.menu.confirm(ask, () => {
          this.menu.toast(upd ? 'Actualizando…' : 'Publicando…', 1200);
          Gld.publish(l).then((r) => {
            if (r.ok) {
              const cur = Storage.get(l.id) || l;
              Storage.save(Object.assign({}, cur, { publishedAt: Date.now(), cloudId: r.id }));
              Gld.setCloudId(l.id, r.id);
              this.menu.toast(r.updated ? '🛡 Versión online actualizada' : '☄ ¡Publicado! Míralo en 🌐 Online', 2600);
              if (done) done();
            } else if (r.error === 'no-bypass') { this.menu.notice('🛡 Falta el SQL de admin', 'El servidor todavía aplica las reglas normales a tu cuenta. Ejecuta kiro/supabase_admin_bypass.sql en Supabase (SQL Editor) y vuelve a intentarlo.'); }
            else if (r.error === 'pub-blocked') { this.menu.notice('🚫 No puedes publicar', 'Tu cuenta está bloqueada para publicar niveles por sanciones de moderación. Pide perdón desde ✉ Mensajes (el correo rojo con el Void Glob).', S.Model.Characters.get('black').paths[0]); }
            else this.menu.toast(r.error === 'offline' ? 'Sin conexión' : r.error === 'pub-limit' ? 'Ya tienes 120 niveles publicados' : r.error === 'duplicate' ? 'Ya hay un nivel publicado idéntico a este' : r.error === 'already' ? 'Este nivel ya está publicado' : 'No se pudo publicar');
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
        search: (q) => (q && q[0] === '@' ? this.showOnline('author', q.slice(1)) : this.showOnline('search', S.Model.LevelCode.isShort(q) ? S.Model.LevelCode.pretty(q) : q)),
        account: () => this.accountDialog(() => this.showOnline(tab, arg)),
        play: (row) => this.playOnline(row, () => this.showOnline(tab, arg)),
        download: (row) => this.downloadOnline(row),
        // con sesión, tu nombre lleva a tu perfil; sin sesión, abre el login
        profile: () => this.showOnline('me'),
        publish: (l) => this.publishLocal(l, () => this.showOnline('me')),
        setPublic: (m, on) => Gld.setPublic(m.id, on).then((r) => { this.menu.toast(r.ok ? (on ? '🌐 Publicado' : '🙈 Ahora es privado') : err(r.error)); this.showOnline('me'); }),
        removeCloud: (m) => Gld.removeCloud(m.id).then((r) => { if (r.ok && m.local) Gld.setCloudId(m.local, null); this.menu.toast(r.ok ? 'Borrado de la nube' : err(r.error)); this.showOnline('me'); }),
        // v3: favoritos, amigos y admin
        favorite: (m, on) => Gld.setFavorite(m.id, on).then((r) => { this.menu.toast(r.ok ? (on ? '🦆 Añadido a favoritos' : 'Quitado de favoritos') : r.error === 'fav-limit' ? 'Máximo 7 favoritos' : err3(r.error)); this.showOnline('me'); }),
        addFriend: (name) => Gld.addFriend(name).then((r) => { this.menu.toast(r.ok ? '👥 ' + name + ' añadido' : r.error === 'not-found' ? 'No existe ese usuario' : r.error === 'self' ? 'Ese eres tú 😅' : err3(r.error)); this.showOnline('friends'); }),
        removeFriend: (name) => Gld.removeFriend(name).then(() => this.showOnline('friends')),
        adminDelete: (row) => this.menu.confirm('ADMIN: ¿borrar "' + row.name + '" de @' + (row.author || '?') + ' para todos?', () => Gld.adminDelete(row.id).then((r) => { this.menu.toast(r.ok ? '🗑 Nivel borrado' : err3(r.error)); this.showOnline(tab, arg); })),
        adminGod: (row, on) => Gld.adminGod(row.id, on).then((r) => { this.menu.toast(r.ok ? (on ? '👑 Nivel GOD' : 'Ya no es GOD') : err3(r.error)); this.showOnline(tab, arg); }),
        // moderación de USUARIO: sancionar (Void Glob) / quitar bloqueo de publicación
        warn: (name) => this.menu.textBox('⚠ Sancionar a @' + name + ' (motivo del aviso)', '', (reason) => Gld.adminWarn(name, reason).then((r) => { this.menu.toast(r.ok ? (r.blocked ? '🕳 Aviso enviado · 🚫 ' + name + ' llegó a 15 y queda BLOQUEADO' : '🕳 Aviso enviado a ' + name) : r.error === 'not-found' ? 'No existe ese usuario' : err4(r.error)); this.showOnline('author', name); }), 'Sancionar'),
        unblock: (name) => this.menu.confirm('ADMIN: ¿quitar el bloqueo de publicación de @' + name + '?', () => Gld.adminUnblock(name).then((r) => { this.menu.toast(r.ok ? '🔓 Bloqueo retirado a ' + name : r.error === 'not-found' ? 'No existe ese usuario' : err4(r.error)); this.showOnline('author', name); }))
      };
      const err4 = (e) => (e === 'no-v4' ? 'Falta aplicar kiro/supabase_online_v4.sql en el servidor' : err3(e));
      const err3 = (e) => (e === 'no-v3' ? 'Falta aplicar kiro/supabase_online_v3.sql en el servidor' : err(e));
      const render = () => { if (tok === this.onlineTok && this.mode === 'menu') this.menu.online(st, h); };
      render();
      if (!Gld.configured()) { st.loading = false; st.error = 'offline'; render(); return; }
      const done = (r) => { st.loading = false; if (r && r.ok === false) st.error = r.error; st.v2 = Gld.v2; render(); };
      const userP = Storage.isLinked() ? Gld.username().catch(() => null) : Promise.resolve(null);
      userP.then(async (u) => {
        st.user = u;
        if (u) this._myUser = u; // cachea tu usuario (para desbloquear tus niveles descargados)
        if (u) {
          Gld.touch(); st.admin = await Gld.isAdmin().catch(() => false);
          // kirbytebi sin permisos: el servidor no lo tiene como admin todavía
          if (!st.admin && String(u).toLowerCase() === 'kirbytebi' && !this._adminWarned) { this._adminWarned = true; this.menu.toast('🛡 El servidor aún no te reconoce como admin: ejecuta kiro/supabase_admin_fix.sql en Supabase', 6000); }
          this.checkModerationWarning(); // avisa si hay sanción nueva (Void Glob)
        }
        if (tab === 'author' && st.author) st.authorWarns = await Gld.warnCount(st.author).catch(() => 0);
        if (tab === 'mod' && !st.admin) { st.error = 'Solo para admin'; return done(); }
        if (tab === 'friends') return u ? Gld.friends().then((r) => { st.friends = r.rows; done(r.ok ? r : { ok: false, error: r.error === 'no-v3' ? 'Falta aplicar kiro/supabase_online_v3.sql (amigos)' : r.error }); }) : done();
        if (tab === 'author' && st.author) st.favs = await Gld.favorites(st.author).catch(() => []);
        // 👑 coronas de Torneo del perfil que se mira
        if ((tab === 'author' && st.author) || (tab === 'me' && u)) st.crowns = await Gld.crowns(tab === 'me' ? u : st.author).catch(() => 0);
        if (tab === 'home') st.gods = await Gld.gods().catch(() => []);
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
        // Moderar (admin): los últimos niveles de TODOS, para marcar GOD o borrar
        // Buscar por código (KX47-2B91-R3T8): el nivel cuyo id corresponde a ese código
        if (tab === 'search' && S.Model.LevelCode.isShort(st.search)) return Gld.findBySeed(st.search).then((r) => { st.rows = r.rows; done(r); });
        const q = tab === 'mod' ? { sort: 'new', limit: 100 } : tab === 'author' ? { sort: 'top', author: st.author, limit: 60 } : tab === 'search' ? { sort: 'top', search: st.search, limit: 40 } : { sort: tab, limit: tab === 'top' ? 10 : 30 };
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

    // Cargar código. cb(L) recibe el nivel de un código completo (o JSON antiguo).
    // Un código corto (KX47-2B91-R3T8) busca el nivel publicado: desde Mis niveles se descarga
    // (igual que ⬇ en Online, bloqueado si es de otro); en el editor (onlyFull) no vale.
    importDialog(cb, onlyFull) {
      this.menu.loadSeed((txt) => {
        const Code = S.Model.LevelCode;
        // un archivo .sgmcode puede llevar "CÓDIGO: X" en la 1ª línea y el código completo debajo
        const lines = txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const fullLine = lines.find((s) => Code.isFull(s)) || (Code.isFull(txt) ? txt : null);
        if (fullLine) {
          Code.unpack(/^\s*\{/.test(txt) ? txt : fullLine).then((d) => { const L = new S.Model.Level(d); L.id = S.util.uid(); cb(L); })
            .catch((e) => this.menu.toast(e && e.message === 'zip' ? 'Tu navegador no puede abrir este código: actualízalo' : 'Introduce un código válido.'));
          return;
        }
        if (Code.isShort(txt)) {
          if (onlyFull) { this.menu.toast('Aquí hace falta el código completo (el código corto se carga desde 📁 Mis niveles)', 3400); return; }
          this.seedLookup(Code.pretty(txt), (row) => this.downloadOnline(row, () => this.showLevels()));
          return;
        }
        this.menu.toast('Introduce un código válido.');
      });
    }
    // Busca un nivel publicado por su código corto y llama a found(row)
    seedLookup(code, found) {
      const Gld = S.Model.Gld;
      if (!Gld.configured()) { this.menu.toast('Sin conexión con Glob Defenders.'); return; }
      this.menu.toast('Buscando ' + code + '…', 1500);
      Gld.findBySeed(code).then((r) => {
        if (!r.ok) this.menu.toast(r.error === 'offline' ? 'Sin conexión con Glob Defenders.' : 'Error: ' + r.error);
        else if (!r.rows.length) this.menu.toast('No hay ningún nivel publicado con el código ' + code, 3000);
        else found(r.rows[0]);
      });
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
      if (this.lastPlay && this.lastPlay.opts.mp) { this.mpLeave(); return; }
      if (this.suspendedEditor) { this.backToEditor(); return; }
      const online = this.lastPlay && this.lastPlay.opts.online;
      if (online && online.back) { online.back(); return; }
      const story = this.lastPlay && this.lastPlay.opts.story;
      if (story && story.world) {
        // Cinematica de DERROTA DE JEFE antes de volver al mapa (una vez por mundo, solo Normal)
        const pend = this._pendingBossCinematic; this._pendingBossCinematic = null;
        if (pend) { this.showStoryDialog(pend, () => this.showStoryMap(story.world)); return; }
        this.showStoryMap(story.world); // vuelve al mapamundi
      } else if (story) this.showStory();
      else this.showTitle();
    }

    // ---------- 👥 MULTIJUGADOR (planning 5d) ----------
    // Entrada como en Glob Defenders: ✨ Crear Seed o escribir una seed y Cargar.
    // Hace falta la cuenta de GlD (tu nombre es el que ven los demás).
    showMultiplayer() {
      const Gld = S.Model.Gld, Room = S.Model.Room;
      if (!Gld.configured()) { this.menu.toast('Sin conexión con Glob Defenders.'); return; }
      if (!Storage.isLinked()) { this.menu.toast('Inicia sesión con tu cuenta de Glob Defenders para jugar online', 2600); this.accountDialog(() => { if (Storage.isLinked()) this.showMultiplayer(); }); return; }
      this.menu.multiplayerEntry({
        create: () => this.mpJoin(Room.newSeed(), true),
        join: (seed) => { if (!Room.isSeed(seed)) { this.menu.toast('Introduce una seed válida.'); return; } this.mpJoin(Room.cleanSeed(seed), false); }
      });
    }
    async mpJoin(seed, created) {
      const Gld = S.Model.Gld, Room = S.Model.Room;
      if (this.mp) this.mpLeave(true);
      this.menu.closeModal(); this.menu.toast('Conectando con la sala ' + seed + '…', 2500);
      try {
        const u = this._myUser || await Gld.username();
        if (!u) { this.menu.toast('Inicia sesión primero.'); return; }
        this._myUser = u;
        const room = new Room(seed, u, this.prefs.character || 'green');
        await room.connect();
        // si al entrar tu Glob ya lo lleva otro, se te asigna uno libre (sync lo resuelve)
        this.mp = new S.Controller.MultiController(this, room);
        if (!created && room.players.length <= 1) this.menu.toast('No había nadie en la sala ' + seed + ': ahora eres el anfitrión', 3000);
        this.showRoomLobby();
      } catch (e) {
        const m = String(e && e.message || e);
        this.menu.toast(m === 'offline' ? 'Sin conexión con Glob Defenders.' : m === 'full' ? 'La sala ' + seed + ' está llena (máximo 4 jugadores).' : 'No se pudo conectar con la sala (' + m + ')', 3200);
        this.mp = null;
      }
    }
    showRoomLobby() {
      const mp = this.mp; if (!mp) return;
      if (this.mode !== 'menu' || !this.menu.screen.classList.contains('room')) this.clearAll();
      const room = mp.room;
      this.menu.roomLobby({ seed: room.seed, players: room.players, isHost: mp.isHost, mode: mp.mode, levels: mp.levels, busy: mp.phase === 'busy', canStart: !mp.canStart(), why: mp.canStart() }, {
        copySeed: () => (navigator.clipboard ? navigator.clipboard.writeText(room.seed) : Promise.reject()).then(() => this.menu.toast('📋 Seed copiada: ' + room.seed), () => this.menu.toast('SEED: ' + room.seed, 4000)),
        pickGlob: () => this.menu.characterPicker(room.me.glob, (id) => { if (!room.setGlob(id)) this.menu.toast('Ese Glob ya lo lleva otro jugador'); else { this.prefs.character = id; savePrefs(this.prefs); } this.showRoomLobby(); }, () => this.showRoomLobby(), 'Elige tu Glob (sin repetir)', room.takenGlobs()),
        invite: () => this.menu.prompt('✉ Invitar a la sala', 'Usuario de Glob Defenders al que invitar. Le llegará la invitación en cuanto entre al juego, mientras la sala siga abierta y tú sigas dentro.', (name) => {
          if (!name) { this.showRoomLobby(); return; }
          S.Model.Room.Invites.invite(room, name); this.menu.toast('✉ Invitación enviada a ' + name.trim()); this.showRoomLobby();
        }, 'Invitar'),
        setMode: (m) => mp.setMode(m),
        addLevel: () => this.menu.mpLevelSource({
          mine: () => this.menu.mpPickLocal(Storage.list(), (l) => { mp.addLevel(l, l.name); }, () => this.showRoomLobby()),
          code: () => this.menu.prompt('🔢 Nivel por código', 'Código del nivel publicado (ej: KX47-2B91-R3T8).', (c) => {
            if (!c) { this.showRoomLobby(); return; }
            if (!S.Model.LevelCode.isShort(c)) { this.menu.toast('Introduce un código válido.'); this.showRoomLobby(); return; }
            this.seedLookup(S.Model.LevelCode.pretty(c), (row) => S.Model.Gld.getLevel(row.id).then((d) => { if (d) mp.addLevel(d, row.name); else this.menu.toast('No se pudo cargar el nivel'); }));
          }, 'Añadir'),
          cancel: () => this.showRoomLobby()
        }),
        removeLevel: (i) => mp.removeLevel(i),
        moveLevel: (i, d) => mp.moveLevel(i, d),
        start: () => mp.startMatch(),
        leave: () => this.mpLeave()
      });
    }
    mpWaiting(rows, mine, h) {
      this.menu.mpWaiting(rows, mine, h);
    }
    mpRoundResults(d, h) {
      if (this.game) { this.game.destroy(); this.game = null; }
      this.clearAll();
      this.menu.mpResults(d, h, this.mp ? this.mp.room.id : null);
    }
    mpFinal(d, h) {
      if (this.game) { this.game.destroy(); this.game = null; }
      this.clearAll();
      this.menu.mpFinal(d, h, this.mp ? this.mp.room.id : null);
    }
    mpLeave(silent) {
      const mp = this.mp; this.mp = null;
      if (mp) mp.leave();
      if (this.lastPlay && this.lastPlay.opts.mp) this.lastPlay = null;
      if (!silent) this.showTitle();
    }
    mpClosed(reason) {
      if (!this.mp) return;
      this.mpLeave(true); this.showTitle();
      this.menu.notice('👥 Sala cerrada', reason === 'full' ? 'La sala está llena (máximo 4 jugadores).' : reason === 'host' ? 'El anfitrión ha salido y la sala se ha cerrado.' : 'Se ha perdido la conexión con la sala.');
    }
    // Invitación recibida (canal sgm-invites)
    onInvite(p) {
      if (this.mp && this.mp.room.seed === p.seed) return;
      if (this.mode === 'menu' && !this.mp) this.menu.confirm('✉ @' + p.from + ' te invita a su sala ' + p.seed + ' (' + (p.players || 1) + '/4). ¿Unirte?', () => this.mpJoin(p.seed, false), 'Unirme');
      else this.menu.toast('✉ @' + p.from + ' te invita a su sala ' + p.seed + ' (👥 Multijugador → Cargar)', 5000);
    }

    progress() { try { return JSON.parse(localStorage.getItem(PROG) || '{}'); } catch (e) { return {}; } }
    savePrefs() { savePrefs(this.prefs); }

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
      // Multijugador: la llegada la gestiona la sala (esperar a los demás, puntos, resultados)
      if (lp && lp.opts.mp) { lp.opts.mp.onLocalFinished(kind, g); return; }
      // Mis niveles: recuerda con qué meta(s) has pasado cada nivel tuyo (los dos huecos)
      if (kind === 'clear' && !testing && !lp.opts.story && !lp.opts.online && lp.data && lp.data.id) {
        try { const m = JSON.parse(localStorage.getItem('sgm.myclears') || '{}'); const e = m[lp.data.id] || {}; if (g.secretClear) e.s = 1; else e.n = 1; m[lp.data.id] = e; localStorage.setItem('sgm.myclears', JSON.stringify(m)); } catch (e) { /* nada */ }
      }
      if (kind === 'clear' && lp.opts.story) {
        const p = this.progress(); p[lp.opts.story.theme + ':' + lp.opts.story.mode] = Math.max(p[lp.opts.story.theme + ':' + lp.opts.story.mode] || 0, g.score);
        try { localStorage.setItem(PROG, JSON.stringify(p)); } catch (e) { /* nada */ }
        // Mapamundi: marca el nodo como completado (y por meta oculta si aplica) para desbloquear
        if (lp.opts.story.world && lp.opts.story.node && S.Model.StoryMap) {
          const SM = S.Model.StoryMap;
          const wId = lp.opts.story.world, nId = lp.opts.story.node;
          SM.markCleared(wId, nId, !!g.secretClear);
          // ¿era el castillo final? -> desbloquea el mundo siguiente (se avisa al volver al mapa)
          this._worldUnlocked = SM.onNodeCleared(wId, nId);
          // ¿era un CASTILLO? -> cinematica de jefe al volver al mapa (una vez por mundo, Normal)
          const node = SM.world(wId).map[nId];
          if (node && node.type === 'castle' && lp.opts.story.mode !== 'corrupt' && SM.seen && !SM.seen(wId, 'boss') && S.Model.StoryDialogs && S.Model.StoryDialogs.has(wId + '/boss')) {
            SM.markSeen(wId, 'boss'); this._pendingBossCinematic = wId + '/boss';
          }
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
