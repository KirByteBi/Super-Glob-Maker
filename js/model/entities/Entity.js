/* Modelo: entidad base y registro de tipos */
(function (S) {
  'use strict';
  const T = S.TILE;
  const C = S.Model.Catalog;
  const Physics = S.Model.Physics;

  class Entity {
    constructor(type, tx, ty) {
      const def = C.OBJECTS[type] || { w: 28, h: 28 };
      this.type = type; this.w = def.w; this.h = def.h;
      this.x = tx * T + T / 2 - this.w / 2;
      if (def.anchor === 'top') this.y = ty * T;
      else if (def.anchor === 'center') this.y = ty * T + T / 2 - this.h / 2;
      else this.y = (ty + 1) * T - this.h;
      this.tx = tx; this.ty = ty;
      this.spawnX = this.x; this.spawnY = this.y;
      this.vx = 0; this.vy = 0; this.dir = -1; this.t = 0;
      this.gravity = 1700; this.maxFall = 600;
      this.enemy = false; this.stompable = false; this.harmful = false; this.shootable = false;
      this.tiles = true; this.active = false; this.remove = false;
      this.dying = 0; this.flipDie = false; this.squashed = false;
      this.onGround = false; this.res = null;
    }
    update(g, dt) {
      this.t += dt;
      if (this.dying > 0) {
        this.dying -= dt;
        if (this.flipDie) { this.vy += 1500 * dt; this.x += this.vx * dt; this.y += this.vy * dt; }
        if (this.dying <= 0) this.remove = true;
        return;
      }
      this.think(g, dt);
      this.physics(g, dt);
      if (this.y > g.level.height * T + 96) this.remove = true;
      if (this.enemy && this.y + this.h > g.liquidY + 10) this.kill(g, true);
    }
    think() {}
    physics(g, dt) {
      if (this.gravity) this.vy = Math.min(this.vy + this.gravity * g.gravMul * dt, this.maxFall);
      if (this.gooSlow) this.vx *= 0.3; // charco pegajoso del Glob Caca
      if (!this.tiles) { this.x += this.vx * dt; this.y += this.vy * dt; return; }
      const r = Physics.move(this, g.level, dt);
      this.res = r;
      if (r.wall) this.onWall(r.wall, g);
      if (this.enemy && this.inLiquid(g)) this.kill(g, true);
    }
    inLiquid(g) {
      const cx = Math.floor((this.x + this.w / 2) / T), by = Math.floor((this.y + this.h - 4) / T);
      return g.level.get(cx, by) === C.T.LIQUID;
    }
    onWall(w) { this.dir = -w; }
    onStomp(g) { this.squashed = true; this.dying = 0.45; this.vx = 0; g.emit('stomp', { x: this.x + this.w / 2, y: this.y + this.h / 2 }); }
    kill(g, silent) {
      if (this.dying > 0) return;
      this.flipDie = true; this.dying = 1.4; this.vy = -360; this.vx = (Math.random() < 0.5 ? -1 : 1) * 60;
      if (!silent) g.emit('kill', { x: this.x + this.w / 2, y: this.y + this.h / 2, type: this.type });
      this.died(g);
    }
    // Se llama una sola vez al morir (para recompensas, restos, etc.)
    died(g) { if (this.deadDone) return; this.deadDone = true; if (this.onDeath) this.onDeath(g); }
    hitByShot(g) { this.kill(g); return true; }
    cx() { return this.x + this.w / 2; }
    cy() { return this.y + this.h / 2; }
  }

  const registry = {};
  S.Model.Entity = Entity;
  S.Model.Entities = {
    register(type, cls) { registry[type] = cls; },
    // o = datos del objeto del nivel (p. ej. o.r = recorrido / longitud elegido en el editor)
    create(type, tx, ty, o) {
      const K = registry[type];
      if (!K) return null;
      // solo (tx, ty): algunas clases usan el 3er parámetro para su tipo interno
      const e = new K(tx, ty);
      if (o && o.r != null) e.r = o.r;
      // Orientación elegida en el editor (R/E)
      if (o && (o.dir === 1 || o.dir === -1)) { e.dir = o.dir; e.spawnDir = o.dir; }
      if (o && o.fv) e.flipV = 1;
      // destino manual de tuberías/puertas (enlace a otra zona/gizmo)
      if (o && o.to) e.to = { z: o.to.z, i: o.to.i };
      // color de la tubería (0-3); el enlace iguala el color de ambos extremos
      if (o && o.col != null) e.col = o.col | 0;
      // orientación de la tubería: 0 = vertical, 1 = horizontal (girada en el editor con R)
      if (o && o.hdir) e.hdir = 1;
      if (e.init) e.init(o || {});
      return e;
    },
    has(type) { return !!registry[type]; }
  };
})(window.SGM);
