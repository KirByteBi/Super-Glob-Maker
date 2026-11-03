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
    characterPicker(current, onPick, onCancel, title) {
      const b = this.openModal(title || 'Elige tu Glob');
      const grid = el('div', 'char-grid');
      S.Model.Characters.list.forEach((c) => {
        const card = el('button', 'char-card' + (c.id === current ? ' on' : ''));
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
      b.appendChild(form);
      const row = el('div', 'row');
      row.appendChild(button('Aplicar', 'primary', () => { this.closeModal(); onApply({ name: name.value.trim() || 'Nivel sin nombre', width: +width.value, height: +height.value, time: +time.value, win: { type: winSel.value, n: +winN.value, target: tgSel.value }, scroll: scroll.checked ? 1 : 0, scrollSpeed: +scrollSpeed.value }); }));
      row.appendChild(button('Exportar', '', h.exportLevel));
      row.appendChild(button('Importar', '', h.importLevel));
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
        const inp = document.createElement('input'); inp.type = 'search'; inp.placeholder = 'Nombre del nivel o @autor'; inp.value = st.search || ''; inp.maxLength = 40; inp.setAttribute('aria-label', 'Buscar niveles');
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
      if (st.tab === 'mod') wrap.appendChild(el('p', 'note', '🛡 Moderación: los 100 niveles más recientes de todos los jugadores. 👑 GOD los destaca arriba en ⭐ Destacados; 🛡🗑 los borra para todos.'));
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
      row.appendChild(info);
      row.appendChild(button('▶ Jugar', 'primary', () => h.play(r)));
      if (h.download) row.appendChild(button('⬇', '', () => h.download(r))).title = 'Descargar a Mis niveles (solo para jugar)';
      // herramientas de ADMIN: marcar GOD y borrar para todos
      if (this._st && this._st.admin && h.adminGod) {
        row.appendChild(button(r.god ? '👑 Quitar GOD' : '👑 GOD', r.god ? 'primary' : '', () => h.adminGod(r, !r.god)));
        row.appendChild(button('🛡🗑', 'danger', () => h.adminDelete(r))).title = 'ADMIN: borrar para todos';
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
      wrap.appendChild(card);
      wrap.appendChild(el('h3', 'sec', '🌐 En la nube'));
      if (!mine.length) wrap.appendChild(el('p', 'empty compact', 'Aún no has publicado niveles. Ve a 📁 Mis niveles, impórtalos o créalos y pulsa 🌐 Publicar.'));
      mine.forEach((m) => {
        const row = this.onlineRow(m, -1, Object.assign({}, h, { download: null }));
        row.lastChild.remove(); // el botón Jugar se sustituye por los de gestión
        row.appendChild(el('span', 'badge ' + (m.is_public ? 'on' : 'off'), m.is_public ? '☄ Público' : 'Oculto'));
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
      head.appendChild(button('Importar', '', h.importLevel));
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
        if (h.publish) row.appendChild(button(pub ? '☄ Publicado' : '🌐 Publicar', pub ? 'disabled' : '', () => h.publish(l)));
        if (h.copy) row.appendChild(button('📄 Copiar', '', () => h.copy(l)));
        if (h.exportLevel) row.appendChild(button('📤 Exportar', '', () => h.exportLevel(l)));
        row.appendChild(button('🗑', 'danger', () => this.confirm('¿Borrar "' + l.name + '"?' + (pub ? ' (la versión online no se borra)' : ''), () => h.remove(l))));
        wrap.appendChild(row);
      });
      s.appendChild(wrap);
    }

    // ---------- partida ----------
    pause(h) {
      const b = this.openModal('Pausa');
      const m = el('div', 'menu');
      m.appendChild(button('Continuar', 'primary', h.resume));
      m.appendChild(button('Reiniciar', '', h.restart));
      if (h.edit) m.appendChild(button('Volver al editor', '', h.edit));
      m.appendChild(button('Salir al menú', 'danger', h.exit));
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
