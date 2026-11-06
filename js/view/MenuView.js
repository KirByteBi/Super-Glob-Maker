/* Vista: pantallas de menú y ventanas (DOM). No contiene lógica: recibe callbacks del controlador. */
(function (S) {
  'use strict';
  const el = (t, c, x) => S.View.el(t, c, x);
  const click = () => S.events.emit('ui:click');

  function button(label, cls, fn) { const b = el('button', 'btn ' + (cls || ''), label); b.onclick = () => { click(); fn(); }; return b; }
  S.View.button = button;
  function globImg(path, cls) { const i = document.createElement('img'); i.src = S.View.Assets.url(path); i.className = cls || 'glob-img'; i.alt = ''; i.draggable = false; return i; }

  class MenuView {
    constructor(screen, modal, toastEl) { this.screen = screen; this.modal = modal; this.toastEl = toastEl; this.toastT = null; }

    clear() { this.screen.innerHTML = ''; this.screen.className = 'screen'; this.screen.style.display = 'none'; }
    open(cls) { this.screen.innerHTML = ''; this.screen.className = 'screen ' + (cls || ''); this.screen.style.display = 'flex'; return this.screen; }
    closeModal() { this.modal.innerHTML = ''; this.modal.style.display = 'none'; }
    openModal(title) {
      this.modal.innerHTML = ''; this.modal.style.display = 'flex';
      const box = el('div', 'modal-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', S.tr ? S.tr(title) : title);
      box.appendChild(el('h2', '', title)); this.modal.appendChild(box);
      return box;
    }
    toast(msg, ms) {
      this.toastEl.textContent = S.tr ? S.tr(msg) : msg; this.toastEl.classList.add('show');
      clearTimeout(this.toastT); this.toastT = setTimeout(() => this.toastEl.classList.remove('show'), ms || 2200);
    }

    // ---------- título ----------
    title(h) {
      const s = this.open('title');
      const logo = el('div', 'logo');
      logo.appendChild(el('div', 'logo-super', 'SUPER'));
      logo.appendChild(el('div', 'logo-main', 'GLOB MAKER'));
      s.appendChild(logo);
      const parade = el('div', 'parade');
      S.Model.Characters.list.forEach((c, i) => { const im = globImg(c.paths[0], 'parade-glob'); im.style.animationDelay = (i * 0.15) + 's'; parade.appendChild(im); });
      s.appendChild(parade);
      const menu = el('div', 'menu');
      menu.appendChild(button('▶ Modo Historia', 'big', h.story));
      menu.appendChild(button('✏ Crear nivel', 'big', h.create));
      menu.appendChild(button('📁 Mis niveles', 'big', h.levels));
      if (h.online) menu.appendChild(button('🌐 Online', 'big', h.online));
      if (h.multi) menu.appendChild(button('👥 Multijugador', 'big', h.multi));
      if (h.messages) menu.appendChild(button('✉ Mensajes', 'big', h.messages));
      const b3d = button('🌌 Modo 3D (próximamente)', 'big disabled', () => this.toast('El modo 3D estilo SM64 / Galaxy llegará en la próxima versión.'));
      menu.appendChild(b3d);
      const row = el('div', 'row');
      row.appendChild(button('🎮 Controles', '', h.controls));
      // Idioma: Español / English (se vuelve a dibujar la pantalla)
      if (S.i18n && h.lang) row.appendChild(button(S.i18n.lang === 'es' ? '🌍 ES → EN' : '🌍 EN → ES', '', h.lang));
      const snd = button(S.View.SoundView.isMuted() ? '🔇 Sonido' : '🔊 Sonido', '', () => { const m = S.View.SoundView.toggleMute(); const t = m ? '🔇 Sonido' : '🔊 Sonido'; snd.textContent = S.tr ? S.tr(t) : t; });
      row.appendChild(snd);
      menu.appendChild(row);
      s.appendChild(menu);
      s.appendChild(el('div', 'foot', 'Versión 2D · Los Globs y sus amigos'));
      // Conexión con Glob Defenders (misma cuenta): logo que abre el juego en otra pestaña
      const gld = document.createElement('a');
      gld.className = 'gld-link'; gld.href = 'https://kirbytebi.github.io/Glob-Defenders/';
      gld.target = '_blank'; gld.rel = 'noopener noreferrer';
      const gt = S.tr ? S.tr('Jugar a Glob Defenders') : 'Jugar a Glob Defenders';
      gld.title = gt; gld.setAttribute('aria-label', gt + ' (se abre en otra pestaña)');
      gld.onclick = () => click();
      const gi = document.createElement('img'); gi.src = S.View.Assets.url('logo/GlobDefendersLogo.png'); gi.alt = 'Glob Defenders'; gi.draggable = false;
      gld.appendChild(gi); gld.appendChild(el('span', '', '🎮 ' + gt + ' ↗'));
      s.appendChild(gld);
    }

    controls(onClose) {
      const b = this.openModal('Controles');
      const rows = [
        ['← → / A D', 'Moverse'], ['Z / W / ↑', 'Saltar (mantén para saltar más)'], ['X / Shift', 'Correr'], ['Espacio / C', 'Disparar (EVO3 y Glob Caca)'],
        ['↓ / S en el aire', 'Culetazo (rompe bloques si eres grande)'], ['Esc / Enter', 'Pausa'],
        ['Editor: clic', 'Colocar'], ['Editor: clic derecho', 'Borrar'], ['Editor: rueda / flechas', 'Desplazar'], ['Editor: Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'], ['Editor: P', 'Probar nivel'], ['Probando: Esc / Ctrl+P', 'Volver al editor al instante'], ['Editor: 1-5', 'Categorías']
      ];
      const tbl = el('table', 'keys');
      rows.forEach(([k, v]) => { const tr = el('tr'); tr.appendChild(el('td', 'k', k)); tr.appendChild(el('td', '', v)); tbl.appendChild(tr); });
      b.appendChild(tbl);
      b.appendChild(el('p', 'small', 'Evoluciones: EVO1 → EVO2 (grande, rompe bloques) → EVO3 (dispara). Si te golpean bajas una evolución. Glob Caca y Glob Vacío son power-ups especiales.'));
      b.appendChild(button('Cerrar', 'primary', () => { this.closeModal(); if (onClose) onClose(); }));
    }

    // ---------- selección de personaje ----------
    // taken = Globs que ya llevan otros jugadores (multijugador: nunca 2 iguales)
    characterPicker(current, onPick, onCancel, title, taken) {
      const b = this.openModal(title || 'Elige tu Glob');
      const grid = el('div', 'char-grid');
      S.Model.Characters.list.forEach((c) => {
        const busy = !!(taken && taken.includes(c.id));
        const card = el('button', 'char-card' + (c.id === current ? ' on' : '') + (busy ? ' taken' : ''));
        if (busy) { card.disabled = true; card.setAttribute('aria-disabled', 'true'); card.appendChild(el('span', 'taken-tag', '🔒 Ya elegido')); }
        card.style.setProperty('--c', c.color);
        const evos = el('div', 'char-evos');
        c.paths.forEach((p, i) => { const w = el('div', 'evo-cell'); w.appendChild(globImg(p, i === 0 ? 'evo-main' : 'evo-small')); w.appendChild(el('small', '', c.evoNames[i])); evos.appendChild(w); });
        card.appendChild(el('b', '', c.name));
        card.appendChild(evos);
        card.appendChild(el('span', 'desc', c.desc));
        card.onclick = () => { click(); this.closeModal(); onPick(c.id); };
        grid.appendChild(card);
      });
      b.appendChild(grid);
      const sp = el('div', 'specials');
      Object.values(S.Model.Characters.specials).forEach((x) => { const d = el('div', 'special'); d.appendChild(globImg(x.path, 'evo-small')); d.appendChild(el('span', '', x.name + ': ' + x.desc)); sp.appendChild(d); });
      b.appendChild(el('h3', '', 'Power-ups especiales (para todos)'));
      b.appendChild(sp);
      if (onCancel) b.appendChild(button('Cancelar', '', () => { this.closeModal(); onCancel(); }));
    }

    // ---------- modo historia ----------
    story(mode, character, h) {
      const s = this.open('story ' + (mode === 'corrupt' ? 'corrupt' : ''));
      const head = el('div', 'head');
      head.appendChild(button('← Volver', '', h.back));
      head.appendChild(el('h1', '', 'Modo Historia'));
      const tg = button(mode === 'corrupt' ? '☠ Modo Corrupto' : '☀ Modo Paz', 'mode-toggle ' + mode, h.toggleMode);
      head.appendChild(tg);
      const ch = S.Model.Characters.get(character);
      const cb = el('button', 'btn char-btn'); cb.appendChild(globImg(ch.paths[0], 'mini')); cb.appendChild(document.createTextNode(ch.name)); cb.onclick = () => { click(); h.character(); };
      head.appendChild(cb);
      s.appendChild(head);
      const grid = el('div', 'map-grid');
      S.Model.SampleLevels.list(mode).forEach((it) => {
        const card = el('button', 'map-card');
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 144;
        this.drawThemeThumb(cv, it.theme, mode);
        card.appendChild(cv);
        card.appendChild(el('b', '', (it.index + 1) + '. ' + S.Model.Themes.name(it.theme, mode)));
        card.appendChild(el('small', '', it.theme.group + (mode === 'corrupt' ? ' · ' + it.theme.effectLabel : '')));
        if (h.cleared(it.theme.id, mode)) card.appendChild(el('span', 'medal-badge', '🏅'));
        card.onclick = () => { click(); h.play(it.theme.id); };
        grid.appendChild(card);
      });
      s.appendChild(grid);
    }

    drawThemeThumb(cv, theme, mode) {
      const x = cv.getContext('2d');
      x.save(); x.scale(cv.width / S.VIEW_W, cv.height / S.VIEW_H);
      S.View.BackgroundView.draw(x, theme, mode, 0, 1);
      // suelo de muestra
      const pal = S.Model.Themes.palette(theme, mode);
      const fake = { get: (a, b) => (b >= 15 ? 1 : 0) };
      for (let tx = 0; tx < 32; tx++) for (let ty = 15; ty < 18; ty++) S.View.Sprites.drawTile(x, fake, tx, ty, 1, pal, 0, {});
      x.restore();
    }

    themePicker(current, mode, onPick, onCancel) {
      const b = this.openModal('Elige el mapa');
      const grid = el('div', 'map-grid small');
      S.Model.Themes.list.forEach((t) => {
        const card = el('button', 'map-card' + (t.id === current ? ' on' : ''));
        const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108; this.drawThemeThumb(cv, t, mode);
        card.appendChild(cv); card.appendChild(el('b', '', S.Model.Themes.name(t, mode))); card.appendChild(el('small', '', t.group));
        card.onclick = () => { click(); this.closeModal(); onPick(t.id); };
        grid.appendChild(card);
      });
      b.appendChild(grid);
      b.appendChild(button('Cancelar', '', () => { this.closeModal(); if (onCancel) onCancel(); }));
    }

    // Cómo empieza un nivel nuevo
    startStyle(onPick, onCancel) {
      const b = this.openModal('¿Cómo empieza tu nivel?');
      const grid = el('div', 'row');
      [['test', '🟩 Campo de Pruebas', 'Suelo firme en todo el nivel (estándar)'],
        ['classic', '⛰ Clásico', 'Solo hay tierra bajo el inicio; el resto está vacío'],
        ['air', '☁ Aireado', 'Sin suelo: construyes todo desde cero']].forEach(([id, name, desc]) => {
        const card = el('button', 'map-card start-card' + (id === 'test' ? ' on' : ''));
        card.appendChild(el('b', '', name)); card.appendChild(el('small', '', desc));
        card.onclick = () => { click(); this.closeModal(); onPick(id); };
        grid.appendChild(card);
      });
      b.appendChild(grid);
      b.appendChild(button('Cancelar', '', () => { this.closeModal(); if (onCancel) onCancel(); }));
    }

    levelSettings(level, onApply, h) {
      const b = this.openModal('Ajustes del nivel');
      const form = el('div', 'form');
      const field = (label, input) => { const l = el('label', ''); l.appendChild(el('span', '', label)); l.appendChild(input); form.appendChild(l); return input; };
      const inp = (type, val, attrs) => { const i = document.createElement('input'); i.type = type; i.value = val; Object.assign(i, attrs || {}); return i; };
      const name = field('Nombre', inp('text', level.name, { maxLength: 40 }));
      const width = field('Ancho (32-400)', inp('number', level.width, { min: 32, max: 400 }));
      const height = field('Alto (18-40)', inp('number', level.height, { min: 18, max: 40 }));
      const time = field('Tiempo (10-500)', inp('number', level.time, { min: 10, max: 500 }));
      // Condición de victoria
      const WT = S.Model.Level.WIN_TYPES;
      const winSel = document.createElement('select');
      Object.keys(WT).forEach((k) => { const op = document.createElement('option'); op.value = k; op.textContent = WT[k].name; winSel.appendChild(op); });
      winSel.value = (level.win && level.win.type) || 'none';
      field('Condición de victoria', winSel);
      const winN = field('Cantidad', inp('number', (level.win && level.win.n) || 5, { min: 1, max: 999 }));
      // A qué meta se aplica la condición (normal, oculta o ambas)
      const tgSel = document.createElement('select'), TG = S.Model.Level.WIN_TARGETS;
      Object.keys(TG).forEach((k) => { const op = document.createElement('option'); op.value = k; op.textContent = TG[k]; tgSel.appendChild(op); });
      tgSel.value = (level.win && level.win.target) || 'both';
      field('Se aplica a', tgSel);
      const syncWinN = () => { const def = WT[winSel.value] || {}; winN.parentNode.style.display = def.hasN ? '' : 'none'; tgSel.parentNode.style.display = winSel.value === 'none' ? 'none' : ''; };
      winSel.addEventListener('change', syncWinN); syncWinN();
      // Nivel de SCROLL (la camara avanza sola; si te quedas atras, mueres)
      const scroll = field('Nivel de scroll (la cámara avanza sola)', inp('checkbox', '', { checked: !!level.scroll }));
      const scrollSpeed = field('Velocidad del scroll (15-120)', inp('number', level.scrollSpeed || 40, { min: 15, max: 120 }));
      const syncScroll = () => { scrollSpeed.parentNode.style.display = scroll.checked ? '' : 'none'; };
      scroll.addEventListener('change', syncScroll); syncScroll();
      // Norma "sin efectos especiales": todos los Globs juegan como el verde (sin poderes)
      const noPowers = field('Sin efectos especiales (todos juegan como el verde)', inp('checkbox', '', { checked: !!level.noPowers }));
      b.appendChild(form);
      const row = el('div', 'row');
      row.appendChild(button('Aplicar', 'primary', () => { this.closeModal(); onApply({ name: name.value.trim() || 'Nivel sin nombre', width: +width.value, height: +height.value, time: +time.value, win: { type: winSel.value, n: +winN.value, target: tgSel.value }, scroll: scroll.checked ? 1 : 0, scrollSpeed: +scrollSpeed.value, noPowers: noPowers.checked ? 1 : 0 }); }));
      row.appendChild(button('🔢 Código', '', h.exportLevel));
      row.appendChild(button('📥 Cargar código', '', h.importLevel));
      row.appendChild(button('🗑 Vaciar', 'danger', () => { this.confirm('¿Borrar todo el contenido del nivel?', h.clearLevel); }));
      row.appendChild(button('Cancelar', '', () => this.closeModal()));
      b.appendChild(row);
    }

    // Diálogo de cuenta Glob Defenders. h = { login(user,pass,cb), logout(cb), linked, username }
    accountDialog(h) {
      const b = this.openModal('Cuenta Glob Defenders');
      if (!S.Model.Gld.configured()) { b.appendChild(el('p', '', 'La conexión con Glob Defenders no está disponible ahora mismo.')); b.appendChild(button('Cerrar', '', () => this.closeModal())); return; }
      if (h.linked) {
        b.appendChild(el('p', '', 'Sesión iniciada como: ' + (h.username || 'tu cuenta de GlD')));
        b.appendChild(el('p', 'small', 'Tus niveles se guardan en la nube y puedes publicarlos. Límite: 258 niveles.'));
        const row = el('div', 'row');
        row.appendChild(button('Cerrar sesión (desvincular)', 'danger', () => h.logout(() => { this.closeModal(); this.toast('Sesión cerrada'); })));
        row.appendChild(button('Cerrar', '', () => this.closeModal()));
        b.appendChild(row);
        return;
      }
      const form = el('div', 'form');
      const field = (label, input) => { const l = el('label', ''); l.appendChild(el('span', '', label)); l.appendChild(input); form.appendChild(l); return input; };
      const inp = (type, attrs) => { const i = document.createElement('input'); i.type = type; Object.assign(i, attrs || {}); return i; };
      const user = field('Usuario de Glob Defenders', inp('text', { maxLength: 40 }));
      const pass = field('Contraseña', inp('password', {}));
      b.appendChild(el('p', 'small', 'Usa tu MISMA cuenta de Glob Defenders. ¿No tienes? Créala aquí: sirve para los dos juegos.'));
      b.appendChild(form);
      const msg = el('p', 'small'); msg.setAttribute('role', 'status'); msg.style.color = '#c0282f'; b.appendChild(msg);
      const ERR = {
        offline: 'Sin conexión con Glob Defenders.', 'bad-name': 'El usuario debe tener 3-24 caracteres: letras, números, puntos, guiones o guiones bajos.',
        offensive: 'Ese nombre de usuario no está permitido.', 'short-pass': 'La contraseña debe tener al menos 6 caracteres.',
        exists: 'Ese usuario ya existe. Si es tuyo, inicia sesión.', rate: 'Demasiados registros seguidos. Espera un poco y vuelve a probar.',
        confirm: 'La cuenta se creó, pero el servidor pide confirmar un correo (desactiva "Confirm email" en Supabase).'
      };
      const say = (e) => { msg.textContent = ERR[e] || 'No se pudo: ' + e; };
      const row = el('div', 'row');
      row.appendChild(button('Iniciar sesión', 'primary', () => {
        const u = user.value.trim(); if (!u || !pass.value) { say('bad-name'); return; }
        h.login(u, pass.value, (r) => {
          if (r.ok) { this.closeModal(); this.toast('¡Vinculado como ' + r.username + '!'); }
          else say(r.error === 'offline' || r.error === 'bad-name' ? r.error : 'Usuario o contraseña incorrectos.');
        });
      }));
      if (h.signup) row.appendChild(button('✨ Crear cuenta', '', () => {
        const u = user.value.trim(); if (!u || !pass.value) { say(u ? 'short-pass' : 'bad-name'); return; }
        h.signup(u, pass.value, (r) => {
          if (r.ok) { this.closeModal(); this.toast('✨ ¡Cuenta ' + r.username + ' creada! También vale en Glob Defenders', 3200); }
          else say(r.error);
        });
      }));
      row.appendChild(button('Cancelar', '', () => this.closeModal()));
      b.appendChild(row);
    }

    textBox(title, text, onOk, okLabel) {
      const b = this.openModal(title);
      const ta = document.createElement('textarea'); ta.className = 'code'; ta.value = text || ''; ta.spellcheck = false; b.appendChild(ta);
      const row = el('div', 'row');
      if (onOk) row.appendChild(button(okLabel || 'Aceptar', 'primary', () => { const v = ta.value; this.closeModal(); onOk(v); }));
      row.appendChild(button('Cerrar', '', () => this.closeModal()));
      b.appendChild(row);
      setTimeout(() => { ta.focus(); if (!onOk) ta.select(); }, 30);
    }

    // Código del nivel (estilo SMM): código corto si está publicado + código completo sin internet.
    // h = { copy(text), download() }
    seedOptions(name, short, full, h) {
      const b = this.openModal('🔢 Código del nivel');
      b.appendChild(el('p', 'note', 'Elige cómo quieres guardar o compartir "' + name + '".'));
      if (short) {
        const card = el('div', 'seed-card');
        card.appendChild(el('span', 'seed-code', short));
        card.appendChild(button('📋 Copiar código', 'primary', () => h.copy(short)));
        b.appendChild(card);
        b.appendChild(el('small', 'note', 'Con el código cualquiera lo carga desde 🌐 Online → 🔍 Buscar o 📁 Mis niveles → 📥 Cargar código (necesita internet).'));
      } else b.appendChild(el('p', 'note', 'Publícalo en 🌐 Online para tener un código corto como en Mario Maker (ej: KX47-2B91-R3T8).'));
      b.appendChild(el('h3', 'sec', '📦 Código completo (funciona sin internet)'));
      const ta = document.createElement('textarea'); ta.className = 'code seed-full'; ta.readOnly = true; ta.value = full; ta.spellcheck = false; ta.setAttribute('aria-label', 'Código completo');
      b.appendChild(ta);
      const row = el('div', 'row');
      row.appendChild(button('📋 Copiar código completo', short ? '' : 'primary', () => h.copy(full)));
      row.appendChild(button('⬇ Descargar código', '', h.download));
      row.appendChild(button('Cerrar', '', () => this.closeModal()));
      b.appendChild(row);
      setTimeout(() => ta.select(), 30);
    }
    // Cargar código: corto (online), completo o el JSON antiguo; también desde un archivo descargado
    loadSeed(onOk) {
      const b = this.openModal('📥 Cargar código');
      b.appendChild(el('p', 'note', 'Pega un código de nivel (ej: KX47-2B91-R3T8) o un código completo.'));
      const ta = document.createElement('textarea'); ta.className = 'code'; ta.spellcheck = false; ta.placeholder = S.tr ? S.tr('Ej: KX47-2B91-R3T8') : 'Ej: KX47-2B91-R3T8'; ta.setAttribute('aria-label', 'Código del nivel');
      b.appendChild(ta);
      const file = document.createElement('input'); file.type = 'file'; file.accept = '.sgmcode,.sgmseed,.txt,.json'; file.style.display = 'none';
      file.onchange = () => { const f = file.files && file.files[0]; if (!f) return; f.text().then((t) => { ta.value = t.trim(); }); };
      b.appendChild(file);
      const row = el('div', 'row');
      row.appendChild(button('Cargar', 'primary', () => { const v = ta.value.trim(); if (!v) { this.toast('Introduce un código válido.'); return; } this.closeModal(); onOk(v); }));
      row.appendChild(button('📂 Abrir archivo', '', () => file.click()));
      row.appendChild(button('Cerrar', '', () => this.closeModal()));
      b.appendChild(row);
      setTimeout(() => ta.focus(), 30);
    }

    // ---------- DIALOGO / CINEMATICA del Modo Historia ----------
    // script = { pages:[ {speaker, side, sprite, text} ] }. onDone() al terminar o saltar.
    // Pantalla DOM superpuesta: el mapa se sigue viendo detras (CSS semitransparente).
    // Avanza con click / Enter / Z / Espacio; Esc salta todo.
    storyDialog(script, charPath, onDone) {
      const pages = (script && script.pages) || [];
      if (!pages.length) { if (onDone) onDone(); return; }
      const s = this.open('story-dialog');
      let i = 0, closed = false;
      const box = el('div', 'dlg-box');
      const portrait = el('div', 'dlg-portrait');
      const bubble = el('div', 'dlg-bubble');
      const who = el('b', 'dlg-who');
      const txt = el('p', 'dlg-text');
      const hint = el('span', 'dlg-hint', '▶');
      bubble.appendChild(who); bubble.appendChild(txt); bubble.appendChild(hint);
      const close = () => {
        if (closed) return; closed = true;
        window.removeEventListener('keydown', onKey);
        this.clear(); if (onDone) onDone();
      };
      const render = () => {
        const p = pages[i];
        box.className = 'dlg-box ' + (p.side === 'right' ? 'right' : 'left');
        portrait.innerHTML = '';
        const path = p.sprite || charPath;
        if (path) { const im = globImg(path, 'dlg-face'); portrait.appendChild(im); }
        who.textContent = S.tr ? S.tr(p.speaker === 'player' ? 'Glob' : p.speaker) : (p.speaker === 'player' ? 'Glob' : p.speaker);
        txt.textContent = S.tr ? S.tr(p.text) : p.text;
        hint.textContent = i < pages.length - 1 ? '▶' : '✓';
      };
      const next = () => { S.events.emit('ui:click'); if (i < pages.length - 1) { i++; render(); } else close(); };
      const onKey = (e) => {
        if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); next(); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); }
      };
      window.addEventListener('keydown', onKey);
      box.appendChild(portrait); box.appendChild(bubble);
      s.appendChild(box);
      const bar = el('div', 'dlg-bar');
      bar.appendChild(button('Saltar ⏭', '', () => close()));
      s.appendChild(bar);
      s.onclick = (e) => { if (!e.target.closest('.btn')) next(); };
      render();
    }

    // Aviso con imagen opcional (p. ej. el Glob Cometa de "ya publicado")
    notice(title, msg, img) {
      const b = this.openModal(title);
      if (img) b.appendChild(globImg(img, 'result-glob'));
      b.appendChild(el('p', 'result-line', msg));
      const row = el('div', 'row'); row.appendChild(button('Entendido', 'primary', () => this.closeModal())); b.appendChild(row);
    }

    confirm(msg, onYes, yesLabel) {
      const b = this.openModal('¿Seguro?');
      b.appendChild(el('p', '', msg));
      const row = el('div', 'row');
      row.appendChild(button(yesLabel || 'Sí', yesLabel ? 'primary' : 'danger', () => { this.closeModal(); onYes(); }));
      row.appendChild(button('No', '', () => this.closeModal()));
      b.appendChild(row);
    }

    // Modal con un campo de entrada (texto o password). onOk recibe el valor; cancelar -> null.
    prompt(title, msg, onOk, okLabel, type) {
      const b = this.openModal(title);
      if (msg) b.appendChild(el('p', 'small', msg));
      const inp = document.createElement('input'); inp.type = type === 'password' ? 'password' : 'text'; inp.className = 'mail-input'; inp.maxLength = 100;
      b.appendChild(inp);
      const row = el('div', 'row');
      row.appendChild(button(okLabel || 'Aceptar', 'primary', () => { const v = inp.value; this.closeModal(); onOk(v); }));
      row.appendChild(button('Cancelar', '', () => { this.closeModal(); onOk(null); }));
      b.appendChild(row);
      inp.onkeydown = (e) => { if (e.key === 'Enter') { const v = inp.value; this.closeModal(); onOk(v); } };
      setTimeout(() => inp.focus(), 30);
    }

    // Vista previa en directo del formato rico debajo de un textarea + chuleta
    richPreview(parent, ta, rich) {
      if (!S.View.RichText) return;
      parent.appendChild(el('small', 'rt-help', '✍ ' + S.View.RichText.HELP));
      const pv = el('div', 'rt-preview'); pv.setAttribute('aria-live', 'polite'); parent.appendChild(pv);
      let tm = null;
      const upd = () => { pv.innerHTML = ''; if (ta.value.trim()) { pv.appendChild(el('small', 'rt-help', '👁 Vista previa:')); pv.appendChild(S.View.RichText.render(ta.value, rich)); } };
      ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(upd, 350); });
    }

    // ---------- ✉ MENSAJES ----------
    // st = { user, loading, error, rows:[{id,kind,title,body,reply,...}], admin, blocked }
    // h  = { apologize(mail, text), news(title, body) (admin), close }
    messages(st, h) {
      const b = this.openModal('✉ Mensajes');
      if (!S.Model.Gld.configured()) { b.appendChild(el('p', '', 'La conexión con Glob Defenders no está disponible ahora mismo.')); b.appendChild(button('Cerrar', '', () => this.closeModal())); return; }
      if (!st.user) { b.appendChild(el('p', '', 'Inicia sesión en 🌐 Online para ver tus mensajes.')); b.appendChild(button('Cerrar', 'primary', () => this.closeModal())); return; }
      if (st.loading) { b.appendChild(el('p', 'empty', 'Cargando…')); return; }
      if (st.error === 'no-v4') { b.appendChild(el('p', 'note', '⚠ Falta aplicar kiro/supabase_online_v4.sql en el servidor para activar los mensajes.')); b.appendChild(button('Cerrar', '', () => this.closeModal())); return; }
      if (st.error === 'no-v5') { b.appendChild(el('p', 'note', '⚠ Falta aplicar kiro/supabase_online_v5.sql en el servidor para editar noticias.')); b.appendChild(button('Cerrar', '', () => this.closeModal())); return; }
      if (st.error) { b.appendChild(el('p', 'empty', 'No se pudo cargar: ' + st.error)); b.appendChild(button('Cerrar', '', () => this.closeModal())); return; }
      // ADMIN: publicar o editar una noticia global
      if (st.admin && h.news) {
        const editing = st.editingNews || null;
        b.appendChild(el('h3', 'sec', editing ? '✏ Editar noticia (admin)' : '📣 Publicar noticia (admin)'));
        const tin = document.createElement('input'); tin.type = 'text'; tin.placeholder = 'Título'; tin.maxLength = 60; tin.className = 'mail-input'; tin.value = editing ? editing.title : '';
        const bta = document.createElement('textarea'); bta.className = 'code'; bta.placeholder = 'Texto de la noticia…'; bta.rows = 2; bta.value = editing ? editing.body : '';
        // tipo de noticia: Actualización (estándar) / Aviso (rojo) / Evento (verde)
        const sel = document.createElement('select'); sel.className = 'mail-input';
        [['update', '🔧 Actualización'], ['warn', '⚠ Aviso (rojo)'], ['event', '🎉 Evento (verde)']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
        if (editing) sel.value = editing.category === 'warn' || editing.category === 'event' ? editing.category : 'update';
        b.appendChild(tin); b.appendChild(sel); b.appendChild(bta);
        this.richPreview(b, bta, h.rich);
        b.appendChild(button(editing ? '💾 Guardar cambios' : '📣 Enviar a todos', 'primary', () => {
          if (!tin.value.trim() || !bta.value.trim()) return;
          if (editing) h.editNews(editing.id, tin.value.trim(), bta.value.trim(), sel.value);
          else h.news(tin.value.trim(), bta.value.trim(), sel.value);
        }));
        if (editing) b.appendChild(button('Cancelar edición', '', () => { st.editingNews = null; this.messages(st, h); }));
      }
      const list = el('div', 'level-list mail-list');
      if (!st.rows.length) list.appendChild(el('p', 'empty', 'No tienes mensajes.'));
      st.rows.forEach((m) => {
        const apology = m.kind === 'apology';
        const cat = apology ? 'apology' : (m.category === 'warn' || m.category === 'event' ? m.category : 'update');
        const row = el('div', 'level-row mail ' + cat);
        const info = el('div', 'info');
        const icon = apology ? '🕳 ' : cat === 'warn' ? '⚠ ' : cat === 'event' ? '🎉 ' : '📣 ';
        info.appendChild(el('b', '', icon + m.title));
        // cuerpo con formato rico (negrita, enlaces, @usuarios, tarjetas de nivel...) sin HTML crudo
        if (S.View.RichText) { const body = S.View.RichText.render(m.body, h.rich); body.classList.add('mail-body'); info.appendChild(body); }
        else info.appendChild(el('small', 'mail-body', m.body));
        // Nota de idioma de ORIGEN: frase en el idioma del LECTOR, color por el origen
        // (español = rojo, inglés = azul). Global, como los Globs.
        const srcLang = m.lang === 'en' ? 'en' : 'es';
        const reader = (S.i18n && S.i18n.lang === 'en') ? 'en' : 'es';
        const origin = reader === 'en' ? (srcLang === 'en' ? 'English' : 'Spanish') : (srcLang === 'en' ? 'inglés' : 'español');
        const note = el('small', 'mail-lang ' + srcLang, (reader === 'en' ? 'This message was written in ' : 'Este mensaje se creó en ') + origin);
        info.appendChild(note);
        if (apology) {
          info.appendChild(el('small', 'mail-note', m.reply ? '✔ Disculpa enviada: ' + m.reply : 'Tu cuenta no puede publicar. Pide perdón aquí abajo.'));
          if (!m.reply) {
            const ta = document.createElement('textarea'); ta.className = 'code'; ta.placeholder = 'Escribe tu disculpa…'; ta.rows = 2; info.appendChild(ta);
            this.richPreview(info, ta, h.rich);
            info.appendChild(button('Enviar disculpa', 'primary', () => { if (ta.value.trim()) h.apologize(m, ta.value.trim()); }));
          }
        }
        row.appendChild(info);
        if (st.admin && m.kind === 'news') {
          row.appendChild(button('✏ Editar', '', () => { st.editingNews = m; this.messages(st, h); }));
        }
        list.appendChild(row);
      });
      b.appendChild(list);
      b.appendChild(button('Cerrar', '', () => this.closeModal()));
    }

    // ---------- ONLINE (🌐) ----------
    // st = { tab, user, loading, error, rows, featured, author, search, v2, mine, localLevels }
    // h  = { back, tab(id), play(row), author(name), search(text), account, publish(local), setPublic(row,on), removeCloud(row) }
    online(st, h) {
      const s = this.open('levels online');
      const head = el('div', 'head');
      head.appendChild(button('← Volver', '', h.back));
      head.appendChild(el('h1', '', '🌐 Online'));
      const acc = button(st.user ? '👤 ' + st.user : '🔑 Iniciar sesión', st.user ? '' : 'primary', st.user ? h.profile : h.account);
      head.appendChild(acc);
      if (st.user) head.appendChild(button('⚙', '', h.account)); // cuenta (cerrar sesión)
      s.appendChild(head);
      const TABS = [['home', '⭐ Destacados'], ['top', '🏆 Top 10'], ['new', '🆕 Recientes'], ['plays', '🔥 Más jugados'], ['hard', '💀 Más difíciles'], ['search', '🔍 Buscar'], ['friends', '👥 Amigos'], ['me', '👤 Mi perfil']];
      if (st.admin) { head.insertBefore(el('span', 'badge admin', '🛡 ADMIN'), acc); TABS.push(['mod', '🛡 Moderar']); }
      const tabs = el('div', 'tabs');
      TABS.forEach(([id, label]) => { const b = button(label, 'tab' + (st.tab === id || (st.tab === 'author' && id === 'search' && false) ? ' on' : ''), () => h.tab(id)); tabs.appendChild(b); });
      s.appendChild(tabs);
      const wrap = el('div', 'level-list');
      s.appendChild(wrap);
      if (st.v2 === false) wrap.appendChild(el('p', 'note', '⚠ Falta aplicar kiro/supabase_online_v2.sql en el servidor: los "no me gusta", la puntuación y los autores no se guardarán hasta entonces.'));
      if (st.tab === 'search') {
        const f = el('div', 'search-row');
        const inp = document.createElement('input'); inp.type = 'search'; inp.placeholder = S.tr ? S.tr('Nombre, @autor o código (ej: KX47-2B91-R3T8)') : 'Nombre, @autor o código (ej: KX47-2B91-R3T8)'; inp.value = st.search || ''; inp.maxLength = 40; inp.setAttribute('aria-label', 'Buscar niveles');
        inp.onkeydown = (e) => { if (e.key === 'Enter') h.search(inp.value.trim()); };
        f.appendChild(inp); f.appendChild(button('Buscar', 'primary', () => h.search(inp.value.trim())));
        wrap.appendChild(f);
        setTimeout(() => inp.focus(), 30);
      }
      if (st.tab === 'author' && st.author) {
        const p = el('div', 'profile-card');
        p.appendChild(el('b', '', '👤 ' + st.author));
        const tl = st.rows.reduce((a, r) => a + r.likes, 0), td = st.rows.reduce((a, r) => a + r.dislikes, 0), tp = st.rows.reduce((a, r) => a + (r.plays || 0), 0);
        p.appendChild(el('span', '', st.rows.length + ' niveles · 👍 ' + tl + ' · 👎 ' + td + ' · ▶ ' + tp + ' partidas'));
        if (st.crowns > 0) p.appendChild(el('span', 'badge on', '👑 ×' + st.crowns + ' Torneos ganados'));
        // sanciones (Void Globs) del autor
        if (st.authorWarns > 0) {
          const warns = el('span', 'warns');
          warns.appendChild(globImg(S.Model.Characters.specials.vacio.path, 'void-glob-icon'));
          warns.appendChild(document.createTextNode(st.authorWarns + ' ' + (st.authorWarns === 1 ? 'Void Glob (sanción)' : 'Void Globs (sanciones)') + (st.authorWarns >= 15 ? ' · 🚫 BLOQUEADO para publicar' : '')));
          p.appendChild(warns);
        }
        // herramientas de ADMIN sobre el usuario
        if (st.admin && h.warn) {
          const ar = el('div', 'row');
          const warn = button('', 'danger void-warn', () => h.warn(st.author));
          warn.appendChild(globImg(S.Model.Characters.specials.vacio.path, 'void-glob-icon'));
          warn.appendChild(document.createTextNode('Sancionar'));
          ar.appendChild(warn);
          ar.appendChild(button('🔓 Quitar bloqueo', '', () => h.unblock(st.author)));
          p.appendChild(ar);
        }
        wrap.appendChild(p);
      }
      if (st.loading) { wrap.appendChild(el('p', 'empty', 'Cargando…')); return; }
      if (st.error) { wrap.appendChild(el('p', 'empty', st.error === 'offline' ? 'Sin conexión con Glob Defenders. Lo online necesita internet.' : 'No se pudo cargar: ' + st.error)); return; }
      this._st = st; // para que onlineRow sepa si eres admin
      if (st.tab === 'me') { this.onlineProfile(wrap, st, h); return; }
      if (st.tab === 'friends') { this.onlineFriends(wrap, st, h); return; }
      if (st.tab === 'home' && st.gods && st.gods.length) {
        wrap.appendChild(el('h3', 'sec', '👑 Niveles GOD'));
        st.gods.forEach((r) => wrap.appendChild(this.onlineRow(r, -1, h, true)));
      }
      if (st.tab === 'author' && st.favs && st.favs.length) {
        wrap.appendChild(el('h3', 'sec', '🦆 Favoritos de @' + st.author));
        st.favs.forEach((r) => wrap.appendChild(this.onlineRow(r, -1, h)));
        wrap.appendChild(el('h3', 'sec', '🌐 Todos sus niveles'));
      }
      if (st.tab === 'home' && st.featured) {
        wrap.appendChild(el('h3', 'sec', '📅 Nivel del día'));
        wrap.appendChild(this.onlineRow(st.featured, -1, h, true));
        wrap.appendChild(el('h3', 'sec', '🏆 Lo mejor ahora mismo'));
      }
      if (st.tab === 'mod') wrap.appendChild(el('p', 'note', '🛡 Moderación: los 100 niveles más recientes de todos los jugadores. 👑 GOD los destaca arriba en ⭐ Destacados; 🛡🗑 borra el nivel sin sancionar y 🕳 envía un Void Glob sin borrarlo.'));
      if (!st.rows.length) wrap.appendChild(el('p', 'empty', st.tab === 'search' ? (st.search ? 'Nada por aquí con "' + st.search + '".' : 'Escribe algo para buscar.') : 'Todavía no hay niveles publicados. ¡Sé el primero!'));
      st.rows.forEach((r, i) => wrap.appendChild(this.onlineRow(r, st.tab === 'top' ? i : -1, h)));
    }
    // Fila de un nivel publicado. rank >= 0 = puesto en el top
    onlineRow(r, rank, h, big) {
      const row = el('div', 'level-row online-row' + (big ? ' featured' : '') + (rank >= 0 && rank < 3 ? ' podium p' + rank : ''));
      if (rank >= 0) row.appendChild(el('span', 'rank', ['🥇', '🥈', '🥉'][rank] || '#' + (rank + 1)));
      const theme = S.Model.Themes.get(r.theme || 'lake');
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; this.drawThemeThumb(cv, theme, r.mode || 'peace');
      row.appendChild(cv);
      const info = el('div', 'info');
      info.appendChild(el('b', '', (r.god ? '👑 ' : '') + (r.favorite ? '🦆 ' : '') + r.name));
      const by = el('small', 'by');
      if (r.author) { const a = el('button', 'link', '@' + r.author); a.onclick = () => { click(); h.author(r.author); }; by.appendChild(document.createTextNode('por ')); by.appendChild(a); by.appendChild(document.createTextNode(' · ')); }
      by.appendChild(document.createTextNode(S.Model.Themes.name(theme, r.mode || 'peace')));
      info.appendChild(by);
      const pct = r.plays ? Math.round(r.rate * 100) + '%' : '—';
      info.appendChild(el('small', 'stats', '👍 ' + r.likes + '   👎 ' + r.dislikes + '   ⭐ ' + (r.score > 0 ? '+' : '') + r.score + '   ▶ ' + (r.plays || 0) + '   🏁 ' + pct + ' superado'));
      // Código del nivel (estilo SMM): clic para copiarlo
      const sd = S.Model.LevelCode && r.id ? S.Model.LevelCode.fromId(r.id) : null;
      if (sd) {
        const sb = el('button', 'link seed-code', '🔢 ' + sd); sb.title = S.tr ? S.tr('📋 Copiar código') : '📋 Copiar código';
        sb.onclick = () => { click(); (navigator.clipboard ? navigator.clipboard.writeText(sd) : Promise.reject()).then(() => this.toast('📋 Código copiado: ' + sd), () => this.toast('🔢 ' + sd, 4000)); };
        info.appendChild(sb);
      }
      row.appendChild(info);
      row.appendChild(button('▶ Jugar', 'primary', () => h.play(r)));
      if (h.download) row.appendChild(button('⬇', '', () => h.download(r))).title = 'Descargar a Mis niveles (solo para jugar)';
      // herramientas de ADMIN: marcar GOD y borrar para todos
      if (this._st && this._st.admin && h.adminGod) {
        row.appendChild(button(r.god ? '👑 Quitar GOD' : '👑 GOD', r.god ? 'primary' : '', () => h.adminGod(r, !r.god)));
        row.appendChild(button('🛡🗑', 'danger', () => h.adminDelete(r))).title = 'ADMIN: borrar para todos';
        if (r.author && h.warn) {
          const wb = button('', 'danger void-warn', () => h.warn(r.author));
          wb.appendChild(globImg(S.Model.Characters.specials.vacio.path, 'void-glob-icon'));
          wb.title = 'ADMIN: enviar un Void Glob sin borrar el nivel';
          wb.setAttribute('aria-label', wb.title);
          row.appendChild(wb);
        }
      }
      return row;
    }
    // Amigos: añadir por nombre, ver si están en línea (activos en los últimos 5 min) y sus niveles
    onlineFriends(wrap, st, h) {
      if (!st.user) { wrap.appendChild(el('p', 'empty compact', 'Inicia sesión para tener amigos.')); return; }
      const f = el('div', 'search-row');
      const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Usuario de tu amigo'; inp.maxLength = 24; inp.setAttribute('aria-label', 'Añadir amigo');
      inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) h.addFriend(inp.value.trim()); };
      f.appendChild(inp); f.appendChild(button('➕ Añadir', 'primary', () => { if (inp.value.trim()) h.addFriend(inp.value.trim()); }));
      wrap.appendChild(f);
      const list = st.friends || [];
      if (!list.length) { wrap.appendChild(el('p', 'empty compact', 'Aún no tienes amigos añadidos.')); return; }
      list.forEach((fr) => {
        const row = el('div', 'level-row');
        const mins = fr.last_seen ? (Date.now() - new Date(fr.last_seen).getTime()) / 60000 : Infinity;
        const info = el('div', 'info');
        info.appendChild(el('b', '', (mins < 5 ? '🟢 ' : '⚪ ') + fr.username + (fr.follows_me ? ' 🤝' : '')));
        info.appendChild(el('small', '', (mins < 5 ? 'En línea ahora' : fr.last_seen ? 'Visto hace ' + (mins < 60 ? Math.round(mins) + ' min' : mins < 1440 ? Math.round(mins / 60) + ' h' : Math.round(mins / 1440) + ' días') : 'Nunca visto') + ' · ' + (fr.levels || 0) + ' niveles publicados'));
        row.appendChild(info);
        row.appendChild(button('🌐 Sus niveles', 'primary', () => h.author(fr.username)));
        row.appendChild(button('✖', 'danger', () => this.confirm('¿Quitar a ' + fr.username + ' de tus amigos?', () => h.removeFriend(fr.username))));
        wrap.appendChild(row);
      });
    }
    onlineProfile(wrap, st, h) {
      if (!st.user) {
        wrap.appendChild(el('p', 'empty', 'Inicia sesión con tu cuenta de Glob Defenders para publicar niveles y ver tu perfil.'));
        const r = el('div', 'row'); r.appendChild(button('🔑 Iniciar sesión', 'primary', h.account)); wrap.appendChild(r); return;
      }
      const mine = st.mine || [], pub = mine.filter((m) => m.is_public);
      const tl = pub.reduce((a, r) => a + r.likes, 0), td = pub.reduce((a, r) => a + r.dislikes, 0), tp = pub.reduce((a, r) => a + (r.plays || 0), 0);
      const card = el('div', 'profile-card');
      card.appendChild(el('b', '', '👤 ' + st.user));
      card.appendChild(el('span', '', pub.length + ' / 120 publicados · 👍 ' + tl + ' · 👎 ' + td + ' · ⭐ ' + (tl - td) + ' · ▶ ' + tp + ' partidas'));
      if (st.crowns > 0) card.appendChild(el('span', 'badge on', '👑 ×' + st.crowns + ' Torneos ganados'));
      wrap.appendChild(card);
      wrap.appendChild(el('h3', 'sec', '🌐 En la nube'));
      if (!mine.length) wrap.appendChild(el('p', 'empty compact', 'Aún no has publicado niveles. Ve a 📁 Mis niveles, impórtalos o créalos y pulsa 🌐 Publicar.'));
      mine.forEach((m) => {
        const row = this.onlineRow(m, -1, Object.assign({}, h, { download: null }));
        row.lastChild.remove(); // el botón Jugar se sustituye por los de gestión
        row.appendChild(el('span', 'badge ' + (m.is_public ? 'on' : 'off'), m.is_public ? '☄ Público' : 'Oculto'));
        // recuperar tu propio nivel en este dispositivo (se guarda EDITABLE, porque es tuyo)
        if (h.download) { const db = button('⬇', '', () => h.download(Object.assign({ author: st.user }, m))); db.title = S.tr ? S.tr('Descargar a Mis niveles (tuyo, editable)') : 'Descargar a Mis niveles (tuyo, editable)'; db.setAttribute('aria-label', db.title); row.appendChild(db); }
        // un nivel publicado se puede ocultar, pero no volver a publicar
        if (m.is_public && h.favorite) { const fb = button(m.favorite ? '🦆 Favorito' : '🦆', m.favorite ? 'primary' : '', () => h.favorite(m, !m.favorite)); fb.title = 'Favoritos (máx. 7): salen destacados en tu perfil'; row.appendChild(fb); }
        if (m.is_public) row.appendChild(button('🙈 Ocultar', '', () => this.confirm('¿Ocultar "' + m.name + '"? Ya no podrás volver a publicarlo.', () => h.setPublic(m, false))));
        row.appendChild(button('🗑', 'danger', () => this.confirm('¿Borrar "' + m.name + '" de la nube? (tu copia local no se borra)', () => h.removeCloud(m))));
        wrap.appendChild(row);
      });
      const local = (st.localLevels || []).filter((l) => !l.publishedAt && !l.cloudId && !mine.some((m) => m.local === l.id));
      if (local.length) {
        wrap.appendChild(el('h3', 'sec', '📁 Niveles de este dispositivo sin publicar'));
        local.forEach((l) => {
          const row = el('div', 'level-row');
          const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; this.drawThemeThumb(cv, S.Model.Themes.get(l.theme), l.mode); row.appendChild(cv);
          const info = el('div', 'info'); info.appendChild(el('b', '', l.name)); info.appendChild(el('small', '', S.Model.Themes.name(S.Model.Themes.get(l.theme), l.mode))); row.appendChild(info);
          row.appendChild(button('🌐 Publicar', 'primary', () => h.publish(l)));
          wrap.appendChild(row);
        });
      }
    }
    // Botones de voto en la pantalla de resultado de un nivel online
    voteBar(box, cur, onVote) {
      const r = el('div', 'row vote-row');
      const up = button('👍 Me gusta', cur === 1 ? 'primary' : '', () => onVote(cur === 1 ? 0 : 1));
      const dn = button('👎 No me gusta', cur === -1 ? 'danger' : '', () => onVote(cur === -1 ? 0 : -1));
      up.setAttribute('aria-pressed', cur === 1); dn.setAttribute('aria-pressed', cur === -1);
      r.appendChild(up); r.appendChild(dn); box.appendChild(r);
      return r;
    }

    // ---------- mis niveles ----------
    myLevels(list, h) {
      const s = this.open('levels');
      const head = el('div', 'head');
      head.appendChild(button('← Volver', '', h.back));
      head.appendChild(el('h1', '', 'Mis niveles'));
      const St = S.Model.LevelStorage;
      head.appendChild(el('span', 'level-count', list.length + ' / ' + St.limit() + (St.isLinked() ? ' (Glob Defenders)' : '')));
      head.appendChild(button('＋ Nuevo', 'primary', h.create));
      head.appendChild(button('📥 Cargar código', '', h.importLevel));
      s.appendChild(head);
      const wrap = el('div', 'level-list');
      if (!list.length) wrap.appendChild(el('p', 'empty', 'Aún no has guardado niveles. ¡Crea el primero!'));
      list.forEach((l) => {
        const theme = S.Model.Themes.get(l.theme);
        const row = el('div', 'level-row');
        const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; this.drawThemeThumb(cv, theme, l.mode);
        row.appendChild(cv);
        const info = el('div', 'info');
        info.appendChild(el('b', '', l.name));
        info.appendChild(el('small', '', S.Model.Themes.name(theme, l.mode) + ' · ' + S.Model.Characters.get(l.character).name + ' · ' + new Date(l.updated || Date.now()).toLocaleString()));
        row.appendChild(info);
        // Publicado: marcado con el Glob Cometa (no se puede volver a publicar)
        const pub = !!(l.publishedAt || l.cloudId), dl = !!l.downloaded;
        if (dl) {
          info.insertBefore(el('span', 'pub-tag dl-tag', '⬇ de @' + l.downloaded.author + ' · solo jugar'), info.firstChild);
          row.appendChild(button('▶ Jugar', 'primary', () => h.play(l)));
          row.appendChild(button('🔒 Editar', 'disabled', () => h.edit(l)));
          // "Es mío": quita la marca de descarga para poder editarlo/publicarlo (para recuperar
          // niveles propios). Confirma, porque si NO es tuyo estarías saltándote la restricción.
          if (h.claim) row.appendChild(button('🔓 Es mío', '', () => this.confirm('¿Este nivel es TUYO? Se desbloqueará para editarlo y publicarlo.\n(Autor marcado: @' + l.downloaded.author + ')', () => h.claim(l), 'Sí, es mío')));
          row.appendChild(button('🗑', 'danger', () => this.confirm('¿Borrar "' + l.name + '" de tus descargas?', () => h.remove(l))));
          wrap.appendChild(row); return;
        }
        if (pub) {
          const tag = el('span', 'pub-tag'); tag.title = 'Publicado: no se puede volver a publicar';
          tag.appendChild(globImg(S.Model.Characters.get('black').paths[0], 'mini')); tag.appendChild(document.createTextNode('Publicado'));
          info.insertBefore(tag, info.firstChild);
        } else if (l.copyOf) info.appendChild(el('small', 'copy-tag', '📄 Copia de "' + (l.copyOf[0].name || 'otro nivel') + '"'));
        // dos huecos: superado por la Medalla y (si tiene) por la meta oculta / interruptor "!"
        const sec = S.app && S.app.levelSecrets ? S.app.levelSecrets(l) : { hidden: false, exSwitch: false };
        let clears = {}; try { clears = (JSON.parse(localStorage.getItem('sgm.myclears') || '{}'))[l.id] || {}; } catch (e) { /* nada */ }
        const slots = el('small', 'slots');
        slots.appendChild(el('span', 'slot' + (clears.n ? ' on' : ''), '🏅')).title = clears.n ? 'Superado por la Medalla' : 'Aún no superado por la Medalla';
        if (sec.hidden || sec.exSwitch) slots.appendChild(el('span', 'slot secret' + (clears.s ? ' on' : ''), '🔍')).title = clears.s ? 'Superado por la meta oculta' : 'Tiene meta oculta: aún sin encontrar';
        info.appendChild(slots);
        row.appendChild(button('▶ Jugar', 'primary', () => h.play(l)));
        row.appendChild(button('✏ Editar', '', () => h.edit(l)));
        // admin: un nivel publicado se puede volver a subir (actualiza su versión online)
      const adm = !!(S.Model.Gld && S.Model.Gld._admin);
      if (h.publish) row.appendChild(button(pub ? (adm ? '🛡 Actualizar online' : '☄ Publicado') : '🌐 Publicar', pub && !adm ? 'disabled' : '', () => h.publish(l)));
        if (h.copy) row.appendChild(button('📄 Copiar', '', () => h.copy(l)));
        if (h.exportLevel) row.appendChild(button('🔢 Código', '', () => h.exportLevel(l))).title = S.tr ? S.tr('🔢 Código del nivel') : '🔢 Código del nivel';
        row.appendChild(button('🗑', 'danger', () => this.confirm('¿Borrar "' + l.name + '"?' + (pub ? ' (la versión online no se borra)' : ''), () => h.remove(l))));
        wrap.appendChild(row);
      });
      s.appendChild(wrap);
    }

    // ---------- 👥 MULTIJUGADOR ----------
    // Entrada estilo Glob Defenders: ✨ Crear Seed / seed + Cargar
    multiplayerEntry(h) {
      const b = this.openModal('👥 Multijugador');
      b.appendChild(el('p', 'note', 'Juega con 2-4 amigos. Crea una sala y pásales su SEED, o escribe la seed de una sala para entrar.'));
      const menu = el('div', 'menu');
      menu.appendChild(button('✨ Crear Seed', 'big primary', h.create));
      const f = el('div', 'search-row');
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 14; inp.placeholder = S.tr ? S.tr('Ej: G123456') : 'Ej: G123456'; inp.setAttribute('aria-label', 'Seed de la sala'); inp.className = 'seed-input';
      inp.onkeydown = (e) => { if (e.key === 'Enter') h.join(inp.value.trim()); };
      f.appendChild(inp); f.appendChild(button('Cargar', 'primary', () => h.join(inp.value.trim())));
      menu.appendChild(f);
      b.appendChild(menu);
      b.appendChild(el('small', 'note', 'Modos: 1 Nivel · Multimundo (varios niveles seguidos) · Torneo (gana quien más puntos tenga y se lleva una 👑 corona). Nunca hay 2 Globs iguales.'));
      b.appendChild(button('Cerrar', '', () => this.closeModal()));
      setTimeout(() => inp.focus(), 30);
    }
    // Sala: jugadores, modo, niveles. st = { seed, players, isHost, mode, levels, busy, canStart, why }
    roomLobby(st, h) {
      const s = this.open('levels room');
      const head = el('div', 'head');
      head.appendChild(button('🚪 Salir', 'danger', h.leave));
      head.appendChild(el('h1', '', '👥 Sala'));
      const sc = button('SEED: ' + st.seed + '  📋', 'seed-btn', h.copySeed); sc.title = S.tr ? S.tr('📋 Copiar seed') : '📋 Copiar seed';
      head.appendChild(sc);
      if (st.isHost) head.appendChild(button('✉ Invitar', '', h.invite));
      s.appendChild(head);
      const wrap = el('div', 'level-list');
      s.appendChild(wrap);
      if (st.busy) wrap.appendChild(el('p', 'note', '⏳ Hay una partida en curso: entrarás en la siguiente ronda.'));
      // jugadores (4 huecos)
      wrap.appendChild(el('h3', 'sec', '👥 Jugadores (' + st.players.length + '/4)'));
      const grid = el('div', 'room-players');
      for (let i = 0; i < 4; i++) {
        const p = st.players[i], card = el('div', 'room-player' + (p ? '' : ' empty') + (p && p.me ? ' me' : ''));
        if (p) {
          const c = S.Model.Characters.get(p.glob); card.style.setProperty('--c', c.color);
          card.appendChild(globImg(c.paths[0], 'evo-main'));
          card.appendChild(el('b', '', (p.isHost ? '👑 ' : '') + p.username));
          card.appendChild(el('small', '', c.name + (p.me ? ' · tú' : '')));
          if (p.me) card.appendChild(button('Cambiar Glob', '', h.pickGlob));
        } else card.appendChild(el('small', '', 'Esperando jugador…'));
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
      // modo
      wrap.appendChild(el('h3', 'sec', '🎮 Modo'));
      const modes = el('div', 'tabs');
      [['one', '1 Nivel'], ['multi', '🗺 Multimundo'], ['tour', '🏆 Torneo']].forEach(([id, label]) => {
        const bt = button(label, 'tab' + (st.mode === id ? ' on' : '') + (st.isHost ? '' : ' disabled'), () => { if (st.isHost) h.setMode(id); });
        modes.appendChild(bt);
      });
      wrap.appendChild(modes);
      const desc = { one: 'Todos juegan el mismo nivel.', multi: 'Hasta 10 niveles seguidos, como un mundo.', tour: 'Compites: llegar primero da más puntos y suman enemigos, objetos y Monedas Estrella. Sin efectos especiales. El ganador se lleva una 👑 corona.' }[st.mode];
      wrap.appendChild(el('small', 'note', desc));
      // niveles
      wrap.appendChild(el('h3', 'sec', '🗺 Niveles (' + st.levels.length + '/' + (st.mode === 'one' ? 1 : 10) + ')'));
      if (!st.levels.length) wrap.appendChild(el('p', 'empty compact', st.isHost ? 'Añade un nivel de 📁 Mis niveles o por 🔢 código.' : 'El anfitrión está eligiendo los niveles…'));
      st.levels.forEach((l, i) => {
        const row = el('div', 'level-row');
        const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; this.drawThemeThumb(cv, S.Model.Themes.get(l.theme || 'lake'), l.mode || 'peace'); row.appendChild(cv);
        const info = el('div', 'info'); info.appendChild(el('b', '', (i + 1) + '. ' + l.name)); info.appendChild(el('small', '', S.Model.Themes.name(S.Model.Themes.get(l.theme || 'lake'), l.mode || 'peace'))); row.appendChild(info);
        if (st.isHost) {
          if (st.levels.length > 1) { row.appendChild(button('▲', '', () => h.moveLevel(i, -1))).setAttribute('aria-label', 'Subir'); row.appendChild(button('▼', '', () => h.moveLevel(i, 1))).setAttribute('aria-label', 'Bajar'); }
          row.appendChild(button('✖', 'danger', () => h.removeLevel(i))).setAttribute('aria-label', 'Quitar');
        }
        wrap.appendChild(row);
      });
      const row = el('div', 'row');
      if (st.isHost) {
        row.appendChild(button('➕ Añadir nivel', '', h.addLevel));
        const go = button('▶ Empezar', 'big ' + (st.canStart ? 'primary' : 'disabled'), h.start);
        if (!st.canStart && st.why) go.title = S.tr ? S.tr(st.why) : st.why;
        row.appendChild(go);
      } else row.appendChild(el('p', 'small', '⏳ Esperando a que el anfitrión empiece…'));
      wrap.appendChild(row);
    }
    mpLevelSource(h) {
      const b = this.openModal('➕ Añadir nivel');
      const m = el('div', 'menu');
      m.appendChild(button('📁 De Mis niveles', 'big', () => { this.closeModal(); h.mine(); }));
      m.appendChild(button('🔢 Por código', 'big', () => { this.closeModal(); h.code(); }));
      m.appendChild(button('Cancelar', '', () => { this.closeModal(); h.cancel(); }));
      b.appendChild(m);
    }
    mpPickLocal(list, onPick, onCancel) {
      const b = this.openModal('📁 Elige un nivel');
      const wrap = el('div', 'level-list compact');
      if (!list.length) wrap.appendChild(el('p', 'empty compact', 'Aún no has guardado niveles. ¡Crea el primero!'));
      list.forEach((l) => {
        const row = el('div', 'level-row');
        row.appendChild(el('div', 'info')).appendChild(el('b', '', l.name));
        row.appendChild(button('➕', 'primary', () => { this.closeModal(); onPick(l); })).setAttribute('aria-label', 'Añadir ' + l.name);
        wrap.appendChild(row);
      });
      b.appendChild(wrap);
      b.appendChild(button('Cancelar', '', () => { this.closeModal(); onCancel(); }));
    }
    // Tabla de jugadores (llegada / puntos)
    mpTable(rows, cols) {
      const tbl = el('table', 'keys mp-table');
      rows.forEach((r, i) => {
        const tr = el('tr'); if (r.me) tr.className = 'me';
        const td0 = el('td', 'k'); const c = S.Model.Characters.get(r.glob || 'green'); td0.appendChild(globImg(c.paths[0], 'mp-glob')); td0.appendChild(document.createTextNode(' ' + (cols.place ? (r.place ? '#' + r.place : '—') : (i + 1) + '.') + ' ' + r.name));
        tr.appendChild(td0);
        cols.cells(r).forEach((x) => tr.appendChild(el('td', '', x)));
        tbl.appendChild(tr);
      });
      return tbl;
    }
    mpWaiting(rows, mine, h) {
      const b = this.openModal(mine && !mine.dnf ? '🏁 ¡Has llegado!' : '⏳ Esperando…');
      b.classList.add('mp-wait');
      if (mine && !mine.dnf) b.appendChild(el('p', 'result-line', '⏱ ' + mine.time.toFixed(2) + ' s · ' + 'Puntos: ' + mine.score));
      b.appendChild(el('p', 'small', 'Esperando a los demás jugadores (como mucho 45 s desde la primera llegada)…'));
      b.appendChild(this.mpTable(rows, { cells: (r) => [r.done ? (r.dnf ? '✖' : '✓ ' + r.time.toFixed(1) + ' s') : '🏃 jugando'] }));
      b.appendChild(button('🚪 Salir de la sala', 'danger', h.leave));
    }
    mpResults(d, h, myId) {
      const s = this.open('levels room');
      const b = el('div', 'modal-box mp-box'); s.appendChild(b);
      b.appendChild(el('h2', '', (d.total > 1 ? 'Ronda ' + (d.round + 1) + '/' + d.total : 'Resultado') + (d.mode === 'tour' ? ' · 🏆 Torneo' : '')));
      const rows = d.rows.map((r) => Object.assign({}, r, { me: r.id === myId }));
      b.appendChild(this.mpTable(rows, { place: true, cells: (r) => [r.dnf ? 'No llegó' : '⏱ ' + r.time.toFixed(2) + ' s', '+' + r.points + ' pts', 'Total: ' + (d.totals[r.id] || 0)] }));
      const row = el('div', 'row');
      if (h.next) row.appendChild(button(d.last ? '🏁 Resultado final' : '▶ Siguiente nivel', 'primary', h.next));
      else row.appendChild(el('p', 'small', '⏳ El anfitrión pasará a lo siguiente…'));
      row.appendChild(button('🚪 Salir de la sala', 'danger', h.leave));
      b.appendChild(row);
    }
    mpFinal(d, h, myId) {
      const s = this.open('levels room');
      const b = el('div', 'modal-box mp-box'); s.appendChild(b);
      const win = d.rows[0];
      b.appendChild(el('h2', '', d.mode === 'tour' ? '👑 ¡' + (win ? win.name : '?') + ' gana el Torneo!' : '🏁 Fin de la partida'));
      if (win) b.appendChild(globImg(S.Model.Characters.get(win.glob).paths[2], 'result-glob'));
      const rows = d.rows.map((r) => Object.assign({}, r, { me: r.id === myId }));
      b.appendChild(this.mpTable(rows, { cells: (r) => [r.points + ' pts', r.id === d.winner && d.mode === 'tour' ? '👑' : ''] }));
      const row = el('div', 'row');
      if (h.lobby) row.appendChild(button('↩ Volver a la sala', 'primary', h.lobby));
      else row.appendChild(el('p', 'small', '⏳ El anfitrión decidirá si jugáis otra…'));
      row.appendChild(button('🚪 Salir de la sala', 'danger', h.leave));
      b.appendChild(row);
    }

    // ---------- partida ----------
    pause(h) {
      const b = this.openModal('Pausa');
      const m = el('div', 'menu');
      m.appendChild(button('Continuar', 'primary', h.resume));
      m.appendChild(button('Reiniciar', '', h.restart));
      if (h.edit) m.appendChild(button('Volver al editor', '', h.edit));
      m.appendChild(button(h.exitLabel || 'Salir al menú', 'danger', h.exit));
      b.appendChild(m);
    }

    result(data, h) {
      const b = this.openModal(data.title);
      if (data.img) b.appendChild(globImg(data.img, 'result-glob'));
      data.lines.forEach((l) => b.appendChild(el('p', 'result-line', l)));
      const m = el('div', 'row');
      h.forEach(([label, fn, cls]) => m.appendChild(button(label, cls || '', fn)));
      b.appendChild(m);
    }

    loading(p) {
      const s = this.open('loading');
      s.appendChild(el('div', 'logo-main', 'GLOB MAKER'));
      const bar = el('div', 'bar'); const fill = el('div', 'fill'); fill.style.width = Math.round(p * 100) + '%'; bar.appendChild(fill); s.appendChild(bar);
      s.appendChild(el('p', '', 'Cargando Globs…'));
    }
  }

  S.View.MenuView = MenuView;
})(window.SGM);
