/* Modo 3D (Model): el Glob jugable. Posición, velocidad, estado de suelo/aire, saltos.
   SOLO lógica (sin THREE). Movimiento en el plano XZ relativo a la cámara (lo pasa el controlador).
   Fase 1: andar/correr + salto simple. Fase 2 añade salto triple, culetazo y wall jump. */
(function (S) {
  'use strict';
  const G3 = S.G3;
  const M = G3.math;
  const Phys = G3.Model.Physics3D;

  const WALK = 5.0, RUN = 8.5;     // velocidad objetivo (u/s)
  // Respuesta rápida y nada resbaladiza: arranca fuerte y FRENA muy rápido al soltar.
  const ACC = 130, FRICTION = 150; // aceleración / frenado en el suelo (u/s^2)
  const AIR_ACC = 45;              // control en el aire (menos que en suelo, pero útil)
  const JUMP_V = 9.2;              // impulso de salto
  const TURN = 22;                 // suavizado del giro (más vivo)

  class Player3D {
    constructor(spawn, character) {
      this.pos = M.v(spawn.x, spawn.y, spawn.z);
      this.vel = M.v(0, 0, 0);
      this.r = 0.45;               // radio de la esfera de colisión
      this.onGround = false;
      this.facing = 0;             // ángulo al que mira (radianes, en XZ)
      this.character = character || 'green';
      this.color = (S.Model.Characters.get(this.character) || {}).color || '#00ff66';
      this.jumpHeld = false;
    }

    // dir = {x,z} intención de movimiento (ya rotada por la cámara), magnitud 0..1.
    // inp = foto de InputController (jump, jumpPressed, run...).
    update(dt, dir, inp) {
      const run = !!inp.run;
      const targetSpeed = run ? RUN : WALK;
      const mag = Math.min(1, Math.hypot(dir.x, dir.z));
      const onG = this.onGround;

      if (mag > 0.01) {
        const nx = dir.x / mag, nz = dir.z / mag;
        const acc = (onG ? ACC : AIR_ACC) * dt;
        this.vel.x = approach(this.vel.x, nx * targetSpeed * mag, acc);
        this.vel.z = approach(this.vel.z, nz * targetSpeed * mag, acc);
        // girar hacia la dirección de movimiento
        const want = Math.atan2(nx, nz);
        this.facing = lerpAngle(this.facing, want, Math.min(1, TURN * dt));
      } else if (onG) {
        const fr = FRICTION * dt;
        this.vel.x = approach(this.vel.x, 0, fr);
        this.vel.z = approach(this.vel.z, 0, fr);
        // zona muerta: por debajo de este umbral, parado del todo (nada de deslizar)
        if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
        if (Math.abs(this.vel.z) < 0.05) this.vel.z = 0;
      }

      // salto (solo desde el suelo en la fase 1)
      if (inp.jumpPressed && onG) { this.vel.y = JUMP_V; this.onGround = false; }
      // salto variable: si sueltas pronto, cae antes
      if (!inp.jump && this.vel.y > 0) this.vel.y *= 0.86;

      return this;
    }

    // Integra física contra los bloques del mundo (modo flat).
    physics(dt, blocks) {
      Phys.stepFlat(this, blocks, dt);
      // red de seguridad: si caes al vacío, respawn (se gestiona arriba leyendo this.pos.y)
      return this;
    }
  }

  function approach(v, t, s) { return v < t ? Math.min(v + s, t) : Math.max(v - s, t); }
  function lerpAngle(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  Player3D.approach = approach;
  Player3D.lerpAngle = lerpAngle;
  G3.Model.Player3D = Player3D;
})(window.SGM);
