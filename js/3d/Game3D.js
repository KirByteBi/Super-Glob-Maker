/* Modo 3D (Controller): orquesta el juego 3D. Crea su PROPIO <canvas> WebGL superpuesto
   (el canvas 2D y los menús siguen igual). El loop() del AppController llama a update()/render()
   cuando mode === '3d'. Victoria al recoger la Medalla principal. */
(function (S) {
  'use strict';
  const G3 = S.G3;
  const M = G3.math;

  class Game3D {
    constructor(app, world, opts) {
      this.app = app; this.opts = opts || {};
      this.world = world;
      this.world._character = (opts && opts.character) || app.prefs.character || 'green';

      // canvas WebGL propio, encima del canvas 2D, dentro de #stage
      const stage = document.getElementById('stage');
      const cv = this.canvas = document.createElement('canvas');
      cv.id = 'game3d';
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;z-index:2;';
      stage.appendChild(cv);

      // HUD DOM simple (medallas / mensaje)
      const hud = this.hud = document.createElement('div');
      hud.style.cssText = 'position:absolute;top:10px;left:14px;z-index:3;color:#fff;font:700 20px system-ui;text-shadow:0 2px 6px #000;pointer-events:none;';
      stage.appendChild(hud);
      const tip = this.tip = document.createElement('div');
      tip.style.cssText = 'position:absolute;bottom:12px;left:0;right:0;z-index:3;text-align:center;color:#fff;font:600 14px system-ui;text-shadow:0 2px 6px #000;pointer-events:none;opacity:.85;';
      tip.textContent = (S.tr ? S.tr('WASD / flechas: mover · Espacio: saltar · Shift: correr · Q/E: girar cámara (o ratón) · Esc: salir') : 'WASD / flechas: mover · Espacio: saltar · Shift: correr · Q/E: girar cámara (o ratón) · Esc: salir');
      stage.appendChild(tip);

      this.scene = new G3.View.Scene3D(cv, world);
      this.player = new G3.Model.Player3D(world.spawn, this.world._character);
      this.cam = new G3.View.Camera3D(this.scene.camera, this.player.pos, cv);
      this.blocks = world.blocks.map((b) => G3.Model.World3D.boxOf(b));
      // enemigos: modelos Pyce3D (mismo orden que los meshes de la escena)
      this.pyces = (world.pyces || []).map((p) => new G3.Model.Pyce3D(p));
      this.medalsGot = 0; this.totalMedals = world.medals.length;
      this.done = false; this.t = 0;

      // Input PROPIO del Modo 3D (lectura directa del teclado), independiente del esquema 2D
      // para que no haya líos (en el 2D W/↑ también saltan, etc.). Esquema estilo SM64:
      //   WASD / flechas = mover · Espacio = saltar · Shift = correr · Esc = salir
      this._keys = {};
      const track = {
        KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowLeft: 1, ArrowDown: 1, ArrowRight: 1,
        Space: 1, ShiftLeft: 1, ShiftRight: 1, Escape: 1,
        // cámara con teclado (para portátiles sin ratón): Q/E giran, R/F suben/bajan la vista
        KeyQ: 1, KeyE: 1, KeyR: 1, KeyF: 1
      };
      this._kd = (e) => {
        if (!track[e.code]) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (!e.repeat) this._keys[e.code] = { held: true, pressed: true };
        else if (this._keys[e.code]) this._keys[e.code].held = true;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      };
      this._ku = (e) => { if (track[e.code] && this._keys[e.code]) this._keys[e.code].held = false; };
      window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku);

      this.updateHud();
    }

    // ¿tecla mantenida? / ¿recién pulsada este frame? (pressed se consume en readInput)
    held(code) { const k = this._keys[code]; return !!(k && k.held); }

    // Reúne la foto de input 3D de este frame y consume las pulsaciones nuevas.
    readInput() {
      const held = (c) => this.held(c);
      const pressed = (c) => { const k = this._keys[c]; return !!(k && k.pressed); };
      const inp = {
        fwd: (held('KeyW') || held('ArrowUp') ? 1 : 0) - (held('KeyS') || held('ArrowDown') ? 1 : 0),
        str: (held('KeyD') || held('ArrowRight') ? 1 : 0) - (held('KeyA') || held('ArrowLeft') ? 1 : 0),
        jump: held('Space'),
        jumpPressed: pressed('Space'),
        run: held('ShiftLeft') || held('ShiftRight'),
        exitPressed: pressed('Escape'),
        // cámara por teclado
        camYaw: (held('KeyE') ? 1 : 0) - (held('KeyQ') ? 1 : 0),
        camPitch: (held('KeyR') ? 1 : 0) - (held('KeyF') ? 1 : 0)
      };
      // consumir las pulsaciones nuevas
      for (const c in this._keys) if (this._keys[c]) this._keys[c].pressed = false;
      return inp;
    }

    updateHud() {
      this.hud.textContent = '🏅 ' + this.medalsGot + ' / ' + this.totalMedals;
    }

    update(dt, inp) {
      if (this.done) { // tras ganar, solo gira la cámara un poco
        this.t += dt; this.cam.update(dt, this.player.pos); return;
      }
      this.t += dt;

      // Input propio del 3D (ignora el esquema 2D que llega en `inp`)
      const k = this.readInput();
      if (k.exitPressed) { this.app.exit3D(); return; }

      // cámara por teclado (portátiles sin ratón): Q/E giran, R/F inclinan.
      // Al usarla, suspende el auto-seguimiento un momento (como el ratón).
      if (k.camYaw || k.camPitch) {
        this.cam.rotate(-k.camYaw * 2.2 * dt, -k.camPitch * 1.4 * dt);
        this.cam.manualT = 0.8;
      }

      // dirección de movimiento relativa a la cámara
      const f = this.cam.forward(), r = this.cam.right();
      const ix = f.x * k.fwd + r.x * k.str;
      const iz = f.z * k.fwd + r.z * k.str;
      const moving = (k.fwd !== 0 || k.str !== 0);

      this.player.update(dt, { x: ix, z: iz }, k);
      this.player.physics(dt, this.blocks);

      // la cámara se recoloca SOLA detrás del Glob mientras te mueves (estilo SM64),
      // salvo justo después de arrastrar con el ratón (respeta tu encuadre un momento)
      this.cam.autoFollow(dt, this.player.facing, moving);

      // caída al vacío -> respawn
      if (this.player.pos.y < -20) {
        this.player.pos = M.v(this.world.spawn.x, this.world.spawn.y, this.world.spawn.z);
        this.player.vel = M.v(0, 0, 0);
      }

      // recoger medallas
      for (const mesh of this.scene.medalMeshes.slice()) {
        if (M.dist(this.player.pos, mesh.position) < 0.9 + this.player.r) {
          this.scene.removeMedal(mesh);
          this.medalsGot++; this.updateHud();
          S.events.emit('ui:coin');
          if (mesh.userData.medal.kind === 'main' || this.medalsGot >= this.totalMedals) this.win();
        }
      }

      // Pyces: IA + física, luego colisión con el Glob.
      for (const pyce of this.pyces) {
        if (pyce.dead) continue;
        pyce.update(dt, this.player, this.blocks);
        const dx = this.player.pos.x - pyce.pos.x;
        const dz = this.player.pos.z - pyce.pos.z;
        const dy = this.player.pos.y - pyce.pos.y;
        const near = Math.hypot(dx, dz) < 0.72 && Math.abs(dy) < 0.98;
        if (!near) continue;
        // pisar desde arriba (cayendo y claramente por encima)
        if (this.player.vel.y < 0 && dy > 0.3) {
          const res = pyce.stomped();
          if (res === 'die') { S.events.emit('ui:stomp'); this.player.vel.y = 7.0; }
          else if (res === 'bounce') { S.events.emit('ui:stomp'); this.player.vel.y = 7.0; }
          else { this._hurt(); break; }   // 'block' (embestida del caballero) = daño
        } else if (pyce.harmfulNow()) {
          this._hurt(); break;
        }
      }

      this.cam.update(dt, this.player.pos);
      this.scene.syncPlayer(this.player);
      this.scene.syncPyces(this.pyces, this.t);
    }

    // Daño al Glob. En Fase 1 no hay vidas todavía: vuelve al punto de inicio.
    _hurt() {
      this.player.pos = M.v(this.world.spawn.x, this.world.spawn.y, this.world.spawn.z);
      this.player.vel = M.v(0, 0, 0);
      S.events.emit('game:hurt_sfx');
    }

    win() {
      if (this.done) return;
      this.done = true;
      S.events.emit('game:clear_sfx');
      this.tip.textContent = '';
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,.45);color:#fff;font:800 34px system-ui;text-shadow:0 3px 10px #000;';
      box.innerHTML = '<div>🏅 ' + (S.tr ? S.tr('¡Medalla conseguida!') : '¡Medalla conseguida!') + '</div>';
      const b = S.View.button(S.tr ? S.tr('Continuar') : 'Continuar', 'btn primary', () => this.app.exit3D());
      b.style.pointerEvents = 'auto'; b.style.fontSize = '20px';
      box.appendChild(b);
      document.getElementById('stage').appendChild(box); this.winBox = box;
    }

    render(t) { this.scene.render(this.t); }

    destroy() {
      window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku);
      if (this.cam) this.cam.destroy();
      if (this.scene) this.scene.destroy();
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
      if (this.tip && this.tip.parentNode) this.tip.parentNode.removeChild(this.tip);
      if (this.winBox && this.winBox.parentNode) this.winBox.parentNode.removeChild(this.winBox);
    }
  }

  G3.Controller.Game3D = Game3D;
})(window.SGM);
