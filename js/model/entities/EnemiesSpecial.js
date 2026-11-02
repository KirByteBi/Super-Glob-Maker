/* Modelo: Pyces acuáticos (familia Pysh), raros (Mimic), jefes y proyectiles enemigos */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const Physics = S.Model.Physics;
  const Ents = S.Model.Entities;
  const Enemy = S.Model.Enemy;
  const near = Enemy.near, dirTo = Enemy.dirTo;
  const reg = Ents.register;

  // ---------------------------------------------------------------- acuáticos
  // Funcionan en cualquier líquido. En lava/veneno se vuelven ígneos/venenosos (no se pisan).
  class Aquatic extends Enemy {
    constructor(type, tx, ty) { super(type, tx, ty); this.gravity = 0; this.element = null; this.inLiq = null; this.hopT = 1; }
    sense(g) {
      this.inLiq = g.liquidAt(this.cx(), this.cy());
      if ((this.inLiq === 'lava' || this.inLiq === 'poison') && this.element !== this.inLiq) {
        this.element = this.inLiq; this.stompable = false; this.poundable = false;
        g.emit('pyshElement', { x: this.cx(), y: this.cy(), element: this.element });
      }
    }
    // Sin agua ni líquido: solo brincos pequeños
    flop(g, dt) {
      this.gravity = 1500; this.maxFall = 600;
      if (this.onGround) { this.vx = 0; this.hopT -= dt; if (this.hopT <= 0) { this.hopT = U.rand(0.5, 1); this.vy = -220; this.vx = this.dir * 40; if (Math.random() < 0.3) this.dir *= -1; } }
    }
    inLiquid() { return false; } // no se ahogan en los líquidos
    onWall(w) { this.dir = -w; }
  }
  class Pysh extends Aquatic {
    constructor(tx, ty, type) { super(type || 'pysh', tx, ty); this.jumpT = U.rand(1.5, 3); this.leap = false; this.power = 1; }
    think(g, dt) {
      this.sense(g);
      if (!this.inLiq && !this.leap) { this.flop(g, dt); return; }
      if (this.inLiq) {
        if (this.leap && this.vy > 0) this.leap = false;
        this.gravity = 0;
        this.vx = this.dir * 50 * this.power * g.enemySpeedMul;
        this.vy = U.approach(this.vy, Math.sin(this.t * 2 + this.spawnX) * 25, 600 * dt);
        this.jumpT -= dt * g.enemySpeedMul;
        const surface = g.liquidAt(this.cx(), this.y - T * 0.6) == null;
        // cuando le toca saltar, sube nadando hasta la superficie
        if (this.jumpT <= 0 && !surface) this.vy = -80 * this.power;
        if (this.jumpT <= 0 && surface) {
          this.dir = dirTo(this, g.player); this.leap = true; this.jumpT = U.rand(2, 3.5) / this.power;
          this.vy = -(520 + 220 * (this.power - 1)); this.vx = this.dir * (90 + 80 * (this.power - 1));
          g.emit('pyshLeap', { x: this.cx(), y: this.y, element: this.element });
        }
      } else { this.gravity = 1000; this.maxFall = 500; }
    }
  }
  class ClownPysh extends Pysh { constructor(tx, ty) { super(tx, ty, 'clownpysh'); this.power = 1.45; } }
  class Axolotl extends Aquatic {
    constructor(tx, ty) { super('axolotl', tx, ty); this.fireT = 2; }
    think(g, dt) {
      this.sense(g);
      const p = g.player;
      this.fireT -= dt * g.enemySpeedMul;
      if (this.inLiq) {
        this.gravity = 0; this.vx = this.dir * 30 * g.enemySpeedMul; this.vy = Math.sin(this.t * 1.8) * 18;
        if (this.fireT <= 0) { this.fireT = 2.4; if (near(this, p, 10 * T)) { this.dir = dirTo(this, p); this.shoot(g, 'bubble', this.dir * 90, 0, { homing: 1, life: 4 }); } }
      } else {
        this.gravity = 1600; this.maxFall = 600; this.walk(g, 18);
        if (this.fireT <= 0) { this.fireT = 4.5; if (near(this, p, 7 * T)) { this.dir = dirTo(this, p); this.shoot(g, 'bubble', this.dir * 60, 0, { life: 2 }); } }
      }
    }
  }
  class Shark extends Aquatic {
    constructor(tx, ty) { super('shark', tx, ty); this.stompable = false; this.poundable = false; this.charge = 0; }
    think(g, dt) {
      this.sense(g);
      const p = g.player;
      const inLine = Math.abs(p.y + p.h / 2 - this.cy()) < T && Math.sign(p.x - this.x) === this.dir;
      if (this.inLiq) {
        this.gravity = 0; this.vy = Math.sin(this.t * 1.5) * 15;
        if (this.charge > 0) { this.charge -= dt; this.vx = this.dir * 280 * g.enemySpeedMul; return; }
        if (inLine && near(this, p, 8 * T)) { this.charge = 1.2; g.emit('sharkCharge', { x: this.cx(), y: this.cy() }); }
        this.vx = this.dir * 45 * g.enemySpeedMul;
      } else {
        this.gravity = 1600; this.maxFall = 600;
        if (this.charge > 0) { this.charge -= dt; this.vx = this.dir * 150; return; }
        if (inLine && near(this, p, 3 * T) && this.onGround) this.charge = 0.5;
        this.walk(g, 15);
      }
    }
    onWall(w) { this.dir = -w; this.charge = 0; }
  }

  // ---------------------------------------------------------------- raros: 10 pisotones, dan vida
  class Mimic extends Enemy {
    constructor(tx, ty, type) { super(type || 'mimic', tx, ty); this.awake = false; this.bite = 0; this.speedMul = 1; }
    think(g, dt) {
      const p = g.player;
      if (!this.awake) { this.vx = 0; this.harmful = false; if (near(this, p, 3.5 * T)) { this.awake = true; this.harmful = true; g.emit('mimicWake', { x: this.cx(), y: this.y }); } return; }
      this.bite += dt;
      if (this.onGround && this.bite > 0.6 / this.speedMul) { this.bite = 0; this.dir = dirTo(this, p); this.vy = -330; this.vx = this.dir * 120 * this.speedMul * g.enemySpeedMul; g.emit('mimicBite', { x: this.cx(), y: this.y }); }
      else if (this.onGround && this.bite > 0.1) this.vx = 0;
    }
    onStomp(g) { this.awake = true; this.harmful = true; super.onStomp(g); }
    onWall(w) { this.dir = -w; this.vx = -this.vx; }
  }
  class Dirty extends Mimic { constructor(tx, ty) { super(tx, ty, 'dirty'); this.speedMul = 1.6; } }
  class NOmic extends Mimic {
    constructor(tx, ty) { super(tx, ty, 'nomic'); this.eyeT = 1.5; }
    think(g, dt) {
      super.think(g, dt);
      if (!this.awake) return;
      this.eyeT -= dt;
      if (this.eyeT <= 0) { this.eyeT = 1.8; this.shoot(g, 'eye', dirTo(this, g.player) * 160, -120, { gravity: 300 }); }
    }
  }
  class GoldMimic extends Mimic {
    constructor(tx, ty) { super(tx, ty, 'goldmimic'); this.coinT = 0.8; }
    think(g, dt) {
      if (!this.awake) { super.think(g, dt); return; }
      this.vx = this.dir * 70 * g.enemySpeedMul;
      if (this.onGround) { this.vy = -560; this.dir = dirTo(this, g.player); }
      this.coinT -= dt;
      if (this.coinT <= 0) { this.coinT = 0.8; const c = Ents.create('gcoin', 0, 0); c.x = this.cx() - c.w / 2; c.y = this.y; c.vy = -200; c.vx = U.rand(-60, 60); c.active = true; g.spawn(c); }
    }
  }

  // ---------------------------------------------------------------- jefes
  // NOeye Pyce (como Boom Boom): corre, gira y salta. Golpeado se esconde y acelera.
  class NOeye extends Enemy {
    constructor(tx, ty) { super('noeye', tx, ty); this.hp = this.maxHp = 3; this.state = 'run'; this.st = 2.5; this.spin = 0; }
    think(g, dt) {
      const p = g.player;
      this.st -= dt * g.enemySpeedMul;
      const rage = 1 + (this.maxHp - this.hp) * 0.35;
      if (this.state === 'run') { this.dir = dirTo(this, p); this.walk(g, 95 * rage); if (this.st <= 0) { this.state = 'spin'; this.st = 1.4; } }
      else if (this.state === 'spin') { this.vx = this.dir * 160 * rage; this.spin += dt * 20; if (this.onGround && Math.random() < dt * 2) this.vy = -520; if (this.st <= 0) { this.state = 'dizzy'; this.st = 1.1; } }
      else if (this.state === 'dizzy') { this.vx = 0; if (this.st <= 0) { this.state = 'run'; this.st = 2.5; } }
      else if (this.state === 'hide') { this.vx = this.dir * 210; this.stompable = false; if (this.st <= 0) { this.state = 'run'; this.st = 2; this.stompable = true; } }
    }
    onHurt(g) { this.state = 'hide'; this.st = 1.6; this.dir = -dirTo(this, g.player); }
  }

  // Jefes fantasma: NOsense (base, 4 golpes) y NOIRrupt (versión fuerte, 6 golpes)
  class GhostBoss extends Enemy {
    constructor(type, tx, ty, strong) {
      super(type, tx, ty);
      this.gravity = 0; this.tiles = false; this.shootable = false; this.poundable = false; this.stompable = false;
      this.strong = !!strong; this.hp = this.maxHp = strong ? 5 : 4;
      this.state = 'drift'; this.st = 2.5; this.shy = false; this.fade = 1; this.dashX = 1; this.dashY = 0;
    }
    think(g, dt) {
      const p = g.player, sp = (this.strong ? 1.35 : 1) * g.enemySpeedMul;
      this.st -= dt * sp;
      const looking = (p.face > 0) === (this.cx() > p.x + p.w / 2);
      const dx = p.x + p.w / 2 - this.cx(), dy = p.y + p.h / 2 - this.cy(), d = Math.hypot(dx, dy) || 1;
      this.dir = Math.sign(dx) || 1;
      if (this.state === 'drift') {
        // se esconde si lo miras; si le das la espalda te persigue
        this.shy = looking;
        const k = looking ? 0.15 : 1;
        this.vx = U.approach(this.vx, dx / d * 70 * sp * k, 160 * dt); this.vy = U.approach(this.vy, dy / d * 70 * sp * k, 160 * dt);
        if (this.st <= 0) {
          this.shy = false;
          const r = Math.random();
          if (this.strong && r < 0.33) { this.state = 'teleport'; this.st = 0.5; }
          else if (r < 0.66) { this.state = 'dash'; this.st = 1.1; this.newDash(); g.emit('ghostDash', { x: this.cx(), y: this.cy() }); }
          else { this.state = 'shoot'; this.st = 0.8; }
        }
      } else if (this.state === 'dash') {
        // embestidas sin sentido: cambia de dirección al azar
        if (Math.random() < dt * 3) this.newDash();
        this.vx = this.dashX * 230 * sp; this.vy = this.dashY * 230 * sp;
        this.keepInView(g);
        if (this.st <= 0) this.toDizzy();
      } else if (this.state === 'shoot') {
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.st <= 0) {
          const n = this.strong ? 5 : 1;
          for (let i = 0; i < n; i++) { const a = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.28; this.shoot(g, 'eye', Math.cos(a) * 190, Math.sin(a) * 190, { tiles: false }); }
          if (this.strong && g.entities.filter((e) => e.type === 'ghost' && !e.remove).length < 3) {
            const gh = Ents.create('ghost', 0, 0); gh.x = this.cx() - this.dir * 60; gh.y = this.cy(); gh.active = true; g.spawn(gh);
            g.emit('summon', { x: gh.cx(), y: gh.cy() });
          }
          this.toDizzy();
        }
      } else if (this.state === 'teleport') {
        this.vx = 0; this.vy = 0; this.fade = Math.max(0, this.st / 0.5);
        if (this.st <= 0) {
          g.emit('glitchTp', { x: this.cx(), y: this.cy() });
          this.x = p.x + p.w / 2 - this.w / 2 + (Math.random() < 0.5 ? -1 : 1) * 3.5 * T; this.y = p.y - 1.5 * T; this.fade = 1;
          g.emit('glitchTp', { x: this.cx(), y: this.cy() });
          this.state = 'shoot'; this.st = 0.6;
        }
      } else if (this.state === 'dizzy') {
        // mareado: momento de pisarlo
        this.vx *= 0.9; this.vy = Math.sin(this.t * 4) * 15; this.stompable = true; this.harmful = false;
        if (this.st <= 0) this.recover();
      }
    }
    newDash() { const a = Math.random() * Math.PI * 2; this.dashX = Math.cos(a); this.dashY = Math.sin(a) * 0.6; }
    toDizzy() { this.state = 'dizzy'; this.st = this.strong ? 1.4 : 2; }
    recover() { this.state = 'drift'; this.st = U.rand(2, 3.2) / (this.strong ? 1.3 : 1); this.stompable = false; this.harmful = true; }
    keepInView(g) {
      const c = g.camera;
      if (this.x < c.x + 10) this.dashX = Math.abs(this.dashX);
      if (this.x + this.w > c.x + c.w - 10) this.dashX = -Math.abs(this.dashX);
      if (this.y < c.y + 40) this.dashY = Math.abs(this.dashY);
      if (this.y + this.h > c.y + c.h - 20) this.dashY = -Math.abs(this.dashY);
    }
    onStomp(g) { if (this.state === 'dizzy') this.damage(g, 1, 'stomp'); }
    onHurt() { this.recover(); this.st = 1.5; this.vy = -200; }
    // Los jefes fantasma solo reciben disparos cuando están mareados (si no, los desvían)
    hitByShot(g) {
      if (this.state === 'dizzy') return this.damage(g, 1, 'shot');
      g.emit('deflect', { x: this.cx(), y: this.cy() }); return false;
    }
  }
  class NOsense extends GhostBoss { constructor(tx, ty) { super('nosense', tx, ty, false); } }
  class NOIRrupt extends GhostBoss { constructor(tx, ty) { super('noir', tx, ty, true); } }

  // MoonStar Pyce (como Bowser): salta, escupe estrellas en abanico y hace temblar el suelo. 5 golpes.
  class MoonStar extends Enemy {
    constructor(tx, ty) { super('moonstar', tx, ty); this.hp = this.maxHp = 6; this.state = 'idle'; this.st = 1.5; this.jumped = false; }
    think(g, dt) {
      const p = g.player; this.dir = dirTo(this, p);
      this.st -= dt * g.enemySpeedMul;
      const fury = this.hp <= 2 ? 1.5 : 1;
      const landed = () => this.jumped && this.onGround && this.vy >= 0 && this.st < -0.2;
      if (this.state === 'idle') {
        this.walk(g, 30 * fury);
        if (this.st <= 0) { const r = Math.random(); this.state = r < 0.4 ? 'jump' : r < 0.8 ? 'breath' : 'stomp'; this.st = 0.6; }
      } else if (this.state === 'jump') {
        if (this.st <= 0 && this.onGround && !this.jumped) { this.vy = -720; this.vx = this.dir * 170; this.jumped = true; g.emit('bossJump', {}); }
        if (landed()) { this.jumped = false; this.state = 'idle'; this.st = 1.4 / fury; this.vx = 0; g.emit('bossLand', { x: this.cx(), y: this.y + this.h }); }
      } else if (this.state === 'breath') {
        this.vx = 0;
        if (this.st <= 0) {
          const n = this.hp <= 2 ? 5 : 3;
          for (let k = 0; k < n; k++) {
            const b = Ents.create('starbullet', 0, 0); b.x = this.cx() - b.w / 2; b.y = this.y + 14; b.dir = this.dir;
            b.vx = this.dir * 170 * g.enemySpeedMul; b.vy = (k - (n - 1) / 2) * 45; b.active = true; g.spawn(b);
          }
          g.emit('cannon', { x: this.cx(), y: this.cy() }); this.state = 'idle'; this.st = 1.6 / fury;
        }
      } else if (this.state === 'stomp') {
        this.vx = 0;
        if (this.st <= 0 && this.onGround && !this.jumped) { this.vy = -400; this.jumped = true; }
        if (landed()) {
          this.jumped = false; this.state = 'idle'; this.st = 1.2;
          g.emit('bossLand', { x: this.cx(), y: this.y + this.h });
          if (g.player.onGround) g.stunPlayer(0.8);
          [-1, 1].forEach((d) => { const s = this.shoot(g, 'shock', d * 220, 0, { life: 2 }); s.y = this.y + this.h - s.h; });
        }
      }
    }
    onWall(w) { this.vx = -w * Math.abs(this.vx) * 0.5; }
    onHurt() { this.state = 'jump'; this.st = 0.1; this.jumped = false; }
  }

  // ---------------------------------------------------------------- proyectiles enemigos
  // kind: bullet, bone, gift, petal, bubble, eye, tear, slash, shock, gust (empuja), fire
  class EShot extends Enemy {
    constructor() {
      super('eshot', 0, 0);
      this.kind = 'bullet'; this.gravity = 0; this.stompable = false; this.shootable = false; this.poundable = false;
      this.life = 5; this.bounce = 0;
    }
    think(g, dt) {
      this.life -= dt; if (this.life <= 0) { this.remove = true; return; }
      if (this.kind === 'slash' && this.owner) { this.x = this.owner.dir > 0 ? this.owner.x + this.owner.w - 4 : this.owner.x - this.w + 4; this.y = this.owner.y; if (this.owner.dying || this.owner.remove) this.remove = true; }
      if (this.homing) { const p = g.player; this.vy = U.approach(this.vy, Math.sign(p.y + p.h / 2 - this.cy()) * 50, 40 * dt); }
      // Ráfaga de aire del Flower Pyce: no daña, pero empuja al jugador que la toca
      if (this.kind === 'gust') { this.harmful = false; this.tiles = false; const p = g.player; if (U.overlap(this, p)) { p.vx += (this.push || Math.sign(this.vx) || 1) * 420 * dt; } }
    }
    physics(g, dt) {
      if (this.kind === 'slash') return;
      if (this.gravity) this.vy = Math.min(this.vy + this.gravity * dt, 600);
      if (this.tiles === false) { this.x += this.vx * dt; this.y += this.vy * dt; return; }
      const r = Physics.move(this, g.level, dt, { noSlopes: this.kind !== 'shock' });
      if (this.kind === 'shock') { if (r.wall) this.remove = true; return; }
      if (r.landed) {
        if (this.bounce > 0) { this.bounce--; this.vy = -280; }
        else { this.remove = true; g.emit('shotHit', { x: this.cx(), y: this.cy(), color: '#ffffff' }); }
      }
      if (r.wall || r.ceil.length) { this.remove = true; g.emit('shotHit', { x: this.cx(), y: this.cy(), color: '#ffffff' }); }
    }
    inLiquid() { return false; }
  }

  [['pysh', Pysh], ['clownpysh', ClownPysh], ['axolotl', Axolotl], ['shark', Shark],
    ['mimic', Mimic], ['dirty', Dirty], ['nomic', NOmic], ['goldmimic', GoldMimic],
    ['noeye', NOeye], ['nosense', NOsense], ['noir', NOIRrupt], ['moonstar', MoonStar], ['eshot', EShot]
  ].forEach(([k, K]) => reg(k, K));
})(window.SGM);
