/* Modelo: el Glob jugable (movimiento, evoluciones, power-ups especiales) */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const C = S.Model.Catalog;
  const Physics = S.Model.Physics;
  const Chars = S.Model.Characters;

  // Tamaños de la caja de colisión (el sprite se dibuja algo más grande)
  const SIZES = [{ w: 28, h: 22, draw: 44 }, { w: 40, h: 32, draw: 62 }];

  class Player {
    constructor(charId, x, y, noPowers) {
      // Norma "sin efectos especiales": el Glob conserva su aspecto pero juega como el verde.
      this.noPowers = !!noPowers;
      this.ch = this.noPowers ? Chars.neutralized(charId) : Chars.get(charId);
      this.evo = 0; this.special = null;
      const s = SIZES[0];
      this.w = s.w; this.h = s.h;
      this.x = x * T + T / 2 - this.w / 2; this.y = (y + 1) * T - this.h;
      this.vx = 0; this.vy = 0; this.face = 1; this.onGround = false;
      this.coyote = 0; this.jumpBuffer = 0; this.jumpHeld = false;
      this.pound = 0; this.poundWait = 0; this.inv = 0; this.star = 0;
      this.dead = false; this.airJumps = 0; this.doubleJumped = false;
      this.swimming = false; this.shootCd = 0; this.anim = 0; this.squash = 0;
      this.ridePlat = null; this.groundTile = 0; this.changeT = 0; this.prevForm = null;
      this.carrying = null; // objeto que lleva encima (Bomb Pyce estilo Bob-omb)
    }
    get big() { return this.evo > 0 || !!this.special; }
    formName() { return Chars.formName(this.ch, this.evo, this.special); }
    formPath() { return Chars.formPath(this.ch, this.evo, this.special); }
    drawSize() { return SIZES[this.big ? 1 : 0].draw; }

    resizeTo(big) {
      const s = SIZES[big ? 1 : 0];
      const cx = this.x + this.w / 2, by = this.y + this.h;
      this.w = s.w; this.h = s.h; this.x = cx - this.w / 2; this.y = by - this.h;
    }
    setForm(evo, special) {
      this.prevForm = this.formPath();
      this.evo = evo; this.special = special || null; this.changeT = 0.6;
      this.resizeTo(this.big);
    }

    // Cápsula de personaje: cambia de Glob manteniendo la evolución (los especiales se pierden)
    setCharacter(id) {
      this.prevForm = this.formPath();
      this.ch = this.noPowers ? Chars.neutralized(id) : Chars.get(id);
      this.evo = Math.min(this.evo, this.ch.evos.length - 1);
      this.special = null; this.changeT = 0.6;
      this.resizeTo(this.big);
    }

    // Devuelve true si el jugador muere
    hurt() {
      if (this.inv > 0 || this.star > 0 || this.dead) return false;
      if (this.special) { this.setForm(1, null); this.inv = 1.6; return 'shrink'; }
      if (this.evo > 0) { this.setForm(this.evo - 1, null); this.inv = 1.6; return 'shrink'; }
      return true;
    }

    update(g, dt, inp) {
      const st = this.ch.stats, fx = g.fx;
      this.anim += dt; this.inv = Math.max(0, this.inv - dt); this.star = Math.max(0, this.star - dt);
      this.shootCd = Math.max(0, this.shootCd - dt); this.changeT = Math.max(0, this.changeT - dt);
      this.squash = U.approach(this.squash, 0, dt * 5);

      // Agua: tema acuático o bloque de agua
      const midT = g.level.get(Math.floor((this.x + this.w / 2) / T), Math.floor((this.y + this.h / 2) / T));
      // Sunlight Seaside Corrupto: dentro de una ola de agua también se nada (y te arrastra)
      const inWave = !midT && g.waveTileAt && g.waveTileAt(this.x + this.w / 2, this.y + this.h / 2) === C.T.WATER;
      this.swimming = !!g.theme.swim || midT === C.T.WATER || inWave;

      let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const run = inp.run;
      let traction = st.traction;
      // hielo: en Corrupto (hielo negro) resbala todavía más
      if (this.groundTile === C.T.ICE || fx.slippery) traction *= (g.mode === 'corrupt' && this.groundTile === C.T.ICE) ? 0.13 : 0.22;
      // Glob de Jabón: resbala al caminar. Mientras patina (va rápido sin frenar) ignora cintas y pinchos.
      this.sliding = false;
      if (this.ch.slippery) {
        traction *= 0.5;
        if (this.onGround && Math.abs(this.vx) > 120) this.sliding = true;
      }
      // Glob Cometa/Antiguo con power-up especial: nadan más rápido
      const swimMul = (this.special && this.ch.swimSpecial) ? this.ch.swimSpecial : 1;
      const maxSpd = (this.swimming ? 120 * swimMul : run ? 245 : 155) * st.speed;
      const accel = (this.onGround ? 1100 : 700) * traction;
      const decel = (this.onGround ? 1300 : 350) * traction;

      if (this.pound > 0) dir = 0;
      if (dir) {
        this.face = dir;
        const turning = Math.sign(this.vx) === -dir;
        this.vx = U.approach(this.vx, dir * maxSpd, (turning ? accel * 1.8 : accel) * dt);
      } else this.vx = U.approach(this.vx, 0, decel * dt);
      if (Math.abs(this.vx) > maxSpd && this.onGround) this.vx = U.approach(this.vx, Math.sign(this.vx) * maxSpd, 600 * dt);

      // Salto (con coyote time y buffer)
      this.coyote = this.onGround ? 0.09 : Math.max(0, this.coyote - dt);
      if (inp.jumpPressed) this.jumpBuffer = 0.12; else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.onGround) { this.airJumps = this.special === 'vacio' ? 1 : 0; }

      let grav = 1750 * g.gravMul;
      let maxFall = 640;
      if (this.swimming) {
        grav = 420 * g.gravMul; maxFall = 150;
        // Abismo Corrupto: brazadas más fuertes (saltos altos)
        if (this.jumpBuffer > 0) { this.vy = -250 * st.swim * (g.fx.abyss ? 1.4 : 1); this.jumpBuffer = 0; g.emit('swim', { x: this.x + this.w / 2, y: this.y + this.h }); }
        if (inp.down) maxFall = 260;
      } else {
        if (this.jumpBuffer > 0 && this.pound <= 0) {
          if (this.coyote > 0) {
            this.vy = -(560 + Math.abs(this.vx) * 0.22) * st.jump;
            this.jumpBuffer = 0; this.coyote = 0; this.onGround = false; this.jumpHeld = true; this.doubleJumped = false;
            this.bounceChain = true; // Gelatin Lake Corrupto: tras saltar sigues rebotando
            this.ridePlat = null;
            g.emit('jump', { x: this.x + this.w / 2, y: this.y + this.h });
          } else if (this.airJumps > 0) {
            this.airJumps--; this.vy = -520 * st.jump; this.jumpBuffer = 0; this.jumpHeld = true; this.doubleJumped = true;
            g.emit('doubleJump', { x: this.x + this.w / 2, y: this.y + this.h });
          }
        }
        if (this.jumpHeld && !inp.jump) { if (this.vy < -180) this.vy *= 0.5; this.jumpHeld = false; }
        if (this.vy < 0 && inp.jump) grav *= 0.6;
        // Planeo: el Glob de Jabón plana mientras mantengas salto; el Ducky plana solo
        // unos pocos segundos (se recarga al pisar suelo). El Glob Vacío cae lento.
        if (this.onGround) this.floatT = 2.2;
        const canFloat = st.float && (this.ch.id !== 'ducky' || this.floatT > 0);
        if (this.vy > 0 && inp.jump) {
          if (canFloat) { maxFall = 110; if (this.ch.id === 'ducky') this.floatT = Math.max(0, (this.floatT || 0) - dt); }
          else if (this.special === 'vacio') maxFall = 160;
        }
        // Culetazo
        if (inp.downPressed && !this.onGround && this.pound <= 0) { this.pound = 1; this.poundWait = 0.18; this.vx = 0; this.vy = 0; g.emit('poundStart', {}); }
      }

      if (this.pound > 0) {
        if (this.poundWait > 0) { this.poundWait -= dt; this.vy = 0; grav = 0; }
        else { this.vy = 820; maxFall = 820; }
      }

      this.vy = Math.min(this.vy + grav * dt, maxFall);

      // Empujes externos: viento, corrientes, cintas, plataforma
      let pushX = 0, pushY = 0;
      if (g.wind) pushX += g.wind * dt * (this.onGround ? 0.5 : 1);
      if (g.currentX) pushX += g.currentX * dt;
      if (inWave) pushX += 90 * dt; // la ola te lleva en su sentido (hacia la derecha)
      if (!this.sliding && this.onGround && this.groundTile === C.T.CONV_L) pushX -= 75 * dt * g.convDir * g.obstacleMul;
      if (!this.sliding && this.onGround && this.groundTile === C.T.CONV_R) pushX += 75 * dt * g.convDir * g.obstacleMul;
      if (this.ridePlat) { pushX += this.ridePlat.dx; pushY += this.ridePlat.dy > 0 ? this.ridePlat.dy : 0; if (this.ridePlat.dy < 0) this.y += this.ridePlat.dy; }

      const prevVy = this.vy, prevBottom = this.y + this.h;
      const r = Physics.move(this, g.level, dt, { pushX, pushY, hidden: true, dropThrough: false });
      this.groundTile = r.groundTile; this.groundX = r.groundX; this.groundY = r.groundY;
      if (r.wall) this.vx = 0;

      // Plataformas y entidades sólidas
      this.ridePlat = null;
      g.solidEntities().forEach((e) => {
        if (e.platform) {
          if (this.vy >= 0 && this.x + this.w > e.x && this.x < e.x + e.w && prevBottom <= e.y + 6 + Math.max(0, e.dy) && this.y + this.h >= e.y) {
            this.y = e.y - this.h; this.vy = 0; this.onGround = true; this.ridePlat = e; r.landed = r.landed || prevVy > 0;
          }
        } else if (e.solid) this.resolveSolid(e, r);
      });

      if (r.ceil.length) g.hitBlocksFromBelow(r.ceil, this);

      if (r.landed || (this.onGround && this.pound > 0)) {
        if (prevVy > 300) this.squash = Math.min(1, prevVy / 900);
        if (this.pound > 0) { this.pound = 0; g.groundPound(this); }
        // Bloque Nota: rebota (más alto si mantienes el salto)
        else if (this.groundTile === C.T.NOTE && g.landOn(this, r.groundX, r.groundY, false, inp.jump)) { this.bounceChain = false; return; }
        if (this.doubleJumped && this.special === 'vacio') { g.starWave(this); }
        this.doubleJumped = false;
        if (prevVy > 120) g.emit('land', { x: this.x + this.w / 2, y: this.y + this.h, v: prevVy });
        // Tiles especiales y suelo gelatinoso
        if (this.groundTile === C.T.BOUNCE) { this.vy = inp.jump ? -880 : -700; this.onGround = false; this.jumpHeld = inp.jump; g.emit('bounce', { x: this.x + this.w / 2, y: this.y + this.h }); }
        else if (fx.bouncy && this.bounceChain && !this.swimming && prevVy > 230 && this.groundTile !== C.T.LIQUID) {
          // Rebote en cadena: cada bote pierde algo de fuerza; mantener salto al caer lo recarga
          this.vy = inp.jump ? -Math.max(560 * st.jump, prevVy * 0.8) : -prevVy * 0.78;
          this.onGround = false; this.jumpHeld = inp.jump; this.ridePlat = null;
          g.emit('bounce', { x: this.x + this.w / 2, y: this.y + this.h, soft: true });
        } else this.bounceChain = false;
        if (r.landed && this.pound > 0) this.bounceChain = false;
      }
      if (inp.downPressed) this.bounceChain = false;

      // Bordes del nivel
      if (this.x < 0) { this.x = 0; this.vx = Math.max(0, this.vx); }
      const maxX = g.level.width * T - this.w;
      if (this.x > maxX) { this.x = maxX; this.vx = Math.min(0, this.vx); }
      if (this.y < -T * 3) { this.y = -T * 3; this.vy = Math.max(0, this.vy); }

      // Disparos: Glob Caca siempre; EVO3 solo si el Glob tiene la habilidad de disparar (gris/negro)
      const canShootEvo = this.evo === 2 && !this.special && this.ch.ability === 'shoot';
      if (inp.shootPressed && this.shootCd <= 0 && (canShootEvo || this.special === 'caca')) g.playerShoot(this);
    }

    resolveSolid(e, r) {
      if (!U.overlap(this, e)) return;
      const ox = Math.min(this.x + this.w - e.x, e.x + e.w - this.x);
      const oy = Math.min(this.y + this.h - e.y, e.y + e.h - this.y);
      if (oy < ox) {
        if (this.y + this.h / 2 < e.y + e.h / 2) { this.y = e.y - this.h; if (this.vy > 0) { r.landed = true; } this.vy = 0; this.onGround = true; }
        else { this.y = e.y + e.h; if (this.vy < 0) this.vy = 0; }
      } else {
        if (this.x + this.w / 2 < e.x + e.w / 2) this.x = e.x - this.w; else this.x = e.x + e.w;
        this.vx = 0;
      }
    }
  }

  S.Model.Player = Player;
  S.Model.Player.SIZES = SIZES;
})(window.SGM);
