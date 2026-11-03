/* Vista: CONTROLES TÁCTILES para móvil/tablet.
   - En partida (y en el mapamundi): cruceta (← → ↓ ↑) a la izquierda y botones a la derecha
     (Saltar, Correr, Disparar) + Pausa. Escriben en InputController.keys como el teclado.
     Correr se puede dejar fijo (toque largo), y Saltar admite mantener para saltar más.
   - En el editor: los toques sobre el lienzo se convierten en ratón (colocar / arrastrar);
     con el botón "🧽" se borra en vez de colocar (como el clic derecho).
   Solo aparece en pantallas táctiles (pointer: coarse) o si la pantalla es pequeña. */
(function (S) {
  'use strict';
  const isTouch = () => (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

  function btn(parent, cls, label, aria) { const b = document.createElement('button'); b.className = 'tc-btn ' + cls; b.textContent = label; b.setAttribute('aria-label', aria || label); b.type = 'button'; parent.appendChild(b); return b; }

  const TouchControls = {
    init(app) {
      if (!isTouch() || this.root) return;
      const stage = document.getElementById('stage');
      const root = this.root = document.createElement('div'); root.id = 'touch'; stage.appendChild(root);
      const keys = app.input.keys;
      // mantiene pulsada(s) la(s) acción(es) mientras el dedo esté encima
      const hold = (b, acts) => {
        const down = (e) => { e.preventDefault(); b.classList.add('on'); acts.forEach((a) => { keys[a] = true; }); try { b.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } };
        const up = (e) => { e.preventDefault(); b.classList.remove('on'); acts.forEach((a) => { keys[a] = false; }); };
        b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      };
      // cruceta: un solo bloque que reparte el dedo según dónde esté (permite deslizar de ← a →)
      const pad = document.createElement('div'); pad.className = 'tc-pad'; root.appendChild(pad);
      ['up', 'left', 'right', 'down'].forEach((d) => { const s = document.createElement('span'); s.className = 'tc-dir ' + d; s.textContent = { up: '▲', left: '◀', right: '▶', down: '▼' }[d]; pad.appendChild(s); });
      const padActs = { left: ['left'], right: ['right'], up: ['up', 'jump'], down: ['down'] };
      let padOn = [];
      const setPad = (list) => { padOn.forEach((a) => { keys[a] = false; }); padOn = list; padOn.forEach((a) => { keys[a] = true; }); pad.querySelectorAll('.tc-dir').forEach((s) => s.classList.toggle('on', list.some((a) => (padActs[s.classList[1]] || []).includes(a)))); };
      const padMove = (e) => {
        const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dead = r.width * 0.12;
        const out = [];
        if (dx < -dead) out.push('left'); else if (dx > dead) out.push('right');
        if (dy < -r.height * 0.28) out.push('up', 'jump'); else if (dy > r.height * 0.28) out.push('down');
        setPad(out);
      };
      pad.addEventListener('pointerdown', (e) => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } padMove(e); });
      pad.addEventListener('pointermove', (e) => { if (padOn.length || e.buttons) padMove(e); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => pad.addEventListener(ev, () => setPad([])));
      // botones de acción
      const acts = document.createElement('div'); acts.className = 'tc-acts'; root.appendChild(acts);
      hold(btn(acts, 'jump', 'A', 'Saltar'), ['jump']);
      hold(btn(acts, 'shoot', '✦', 'Disparar'), ['shoot']);
      const run = btn(acts, 'run', 'B', 'Correr (toque largo: fijo)'); hold(run, ['run']);
      // toque largo en Correr = dejarlo fijo; otro toque lo suelta
      let lockT = null, locked = false;
      run.addEventListener('pointerdown', () => { if (locked) { locked = false; run.classList.remove('lock'); return; } lockT = setTimeout(() => { locked = true; run.classList.add('lock'); }, 550); });
      run.addEventListener('pointerup', () => { clearTimeout(lockT); if (locked) keys.run = true; });
      const pause = btn(root, 'pause', '⏸', 'Pausa');
      pause.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.pause = true; setTimeout(() => { keys.pause = false; }, 120); });
      // ---- editor: toques -> ratón ----
      const cv = app.canvas; let erase = false;
      const eraser = btn(root, 'erase', '🧽', 'Borrar (como el clic derecho)');
      eraser.addEventListener('click', () => { erase = !erase; eraser.classList.toggle('on', erase); });
      const fire = (type, t) => cv.dispatchEvent(new MouseEvent(type, { clientX: t.clientX, clientY: t.clientY, button: erase ? 2 : 0, buttons: erase ? 2 : 1, bubbles: true }));
      cv.addEventListener('touchstart', (e) => { if (app.mode !== 'editor' || e.touches.length !== 1) return; e.preventDefault(); fire('mousedown', e.touches[0]); }, { passive: false });
      // un dedo = pintar / arrastrar; dos dedos = mover la cámara del editor
      let pan = null;
      cv.addEventListener('touchmove', (e) => {
        if (app.mode !== 'editor') return; e.preventDefault();
        if (e.touches.length === 2 && app.editor) {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2, k = S.VIEW_W / cv.getBoundingClientRect().width, m = app.editor.model;
          if (!pan) { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); pan = { x: mx, y: my, cx: m.camX, cy: m.camY }; }
          m.camX = pan.cx - (mx - pan.x) * k; m.camY = pan.cy - (my - pan.y) * k; app.editor.clampCam(); return;
        }
        if (e.touches.length !== 1 || pan) return;
        const t = e.touches[0]; cv.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY, buttons: erase ? 2 : 1, bubbles: true }));
      }, { passive: false });
      cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) e.preventDefault(); }, { passive: false });
      cv.addEventListener('touchend', (e) => { if (app.mode !== 'editor') return; e.preventDefault(); if (!e.touches.length) pan = null; window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); }, { passive: false });
      // mostrar lo que toque según la pantalla
      const tick = () => {
        const playing = app.mode === 'game' || app.mode === 'map', ed = app.mode === 'editor';
        root.className = playing ? 'play' : ed ? 'edit' : 'hide';
        requestAnimationFrame(tick);
      };
      tick();
      document.body.classList.add('touch');
    }
  };
  S.View.TouchControls = TouchControls;
})(window.SGM);
