/* Modelo: enemigos Pyce de tierra. Cuanto más básico es el dibujo, más sencillo es el enemigo. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const C = S.Model.Catalog;
  const Entity = S.Model.Entity;
  const Physics = S.Model.Physics;
  const Ents = S.Model.Entities;
  const reg = Ents.register;

  const near = (e, p, dist) => Math.abs(p.x + p.w / 2 - e.cx()) < dist && Math.abs(p.y + p.h / 2 - e.cy()) < dist * 0.7;
  const dirTo = (e, p) => (p.x + p.w / 2 < e.cx() ? -1 : 1);

  // ---------------------------------------------------------------- base
  class Enemy extends Entity {
    constructor(type, tx, ty) {
      super(type, tx, ty);
      const d = C.OBJECTS[type] || {};
      this.enemy = true; this.stompable = true; this.harmful = true; this.shootable = true; this.poundable = true;
      this.rare = !!d.rare; this.boss = !!d.boss;
      this.hp = d.hp || (this.rare ? 10 : 1); this.maxHp = this.hp;
      this.hurtT = 0; this.speed = 40; this.turnAtLedge = false; this.swims = false;
    }
    update(g, dt) { this.hurtT = Math.max(0, this.hurtT - dt); super.update(g, dt); }
    // Abismo Corrupto: algunos enemigos de tierra nadan en vez de caminar
    swim() { this.gravity = 0; this.vy = Math.cos(this.t * 2.2 + this.spawnX) * 40; }
    walk(g, sp) {
      sp = (sp != null ? sp : this.speed) * g.enemySpeedMul;
      if (this.swims) this.swim(g);
      this.vx = this.dir * sp;
      if (this.turnAtLedge && this.onGround && !this.swims) {
        const fx = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        if (!Physics.solidAt(g.level, fx, this.y + this.h + 4, true)) { this.dir *= -1; this.vx = this.dir * sp; }
      }
    }
    // how: 'stomp' | 'shot' | 'shell' | ... Devuelve true si le ha afectado
    damage(g, amt, how) {
      if (this.hurtT > 0 || this.dying > 0) return false;
      this.hp -= amt;
      if (this.hp <= 0.001) {
        if (how === 'stomp') { this.squashed = true; this.dying = 0.45; this.vx = 0; g.emit('stomp', { x: this.cx(), y: this.cy() }); this.died(g); }
        else this.kill(g);
      } else {
        this.hurtT = this.rare ? 0.12 : 0.35; this.onHurt(g, how);
        g.emit('enemyHurt', { x: this.cx(), y: this.cy(), hp: this.hp, max: this.maxHp, boss: this.boss });
      }
      return true;
    }
    onHurt() {}
    onStomp(g) { this.damage(g, 1, 'stomp'); }
    hitByShot(g) {
      if (!this.shootable) { g.emit('deflect', { x: this.cx(), y: this.cy() }); return false; }
      // Los jefes se pueden matar a disparos: 1 golpe por disparo (con breve invulnerabilidad)
      return this.damage(g, 1, 'shot');
    }
    onDeath(g) {
      if (this.rare) { const n = this.type === 'goldmimic' ? 3 : 1; for (let i = 0; i < n; i++) g.oneUp(this.cx(), this.y - i * 18); }
      if (this.boss) { g.addScore(5000, this); g.emit('bossDown', { x: this.cx(), y: this.cy(), type: this.type }); }
    }
    shoot(g, kind, vx, vy, o) {
      const b = Ents.create('eshot', 0, 0); b.kind = kind;
      Object.assign(b, o || {});
      b.x = this.cx() - b.w / 2 + Math.sign(vx || this.dir) * this.w * 0.4; b.y = this.y + this.h * 0.35;
      b.vx = vx; b.vy = vy || 0; b.active = true; b.dir = Math.sign(vx) || this.dir;
      g.spawn(b); g.emit('enemyShoot', { x: b.x, y: b.y, kind });
      return b;
    }
  }
  Enemy.near = near; Enemy.dirTo = dirTo;

  // ---------------------------------------------------------------- nivel 1
  class Stupid extends Enemy { constructor(tx, ty) { super('stupid', tx, ty); } think(g) { this.walk(g, 40); } }
  class SO extends Enemy { constructor(tx, ty) { super('so', tx, ty); this.turnAtLedge = true; this.alpha = 0.5; } think(g) { this.walk(g, 36); } }
  class Symbol extends Enemy {
    constructor(tx, ty) { super('symbol', tx, ty); this.hopT = 0.6; }
    think(g, dt) {
      if (this.swims) { this.walk(g, 34); return; }
      this.vx = this.onGround ? 0 : this.dir * 60 * g.enemySpeedMul;
      if (this.onGround) { this.hopT -= dt * g.enemySpeedMul; if (this.hopT <= 0) { this.vy = -300; this.hopT = 0.7; g.emit('enemyHop', { x: this.cx(), y: this.y }); } }
    }
  }

  // ---------------------------------------------------------------- nivel 2
  class Pyce2 extends Enemy {
    constructor(tx, ty) { super('pyce2', tx, ty); this.hp = this.maxHp = 2; this.angry = false; }
    think(g) { this.walk(g, this.angry ? 95 : 38); }
    onHurt(g) { this.angry = true; this.dir = dirTo(this, g.player); g.emit('enemyAngry', { x: this.cx(), y: this.y }); }
  }
  class Guest extends Enemy {
    constructor(tx, ty) { super('guest', tx, ty); this.cool = 1; this.swing = 0; }
    think(g, dt) {
      const p = g.player;
      this.cool -= dt * g.enemySpeedMul;
      if (this.swing > 0) {
        this.swing -= dt; this.vx = 0;
        if (this.swing <= 0.18 && !this.slashed) {
          this.slashed = true;
          const s = Ents.create('eshot', 0, 0); s.kind = 'slash'; s.w = 34; s.h = 30; s.life = 0.2; s.owner = this;
          s.x = this.dir > 0 ? this.x + this.w - 4 : this.x - s.w + 4; s.y = this.y; s.active = true; g.spawn(s);
          g.emit('slash', { x: s.cx(), y: s.cy() });
        }
        return;
      }
      if (this.cool <= 0 && near(this, p, 2.6 * T)) { this.dir = dirTo(this, p); this.swing = 0.5; this.slashed = false; this.cool = 1.4; return; }
      this.walk(g, 34);
    }
  }
  class Noob extends Enemy {
    constructor(tx, ty) { super('noob', tx, ty); this.turnAtLedge = true; this.fireT = 2; this.aim = 0; }
    think(g, dt) {
      const p = g.player;
      this.fireT -= dt * g.enemySpeedMul;
      if (this.fireT < 0.5) {
        this.vx = 0; this.dir = dirTo(this, p); this.aim = 1;
        if (this.swims) this.swim(g);
        if (this.fireT <= 0) { this.fireT = 2.6; this.aim = 0; if (Math.abs(p.x - this.x) < 15 * T) this.shoot(g, 'bullet', this.dir * 200); }
        return;
      }
      this.walk(g, 30);
    }
  }
  class Elf extends Enemy {
    constructor(tx, ty) { super('elf', tx, ty); this.hopT = 0.4; }
    think(g, dt) {
      if (this.swims) { this.walk(g, 40); return; }
      if (this.onGround) {
        this.vx = 0; this.hopT -= dt * g.enemySpeedMul;
        if (this.hopT <= 0) { this.dir = dirTo(this, g.player); this.vy = -420; this.vx = this.dir * 110 * g.enemySpeedMul; this.hopT = 0.35; g.emit('enemyHop', { x: this.cx(), y: this.y }); }
      }
    }
    onWall(w) { this.dir = -w; this.vx = -this.vx; }
  }
  class Umbrella extends Enemy {
    constructor(tx, ty) { super('umbrella', tx, ty); this.open = true; this.maxFall = 60; }
    think(g) {
      if (this.open && !this.onGround) { this.maxFall = 60; this.vx = U.approach(this.vx, dirTo(this, g.player) * 45, 4) + Math.sin(this.t * 2) * 20; return; }
      this.maxFall = 600; this.walk(g, 34);
    }
    onStomp(g) {
      if (this.open) { this.open = false; this.vy = 0; g.emit('stomp', { x: this.cx(), y: this.y }); g.emit('umbrellaPop', { x: this.cx(), y: this.y }); return; }
      super.onStomp(g);
    }
  }
  class Zom extends Enemy {
    constructor(tx, ty) { super('zom', tx, ty); this.revived = false; this.downT = 0; }
    think(g, dt) {
      if (this.downT > 0) { this.vx = 0; this.downT -= dt; if (this.downT <= 0) { this.harmful = true; g.emit('zomRise', { x: this.cx(), y: this.y }); } return; }
      this.walk(g, this.revived ? 34 : 22);
    }
    onStomp(g) {
      if (this.downT > 0) return;
      if (!this.revived) { this.revived = true; this.downT = 2.2; this.harmful = false; g.emit('stomp', { x: this.cx(), y: this.cy() }); return; }
      super.onStomp(g);
    }
  }

  // ---------------------------------------------------------------- nivel 3
  class Crystal extends Enemy { constructor(tx, ty) { super('crystal', tx, ty); this.turnAtLedge = true; this.stompable = false; this.poundable = false; } think(g) { this.walk(g, 34); } }
  // Knight: armadura inmune a los proyectiles; embiste si estás cerca
  class Knight extends Enemy {
    constructor(tx, ty) { super('knight', tx, ty); this.shootable = false; this.charge = 0; }
    think(g, dt) {
      const p = g.player;
      if (this.charge > 0) { this.charge -= dt; this.walk(g, 120); return; }
      if (near(this, p, 4 * T) && Math.abs(p.y - this.y) < T && Math.random() < dt * 0.8) { this.dir = dirTo(this, p); this.charge = 0.6; }
      this.walk(g, 30);
    }
  }
  // Rebel: su spray crea nubes de niebla
  class Rebel extends Enemy {
    constructor(tx, ty) { super('rebel', tx, ty); this.sprayT = 2.5; this.spraying = 0; }
    think(g, dt) {
      const p = g.player;
      this.sprayT -= dt * g.enemySpeedMul;
      if (this.spraying > 0) { this.spraying -= dt; this.vx = 0; return; }
      if (this.sprayT <= 0 && near(this, p, 7 * T)) {
        this.sprayT = 5; this.spraying = 0.6; this.dir = dirTo(this, p);
        const f = Ents.create('sprayfog', 0, 0); f.x = this.cx() + this.dir * 70 - f.w / 2; f.y = this.cy() - f.h / 2; f.active = true; g.spawn(f);
        g.emit('spray', { x: this.cx() + this.dir * 20, y: this.cy() });
        return;
      }
      this.walk(g, 32);
    }
  }
  // Hermanos (tipo Hammer Bro / Boomerang Bro): van y vienen en un tramo corto alrededor
  // de donde los pones, siempre mirándote, y de vez en cuando dan un salto en el sitio.
  class Bro extends Enemy {
    constructor(type, tx, ty) { super(type, tx, ty); this.paceDir = 1; this.jumpT = U.rand(2.5, 4); this.throwT = U.rand(0.8, 1.6); this.keepFace = true; }
    pace(g, dt) {
      const p = g.player;
      if (near(this, p, 14 * T)) this.dir = dirTo(this, p);
      if (this.swims) this.swim(g);
      // tramo de ±1.5 casillas; se da la vuelta en los bordes del tramo y en las paredes
      if (this.x > this.spawnX + T * 1.5) this.paceDir = -1;
      else if (this.x < this.spawnX - T * 1.5) this.paceDir = 1;
      this.vx = this.paceDir * 45 * g.enemySpeedMul;
      this.jumpT -= dt * g.enemySpeedMul;
      if (this.onGround && this.jumpT <= 0 && !this.swims) { this.jumpT = U.rand(3, 5); this.vy = -620; g.emit('enemyHop', { x: this.cx(), y: this.y }); }
    }
    onWall(w) { this.paceDir = -w; }
  }
  // Builder Pyce (guiño a Builderman): lanza martillos en arco, en ráfagas de 2-3.
  // Los martillos atraviesan las paredes, como los de los Hammer Bros.
  class Builder extends Bro {
    constructor(tx, ty) { super('builder', tx, ty); this.burst = 0; }
    think(g, dt) {
      this.pace(g, dt);
      this.throwT -= dt * g.enemySpeedMul;
      if (this.throwT > 0 || !near(this, g.player, 11 * T)) return;
      if (this.burst <= 0) this.burst = Math.random() < 0.5 ? 2 : 3;
      this.burst--;
      this.throwT = this.burst > 0 ? 0.35 : U.rand(1.4, 2.2);
      this.shoot(g, 'hammer', this.dir * U.rand(95, 175), -U.rand(430, 520), { gravity: 1000, tiles: false, w: 18, h: 18, life: 3 });
    }
  }
  // Miner Pyce (poseído por cristales): lanza su pico de cristal como un bumerán. Va lejos,
  // frena, vuelve por el mismo carril y lo recoge. Solo tiene un pico: no lanza otro hasta recogerlo.
  class Miner extends Bro {
    constructor(tx, ty) { super('miner', tx, ty); this.pick = null; }
    think(g, dt) {
      this.pace(g, dt);
      if (this.pick && (this.pick.remove || this.pick.dying)) this.pick = null;
      if (this.pick) return;
      this.throwT -= dt * g.enemySpeedMul;
      if (this.throwT > 0 || !near(this, g.player, 11 * T)) return;
      this.throwT = U.rand(1.2, 2);
      const b = this.shoot(g, 'pickaxe', this.dir * 330, 0, { tiles: false, w: 22, h: 22, life: 5, owner: this, boomer: this.dir, homeY: this.y + this.h * 0.35 });
      this.pick = b;
    }
    died(g) { if (this.pick) { this.pick.owner = null; } super.died(g); }
  }
  reg('builder', Builder); reg('miner', Miner);

  // SkeleBone: pisado se desmonta y se recompone; muerto de verdad se desmonta del todo
  class SkeleBone extends Enemy {
    constructor(tx, ty) { super('skelebone', tx, ty); this.turnAtLedge = true; this.pile = 0; this.throwT = 2.5; }
    think(g, dt) {
      if (this.pile > 0) {
        this.vx = 0; this.pile -= dt;
        if (this.pile <= 0) { this.harmful = true; this.stompable = true; this.shootable = true; g.emit('boneRise', { x: this.cx(), y: this.y }); }
        return;
      }
      this.throwT -= dt * g.enemySpeedMul;
      if (this.throwT <= 0) { this.throwT = 3; const p = g.player; if (near(this, p, 10 * T)) { this.dir = dirTo(this, p); this.shoot(g, 'bone', this.dir * 150, -380, { gravity: 900 }); } }
      this.walk(g, 30);
    }
    onStomp(g) {
      if (this.pile > 0) return;
      this.pile = 3.5; this.harmful = false; this.stompable = false; this.shootable = false;
      g.emit('bonesScatter', { x: this.cx(), y: this.cy(), soft: true });
      g.emit('stomp', { x: this.cx(), y: this.cy() });
    }
    onDeath(g) { super.onDeath(g); g.emit('bonesScatter', { x: this.cx(), y: this.cy() }); }
    kill(g, silent) { if (this.dying > 0) return; this.dying = 0.01; this.died(g); if (!silent) g.emit('kill', { x: this.cx(), y: this.cy(), type: this.type }); }
  }
  // SnowCapsule: al pisarlo se vuelve una cápsula que se patea (como un caparazón)
  class SnowCap extends Enemy {
    constructor(tx, ty) { super('snowcap', tx, ty); this.turnAtLedge = true; this.shell = false; this.kick = 0; this.wakeT = 0; this.baseH = this.h; }
    think(g, dt) {
      this.kickGrace = Math.max(0, (this.kickGrace || 0) - dt);
      if (!this.shell) { this.walk(g, 34); return; }
      if (this.kick) {
        this.vx = this.kick * 380;
        g.entities.forEach((o) => {
          if (o !== this && o.enemy && !o.dying && o.active && !o.remove && o.type !== 'eshot' && U.overlap(this, o)) {
            if (o.boss) { if (o.damage) o.damage(g, 1, 'shell'); } else { o.kill(g); g.addScore(200, o); }
          }
        });
      } else {
        this.vx = 0; this.wakeT -= dt;
        if (this.wakeT <= 0) { this.shell = false; this.y -= this.baseH - this.h; this.h = this.baseH; this.harmful = true; }
      }
    }
    onWall(w, g) {
      if (!this.kick) { this.dir = -w; return; }
      this.kick = -w; g.emit('bumpSoft', { x: this.cx(), y: this.cy() });
      g.hitBlock(Math.floor((w > 0 ? this.x + this.w + 2 : this.x - 2) / T), Math.floor(this.cy() / T), true, false);
    }
    toShell() { this.shell = true; this.kick = 0; this.y += this.h - 20; this.h = 20; this.wakeT = 6; this.harmful = false; }
    onStomp(g) {
      if (!this.shell) { this.toShell(); g.emit('stomp', { x: this.cx(), y: this.cy() }); g.addScore(100, this); return; }
      if (this.kick) { this.kick = 0; this.wakeT = 6; this.harmful = false; g.emit('stomp', { x: this.cx(), y: this.cy() }); }
      else this.kickFrom(g, g.player);
    }
    kickFrom(g, p) { this.kick = p.x + p.w / 2 < this.cx() ? 1 : -1; this.harmful = true; this.kickGrace = 0.25; g.emit('kick', { x: this.cx(), y: this.cy() }); }
    onTouch(g, p) {
      if (!this.shell) return false;
      if (!this.kick) { this.kickFrom(g, p); return true; }
      return this.kickGrace > 0;
    }
  }
  class Festive extends Enemy {
    constructor(tx, ty) { super('festive', tx, ty); this.turnAtLedge = true; this.throwT = 2; }
    think(g, dt) {
      this.throwT -= dt * g.enemySpeedMul;
      const p = g.player;
      if (this.throwT <= 0) { this.throwT = 2.8; if (near(this, p, 11 * T)) { this.dir = dirTo(this, p); this.shoot(g, 'gift', U.clamp((p.x - this.x) * 0.9, -220, 220), -460, { gravity: 1000, bounce: 1 }); } }
      this.walk(g, 30);
    }
  }
  // Bomb Pyce: como un Bob-omb. Camina; al pisarlo enciende la mecha y se puede patear.
  // Estilo Bob-omb: con el botón de correr se puede COGER y cargar encima del Glob, y
  // lanzarla al soltar. ¡Cuidado si explota mientras la llevas!
  class Bomb extends Enemy {
    constructor(tx, ty, type) { super(type || 'bomb', tx, ty); this.lit = 0; this.kickV = 0; this.carried = false; }
    think(g, dt) {
      if (this.carried) {
        // la coloca el jugador sobre su cabeza (ver GameModel.carryUpdate); solo corre la mecha
        if (this.lit > 0) { this.lit -= dt; if (this.lit <= 0) { this.remove = true; g.explode(this.cx(), this.cy(), 52, this); } }
        return;
      }
      if (this.lit > 0) {
        this.vx = this.kickV; this.kickV = U.approach(this.kickV, 0, 200 * dt);
        this.lit -= dt;
        if (this.lit <= 0) { this.remove = true; g.explode(this.cx(), this.cy(), 52, this); }
        return;
      }
      this.walk(g, 30);
    }
    light(g, t) { if (this.lit > 0) { this.lit = Math.min(this.lit, t); return; } this.lit = t; this.harmful = false; g.emit('fuse', { x: this.cx(), y: this.y }); }
    onStomp(g) { if (this.lit <= 0) { this.light(g, 2.4); g.emit('stomp', { x: this.cx(), y: this.cy() }); } else this.kickV = (g.player.x < this.x ? 1 : -1) * 240; }
    hitByShot(g) { this.light(g, 0.3); return true; }
    kill(g) { this.light(g, 0.25); }
    onTouch(g, p) {
      // coger la bomba con el botón de correr (si no la lleva ya nadie)
      if (!this.carried && !p.carrying && g.input && g.input.run) { g.pickUp(this); return true; }
      if (this.lit > 0) { this.kickV = (p.x + p.w / 2 < this.cx() ? 1 : -1) * 240; return true; }
      return false;
    }
  }
  // ToyBomb: juguete de cuerda que corre hacia ti y explota
  // ToyBomb: juguete de cuerda. Camina sin más, pero explota al instante si le saltan
  // encima o si toca fuego / lava (cualquier líquido ígneo).
  class ToyBomb extends Bomb {
    constructor(tx, ty) { super(tx, ty, 'toybomb'); }
    think(g, dt) {
      if (this.lit > 0) { super.think(g, dt); return; }
      // ¿pisa fuego o lava? -> explota ya
      const liq = g.liquidAt(this.cx(), this.y + this.h - 4);
      if (liq === 'lava') { this.light(g, 0.05); return; }
      this.walk(g, 55);
    }
    // Saltarle encima: explosión inmediata (no se puede patear como el Bomb normal)
    onStomp(g) { this.light(g, 0.05); g.emit('stomp', { x: this.cx(), y: this.cy() }); }
  }
  class Wingel extends Enemy {
    constructor(tx, ty) { super('wingel', tx, ty); this.wings = true; }
    think(g) {
      if (this.wings) { this.vx = this.dir * 55 * g.enemySpeedMul; if (this.onGround) { this.vy = -520; g.emit('flap', { x: this.cx(), y: this.y }); } return; }
      this.walk(g, 38);
    }
    onStomp(g) {
      if (this.wings) { this.wings = false; this.vy = 0; g.emit('stomp', { x: this.cx(), y: this.cy() }); g.emit('wingsLost', { x: this.cx(), y: this.y }); return; }
      super.onStomp(g);
    }
  }
  // Strechy: se estira hacia arriba cada cierto tiempo
  class Strechy extends Enemy {
    constructor(tx, ty) { super('strechy', tx, ty); this.turnAtLedge = true; this.base = this.h; this.stretch = 0; this.cycle = Math.random() * 3; }
    think(g, dt) {
      this.cycle += dt * g.enemySpeedMul;
      const ph = this.cycle % 3.2;
      const prev = this.h;
      this.stretch = U.approach(this.stretch, ph > 1.6 && ph < 2.8 ? 1 : 0, dt * 3);
      this.h = Math.round(this.base * (1 + this.stretch * 2));
      this.y -= this.h - prev;
      if (this.stretch > 0.05) this.vx = 0; else this.walk(g, 26);
    }
  }
  // Flower Pyce: planta-ventilador fija que lanza RÁFAGAS DE AIRE (empujan al jugador).
  // Si se coloca sobre una tubería, se comporta como planta piraña piromana: emerge del tubo,
  // escupe fuego y se esconde (no se puede pisar).
  class Flower extends Enemy {
    constructor(tx, ty) { super('flower', tx, ty); this.stompable = false; this.poundable = false; this.fireT = 1.5; this.open = 0; this.inPipe = false; this.rise = 1; this.hideT = 0; }
    init(o) { this.inPipe = !!(o && o.inPipe); if (this.inPipe) { this.rise = 0; this.harmful = false; } }
    think(g, dt) {
      this.vx = 0; this.open = Math.max(0, this.open - dt * 2);
      const p = g.player;
      // Variante piraña piromana (en tubo): sube, escupe fuego, se esconde. No sale si estás pegado.
      if (this.inPipe) {
        this.fireT -= dt * g.enemySpeedMul;
        if (this.fireT <= 0) {
          this.fireT = 3;
          const tooClose = Math.abs(p.x + p.w / 2 - this.cx()) < T * 1.5;
          this.wantUp = !tooClose;
        }
        const target = this.wantUp ? 1 : 0;
        this.rise = U.approach(this.rise, target, dt * 2.5);
        this.harmful = this.rise > 0.3;
        if (this.rise > 0.9 && !this.spat) { this.spat = true; const d = dirTo(this, p); this.shoot(g, 'fire', d * 150, -40, { gravity: 240, life: 2.5 }); g.emit('cannon', { x: this.cx(), y: this.y }); }
        if (this.rise < 0.5) this.spat = false;
        return;
      }
      // Ventilador normal: ráfaga de aire que empuja
      this.fireT -= dt * g.enemySpeedMul;
      if (this.fireT <= 0) {
        this.fireT = 2.4;
        if (near(this, p, 10 * T)) { this.open = 1; const d = dirTo(this, p); this.shoot(g, 'gust', d * 240, 0, { life: 0.8, w: 120, h: 40, push: d }); }
      }
    }
  }
  // Cannon Pycer: un Pyce dentro de un cañón. Dos fases:
  //  - Pisándolo muere el Pyce y el cañón queda INERTE (deja de disparar) pero sigue
  //    siendo sólido, se puede usar de escalón.
  //  - El cañón inerte se puede romper con un disparo, Brillo Estelar o bloque desde abajo.
  class Cannon extends Enemy {
    constructor(tx, ty) { super('cannon', tx, ty); this.gravity = 0; this.solid = true; this.fireT = 2; this.recoil = 0; this.manned = true; this.harmful = false; }
    think(g, dt) {
      this.vx = 0; this.vy = 0; this.recoil = Math.max(0, this.recoil - dt * 3);
      if (!this.manned) return; // cañón desarmado: inerte
      this.fireT -= dt * g.enemySpeedMul * (g.obstacleMul || 1);
      const p = g.player, dx = p.x + p.w / 2 - this.cx();
      if (this.fireT <= 0) {
        this.fireT = 3.2;
        if (Math.abs(dx) < 15 * T && Math.abs(dx) > 1.5 * T) {
          // apunta hacia el jugador; el sprite del cañón mira hacia donde dispara
          const aim = dx < 0 ? -1 : 1;
          this.dir = -aim; // el arte del cañón está invertido: su dir visual es el opuesto al disparo
          const b = Ents.create('starbullet', 0, 0);
          b.x = aim > 0 ? this.x + this.w - 4 : this.x - b.w + 4; b.y = this.y + 5; b.dir = aim; b.vx = aim * 165 * g.enemySpeedMul; b.active = true;
          g.spawn(b); this.recoil = 1; g.emit('cannon', { x: this.cx(), y: this.cy() });
        }
      }
    }
    // 1er pisotón: desarma el cañón (muere el Pyce). Ya desarmado no se vuelve a pisar.
    disarm(g) {
      if (!this.manned) return;
      this.manned = false; this.stompable = false;
      g.emit('stomp', { x: this.cx(), y: this.cy() });
      g.emit('kill', { x: this.cx(), y: this.cy(), type: this.type });
      g.addScore(200, this);
    }
    onStomp(g) { this.disarm(g); }
    // Como el cañón es sólido, el jugador se posa encima (no cuenta como stomp normal):
    // si cae sobre la tapa estando armado, lo desarma.
    onTouch(g, p) {
      if (this.manned && p.vy >= 0 && p.y + p.h - this.y < 16) { this.disarm(g); p.vy = -360; p.jumpHeld = true; }
      return false;
    }
    // Disparos / Brillo: solo rompen el cañón ya desarmado; con el Pyce dentro lo protege.
    hitByShot(g) {
      if (this.manned) { g.emit('deflect', { x: this.cx(), y: this.cy() }); return false; }
      this.kill(g); return true;
    }
    // Bloque desde abajo: rompe el cañón desarmado
    damage(g, amt, how) {
      if (!this.manned) { this.kill(g); return true; }
      return false;
    }
    physics() {}
  }
  class StarBullet extends Enemy {
    constructor() { super('starbullet', 0, 0); this.gravity = 0; this.tiles = false; }
    think(g) { if (Math.abs(this.x - g.player.x) > 30 * T || this.t > 14) this.remove = true; }
  }

  // ---------------------------------------------------------------- nivel 4 y 5
  // Ghost: avanza cuando le das la espalda, se para si lo miras. Solo lo mata el Brillo Estelar.
  class Ghost extends Enemy {
    constructor(tx, ty) { super('ghost', tx, ty); this.gravity = 0; this.tiles = false; this.stompable = false; this.shootable = false; this.poundable = false; this.shy = false; }
    think(g, dt) {
      const p = g.player;
      this.shy = (p.face > 0) === (this.cx() > p.x + p.w / 2);
      if (this.shy || !near(this, p, 14 * T)) { this.vx = U.approach(this.vx, 0, 120 * dt); this.vy = U.approach(this.vy, Math.sin(this.t * 2) * 10, 120 * dt); return; }
      const dx = p.x + p.w / 2 - this.cx(), dy = p.y + p.h / 2 - this.cy(), d = Math.hypot(dx, dy) || 1, sp = 55 * g.enemySpeedMul;
      this.vx = U.approach(this.vx, dx / d * sp, 140 * dt); this.vy = U.approach(this.vy, dy / d * sp, 140 * dt);
      this.dir = Math.sign(dx) || 1;
    }
  }
  class Holo extends Enemy {
    constructor(tx, ty) { super('holo', tx, ty); this.turnAtLedge = true; this.phase = Math.random() * 3.5; }
    think(g, dt) {
      this.phase += dt * g.enemySpeedMul;
      const solid = (this.phase % 3.5) < 2;
      this.intangible = !solid; this.harmful = solid; this.stompable = solid; this.shootable = solid;
      this.walk(g, 40);
    }
  }
  const MOODS = ['happy', 'angry', 'sad', 'scared'];
  class Motions extends Enemy {
    constructor(tx, ty) { super('motions', tx, ty); this.mood = 'happy'; this.moodT = 3; this.cry = 0.6; }
    think(g, dt) {
      this.moodT -= dt * g.enemySpeedMul;
      if (this.moodT <= 0) { this.moodT = 3; this.mood = MOODS[(MOODS.indexOf(this.mood) + 1) % 4]; g.emit('mood', { x: this.cx(), y: this.y, mood: this.mood }); }
      const p = g.player;
      if (this.mood === 'happy') { if (this.onGround && Math.random() < dt) this.vy = -280; this.walk(g, 40); }
      else if (this.mood === 'angry') { this.dir = dirTo(this, p); this.walk(g, 115); }
      else if (this.mood === 'sad') { this.vx = 0; this.cry -= dt; if (this.cry <= 0) { this.cry = 0.5; this.shoot(g, 'tear', U.rand(-50, 50), -150, { gravity: 900 }); } }
      else { this.dir = -dirTo(this, p); this.walk(g, 90); }
    }
  }
  // 1x1x1x1: hacker que atraviesa paredes
  class Hacker extends Enemy {
    constructor(tx, ty) { super('hacker', tx, ty); this.gravity = 0; this.tiles = false; }
    think(g, dt) {
      const p = g.player;
      if (!near(this, p, 16 * T)) { this.vx = 0; this.vy = Math.sin(this.t * 2) * 12; return; }
      this.dir = dirTo(this, p);
      this.vx = U.approach(this.vx, this.dir * 48 * g.enemySpeedMul, 80 * dt);
      this.vy = U.approach(this.vy, Math.sign(p.y - this.y) * 30 + Math.sin(this.t * 3) * 30, 80 * dt);
    }
  }

  [['stupid', Stupid], ['so', SO], ['symbol', Symbol], ['pyce2', Pyce2], ['guest', Guest], ['noob', Noob], ['elf', Elf],
    ['umbrella', Umbrella], ['zom', Zom], ['crystal', Crystal], ['knight', Knight], ['rebel', Rebel], ['skelebone', SkeleBone], ['snowcap', SnowCap],
    ['festive', Festive], ['bomb', Bomb], ['toybomb', ToyBomb], ['wingel', Wingel], ['strechy', Strechy], ['flower', Flower], ['cannon', Cannon],
    ['starbullet', StarBullet], ['ghost', Ghost], ['holo', Holo], ['motions', Motions], ['hacker', Hacker]
  ].forEach(([k, K]) => reg(k, K));
  S.Model.Enemy = Enemy;
})(window.SGM);
