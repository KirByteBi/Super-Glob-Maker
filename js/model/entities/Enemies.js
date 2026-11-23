/* © 2026 KirByte_Bi · OWNER: KirByte_Bi · Todos los derechos reservados. Ver LICENSE. */
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
  // LIGHT alcanza dos casillas desde toda la hitbox, no solo desde su centro.
  const inLight = (e, g) => {
    const LIGHT = (S.Model.Catalog.T && S.Model.Catalog.T.LIGHT) || 48, radius = 2 * T;
    const x0 = Math.floor((e.x - radius) / T), x1 = Math.floor((e.x + e.w + radius) / T);
    const y0 = Math.floor((e.y - radius) / T), y1 = Math.floor((e.y + e.h + radius) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (Number(g.level.get(tx, ty)) !== LIGHT) continue;
      const lx = tx * T + T / 2, ly = ty * T + T / 2;
      const dx = Math.max(e.x - lx, 0, lx - (e.x + e.w));
      const dy = Math.max(e.y - ly, 0, ly - (e.y + e.h));
      if (dx * dx + dy * dy <= radius * radius) return true;
    }
    return false;
  };
  const diesInLight = (e, g) => {
    if (!inLight(e, g)) return false;
    e.kill(g); g.addCoin(e.cx(), e.cy()); return true;
  };

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
      if (diesInLight(this, g)) return;
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

  // SkeleBone: pisado se desmonta y se recompone. La luz destruye sus almas/cara:
  // desde entonces camina sin ella, no evita bordes, no se recompone y un pisotón lo mata.
  class SkeleBone extends Enemy {
    constructor(tx, ty) { super('skelebone', tx, ty); this.turnAtLedge = true; this.pile = 0; this.throwT = 2.5; this.soulless = false; }
    loseSoulFace(g) {
      if (this.soulless) return;
      this.soulless = true; this.pile = 0; this.turnAtLedge = false;
      this.harmful = true; this.stompable = true; this.shootable = true; this.poundable = true;
      g.emit('bonesScatter', { x: this.cx(), y: this.cy(), soft: true });
    }
    think(g, dt) {
      if (inLight(this, g)) this.loseSoulFace(g);
      if (this.pile > 0) {
        this.vx = 0; this.pile -= dt;
        if (this.pile <= 0) { this.harmful = true; this.stompable = true; this.shootable = true; g.emit('boneRise', { x: this.cx(), y: this.y }); }
        return;
      }
      if (!this.soulless) {
        this.throwT -= dt * g.enemySpeedMul;
        if (this.throwT <= 0) { this.throwT = 3; const p = g.player; if (near(this, p, 10 * T)) { this.dir = dirTo(this, p); this.shoot(g, 'bone', this.dir * 150, -380, { gravity: 900 }); } }
      }
      this.walk(g, 30);
    }
    onStomp(g) {
      if (this.soulless) { super.onStomp(g); return; }
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
  // Flower Pyce: ventilador fijo que lanza ráfagas de aire. Pyceranha es otro enemigo (piranha).
  class Flower extends Enemy {
    constructor(tx, ty) { super('flower', tx, ty); this.stompable = false; this.poundable = false; this.fireT = 1.5; this.open = 0; }
    think(g, dt) {
      this.vx = 0; this.open = Math.max(0, this.open - dt * 2);
      const p = g.player;
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
  // Astral BPyce (versión mejorada del Bomb Pyce): no se puede pisar (solo Void Glob), explota al recibir
  // daño y cualquier proyectil lo enciende.
  class AstralBPyce extends Bomb {
    constructor(tx, ty) { super(tx, ty, 'astralbpyce'); this.stompable = false; this.poundable = false; this.voidStompable = true; }
    damage(g, amt, how) {
      if (how === 'stomp' || this.dying > 0) return false;
      this.light(g, 0.4); return true;
    }
    onStomp(g) { this.kill(g); } // solo lo llega a pisar el Void Glob
  }
  // Dreamy SPyce (versión mejorada del Symbol Pyce): no se puede pisar (solo Void Glob), invoca Symbol Pyces
  // cada pocos segundos mientras camina y planea unos segundos tras saltar.
  class DreamySPyce extends Symbol {
    constructor(tx, ty) { super(tx, ty); this.type = 'dreamyspyce'; this.stompable = false; this.poundable = false; this.voidStompable = true; this.summonT = 4; this.glideT = 0; }
    think(g, dt) {
      const wasGround = this.onGround;
      super.think(g, dt);
      if (wasGround && !this.onGround && this.vy < 0) this.glideT = 2.5; // acaba de saltar: planea
      if (this.glideT > 0) { this.glideT -= dt; if (this.vy > 90) this.vy = 90; }
      this.summonT -= dt * g.enemySpeedMul;
      if (this.summonT <= 0 && this.onGround && !this.dying) {
        this.summonT = 4;
        const s = S.Model.Entities.create('symbol', Math.floor(this.cx() / T), Math.floor(this.y / T));
        if (s) { s.active = true; g.spawn(s); g.emit('enemyHop', { x: this.cx(), y: this.y }); }
      }
    }
    onStomp(g) { this.kill(g); } // solo lo llega a pisar el Void Glob
  }
  class Ghost extends Enemy {
    constructor(tx, ty) { super('ghost', tx, ty); this.gravity = 0; this.tiles = false; this.stompable = false; this.shootable = false; this.poundable = false; this.shy = false; }
    think(g, dt) {
      // Un Bloque de luz tiene un radio de 2 casillas: un fantasma que entra en él se disipa y suelta una moneda
      const gx = Math.floor(this.cx() / T), gy = Math.floor(this.cy() / T), LIGHT = S.Model.Catalog.T.LIGHT;
      let lit = false;
      for (let dy = -2; dy <= 2 && !lit; dy++) for (let dx = -2; dx <= 2 && !lit; dx++) {
        if (dx * dx + dy * dy <= 4 && g.level.get(gx + dx, gy + dy) === LIGHT) lit = true;
      }
      if (lit) { this.kill(g); g.addCoin(this.cx(), this.cy()); return; }
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
    constructor(tx, ty) { super('motions', tx, ty); this.mood = 'happy'; this.moodT = 3; this.cry = 0; this.hopT = 0.8; }
    setMood(mood, g) {
      this.mood = mood; this.moodT = 3; this.cry = mood === 'sad' ? 0.45 : 0; this.hopT = 0.8;
      g.emit('mood', { x: this.cx(), y: this.y, mood });
    }
    think(g, dt) {
      this.moodT -= dt * g.enemySpeedMul;
      if (this.moodT <= 0) this.setMood(MOODS[(MOODS.indexOf(this.mood) + 1) % MOODS.length], g);
      const p = g.player;
      if (this.mood === 'happy') {
        this.hopT -= dt * g.enemySpeedMul;
        if (this.onGround && this.hopT <= 0) { this.vy = -280; this.hopT = 1.1; g.emit('enemyHop', { x: this.cx(), y: this.y }); }
        this.walk(g, 40);
      } else if (this.mood === 'angry') { this.dir = dirTo(this, p); this.walk(g, 115); }
      else if (this.mood === 'sad') { this.vx = 0; this.cry -= dt; if (this.cry <= 0) { this.cry = 0.5; this.dir = dirTo(this, p); this.shoot(g, 'tear', this.dir * 55, -150, { gravity: 900 }); } }
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

  // ---------------------------------------------------------------- Pyces de bosque/noche
  // Mushroom: en base camina sin caer por precipicios; al acercarse el Glob se estira
  // verticalmente como un muro y no se mueve hasta encogerse otra vez.
  class Mushroom extends Enemy {
    constructor(tx, ty) { super('mushroom', tx, ty); this.turnAtLedge = true; this.baseH = this.h; this.stretch = 0; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      const p = g.player;
      // Se estira inmediatamente cuando el Glob entra delante de él; en forma base vuelve a caminar.
      this.stretch = Math.abs(p.x + p.w / 2 - this.cx()) < 5 * T ? 1 : 0;
      const targetH = this.baseH + this.stretch * 48;
      const oldH = this.h;
      this.h = U.approach(this.h, targetH, dt * 120);
      this.y -= this.h - oldH; // conserva los pies en el suelo mientras se estira
      if (this.stretch > 0.15 || this.h > this.baseH + 2) { this.vx = 0; return; }
      this.walk(g, 34);
    }
  }
  // Pyceranha: planta fija. Apunta al Glob y sus bolas de fuego se destruyen contra paredes.
  class Piranha extends Enemy {
    constructor(tx, ty) { super('piranha', tx, ty); this.gravity = 0; this.fireT = 1.4; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      this.vx = 0; this.vy = 0;
      const p = g.player, dx = p.x + p.w / 2 - this.cx(), dy = p.y + p.h / 2 - this.cy();
      this.dir = Math.sign(dx) || this.dir;
      this.fireT -= dt * g.enemySpeedMul;
      if (this.fireT <= 0 && Math.abs(dx) < 12 * T) {
        this.fireT = 2.5;
        const d = Math.hypot(dx, dy) || 1, speed = 180 * g.enemySpeedMul;
        this.shoot(g, 'fire', dx / d * speed, dy / d * speed, { gravity: 0, life: 2.8 });
      }
    }
    physics() {} // fijo: no cae ni se desplaza
  }
  // Vampire: al acercarte adopta forma de murciélago y te persigue por el aire;
  // si aterriza, vuelve a su forma terrestre y puede despegar de nuevo.
  class Vampire extends Enemy {
    constructor(tx, ty) { super('vampire', tx, ty); this.gravity = 0; this.awake = false; }
    setForm(type) {
      const cx = this.cx(), foot = this.y + this.h, d = C.OBJECTS[type];
      this.type = type; this.w = d.w; this.h = d.h; this.x = cx - this.w / 2; this.y = foot - this.h;
    }
    becomeBat(g) {
      this.setForm('bat'); this.awake = true; this.gravity = 0; this.tiles = true; this.y -= 20; this.vy = -90; this.onGround = false; this.dir = dirTo(this, g.player);
      g.emit('enemyAngry', { x: this.cx(), y: this.cy() });
    }
    becomeVampire() {
      this.setForm('vampire'); this.awake = false; this.gravity = 0; this.tiles = true; this.vx = 0; this.vy = 0;
    }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      if (!this.awake) { this.vx = 0; this.vy = 0; if (near(this, g.player, 6 * T)) this.becomeBat(g); return; }
      // El murciélago persigue el aire sobre el Glob; solo vuelve a Vampire si aterriza.
      if (this.onGround) { this.becomeVampire(); return; }
      const p = g.player, dx = p.x + p.w / 2 - this.cx(), targetY = p.y + p.h / 2 - 36;
      this.dir = dx < 0 ? -1 : 1;
      this.vx = U.approach(this.vx, U.clamp(dx * 2.2, -108, 108) * g.enemySpeedMul, 360 * dt);
      this.vy = U.approach(this.vy, U.clamp((targetY - this.cy()) * 3, -92, 92), 300 * dt);
    }
    onWall(w) { this.vx = -w * 70; }
  }
  // Bat: vuelo horizontal continuo, rebota en muros.
  class Bat extends Enemy {
    constructor(tx, ty) { super('bat', tx, ty); this.gravity = 0; }
    think(g) { if (diesInLight(this, g)) return; this.vx = this.dir * 72 * g.enemySpeedMul; this.vy = 0; }
    onWall(w) { this.dir = -w; }
  }

  // ================================================================ DESBLOQUEABLES
  // Versiones alternas de juegos anteriores de la saga. Algo más difíciles que el original,
  // pero sin pasarse: siempre avisan antes de atacar y tienen límites (1 banhammer, 2 minas,
  // 2 murciélagos, 4 setas...). Los de bosque/noche siguen siendo débiles a la luz.
  const alive = (list) => list.filter((e) => e && !e.remove && !(e.dying > 0));
  const spawnAt = (g, type, x, y, o) => {
    const e = Ents.create(type, 0, 0); if (!e) return null;
    e.x = x - e.w / 2; e.y = y - e.h; e.spawnX = e.x; e.spawnY = e.y; Object.assign(e, o || {});
    e.active = true; g.spawn(e); return e;
  };

  // Minery Eterniumed Pyce: el Miner convertido en eternium. Lanza DOS picos a la vez, uno
  // hacia delante y otro hacia atrás (los dos vuelven como bumerán). No lanza más hasta
  // recoger ambos. Misma espera que el Miner original para que no sea agobiante.
  class EMiner extends Miner {
    constructor(tx, ty) { super(tx, ty); this.type = 'eminer'; this.picks = []; }
    think(g, dt) {
      this.pace(g, dt);
      this.picks = this.picks.filter((b) => b && !b.remove && !b.dying);
      if (this.picks.length) return;
      this.throwT -= dt * g.enemySpeedMul;
      if (this.throwT > 0 || !near(this, g.player, 11 * T)) return;
      this.throwT = U.rand(1.2, 2);
      [this.dir, -this.dir].forEach((d) => {
        this.picks.push(this.shoot(g, 'pickaxe', d * 330, 0, { tiles: false, w: 22, h: 22, life: 5, owner: this, boomer: d, homeY: this.y + this.h * 0.35, lilac: true }));
      });
    }
    died(g) { this.picks.forEach((b) => { if (b) b.owner = null; }); super.died(g); }
  }

  // Banned Builder Pyce: un banhammer a la vez (letal, pero lento y con aviso) y minas (máx. 2).
  class BanBuilder extends Bro {
    constructor(tx, ty) { super('banbuilder', tx, ty); this.hammer = null; this.mines = []; this.mineT = U.rand(3, 4.5); this.windup = 0; this.throwT = U.rand(1.5, 2.5); }
    think(g, dt) {
      this.pace(g, dt);
      if (this.hammer && (this.hammer.remove || this.hammer.dying)) this.hammer = null;
      const close = near(this, g.player, 11 * T);
      // aviso antes de lanzar (se para y levanta el martillo ~0.45 s)
      if (this.windup > 0) {
        this.vx = 0; this.windup -= dt;
        if (this.windup <= 0) {
          this.hammer = this.shoot(g, 'banhammer', this.dir * U.rand(110, 160), -U.rand(440, 500), { gravity: 1000, tiles: false, w: 22, h: 22, life: 3, lethal: true });
          this.throwT = U.rand(2.4, 3.2);
        }
        return;
      }
      this.throwT -= dt * g.enemySpeedMul;
      if (!this.hammer && this.throwT <= 0 && close) { this.windup = 0.45; g.emit('enemyAngry', { x: this.cx(), y: this.y }); }
      // minas: deja una a sus pies de vez en cuando, como mucho 2 a la vez
      this.mineT -= dt * g.enemySpeedMul;
      if (this.mineT <= 0 && this.onGround) {
        this.mineT = U.rand(4, 6);
        this.mines = alive(this.mines);
        if (this.mines.length < 2) { const m = spawnAt(g, 'banmine', this.cx(), this.y + this.h); if (m) this.mines.push(m); }
      }
    }
  }
  // Mina del Banned Builder: tarda un momento en armarse (parpadea) y explota al tocarla.
  class BanMine extends Entity {
    constructor(tx, ty) { super('banmine', tx, ty); this.armT = 0.8; }
    think(g, dt) { this.vx = 0; if (this.armT > 0) this.armT -= dt; }
    onTouch(g) {
      if (this.armT > 0) return true;              // aún sin armar: se puede pasar por encima
      this.remove = true; g.explode(this.cx(), this.cy(), 40, this);
      return true;
    }
  }

  // Veneraña Pyce: Pyceranha venenosa. Poco alcance; el veneno cae en arco y deja charco.
  class Venerana extends Piranha {
    constructor(tx, ty) { super(tx, ty); this.type = 'venerana'; this.fireT = 1.6; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      this.vx = 0; this.vy = 0;
      const p = g.player, dx = p.x + p.w / 2 - this.cx();
      this.dir = Math.sign(dx) || this.dir;
      this.fireT -= dt * g.enemySpeedMul;
      if (this.fireT <= 0 && Math.abs(dx) < 6 * T && Math.abs(p.y - this.y) < 4 * T) {
        this.fireT = 2.6;
        // arco corto hacia ti (llega como mucho ~5 casillas)
        const vx = U.clamp(dx * 1.6, -230, 230);
        this.shoot(g, 'poison', vx, -360, { gravity: 900, life: 3, w: 14, h: 14 });
      }
    }
  }
  // Charco de veneno: daña si lo tocas y desaparece a los pocos segundos.
  class PoisonPool extends Entity {
    constructor(tx, ty) { super('poisonpool', tx, ty); this.gravity = 0; this.life = 3; }
    think(g, dt) { this.life -= dt; if (this.life <= 0) this.remove = true; }
    physics() {}
    onTouch(g) { if (this.life > 0.25) g.hurtPlayer(this); return true; }
  }

  // Bloat Pyce: murciélago de Bloodpire. Persigue haciendo eses, más lento que el Glob.
  class Bloat extends Enemy {
    constructor(tx, ty) { super('bloat', tx, ty); this.gravity = 0; this.phase = Math.random() * 6; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      const p = g.player, dx = p.x + p.w / 2 - this.cx(), dy = p.y + p.h / 2 - 30 - this.cy();
      this.dir = dx < 0 ? -1 : 1;
      this.vx = U.approach(this.vx, U.clamp(dx * 1.5, -85, 85) * g.enemySpeedMul, 240 * dt);
      this.vy = U.approach(this.vy, U.clamp(dy * 2, -70, 70) + Math.sin(this.t * 3 + this.phase) * 45, 260 * dt);
    }
    onWall(w) { this.vx = -w * 60; }
  }
  // Bloodpire Pyce: quieto invoca Bat Pyces (máx. 2). Al acercarte se vuelve Bloat Pyce y
  // suelta otros dos Bloat Pyces de señuelo (solo si los anteriores ya no están).
  class Bloodpire extends Vampire {
    constructor(tx, ty) { super(tx, ty); this.type = 'bloodpire'; this.bats = []; this.decoys = []; this.batT = 2.5; }
    becomeBat(g) {
      this.setForm('bloat'); this.awake = true; this.gravity = 0; this.tiles = true; this.y -= 20; this.vy = -90; this.onGround = false; this.dir = dirTo(this, g.player);
      g.emit('enemyAngry', { x: this.cx(), y: this.cy() });
      this.decoys = alive(this.decoys);
      if (!this.decoys.length) [-1, 1].forEach((s) => { const d = spawnAt(g, 'bloat', this.cx() + s * 28, this.y + 10); if (d) { d.vy = -80; this.decoys.push(d); } });
    }
    becomeVampire() { this.setForm('bloodpire'); this.awake = false; this.gravity = 0; this.tiles = true; this.vx = 0; this.vy = 0; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      if (!this.awake) {
        this.vx = 0; this.vy = 0;
        this.batT -= dt * g.enemySpeedMul;
        if (this.batT <= 0) {
          this.batT = 4;
          this.bats = alive(this.bats);
          if (this.bats.length < 2) { const b = spawnAt(g, 'bat', this.cx(), this.y - 4); if (b) { b.dir = dirTo(this, g.player); this.bats.push(b); } }
        }
        if (near(this, g.player, 6 * T)) this.becomeBat(g);
        return;
      }
      if (this.onGround) { this.becomeVampire(); return; }
      const p = g.player, dx = p.x + p.w / 2 - this.cx(), targetY = p.y + p.h / 2 - 36;
      this.dir = dx < 0 ? -1 : 1;
      this.vx = U.approach(this.vx, U.clamp(dx * 2.2, -108, 108) * g.enemySpeedMul, 360 * dt);
      this.vy = U.approach(this.vy, U.clamp((targetY - this.cy()) * 3, -92, 92), 300 * dt);
    }
  }

  // Fungus Pyce: seta que se estira y SIGUE andando. Cada 3 esporas sale un Mushroom Pyce
  // (máximo 4 vivos; si los derrotas puede volver a invocar).
  class Fungus extends Mushroom {
    constructor(tx, ty) { super(tx, ty); this.type = 'fungus'; this.sporeT = 1.6; this.spores = 0; this.kids = []; }
    think(g, dt) {
      if (diesInLight(this, g)) return;
      const p = g.player;
      this.stretch = Math.abs(p.x + p.w / 2 - this.cx()) < 5 * T ? 1 : 0;
      const oldH = this.h;
      this.h = U.approach(this.h, this.baseH + this.stretch * 48, dt * 120);
      this.y -= this.h - oldH;
      this.walk(g, this.stretch ? 26 : 34);       // estirado anda algo más lento, pero anda
      this.sporeT -= dt * g.enemySpeedMul;
      if (this.sporeT <= 0 && this.onGround) {
        this.sporeT = 1.8;
        this.kids = alive(this.kids);
        if (this.kids.length >= 4) return;          // con 4 setas fuera no siembra más
        this.spores++;
        spawnAt(g, 'spore', this.cx(), this.y + this.h, { owner: this, grow: this.spores % 3 === 0 });
      }
    }
  }
  // Espora: se queda en el suelo un momento; la 3ª de cada tanda se convierte en Mushroom Pyce.
  class Spore extends Entity {
    constructor(tx, ty) { super('spore', tx, ty); this.life = 2.2; }
    think(g, dt) {
      this.vx = 0; this.life -= dt;
      if (this.life > 0) return;
      this.remove = true;
      const o = this.owner;
      if (this.grow && o && !o.remove && !(o.dying > 0) && alive(o.kids).length < 4) {
        const m = spawnAt(g, 'mushroom', this.cx(), this.y + this.h); if (m) { m.dir = o.dir; o.kids.push(m); }
      }
    }
  }

  [['eminer', EMiner], ['banbuilder', BanBuilder], ['banmine', BanMine], ['venerana', Venerana], ['poisonpool', PoisonPool],
    ['bloat', Bloat], ['bloodpire', Bloodpire], ['fungus', Fungus], ['spore', Spore]].forEach(([k, K]) => reg(k, K));

  [['stupid', Stupid], ['so', SO], ['symbol', Symbol], ['pyce2', Pyce2], ['guest', Guest], ['noob', Noob], ['elf', Elf],
    ['umbrella', Umbrella], ['zom', Zom], ['crystal', Crystal], ['knight', Knight], ['rebel', Rebel], ['skelebone', SkeleBone], ['snowcap', SnowCap],
    ['festive', Festive], ['bomb', Bomb], ['toybomb', ToyBomb], ['wingel', Wingel], ['strechy', Strechy], ['flower', Flower], ['cannon', Cannon],
    ['starbullet', StarBullet], ['ghost', Ghost], ['astralbpyce', AstralBPyce], ['dreamyspyce', DreamySPyce], ['holo', Holo], ['motions', Motions], ['hacker', Hacker],
    ['mushroom', Mushroom], ['piranha', Piranha], ['vampire', Vampire], ['bat', Bat]
  ].forEach(([k, K]) => reg(k, K));
  S.Model.Enemy = Enemy;
})(window.SGM);
