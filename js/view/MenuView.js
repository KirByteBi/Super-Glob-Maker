/* Vista: pantallas de menú y ventanas (DOM). No contiene lógica: recibe callbacks del controlador. */
(function (S) {
  'use strict';
  const el = (t, c, x) => S.View.el(t, c, x);
  const click = () => S.events.emit('ui:click');

  function button(label, cls, fn) { const b = el('button', 'btn ' + (cls || ''), label); b.onclick = () => { click(); fn(); }; return b; }
  function globImg(path, cls) { const i = document.createElement('img'); i.src = S.View.Assets.url(path); i.className = cls || 'glob-img'; i.alt = ''; i.draggable = false; return i; }

  class MenuView {
    constructor(screen, modal, toastEl) { this.screen = screen; this.modal = modal; this.toastEl = toastEl; this.toastT = null; }

    clear() { this.screen.innerHTML = ''; this.screen.className = 'screen'; this.screen.style.display = 'none'; }
    open(cls) { this.screen.innerHTML = ''; this.screen.className = 'screen ' + (cls || ''); this.screen.style.display = 'flex'; return this.screen; }
    closeModal() { this.modal.innerHTML = ''; this.modal.style.display = 'none'; }
    openModal(title) {
      this.modal.innerHTML = ''; this.modal.style.display = 'flex';
      const box = el('div', 'modal-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', title);
      box.appendChild(el('h2', '', title)); this.modal.appendChild(box);
      return box;
    }
    toast(msg, ms) {
      this.toastEl.textContent = msg; this.toastEl.classList.add('show');
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
      const b3d = button('🌌 Modo 3D (próximamente)', 'big disabled', () => this.toast('El modo 3D estilo SM64 / Galaxy llegará en la próxima versión.'));
      menu.appendChild(b3d);
      const row = el('div', 'row');
      row.appendChild(button('🎮 Controles', '', h.controls));
      row.appendChild(button(S.View.SoundView.isMuted() ? '🔇 Sonido' : '🔊 Sonido', '', () => { const m = S.View.SoundView.toggleMute(); row.children[1].textContent = m ? '🔇 Sonido' : '🔊 Sonido'; }));
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
      const syncWinN = () => { const def = WT[winSel.value] || {}; winN.parentNode.style.display = def.hasN ? '' : 'none'; };
      winSel.addEventListener('change', syncWinN); syncWinN();
      b.appendChild(form);
      const row = el('div', 'row');
      row.appendChild(button('Aplicar', 'primary', () => { this.closeModal(); onApply({ name: name.value.trim() || 'Nivel sin nombre', width: +width.value, height: +height.value, time: +time.value, win: { type: winSel.value, n: +winN.value } }); }));
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
      b.appendChild(el('p', 'small', 'Usa tu MISMA cuenta de Glob Defenders. Super Glob Maker no tiene cuentas propias.'));
      b.appendChild(form);
      const row = el('div', 'row');
      row.appendChild(button('Iniciar sesión', 'primary', () => {
        const u = user.value.trim(); if (!u || !pass.value) { this.toast('Escribe usuario y contraseña'); return; }
        h.login(u, pass.value, (r) => {
          if (r.ok) { this.closeModal(); this.toast('¡Vinculado como ' + r.username + '!'); }
          else this.toast(r.error === 'offline' ? 'Sin conexión con Glob Defenders' : 'No se pudo iniciar sesión');
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

    confirm(msg, onYes) {
      const b = this.openModal('¿Seguro?');
      b.appendChild(el('p', '', msg));
      const row = el('div', 'row');
      row.appendChild(button('Sí', 'danger', () => { this.closeModal(); onYes(); }));
      row.appendChild(button('No', '', () => this.closeModal()));
      b.appendChild(row);
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
        row.appendChild(button('▶ Jugar', 'primary', () => h.play(l)));
        row.appendChild(button('✏ Editar', '', () => h.edit(l)));
        if (h.publish) row.appendChild(button('🌐 Publicar', '', () => h.publish(l)));
        row.appendChild(button('🗑', 'danger', () => this.confirm('¿Borrar "' + l.name + '"?', () => h.remove(l))));
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
