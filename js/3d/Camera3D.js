/* Modo 3D (View/Controller): cámara orbital que sigue al Glob (estilo SM64/Galaxy).
   El ratón (arrastrar) o las flechas la giran. Da el "forward/right" para que el
   movimiento del jugador sea relativo a la cámara. */
(function (S) {
  'use strict';
  const G3 = S.G3;
  const M = G3.math;

  const DIST = 9, HEIGHT = 4.5;       // distancia y altura de la cámara
  const MIN_PITCH = 0.15, MAX_PITCH = 1.2;

  class Camera3D {
    constructor(camera, target, canvas) {
      this.camera = camera; this.canvas = canvas;
      this.yaw = Math.PI;              // ángulo horizontal (rad)
      this.pitch = 0.5;                // ángulo vertical (rad)
      this.target = { x: target.x, y: target.y, z: target.z };
      this.dragging = false; this.lastX = 0; this.lastY = 0;
      this._bind();
    }

    _bind() {
      const c = this.canvas;
      this._down = (e) => { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; };
      this._move = (e) => {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
        this.lastX = e.clientX; this.lastY = e.clientY;
        this.yaw -= dx * 0.008;
        this.pitch = M.clamp(this.pitch + dy * 0.006, MIN_PITCH, MAX_PITCH);
      };
      this._up = () => { this.dragging = false; };
      c.addEventListener('pointerdown', this._down);
      window.addEventListener('pointermove', this._move);
      window.addEventListener('pointerup', this._up);
      this.manualT = 0; // segundos restantes en los que NO auto-seguimos (tras tocar el ratón)
    }

    // Recoloca la cámara SOLA detrás del Glob mientras se mueve (como SM64/Galaxy).
    // facing = ángulo al que mira el Glob. moving = si hay intención de movimiento.
    // Tras arrastrar con el ratón se respeta tu encuadre ~1.2 s antes de volver a seguir.
    autoFollow(dt, facing, moving) {
      if (this.dragging) { this.manualT = 1.2; return; }
      if (this.manualT > 0) { this.manualT -= dt; return; }
      if (!moving) return;
      // objetivo: la cámara detrás del Glob => yaw igual a su rumbo
      let d = ((facing - this.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 2.5); // seguimiento suave
    }

    // Flechas de la cámara con teclado (se pasa la foto de input; usamos las Pressed/held).
    // En 3D reasignamos: el jugador se mueve con WASD y la cámara gira con las flechas del input
    // "left/right" SOLO si no hay intención de mover... para simplificar, la cámara gira con ratón
    // y, además, con las teclas Q/E (las añade Game3D leyendo el teclado directo). Aquí offset manual.
    rotate(dyaw, dpitch) {
      this.yaw += dyaw;
      if (dpitch) this.pitch = M.clamp(this.pitch + dpitch, MIN_PITCH, MAX_PITCH);
    }

    // Vector "adelante" en el plano XZ según el yaw (hacia donde mira la cámara).
    forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
    right() { return { x: Math.sin(this.yaw + Math.PI / 2), z: Math.cos(this.yaw + Math.PI / 2) }; }

    update(dt, targetPos) {
      // suaviza el seguimiento del objetivo
      const t = Math.min(1, dt * 8);
      this.target.x = M.lerp(this.target.x, targetPos.x, t);
      this.target.y = M.lerp(this.target.y, targetPos.y, t);
      this.target.z = M.lerp(this.target.z, targetPos.z, t);
      // posición orbital
      const hor = Math.cos(this.pitch) * DIST;
      const cx = this.target.x - Math.sin(this.yaw) * hor;
      const cz = this.target.z - Math.cos(this.yaw) * hor;
      const cy = this.target.y + HEIGHT + Math.sin(this.pitch) * DIST;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(this.target.x, this.target.y + 0.5, this.target.z);
    }

    destroy() {
      this.canvas.removeEventListener('pointerdown', this._down);
      window.removeEventListener('pointermove', this._move);
      window.removeEventListener('pointerup', this._up);
    }
  }

  G3.View.Camera3D = Camera3D;
})(window.SGM);
