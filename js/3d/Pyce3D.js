/* Modo 3D (Model): enemigos Pyce. Reproducen su MECÁNICA del 2D, adaptada a suelo 3D plano.
   Solo se incluyen los Pyces que funcionan bien sin limitaciones en 3D y son fáciles de usar:
     stupid  -> camina recto, cae al pisarlo.                      (cara ":D")
     pyce2   -> camina lento; al golpearlo se enfada y acelera; 2 golpes.  (cara "^^")
     symbol  -> da saltitos avanzando (rebota).
     noob    -> camina y, si estás cerca, se para y te "dispara" (embestida corta hacia ti).
     zom     -> camina muy lento; al pisarlo cae y se levanta UNA vez, luego ya muere.
     knight  -> camina; si te acercas, EMBISTE rápido un momento. (no se pisa por delante)
   Física: gravedad + colisión AABB iguales que el Player3D (Physics3D.stepFlat). */
(function (S) {
  'use strict';
  const G3 = S.G3;
  const M = G3.math;
  const Phys = G3.Model.Physics3D;

  // Tabla de tipos: velocidad, vida y rasgos. Fiel a Enemies.js del 2D (escala 1u≈1 bloque).
  const TYPES = {
    stupid: { speed: 2.2, hp: 1 },
    pyce2: { speed: 2.0, hp: 2, angrySpeed: 5.2 },
    symbol: { speed: 0, hp: 1, hop: true, hopV: 8.0, hopEvery: 0.7, hopFwd: 2.0 },
    noob: { speed: 1.8, hp: 1, ranged: true, range: 9, chargeV: 6.5 },
    zom: { speed: 1.2, hp: 1, revive: true, reviveSpeed: 2.0 },
    knight: { speed: 1.6, hp: 1, charger: true, range: 5, chargeV: 7.5, frontProof: true }
  };

  class Pyce3D {
    constructor(data) {
      this.type = data.type || 'stupid';
      const d = TYPES[this.type] || TYPES.stupid;
      this.def = d;
      this.pos = M.v(data.x, data.y, data.z);
      this.vel = M.v(0, 0, 0);
      this.r = 0.46;
      this.onGround = false;
      this.dir = data.dir || 1;           // -1 / +1 sobre el eje X (patrulla)
      this.homeX = data.x; this.range = data.range || 3;
      this.hp = d.hp; this.maxHp = d.hp;
      this.facing = this.dir > 0 ? 0 : Math.PI;
      this.dead = false; this.hurtT = 0;
      // estados propios
      this.angry = false; this.hopT = (d.hopEvery || 0.7) * Math.random();
      this.charge = 0; this.cool = 1; this.down = 0; this.revived = false;
    }

    // IA + física de un paso. player = Player3D (para perseguir/apuntar). blocks = cajas AABB.
    update(dt, player, blocks) {
      if (this.dead) return;
      this.hurtT = Math.max(0, this.hurtT - dt);
      const d = this.def;
      const toPlayer = M.sub(player.pos, this.pos);
      const distXZ = Math.hypot(toPlayer.x, toPlayer.z);

      // --- zombi caído: no hace nada hasta levantarse ---
      if (d.revive && this.down > 0) {
        this.vel.x = 0; this.vel.z = 0; this.down -= dt;
        if (this.down <= 0) this.revived = true;
        this._physics(dt, blocks); return;
      }

      // --- caballero/noob: embestida o disparo corto hacia el jugador si está cerca ---
      if ((d.charger || d.ranged) && this.charge > 0) {
        this.charge -= dt;
        this._moveToward(toPlayer, d.chargeV);
        this._physics(dt, blocks); return;
      }
      if ((d.charger || d.ranged)) {
        this.cool -= dt;
        if (this.cool <= 0 && distXZ < (d.range || 6)) {
          this.charge = 0.5; this.cool = 1.6;
          this._faceToward(toPlayer);
          this._physics(dt, blocks); return;
        }
      }

      // --- symbol: brinca avanzando ---
      if (d.hop) {
        if (this.onGround) {
          this.vel.x = 0; this.vel.z = 0;
          this.hopT -= dt;
          if (this.hopT <= 0) { this.hopT = d.hopEvery; this.vel.y = d.hopV; this.vel.x = this.dir * d.hopFwd; }
        }
        this._patrolTurn();
        this._physics(dt, blocks); return;
      }

      // --- caminar/patrullar de lado a lado (eje X) ---
      const sp = (this.angry ? d.angrySpeed : d.speed) * (this.revived ? (d.reviveSpeed / d.speed) : 1);
      this.vel.x = this.dir * sp;
      this.vel.z = 0;
      this._patrolTurn();
      this.facing = this.dir > 0 ? 0 : Math.PI;
      this._physics(dt, blocks);
    }

    _patrolTurn() {
      if (this.pos.x > this.homeX + this.range) { this.dir = -1; }
      else if (this.pos.x < this.homeX - this.range) { this.dir = 1; }
    }
    _faceToward(to) { this.dir = to.x >= 0 ? 1 : -1; this.facing = this.dir > 0 ? 0 : Math.PI; }
    _moveToward(to, sp) {
      const l = Math.hypot(to.x, to.z) || 1;
      this.vel.x = (to.x / l) * sp; this.vel.z = (to.z / l) * sp;
      this.facing = Math.atan2(to.x, to.z);
    }
    _physics(dt, blocks) {
      Phys.stepFlat(this, blocks, dt);
      if (this.pos.y < -30) this.dead = true; // cayó al vacío
    }

    // El jugador lo pisa desde arriba. Devuelve 'die' | 'bounce' | 'block' (no le afecta).
    stomped() {
      const d = this.def;
      // caballero: no se pisa de frente (blindaje), pero aquí simplificamos: siempre pisable
      if (d.charger && d.frontProof && this.charge > 0) return 'block'; // embistiendo = peligroso
      if (d.revive && !this.revived && this.down <= 0) { this.down = 2.2; return 'bounce'; }
      if (this.hp > 1) { this.hp--; this.angry = true; this.hurtT = 0.3; return 'bounce'; }
      this.dead = true; return 'die';
    }
    // ¿este Pyce hace daño al tocarlo de lado ahora mismo?
    harmfulNow() { return !this.dead && !(this.def.revive && this.down > 0); }
  }

  Pyce3D.TYPES = TYPES;
  G3.Model.Pyce3D = Pyce3D;
})(window.SGM);
