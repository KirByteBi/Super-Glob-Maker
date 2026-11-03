/* Modelo: objetos (power-ups, muelles, plataformas, puntos de control y proyectiles del jugador) */
(function (S) {
  'use strict';
  const T = S.TILE;
  const Entity = S.Model.Entity;
  const Physics = S.Model.Physics;
  const reg = S.Model.Entities.register;

  // Objeto recogible. Si sale de una caja, primero "emerge" hacia arriba.
  class Item extends Entity {
    constructor(type, tx, ty, speed) { super(type, tx, ty); this.item = true; this.speed = speed || 0; this.dir = 1; this.emerge = 0; }
    fromBox(tx, ty) { this.x = tx * T + T / 2 - this.w / 2; this.y = ty * T + T - this.h; this.emerge = T; this.gravity = 0; }
    update(g, dt) {
      this.t += dt;
      if (this.emerge > 0) { const d = Math.min(this.emerge, 48 * dt); this.y -= d; this.emerge -= d; if (this.emerge <= 0) this.gravity = 1700; return; }
      this.think(g, dt); this.physics(g, dt);
      if (this.y > g.level.height * T + 64) this.remove = true;
    }
    think() { this.vx = this.dir * this.speed; }
  }

  class Evo extends Item { constructor(tx, ty) { super('evo', tx, ty, 80); } }
  class Flor extends Item { constructor(tx, ty) { super('flor', tx, ty, 70); } }
  class Caca extends Item { constructor(tx, ty) { super('caca', tx, ty, 60); } }
  class Miniglob extends Item { constructor(tx, ty) { super('miniglob', tx, ty, 95); } }
  class Vacio extends Item {
    constructor(tx, ty) { super('vacio', tx, ty, 50); }
    physics(g, dt) { this.gravity = this.emerge > 0 ? 0 : 500; this.maxFall = 70; super.physics(g, dt); }
  }
  class Brillo extends Item {
    constructor(tx, ty) { super('brillo', tx, ty, 110); }
    think(g) { super.think(g); if (this.onGround) this.vy = -470; }
  }

  // Moneda que salta de una caja y desaparece
  class CoinPop extends Entity {
    constructor() { super('coinpop', 0, 0); this.tiles = false; this.vy = -560; this.gravity = 1900; }
    think() { if (this.t > 0.45) this.remove = true; }
  }

  class Spring extends Entity {
    constructor(tx, ty) { super('spring', tx, ty); this.gravity = 0; this.squash = 0; }
    think(g, dt) { this.squash = Math.max(0, this.squash - dt * 4); }
    physics() {}
  }

  // Plataforma móvil. r = recorrido en casillas (elegido en el editor)
  class Platform extends Entity {
    constructor(tx, ty, type, vertical, diag) {
      super(type || (vertical ? 'platformV' : 'platform'), tx, ty);
      this.platform = true; this.gravity = 0; this.tiles = false; this.vertical = !!vertical; this.diag = diag || 0; this.r = 3; this.dx = 0; this.dy = 0; this.ph = 0;
    }
    moves() { return true; }
    think(g, dt) {
      const ox = this.x, oy = this.y;
      if (this.moves(g)) this.ph += dt * 1.1 * (g.obstacleMul || 1) * (3 / Math.max(1, this.r)) ** 0.5;
      const off = Math.sin(this.ph) * this.r * T;
      if (this.diag) { this.x = this.spawnX + off; this.y = this.spawnY + off * this.diag; } // raíl diagonal (↗↙ = -1, ↘↖ = 1)
      else if (this.vertical) this.y = this.spawnY + off; else this.x = this.spawnX + off;
      this.dx = this.x - ox; this.dy = this.y - oy;
    }
    physics() {}
  }
  class PlatformH extends Platform { constructor(tx, ty) { super(tx, ty, 'platform', false); } }
  class PlatformV extends Platform { constructor(tx, ty) { super(tx, ty, 'platformV', true); } }
  // Raíles diagonales: D1 sube hacia la derecha (↗↙), D2 baja hacia la derecha (↘↖)
  class PlatformD1 extends Platform { constructor(tx, ty) { super(tx, ty, 'platformD1', false, -1); } }
  class PlatformD2 extends Platform { constructor(tx, ty) { super(tx, ty, 'platformD2', false, 1); } }
  // Setas (semisólido): solo se mueven mientras hay alguien encima (el jugador montado).
  // En Darkness Forest Corrupto (movingShrooms) se mueven siempre, aunque nadie las pise.
  // Si nadie va encima se quedan quietas donde estén (conservan la fase 'ph').
  class ShroomH extends Platform { constructor(tx, ty) { super(tx, ty, 'shroomH', false); this.r = 2; } moves(g) { return !!g.fx.movingShrooms || (g.player && g.player.ridePlat === this); } }
  class ShroomV extends Platform { constructor(tx, ty) { super(tx, ty, 'shroomV', true); this.r = 2; } moves(g) { return !!g.fx.movingShrooms || (g.player && g.player.ridePlat === this); } }

  // Rosquilla que cae (se crea cuando te quedas encima de un bloque Rosquilla)
  class DonutFall extends Entity {
    constructor() { super('donutfall', 0, 0); this.platform = true; this.gravity = 0; this.tiles = false; this.dx = 0; this.dy = 0; this.vy = 0; }
    think(g, dt) { const oy = this.y; this.vy = Math.min(this.vy + 900 * dt, 420); this.y += this.vy * dt; this.dy = this.y - oy; if (this.y > g.level.height * T + 40) this.remove = true; }
    physics() {}
  }

  // Cápsulas de personaje: te transforman en otro Glob
  class Capsule extends Item {
    constructor(tx, ty, o, type) { super(type, tx, ty, 70); this.char = S.Model.Catalog.OBJECTS[type].char; }
  }
  // Monedas que suelta el Golden Mimic
  class GCoin extends Item {
    constructor() { super('gcoin', 0, 0, 0); this.coin = true; this.life = 6; }
    think(g, dt) { this.life -= dt; if (this.life <= 0) this.remove = true; if (this.onGround) this.vx *= 0.9; }
  }

  // Tuberías y puertas: se conectan con la siguiente de su familia (las de tubería con tuberías, las puertas con puertas).
  // Las versiones con llave/tapa empiezan cerradas y se abren gastando una llave; abiertas funcionan igual.
  class Warp extends Entity {
    // hdir: 0 = vertical (boca arriba, se entra con ↓), 1 = horizontal (boca al lado, se entra
    // caminando). Lo aplica Entities.create desde o.hdir (como o.dir/o.col), no el constructor.
    // Ocupa EXACTAMENTE las casillas tx..tx+1 (antes se centraba en tx y quedaba media casilla
    // desplazada de los tiles de tubería que lleva debajo). Es sólida: te puedes subir encima.
    constructor(tx, ty, o, type) { super(type || 'warp', tx, ty); this.x = tx * T + (2 * T - this.w) / 2; this.spawnX = this.x; this.gravity = 0; this.tiles = false; this.gizmo = true; this.solid = true; this.family = 'pipe'; this.locked = false; this.hdir = 0; }
    physics() {}
  }
  class LockWarp extends Warp { constructor(tx, ty, o) { super(tx, ty, o, 'lockwarp'); this.locked = true; } }
  class Door extends Entity {
    constructor(tx, ty, o, type) { super(type || 'door', tx, ty); this.gravity = 0; this.tiles = false; this.gizmo = true; this.family = 'door'; this.open = 0; this.locked = false; }
    think(g, dt) { this.open = Math.max(0, this.open - dt * 2); }
    physics() {}
  }
  class LockDoor extends Door { constructor(tx, ty, o) { super(tx, ty, o, 'lockdoor'); this.locked = true; } }
  // Llave: se recoge y la lleva el jugador (se ve flotando a su lado) hasta usarla
  class Key extends Item {
    constructor(tx, ty) { super('key', tx, ty, 0); this.gravity = 0; }
    think() { this.vx = 0; this.vy = Math.sin(this.t * 3) * 10; }
  }

  // Barra Estelar: cadena giratoria de estrellas. r = longitud
  class FireBar extends Entity {
    constructor(tx, ty) { super('firebar', tx, ty); this.gravity = 0; this.tiles = false; this.r = 5; this.ang = 0; this.hazard = true; }
    think(g, dt) { this.ang += dt * 1.6 * (g.obstacleMul || 1) * (this.tx % 2 ? -1 : 1); }
    // puntos de la barra (para colisión y dibujo)
    points() { const out = [], cx = this.cx(), cy = this.cy(); for (let i = 0; i <= this.r; i++) out.push({ x: cx + Math.cos(this.ang) * i * 14, y: cy + Math.sin(this.ang) * i * 14 }); return out; }
    hits(p) { return this.points().some((q) => q.x > p.x - 6 && q.x < p.x + p.w + 6 && q.y > p.y - 6 && q.y < p.y + p.h + 6); }
    physics() {}
  }

  // Carámbano: cae cuando pasas por debajo
  class Icicle extends Entity {
    constructor(tx, ty) { super('icicle', tx, ty); this.gravity = 0; this.state = 'hang'; this.shake = 0; this.enemy = true; this.harmful = true; this.stompable = false; this.shootable = false; this.poundable = false; }
    think(g, dt) {
      const p = g.player;
      if (this.state === 'hang') { this.vx = 0; this.vy = 0; if (Math.abs(p.x + p.w / 2 - this.cx()) < 40 && p.y > this.y) { this.state = 'shake'; this.shake = 0.4; g.emit('icicleShake', { x: this.cx(), y: this.y }); } }
      else if (this.state === 'shake') { this.shake -= dt; if (this.shake <= 0) { this.state = 'fall'; this.gravity = 1600; } }
      else if (this.onGround) { this.remove = true; g.emit('icicleBreak', { x: this.cx(), y: this.y + this.h }); }
    }
    onStomp() {}
    hitByShot() { return false; }
    inLiquid() { return false; }
  }

  // Explosión (Bomb Pyce, meteoritos...): hiere a todos en su radio y rompe bloques
  class Explosion extends Entity {
    constructor() { super('explosion', 0, 0); this.gravity = 0; this.tiles = false; this.life = 0.45; this.done = false; this.radius = 52; }
    think(g, dt) { this.life -= dt; if (this.life <= 0) this.remove = true; }
    physics() {}
  }
  // Nube de niebla del spray de Rebel Pyce (solo tapa la vista)
  class SprayFog extends Entity {
    constructor() { super('sprayfog', 0, 0); this.gravity = 0; this.tiles = false; this.life = 6; this.max = 6; }
    think(g, dt) { this.life -= dt; if (this.life <= 0) this.remove = true; this.x += Math.sin(this.t) * 0.2; }
    physics() {}
  }
  // Meteorito (Núcleo Fundido Corrupto): cae en diagonal y explota al tocar el suelo
  class Meteor extends Entity {
    constructor() { super('meteor', 0, 0); this.gravity = 0; this.enemy = true; this.harmful = true; this.stompable = false; this.shootable = false; this.poundable = false; }
    think(g) { if (this.y > g.level.height * T) this.remove = true; }
    physics(g, dt) {
      const r = Physics.move(this, g.level, dt, { noSlopes: true });
      if (r.landed || r.wall || this.inLiquid(g)) { this.remove = true; g.explode(this.cx(), this.cy(), 44, this); }
    }
    onStomp() {}
    hitByShot() { return false; }
    kill() {}
  }
  // Rayo de nube (Fábrica MadStars Corrupta): aviso y luego descarga vertical
  class Lightning extends Entity {
    constructor() { super('lightning', 0, 0); this.gravity = 0; this.tiles = false; this.warn = 0.6; this.life = 0.35; this.enemy = true; this.harmful = false; this.stompable = false; this.shootable = false; this.poundable = false; }
    think(g, dt) {
      if (this.warn > 0) { this.warn -= dt; if (this.warn <= 0) { this.harmful = true; g.emit('thunder', { x: this.cx(), y: this.y }); } return; }
      this.life -= dt; if (this.life <= 0) this.remove = true;
    }
    physics() {}
    onStomp() {}
    hitByShot() { return false; }
    kill() {}
  }

  class Checkpoint extends Entity {
    constructor(tx, ty) { super('checkpoint', tx, ty); this.gravity = 0; this.taken = false; this.wave = 0; }
    think(g, dt) { this.wave += dt; }
    physics() {}
  }

  // Disparo de EVO3: rebota por el suelo como una gota
  class Shot extends Entity {
    constructor() { super('shot', 0, 0); this.friendly = true; this.gravity = 1500; this.maxFall = 500; this.bounces = 0; this.color = '#fff'; }
    physics(g, dt) {
      this.vy = Math.min(this.vy + this.gravity * dt, this.maxFall);
      const r = Physics.move(this, g.level, dt);
      if (r.landed) { this.vy = -300; this.bounces++; }
      if (r.wall || r.ceil.length || this.bounces > 5 || this.t > 2.2) { this.remove = true; g.emit('shotHit', { x: this.cx(), y: this.cy(), color: this.color }); }
      if (this.inLiquid(g)) this.remove = true;
    }
  }

  // Bola de caca: rebota y deja un charco pegajoso al deshacerse
  class Poop extends Shot {
    constructor() { super(); this.type = 'poop'; this.w = 16; this.h = 16; this.color = '#8a5a2b'; }
    physics(g, dt) {
      this.vy = Math.min(this.vy + this.gravity * dt, this.maxFall);
      const r = Physics.move(this, g.level, dt);
      if (r.landed) { this.vy = -260; this.bounces++; }
      const end = r.wall || r.ceil.length || this.bounces > 3 || this.t > 2.4;
      if (end) {
        this.remove = true; g.emit('splat', { x: this.cx(), y: this.cy(), color: this.color });
        if (this.onGround || r.landed) this.leaveGoo(g);
      }
    }
    leaveGoo(g) {
      const goo = new Goo(); goo.x = this.cx() - goo.w / 2; goo.y = this.y + this.h - goo.h; goo.active = true; g.spawn(goo);
    }
    // Al matar a un enemigo también deja charco
    onHit(g) { if (this.onGround) this.leaveGoo(g); }
  }

  // Charco pegajoso: frena a los enemigos que lo pisan
  class Goo extends Entity {
    constructor() { super('goo', 0, 0); this.gravity = 0; this.tiles = false; this.life = 6; }
    think(g, dt) { this.life -= dt; if (this.life <= 0) this.remove = true; }
    physics() {}
  }

  // Onda de estrellas del Glob Vacío
  class StarWave extends Entity {
    constructor() { super('starwave', 0, 0); this.friendly = true; this.gravity = 0; this.tiles = false; this.color = '#ffe600'; }
    think() { if (this.t > 0.6) this.remove = true; }
  }

  // Moneda Estrella: coleccionable del nivel (estilo Star Coin). No cae: flota en el sitio.
  // Las reskins solo cambian el dibujo (skin); el comportamiento es idéntico.
  class StarCoin extends Entity {
    constructor(tx, ty, o, type) {
      super(type, tx, ty);
      const def = S.Model.Catalog.OBJECTS[type] || {};
      this.item = true; this.collect = true; this.gravity = 0; this.tiles = false;
      this.skin = def.skin || 'star';
      this.hurt = !!def.hurt; // Estrella de la Traición: daña al cogerla
    }
    think(g, dt) { this.vy = Math.sin(this.t * 2.4) * 8; }
    physics() {}
  }
  S.Model.StarCoin = StarCoin;
  ['starcoin', 'starcoin_giga', 'starcoin_rg', 'starcoin_moon', 'starcoin_magic', 'starcoin_traitor']
    .forEach((k) => reg(k, class extends StarCoin { constructor(tx, ty, o) { super(tx, ty, o, k); } }));

  // Interruptor "!" (2×2): al tocarlo activa los bloques "!" de su color (persistente) y
  // cuenta como pasar el nivel por meta oculta.
  class ExSwitch extends Entity {
    constructor(tx, ty, o, type) { super(type, tx, ty); this.gizmo = true; this.gravity = 0; this.tiles = false; this.exk = S.Model.Catalog.OBJECTS[type].exk; this.pressed = false; }
    think() {}
    physics() {}
    onTouch(g) { if (!this.pressed) { this.pressed = true; g.pressExclaim(this.exk, this.cx(), this.cy()); } return true; }
  }
  S.Model.ExSwitch = ExSwitch;
  ['exswitch0', 'exswitch1', 'exswitch2'].forEach((k) => reg(k, class extends ExSwitch { constructor(tx, ty, o) { super(tx, ty, o, k); } }));

  // Moneda de valor múltiple (×10/×30/×50/×100): objeto 2×2 que flota y da 'value' monedas
  class ValueCoin extends Entity {
    constructor(tx, ty, o, type) {
      super(type, tx, ty);
      this.item = true; this.gravity = 0; this.tiles = false;
      this.value = (S.Model.Catalog.OBJECTS[type] || {}).value || 10;
    }
    think(g, dt) { this.vy = Math.sin(this.t * 2.6) * 7; }
    physics() {}
  }
  S.Model.ValueCoin = ValueCoin;
  ['coin10', 'coin30', 'coin50', 'coin100'].forEach((k) => reg(k, class extends ValueCoin { constructor(tx, ty, o) { super(tx, ty, o, k); } }));

  reg('evo', Evo); reg('flor', Flor); reg('caca', Caca); reg('vacio', Vacio); reg('brillo', Brillo); reg('miniglob', Miniglob);
  reg('coinpop', CoinPop); reg('spring', Spring); reg('platform', PlatformH); reg('platformV', PlatformV);
  reg('platformD1', PlatformD1); reg('platformD2', PlatformD2);
  reg('shroomH', ShroomH); reg('shroomV', ShroomV); reg('donutfall', DonutFall); reg('gcoin', GCoin);
  reg('warp', Warp); reg('lockwarp', LockWarp); reg('door', Door); reg('lockdoor', LockDoor); reg('key', Key); reg('firebar', FireBar); reg('icicle', Icicle);
  reg('explosion', Explosion); reg('sprayfog', SprayFog); reg('meteor', Meteor); reg('lightning', Lightning);
  S.Model.Characters.list.forEach((c) => { const k = 'cap_' + c.id; reg(k, class extends Capsule { constructor(tx, ty, o) { super(tx, ty, o, k); } }); });
  reg('checkpoint', Checkpoint); reg('shot', Shot); reg('poop', Poop); reg('goo', Goo); reg('starwave', StarWave);
  S.Model.Item = Item;
})(window.SGM);
