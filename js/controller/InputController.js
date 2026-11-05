/* Controlador: teclado y mando. Produce una "foto" de la entrada por fotograma, con pulsaciones nuevas. */
(function (S) {
  'use strict';
  const MAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    // ↑ / W saltan y además sirven para entrar por las puertas
    ArrowUp: ['jump', 'up'], KeyW: ['jump', 'up'], KeyZ: 'jump', KeyK: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
    // Disparar: Espacio (principal), C o L
    Space: 'shoot', KeyC: 'shoot', KeyL: 'shoot',
    Escape: 'pause', Enter: ['pause', 'enter'], KeyP: 'pause',
    KeyM: 'altmode', // alterna Paz/Corrupto en el mapamundi (Historia Corrupta)
    KeyE: 'edit', KeyB: 'packexp' // admin en el mapamundi: editar el nivel / exportar la lista de la Historia
  };
  const ACTIONS = ['left', 'right', 'jump', 'up', 'down', 'run', 'shoot', 'pause', 'enter', 'altmode', 'edit', 'packexp'];
  const acts = (code) => { const a = MAP[code]; return a ? [].concat(a) : null; };

  class InputController {
    constructor() {
      this.keys = {}; this.prev = {}; this.enabled = true;
      // Volver al editor al vuelo: Esc o Ctrl+P mientras pruebas un nivel.
      // Se consume una sola vez (editExit) desde el GameController en modo prueba.
      this.editExit = false;
      window.addEventListener('keydown', (e) => {
        const a = acts(e.code);
        if (!a || !this.enabled) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (!e.repeat && (e.code === 'Escape' || (e.code === 'KeyP' && (e.ctrlKey || e.metaKey)))) this.editExit = true;
        a.forEach((k) => { this.keys[k] = true; });
        if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { const a = acts(e.code); if (a) a.forEach((k) => { this.keys[k] = false; }); });
      window.addEventListener('blur', () => { this.keys = {}; });
    }

    gamepad() {
      const out = {};
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (!p) continue;
        const ax = p.axes[0] || 0, b = (i) => p.buttons[i] && p.buttons[i].pressed;
        if (ax < -0.4 || b(14)) out.left = true;
        if (ax > 0.4 || b(15)) out.right = true;
        if ((p.axes[1] || 0) > 0.5 || b(13)) out.down = true;
        if ((p.axes[1] || 0) < -0.5 || b(12)) out.up = true;
        if (b(0) || b(1)) out.jump = true;
        if (b(3) || b(5) || b(7)) out.run = true;
        if (b(2) || b(4) || b(6)) out.shoot = true;
        if (b(9)) out.pause = true;
      }
      return out;
    }
    // Llamar una vez por fotograma
    poll() {
      const pad = this.gamepad();
      const s = {};
      ACTIONS.forEach((a) => {
        s[a] = !!(this.keys[a] || pad[a]);
        s[a + 'Pressed'] = s[a] && !this.prev[a];
      });
      ACTIONS.forEach((a) => { this.prev[a] = s[a]; });
      // Señal de "volver al editor" (Esc o Ctrl+P), se consume una sola vez
      s.editExitPressed = this.editExit; this.editExit = false;
      return s;
    }
    clear() { this.keys = {}; }
    // Las teclas que ya están pulsadas al cambiar de pantalla no cuentan como pulsación nueva
    // (p. ej. la P que lanza la prueba desde el editor no debe pausar la partida al empezar).
    swallow() { ACTIONS.forEach((a) => { if (this.keys[a]) this.prev[a] = true; }); this.editExit = false; }
  }
  S.Controller.InputController = InputController;
})(window.SGM);
