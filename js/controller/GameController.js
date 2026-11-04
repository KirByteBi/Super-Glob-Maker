/* Controlador: une GameModel con sus vistas y gestiona pausa / fin de partida */
(function (S) {
  'use strict';
  const STEP = 1 / 120;

  class GameController {
    constructor(app, levelData, opts) {
      this.app = app; this.opts = opts || {};
      this.model = new S.Model.GameModel(levelData, opts);
      this.renderer = new S.View.WorldRenderer(app.canvas);
      this.particles = new S.View.ParticlesView();
      this.paused = false; this.acc = 0; this.finished = false;
      this.offs = [
        S.events.on('game:cleared', () => this.finish('clear')),
        S.events.on('game:gameover', () => this.finish('gameover')),
        S.events.on('game:start', (d) => { if (!d.first) S.View.SoundView.playMusic(this.model.theme, this.model.mode); })
      ];
      S.View.SoundView.playMusic(this.model.theme, this.model.mode);
    }
    destroy() { this.offs.forEach((f) => f()); S.View.SoundView.stopMusic(); }

    update(dt, inp) {
      // Al probar un nivel: Esc o Ctrl+P vuelven al editor directamente (sin menú de pausa)
      if (this.opts.testMode && inp.editExitPressed && !this.finished) { this.app.backToEditor(); return; }
      if (inp.pausePressed && !this.finished) { this.togglePause(); return; }
      // Multijugador: tras llegar a la meta sigues viendo a los demás (y mandando que has acabado)
      if (this.finished && this.opts.mp) { this.opts.mp.tick(this.model, dt); this.particles.update(dt); return; }
      if (this.paused || this.finished) return;
      this.acc = Math.min(this.acc + dt, 0.1);
      let first = true;
      while (this.acc >= STEP) {
        // las pulsaciones nuevas solo cuentan en el primer subpaso
        const i = first ? inp : Object.assign({}, inp, { jumpPressed: false, upPressed: false, downPressed: false, runPressed: false, shootPressed: false });
        this.model.update(STEP, i);
        this.acc -= STEP; first = false;
      }
      // Multijugador: manda tu posición y mueve a los demás Globs
      if (this.opts.mp) this.opts.mp.tick(this.model, dt);
      this.particles.update(dt);
    }
    render(t) {
      this.renderer.render(this.model, this.particles, t);
      S.View.HUDView.draw(this.app.ctx, this.model, t);
    }

    togglePause() {
      const menu = this.app.menu;
      if (this.paused) { this.paused = false; menu.closeModal(); return; }
      this.paused = true;
      menu.pause({
        resume: () => { this.paused = false; menu.closeModal(); },
        // en multijugador la carrera sigue: reiniciar vuelve a la salida pero el reloj no para
        restart: () => { menu.closeModal(); this.paused = false; if (this.opts.mp) { this.model.checkpoint = null; this.model.reset(false); } else this.app.restartGame(); },
        exitLabel: this.opts.mp ? '🚪 Salir de la sala' : null,
        edit: this.opts.testMode ? () => { menu.closeModal(); this.app.backToEditor(); } : null,
        exit: () => { menu.closeModal(); this.app.exitGame(); }
      });
    }

    finish(kind) {
      if (this.finished) return;
      this.finished = true;
      this.app.onGameFinished(kind, this.model);
    }
  }
  S.Controller.GameController = GameController;
})(window.SGM);
