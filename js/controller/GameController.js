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
      if (inp.pausePressed && !this.finished) { this.togglePause(); return; }
      if (this.paused || this.finished) return;
      this.acc = Math.min(this.acc + dt, 0.1);
      let first = true;
      while (this.acc >= STEP) {
        // las pulsaciones nuevas solo cuentan en el primer subpaso
        const i = first ? inp : Object.assign({}, inp, { jumpPressed: false, upPressed: false, downPressed: false, runPressed: false, shootPressed: false });
        this.model.update(STEP, i);
        this.acc -= STEP; first = false;
      }
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
        restart: () => { menu.closeModal(); this.paused = false; this.app.restartGame(); },
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
