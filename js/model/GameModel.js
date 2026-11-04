/* Modelo: estado completo de una partida. No dibuja nada: emite eventos que escuchan las vistas. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const U = S.util;
  const C = S.Model.Catalog;
  const TT = C.T;
  const Ents = S.Model.Entities;

  class GameModel {
    constructor(levelData, opts) {
      opts = opts || {};
      this.source = levelData;
      this.level = new S.Model.Level(U.deepClone(levelData));
      this.theme = S.Model.Themes.get(this.level.theme);
      this.mode = this.level.mode;
      this.pal = S.Model.Themes.palette(this.theme, this.mode);
      this.testMode = !!opts.testMode;
      this.charId = opts.character || this.level.character || 'green';
      this.lives = opts.lives != null ? opts.lives : 5;
      this.score = opts.score || 0; this.coins = opts.coins || 0;
      this.checkpoint = null;
      this.medals = 0;
      this.fx = {};
      if (this.mode === 'corrupt') this.fx[this.theme.effect] = true;
      // Interruptores "!" ya activados antes (p. ej. el palacio del mundo en el Modo Historia)
      if (Array.isArray(opts.exState)) this.exState = opts.exState.slice(0, 3).map((v) => (v ? 1 : 0));
      this.reset(true);
    }

    emit(name, data) {
      // Condición "sin saltar": cualquier salto del jugador la invalida
      if (name === 'jump' || name === 'doubleJump') this.jumped = true;
      S.events.emit('game:' + name, Object.assign({ game: this }, data || {}));
    }

    reset(first) {
      // Al morir se vuelve siempre a la zona base (0). El checkpoint solo guarda posición en la base.
      this.zone = 0;
      this.sourceLevel = this.sourceLevel || new S.Model.Level(U.deepClone(this.source));
      // Recarga el nivel (las cajas usadas vuelven a su sitio) salvo la posición del punto de control
      this.level = new S.Model.Level(U.deepClone(this.sourceLevel.zoneData(0)));
      // Restaurar tema/efectos de la zona base (por si se murió en una subzona)
      this.theme = S.Model.Themes.get(this.level.theme);
      this.mode = this.level.mode;
      this.pal = S.Model.Themes.palette(this.theme, this.mode);
      this.fx = {};
      if (this.mode === 'corrupt') this.fx[this.theme.effect] = true;
      const start = this.level.objects.find((o) => o.type === 'start') || { x: 2, y: this.level.height - 4 };
      this.entities = [];
      this.level.objects.forEach((o) => {
        if (o.type === 'start' || o.type === 'goal') return;
        // Flower Pyce sobre una tubería = planta piraña piromana
        if (o.type === 'flower' && this.level.get(o.x, o.y) === TT.PIPE) o = Object.assign({}, o, { inPipe: true });
        const e = Ents.create(o.type, o.x, o.y, o);
        if (!e) return;
        if (o.type === 'checkpoint' && this.checkpoint && this.checkpoint.x === o.x && this.checkpoint.y === o.y) e.taken = true;
        // las puertas/tuberías con llave que ya abriste siguen abiertas tras morir
        if (e.locked && this.unlocked && this.unlocked['0:' + o.x + ',' + o.y]) e.locked = false;
        // Abismo Corrupto: más de la mitad de los enemigos de tierra nadan en vez de caminar
        if (this.fx.abyss && e.enemy && !e.boss && !C.OBJECTS[o.type].water && U.hash(o.x * 7 + o.y) < 0.6) e.swims = true;
        // Encima de un raíl: lo sigue
        if (this.level.get(o.x, o.y) === TT.RAIL && S.Model.Rail.rideable(e)) S.Model.Rail.attach(e, this.level, o.x, o.y, o.dir);
        this.entities.push(e);
      });
      // Enlaces de tuberías y puertas.
      //  - Sin destino manual (o.to): cada una lleva a la SIGUIENTE de su familia (orden de colocación).
      //  - Con destino manual: a la zona o.to.z, al gizmo de la misma familia nº o.to.i de esa zona.
      ['pipe', 'door'].forEach((fam) => {
        const list = this.entities.filter((e) => e.gizmo && e.family === fam);
        list.forEach((e, i) => {
          if (e.to) {
            if (e.to.z === this.zone) { e.link = list[e.to.i] || null; e.toZone = null; }
            else { e.link = null; e.toZone = e.to; } // destino en otra zona: se resuelve al entrar
          } else { e.link = list.length > 1 ? list[(i + 1) % list.length] : null; e.toZone = null; }
        });
      });
      this.stampPipes();
      this.keys = 0; this.unlocked = this.unlocked || {};
      // Monedas rojas: set de 8 -> 1UP (estilo SM64). redTotal = cuántas hay en el nivel.
      this.redTotal = 0;
      for (let i = 0; i < this.level.tiles.length; i++) if (this.level.tiles[i] === TT.RCOIN) this.redTotal++;
      this.redCoins = 0;
      // Monedas púrpura (de TODO el nivel: base + subzonas). Con alguna, la Medalla aparece al juntar 100.
      this.purpleCoins = 0;
      this.purpleTotal = this.countPurple();
      this.purpleNeed = Math.min(C.PURPLE_NEED, this.purpleTotal);
      this.goalLocked = this.purpleNeed > 0;
      // Interruptor G: activa las monedas verdes ocultas (GHID) un tiempo, como el P
      this.gTimer = 0;
      // Interruptor P clásico: mientras pTimer > 0, pActive = true (monedas P <-> bloques P)
      this.pTimer = 0; this.level.pActive = false;
      // Monedas Estrella coleccionables del nivel (estilo Star Coin)
      this.starTotal = this.level.objects.filter((o) => (C.OBJECTS[o.type] || {}).collect).length;
      this.stars = 0;
      // Enemigos derrotados y si el jugador ha saltado (para las condiciones de victoria)
      this.kills = 0; this.jumped = false;
      this.level.ab = [0, 0, 0];
      // Interruptores "!": estado persistente de la partida (se conserva al cambiar de zona)
      this.exState = this.exState || [0, 0, 0];
      this.level.ex = this.exState.slice();
      this.donuts = {}; this.cloudT = {}; this.goneClouds = []; this.boltT = 2; this.meteorT = 3;
      this.stun = 0; this.warping = null;
      const goal = this.level.objects.find((o) => o.type === 'goal');
      this.goal = goal ? { x: goal.x * T + T / 2 - 4, y: (goal.y + 1) * T - 192, w: 8, h: 192, medalY: 0, tx: goal.x, ty: goal.y } : null;
      const gh = this.level.objects.find((o) => o.type === 'goalhidden');
      this.goalHidden = gh ? { x: gh.x * T + T / 2 - 4, y: (gh.y + 1) * T - 192, w: 8, h: 192, medalY: 0, tx: gh.x, ty: gh.y, hidden: true } : null;
      this.secretClear = false;
      const sp = this.checkpoint || start;
      // Norma "sin efectos especiales": si el nivel la tiene, el Glob juega como el verde.
      this.player = new S.Model.Player(this.charId, sp.x, sp.y, !!this.level.noPowers);
      // Al reaparecer tras morir: 2 s de invulnerabilidad para que nada te mate en bucle
      if (!first) this.player.inv = 2;
      this.time = this.level.time; this.state = 'play'; this.stateT = 0; this.t = 0;
      // Vórtice y Abismo Corruptos: gravedad baja
      this.gravMul = this.fx.lowGravity ? 0.55 : this.fx.abyss ? 0.5 : 1;
      // Circo Corrupto: enemigos, plataformas, cintas y cañones a toda velocidad
      this.enemySpeedMul = this.fx.speedUp ? 1.75 : this.fx.glitch ? 1.25 : 1;
      this.obstacleMul = this.fx.speedUp ? 1.9 : 1;
      this.wind = 0; this.windT = 3; this.currentX = 0; this.currentY = 0; this.convDir = 1; this.glitchT = 5; this.glitchPulse = 0;
      // Efectos de los mapas nuevos (Corrupto)
      this.beatT = 0;        // Sound Discotech: pulso rítmico (0..1), late con la música
      this.timeWarpT = 4; this.timeWarp = 1;  // Time Attack: multiplicador de tiempo (lento/rápido)
      this.rouletteT = 6; this.rouletteRule = null; // Gambling Gaming: regla activa
      // Event Hub: la meta está sellada hasta coger todas las Monedas Estrella (Medallas)
      this.gateSealed = !!this.fx.medalGate;
      this.baseLiquid = this.level.height * T + 200;
      this.liquidY = this.baseLiquid;
      this.bumps = []; // bloques golpeados (para la animación de la vista)
      this.boss = this.entities.find((e) => e.boss) || null;
      this.camera = { x: 0, y: 0, w: S.VIEW_W, h: S.VIEW_H };
      this.scrollX = 0; // posicion del autoscroll (solo crece)
      this.updateCamera(1);
      this.emit('start', { first });
    }

    solidEntities() { return this.entities.filter((e) => (e.platform || e.solid) && e.active && !e.remove); }
    spawn(e) { this.entities.push(e); }
    addScore(n, at) { this.score += n; if (at) this.emit('score', { x: at.x + (at.w || 0) / 2, y: at.y, n }); }
    addCoin(x, y) {
      // Glob Ducky: +1 a cada moneda que coge
      const bonus = (this.player && this.player.ch.coinBonus) || 0;
      this.coins += 1 + bonus; this.score += 100 * (1 + bonus); this.emit('coin', { x, y });
      while (this.coins >= 100) { this.coins -= 100; this.oneUp(x, y); }
    }
    oneUp(x, y) { this.lives++; this.emit('oneUp', { x, y }); }
    countPurple() {
      let n = 0; const src = this.sourceLevel || this.level;
      const zones = [src.tiles].concat((src.subs || []).map((s) => S.Model.Level.decode(s.tiles, s.width * s.height)));
      zones.forEach((tl) => { for (let i = 0; i < tl.length; i++) if (tl[i] === TT.VCOIN) n++; });
      return n;
    }
    addPurpleCoin(x, y) {
      this.purpleCoins++; this.addCoin(x, y);
      this.emit('purpleCoin', { x, y, got: this.purpleCoins, need: this.purpleNeed });
    }
    // Moneda roja: cada 8 recogidas = 1UP (como en SM64)
    addRedCoin(x, y) {
      this.redCoins++; this.score += 200;
      this.emit('redCoin', { x, y, got: this.redCoins % 8 || 8, total: Math.min(8, this.redTotal) });
      if (this.redCoins % 8 === 0) this.oneUp(x, y);
    }
    // Moneda de valor (azul, verde, rosa, ×10/×30/×50/×100): suma n monedas
    addValueCoin(x, y, n) {
      this.score += 100 * n;
      for (let i = 0; i < n; i++) this.addCoin(x, y);
    }

    update(dt, inp) {
      this.t += dt; this.stateT += dt;
      if (this.state === 'dying') {
        const p = this.player; p.vy += 1500 * dt; p.y += p.vy * dt;
        if (this.stateT > 2.4) this.afterDeath();
        return;
      }
      if (this.state === 'clear') { this.updateClear(dt); return; }
      if (this.state !== 'play') return;

      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.die('time'); return; }
      this.updateEffects(dt);
      this.updateWorld(dt);

      const p = this.player;
      // Entrando por una tubería o puerta: animación y teletransporte
      if (this.warping) { this.updateWarp(dt); this.updateCamera(dt); return; }

      this.inputJump = !!inp.jump;
      this.input = inp; // disponible para los objetos (p. ej. coger la Bomb con 'run')
      // Entrada espejada en el modo espejo para que coincida con la pantalla
      let input = this.fx.mirror ? Object.assign({}, inp, { left: inp.right, right: inp.left }) : inp;
      // Aturdido por el pisotón de MoonStar: no se puede mover
      if (this.stun > 0) { this.stun -= dt; input = { stunned: true }; }
      // las puertas se miran antes de mover (↑ en una puerta entra en vez de saltar)
      if (!input.stunned) { this.tryWarp(p, input); if (this.warping) { this.updateCamera(dt); return; } }
      p.update(this, dt, input);
      if (p.carrying) this.carryUpdate(dt);

      this.collectTiles(p);
      this.checkHazards(p);
      if (this.state !== 'play') return;

      const cam = this.camera;
      const margin = 3 * T;
      this.entities.forEach((e) => {
        if (!e.active && e.x < cam.x + cam.w + margin && e.x + e.w > cam.x - margin) e.active = true;
      });
      const goos = this.entities.filter((e) => e.type === 'goo');
      this.entities.forEach((e) => {
        if (!e.active || e.remove) return;
        if (e.enemy) e.gooSlow = goos.some((g) => U.overlap(e, g));
        e.update(this, dt);
        // Aridez Escalofriante: los enemigos son espectros que solo se ven de cerca (siguen siendo peligrosos)
        if (this.fx.ghosts && e.enemy) {
          const d = Math.hypot(e.cx() - (p.x + p.w / 2), e.cy() - (p.y + p.h / 2));
          e.ghost = U.clamp((6 * T - d) / (3 * T), 0, 1);
        }
      });
      this.interactions(p);
      // Cuenta enemigos derrotados (para la condición de victoria "Derrotar enemigos").
      // Un enemigo cuenta una sola vez, cuando entra en su animación de muerte.
      this.entities.forEach((e) => {
        if (e.enemy && !e.boss && e.type !== 'eshot' && (e.dying > 0 || e.squashed) && !e._counted) { e._counted = true; this.kills++; }
      });
      this.entities = this.entities.filter((e) => !e.remove);

      // Meta: la Medalla (solo si se cumple la condición de victoria)
      // Monedas púrpura: la Medalla normal no existe hasta juntar las necesarias
      if (this.goal && this.goalLocked && this.purpleCoins >= this.purpleNeed) { this.goalLocked = false; this.emit('goalAppear', { x: this.goal.x, y: this.goal.y + this.goal.h / 2 }); }
      if (this.goal && !this.goalLocked && this.state === 'play' && p.x + p.w > this.goal.x && p.x < this.goal.x + this.goal.w + 8 && p.y + p.h > this.goal.y) {
        if (this.winMet(false)) this.reachGoal(false);
        else if (!this.winMsgT || this.t - this.winMsgT > 1.2) { this.winMsgT = this.t; this.emit('winLocked', { x: this.goal.x, y: p.y - 24, text: this.winText() }); }
      }
      // Meta OCULTA: pasa el nivel por salida secreta (también sujeta a la condición de victoria)
      const gh = this.goalHidden;
      if (gh && this.state === 'play' && p.x + p.w > gh.x && p.x < gh.x + gh.w + 8 && p.y + p.h > gh.y) {
        if (this.winMet(true)) this.reachGoal(true);
        else if (!this.winMsgT || this.t - this.winMsgT > 1.2) { this.winMsgT = this.t; this.emit('winLocked', { x: gh.x, y: p.y - 24, text: this.winText() }); }
      }

      if (p.y > this.level.height * T + 40) this.die('fall');
      this.bumps = this.bumps.filter((b) => (b.t += dt) < 0.25);
      this.updateCamera(dt);
    }

    // ---------------------------------------------------------------- mecanismos del nivel
    updateWorld(dt) {
      const L = this.level, p = this.player;
      // Interruptor G: mientras dura, las monedas verdes ocultas (GHID) se pueden coger
      if (this.gTimer > 0) { this.gTimer -= dt; if (this.gTimer <= 0) this.emit('gSwitchEnd', {}); }
      // Interruptor P: al expirar, los bloques/monedas P vuelven a su estado normal
      if (this.pTimer > 0) { this.pTimer -= dt; if (this.pTimer <= 0) { this.setPActive(false); this.emit('pSwitchEnd', {}); } }
      // Rosquillas: si estás encima 0.5 s caen
      if (p.onGround && p.groundTile === TT.DONUT && p.groundX != null) {
        const k = p.groundX + ',' + p.groundY;
        this.donuts[k] = (this.donuts[k] || 0) + dt;
        if (this.donuts[k] > 0.5) {
          L.set(p.groundX, p.groundY, 0); delete this.donuts[k];
          const d = Ents.create('donutfall', 0, 0); d.x = p.groundX * T; d.y = p.groundY * T; d.active = true; d.tile = { x: p.groundX, y: p.groundY, back: 4 };
          this.spawn(d); this.emit('donutFall', { x: d.cx(), y: d.y });
        } else if (this.donuts[k] > 0.15) this.donutShake = k;
      } else this.donutShake = null;
      Object.keys(this.donuts).forEach((k) => { if (!p.onGround || k !== p.groundX + ',' + p.groundY) delete this.donuts[k]; });
      // las rosquillas vuelven a su sitio a los 4 s
      this.entities.forEach((e) => {
        if (e.type !== 'donutfall' || !e.tile) return;
        e.tile.back -= dt;
        if (e.tile.back <= 0 && !L.get(e.tile.x, e.tile.y)) { L.set(e.tile.x, e.tile.y, TT.DONUT); e.tile = null; }
      });
      // Nubes de la Fábrica MadStars Corrupta: desaparecen tras 1 s encima y vuelven a los 5 s
      if (this.fx.stormClouds) {
        if (p.onGround && p.groundTile === TT.CLOUD) {
          const k = p.groundX + ',' + p.groundY;
          this.cloudT[k] = (this.cloudT[k] || 0) + dt;
          if (this.cloudT[k] >= 1) { L.set(p.groundX, p.groundY, 0); this.goneClouds.push({ x: p.groundX, y: p.groundY, t: 5 }); delete this.cloudT[k]; this.emit('cloudPoof', { x: (p.groundX + 0.5) * T, y: p.groundY * T }); }
        }
        this.goneClouds = this.goneClouds.filter((c) => {
          c.t -= dt;
          if (c.t > 0) return true;
          if (!U.overlap(p, { x: c.x * T, y: c.y * T, w: T, h: T })) { L.set(c.x, c.y, TT.CLOUD); return false; }
          return true;
        });
        // rayos hacia abajo desde las nubes que hay en pantalla
        this.boltT -= dt;
        if (this.boltT <= 0) {
          this.boltT = U.rand(1.2, 2.2);
          const cam = this.camera, clouds = [];
          for (let y = Math.max(0, Math.floor(cam.y / T)); y < Math.min(L.height, Math.ceil((cam.y + cam.h) / T)); y++)
            for (let x = Math.max(0, Math.floor(cam.x / T)); x < Math.min(L.width, Math.ceil((cam.x + cam.w) / T)); x++)
              if (L.get(x, y) === TT.CLOUD) clouds.push({ x, y });
          if (clouds.length) {
            const c = clouds[Math.floor(Math.random() * clouds.length)];
            let by = c.y + 1; while (by < L.height && !C.isSolid(L.get(c.x, by), L) && !C.isSemi(L.get(c.x, by))) by++;
            const b = Ents.create('lightning', 0, 0); b.x = c.x * T + T / 2 - b.w / 2; b.y = (c.y + 1) * T; b.h = Math.max(T, (by - c.y - 1) * T); b.active = true;
            this.spawn(b); this.emit('boltWarn', { x: b.cx(), y: b.y });
          }
        }
      }
      // Núcleo Fundido Corrupto: lluvia de meteoritos
      if (this.fx.meteors) {
        this.meteorT -= dt;
        if (this.meteorT <= 0) {
          this.meteorT = U.rand(1.6, 3);
          const m = Ents.create('meteor', 0, 0), cam = this.camera;
          m.x = cam.x + U.rand(0.2, 1.1) * cam.w; m.y = cam.y - 40; m.vx = -U.rand(60, 140); m.vy = U.rand(260, 340); m.active = true;
          this.spawn(m); this.emit('meteorWarn', { x: m.x + m.vx * 1.5, y: cam.y + cam.h });
        }
      }
    }

    // Tipo de líquido en un punto: 'water' | 'lava' | 'poison' | 'jelly' | null
    liquidAt(px, py) {
      // Las olas de Sunlight Seaside Corrupto cuentan como el líquido del que salen
      const t = this.level.get(Math.floor(px / T), Math.floor(py / T)) || this.waveTileAt(px, py);
      if (t === TT.WATER || t === TT.WATERCOIN) return 'water';
      if (t === TT.LIQUID) return this.theme.id === 'volcano' ? 'lava' : this.theme.id === 'lake' ? 'jelly' : 'poison';
      if (py > this.liquidY + 6) return 'lava';
      if (this.theme.swim && py > 0) return 'water';
      return null;
    }

    // Sunlight Seaside Corrupto (Marejada): el agua y el líquido hacen olas que viajan
    // hacia la derecha (~2 casillas/s, una cresta cada 7 casillas). Su tamaño va por
    // series: ratos de olas grandes y ratos de calma. Devuelve la altura (px) en x.
    waveH(px) {
      if (!this.fx.waves) return 0;
      const env = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * 0.5));
      const s = Math.sin((px / (T * 7)) * Math.PI * 2 - this.t * 1.8);
      return s > 0 ? Math.pow(s, 1.6) * env * T * 1.6 : 0;
    }

    // Tile de líquido (WATER / LIQUID) cuya ola cubre el punto (aire), o 0.
    // Solo crecen las superficies (líquido con aire encima) y como mucho 2 casillas.
    waveTileAt(px, py) {
      if (!this.fx.waves) return 0;
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (this.level.get(tx, ty) !== TT.EMPTY) return 0;
      for (let d = 1; d <= 2; d++) {
        const t = this.level.get(tx, ty + d);
        if (t === TT.EMPTY) continue;
        if (t !== TT.WATER && t !== TT.LIQUID) return 0;
        const surf = (ty + d) * T + (t === TT.LIQUID ? 8 : 0); // el líquido se dibuja 8 px por debajo
        return py >= surf - this.waveH(px) ? t : 0;
      }
      return 0;
    }

    // Cambia a la zona z (0 = base, 1..2 = subzonas). Reconstruye el mundo de esa zona
    // conservando al jugador, vidas, puntos, monedas, estrellas, etc.
    // Devuelve el gizmo (tubería/puerta) nº gizmoIdx de la familia fam en la zona nueva.
    enterZone(z, gizmoIdx, fam) {
      const data = this.sourceLevel.zoneData(z);
      if (!data) return null;
      this.zone = z;
      this.level = new S.Model.Level(U.deepClone(data));
      this.theme = S.Model.Themes.get(this.level.theme);
      this.mode = this.level.mode;
      this.pal = S.Model.Themes.palette(this.theme, this.mode);
      this.fx = {};
      if (this.mode === 'corrupt') this.fx[this.theme.effect] = true;
      // reconstruir entidades de la zona
      this.entities = [];
      this.level.objects.forEach((o) => {
        if (o.type === 'start' || o.type === 'goal') return;
        const e = Ents.create(o.type, o.x, o.y, o);
        if (!e) return;
        if (this.fx.abyss && e.enemy && !e.boss && !C.OBJECTS[o.type].water && U.hash(o.x * 7 + o.y) < 0.6) e.swims = true;
        if (this.level.get(o.x, o.y) === TT.RAIL && S.Model.Rail.rideable(e)) S.Model.Rail.attach(e, this.level, o.x, o.y, o.dir);
        // puertas/tuberías con llave que ya abriste en esta zona siguen abiertas al volver
        if (e.locked && this.unlocked && this.unlocked[z + ':' + o.x + ',' + o.y]) e.locked = false;
        this.entities.push(e);
      });
      ['pipe', 'door'].forEach((family) => {
        const list = this.entities.filter((e) => e.gizmo && e.family === family);
        list.forEach((e, i) => {
          if (e.to) { if (e.to.z === z) { e.link = list[e.to.i] || null; e.toZone = null; } else { e.link = null; e.toZone = e.to; } }
          else { e.link = list.length > 1 ? list[(i + 1) % list.length] : null; e.toZone = null; }
        });
      });
      this.stampPipes();
      // contadores que dependen de la zona
      this.redTotal = 0; for (let i = 0; i < this.level.tiles.length; i++) if (this.level.tiles[i] === TT.RCOIN) this.redTotal++;
      this.starTotal = this.level.objects.filter((o) => (C.OBJECTS[o.type] || {}).collect).length;
      this.level.ab = [0, 0, 0]; this.level.ex = (this.exState || [0, 0, 0]).slice(); this.gTimer = 0;
      this.pTimer = 0; this.level.pActive = false;
      this.donuts = {}; this.cloudT = {}; this.goneClouds = []; this.boltT = 2; this.meteorT = 3;
      const goal = this.level.objects.find((o) => o.type === 'goal');
      this.goal = goal ? { x: goal.x * T + T / 2 - 4, y: (goal.y + 1) * T - 192, w: 8, h: 192, medalY: 0, tx: goal.x, ty: goal.y } : null;
      const gh = this.level.objects.find((o) => o.type === 'goalhidden');
      this.goalHidden = gh ? { x: gh.x * T + T / 2 - 4, y: (gh.y + 1) * T - 192, w: 8, h: 192, medalY: 0, tx: gh.x, ty: gh.y, hidden: true } : null;
      this.gravMul = this.fx.lowGravity ? 0.55 : this.fx.abyss ? 0.5 : 1;
      this.enemySpeedMul = this.fx.speedUp ? 1.75 : this.fx.glitch ? 1.25 : 1;
      this.obstacleMul = this.fx.speedUp ? 1.9 : 1;
      this.beatT = 0; this.timeWarpT = 4; this.timeWarp = 1; this.rouletteT = 6; this.rouletteRule = null;
      this.gateSealed = !!this.fx.medalGate;
      this.baseLiquid = this.level.height * T + 200; this.liquidY = this.baseLiquid;
      this.boss = this.entities.find((e) => e.boss) || null;
      this.emit('zoneChange', { zone: z });
      const list = this.entities.filter((e) => e.gizmo && e.family === fam);
      return list[gizmoIdx] || list[0] || null;
    }

    // ---------------------------------------------------------------- tuberías y puertas
    // Tuberías enlazables: su boca + cuerpo son sólidos (casillas invisibles PIPEX donde no haya
    // ya algo). Solo en la copia del nivel de la partida: el nivel guardado no cambia.
    stampPipes() {
      const L = this.level;
      L.objects.forEach((o) => {
        if (!S.Model.Pipe.isPipe(o.type)) return;
        S.Model.Pipe.cells(o).forEach(([x, y]) => { if (L.inBounds(x, y) && !L.get(x, y)) L.set(x, y, TT.PIPEX); });
      });
    }
    // Caja en píxeles de la BOCA (2×2) de una tubería
    mouthBox(e) { return { x: e.tx * T, y: e.ty * T, w: 2 * T, h: 2 * T }; }
    tryWarp(p, inp) {
      // (antes había un corte global por onGround; ahora cada rama exige lo suyo, porque
      //  la tubería horizontal se puede tomar también en el aire, a la altura de su boca)
      for (const e of this.entities) {
        if (!e.gizmo || !e.active) continue;
        if (e.family === 'pipe') {
          // Se entra por la BOCA según hacia dónde mire (como en SMM)
          const m = this.mouthBox(e), cx = p.x + p.w / 2, cy = p.y + p.h / 2, pd = e.pd | 0;
          if (pd === 0) {
            // boca ARRIBA: de pie encima y pulsando ↓
            if (!inp.down || !p.onGround) continue;
            const feet = p.y + p.h;
            if (cx < m.x + 6 || cx > m.x + m.w - 6 || feet < m.y - 6 || feet > m.y + 6) continue;
          } else if (pd === 2) {
            // boca ABAJO: debajo, con la cabeza en la boca y pulsando ↑ (saltando o de pie)
            if (!inp.up) continue;
            if (cx < m.x + 6 || cx > m.x + m.w - 6 || p.y > m.y + m.h + 6 || p.y < m.y + m.h - 8) continue;
          } else {
            // boca a un LADO: a la altura de la boca y caminando hacia ella
            if (cy < m.y + 2 || cy > m.y + m.h - 2) continue;
            if (pd === 3 && !(inp.right && p.x + p.w >= m.x - 3 && p.x + p.w <= m.x + 8)) continue; // boca a la izquierda: yendo →
            if (pd === 1 && !(inp.left && p.x <= m.x + m.w + 3 && p.x >= m.x + m.w - 8)) continue;   // boca a la derecha: yendo ←
          }
        } else {
          // delante de la puerta y pulsando arriba
          if (!inp.upPressed || !p.onGround || !U.overlap(p, e)) continue;
        }
        // sin destino: no gastes la llave en una puerta que no lleva a ningún sitio
        if (!e.link && !e.toZone) { if (!this.lockMsgT || this.t - this.lockMsgT > 1) { this.lockMsgT = this.t; this.emit('noLink', { x: e.cx(), y: e.y, family: e.family }); } continue; }
        if (e.locked) {
          if (this.keys > 0) { this.keys--; e.locked = false; this.unlocked[this.zone + ':' + e.tx + ',' + e.ty] = true; this.emit('unlock', { x: e.cx(), y: e.cy(), family: e.family }); }
          else { if (!this.lockMsgT || this.t - this.lockMsgT > 1) { this.lockMsgT = this.t; this.emit('locked', { x: e.cx(), y: e.y, family: e.family }); } continue; }
        }
        this.warping = { from: e, to: e.link, toZone: e.toZone, fam: e.family, t: 0, phase: 'in' };
        p.vx = 0; p.vy = 0;
        if (e.family === 'door') e.open = 1;
        this.emit(e.family === 'pipe' ? 'pipeIn' : 'doorIn', { x: e.cx(), y: e.cy() });
        return;
      }
    }
    updateWarp(dt) {
      const w = this.warping, p = this.player;
      w.t += dt;
      const pipe = w.from.family === 'pipe';
      // coloca al jugador en la boca de la tubería destino d (según su orientación)
      // coloca al jugador FUERA de la boca de la tubería destino d (según hacia dónde mire)
      const placeAtPipe = (d) => {
        const m = this.mouthBox(d), pd = d.pd | 0;
        if (pd === 0) { p.x = m.x + m.w / 2 - p.w / 2; p.y = m.y - p.h; }            // arriba: encima
        else if (pd === 2) { p.x = m.x + m.w / 2 - p.w / 2; p.y = m.y + m.h + 1; }   // abajo: debajo (cae)
        else if (pd === 3) { p.x = m.x - p.w - 1; p.y = m.y + m.h - p.h - 1; }       // izquierda: a su lado
        else { p.x = m.x + m.w + 1; p.y = m.y + m.h - p.h - 1; }                     // derecha: a su lado
        p.vx = 0; p.vy = 0;
      };
      if (w.phase === 'in') {
        if (pipe) {
          // entrada: el Glob se mete por la boca (hacia dentro según la orientación)
          const m = this.mouthBox(w.from), pd = w.from.pd | 0;
          if (pd === 0) { p.y += 60 * dt; p.x = U.approach(p.x, m.x + m.w / 2 - p.w / 2, 200 * dt); }
          else if (pd === 2) { p.y -= 60 * dt; p.x = U.approach(p.x, m.x + m.w / 2 - p.w / 2, 200 * dt); }
          else { p.x += (pd === 3 ? 1 : -1) * 70 * dt; p.y = U.approach(p.y, m.y + m.h - p.h - 4, 160 * dt); }
        }
        p.warpAlpha = pipe ? 1 : Math.max(0, 1 - w.t / 0.4);
        if (w.t > 0.55) {
          // Destino en otra zona: recargar esa zona y salir en el gizmo destino
          if (w.toZone) {
            const d = this.enterZone(w.toZone.z, w.toZone.i, w.fam);
            if (d) {
              if (d.family === 'pipe') placeAtPipe(d); else { p.x = d.cx() - p.w / 2; p.y = d.y + d.h - p.h; d.open = 1; }
              if (d.locked) { d.locked = false; this.unlocked[this.zone + ':' + d.tx + ',' + d.ty] = true; } // sales por ella: queda abierta
            }
          } else {
            const d = w.to;
            // salir en la boca de la tubería destino (según orientación) o delante de la puerta destino
            if (d.family === 'pipe') placeAtPipe(d);
            else { p.x = d.cx() - p.w / 2; p.y = d.y + d.h - p.h; d.open = 1; }
            if (d.locked) { d.locked = false; this.unlocked[this.zone + ':' + d.tx + ',' + d.ty] = true; }
          }
          w.phase = 'out'; w.t = 0;
          this.updateCamera(1);
          this.emit(pipe ? 'pipeOut' : 'doorOut', { x: p.x + p.w / 2, y: p.y });
        }
      } else {
        p.warpAlpha = Math.min(1, w.t / 0.3);
        if (w.t > 0.3) { this.warping = null; p.warpAlpha = 1; }
      }
    }

    // ---------------------------------------------------------------- bloques especiales
    toggleAB(k) {
      this.level.ab[k] = this.level.ab[k] ? 0 : 1;
      this.emit('abToggle', { k, state: this.level.ab[k] });
      this.unstickPlayer();
    }
    // Si un bloque recién vuelto sólido ATRAPA el cuerpo del jugador, lo saca por arriba.
    // Se comprueba el torso (no el pie): el pie siempre roza el suelo y daría falsos
    // positivos que lanzaban al Glob hacia arriba sin estar realmente atrapado.
    unstickPlayer() {
      const p = this.player, L = this.level, P = S.Model.Physics;
      const stuck = () => {
        const yTop = p.y + 3, yMid = p.y + p.h * 0.5; // torso, nunca el borde del pie
        return P.solidAt(L, p.x + 2, yTop) || P.solidAt(L, p.x + p.w - 2, yTop)
          || P.solidAt(L, p.x + 2, yMid) || P.solidAt(L, p.x + p.w - 2, yMid);
      };
      for (let i = 0; i < 4 && stuck(); i++) p.y -= T;
    }
    // Interruptor P clásico: durante 10 s las monedas P se vuelven bloques y los bloques P, monedas
    pSwitch() { this.pTimer = 10; this.setPActive(true); this.emit('pSwitch', { x: this.player.x, y: this.player.y }); }
    setPActive(on) {
      this.level.pActive = !!on;
      this.unstickPlayer(); // igual que A/B: solo sube si el torso queda atrapado
    }
    gSwitch() { this.gTimer = 10; this.emit('gSwitch', { x: this.player.x, y: this.player.y }); }
    // Interruptor "!": activa (de forma persistente) los bloques "!" del color k.
    // Activarlo pasa el nivel por meta oculta.
    pressExclaim(k, x, y) {
      if (!this.exState) this.exState = [0, 0, 0];
      this.exState[k] = 1; this.level.ex[k] = 1;
      this.emit('exToggle', { k, x, y });
      this.unstickPlayer(); // solo sube si el torso queda atrapado (no el pie)
      const p = this.player;
      // cuenta como completar por meta oculta (clear directo, sin bajar por un poste)
      this.secretClear = true;
      if (this.state === 'play') {
        this.state = 'clear'; this.stateT = 3.4; // salta a la fase de recuento
        this.clearGoal = this.goal || { x: p.x, y: p.y, h: 192, grabY: p.y, medalY: 0 };
        this.clearBonus = 2000; this.addScore(2000, { x, y, w: 0 });
        this.medals = 1; p.vx = 0; p.vy = 0;
        this.emit('goal', { x, y, bonus: 2000, secret: true, viaSwitch: true });
      }
    }
    // POW: mata a los enemigos que están en el suelo en pantalla
    pow(x, y) {
      const cam = this.camera;
      this.entities.forEach((e) => {
        if (!e.enemy || e.dying || e.remove || e.type === 'eshot') return;
        if (e.x + e.w < cam.x || e.x > cam.x + cam.w) return;
        if (e.boss) { if (e.damage) e.damage(this, 1, 'pow'); }
        else if (e.onGround || e.swims) { e.kill(this); this.addScore(200, e); }
      });
      this.emit('pow', { x, y });
    }
    // Explosión: hiere al jugador y a los enemigos en el radio y rompe bloques
    explode(x, y, r, src) {
      const ex = Ents.create('explosion', 0, 0); ex.x = x - ex.w / 2; ex.y = y - ex.h / 2; ex.radius = r; ex.active = true; this.spawn(ex);
      this.emit('explode', { x, y, r });
      const p = this.player;
      if (Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y) < r + 12 && this.state === 'play') this.hurtPlayer();
      this.entities.forEach((e) => {
        if (e === src || !e.enemy || e.dying || e.remove) return;
        if (Math.hypot(e.cx() - x, e.cy() - y) < r + e.w / 2) { if (e.boss) { if (e.damage) e.damage(this, 1, 'explosion'); } else if (e.type !== 'eshot') { e.kill(this); this.addScore(200, e); } }
      });
      const L = this.level;
      for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++)
        for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++) {
          const t = L.get(tx, ty);
          if ((t === TT.BRICK || t === TT.BOX || t === TT.HIDDEN || t === TT.NOTE) && Math.hypot((tx + 0.5) * T - x, (ty + 0.5) * T - y) < r + T * 0.5) this.hitBlock(tx, ty, true, false);
        }
    }
    stunPlayer(t) { if (this.player.star > 0) return; this.stun = t; this.emit('stun', {}); }

    // ---------------------------------------------------------------- cargar objetos (Bomb Pyce)
    pickUp(e) {
      const p = this.player;
      if (p.carrying || e.carried) return;
      e.carried = true; e.vx = 0; e.vy = 0; e.harmful = false; e.stompable = false;
      p.carrying = e;
      this.emit('pickUp', { x: e.cx(), y: e.cy() });
    }
    // Coloca lo que lleva encima de la cabeza y lo suelta/lanza al dejar el botón de correr
    carryUpdate(dt) {
      const p = this.player, e = p.carrying;
      if (!e || e.remove) { p.carrying = null; return; }
      e.x = p.x + p.w / 2 - e.w / 2; e.y = p.y - e.h - 2;
      e.dir = p.face;
      // soltar: al dejar de pulsar correr, la lanza hacia donde mira
      if (!this.input || !this.input.run) this.throwCarried();
    }
    throwCarried() {
      const p = this.player, e = p.carrying;
      if (!e) return;
      p.carrying = null; e.carried = false; e.stompable = true;
      e.x = p.x + (p.face > 0 ? p.w + 2 : -e.w - 2); e.y = p.y;
      if (e.lit > 0) e.kickV = p.face * 320; else { e.vx = p.face * 60; e.dir = p.face; }
      this.emit('throw', { x: e.cx(), y: e.cy() });
    }

    updateEffects(dt) {
      const fx = this.fx;
      if (fx.wind) {
        this.windT -= dt;
        if (this.windT <= 0) { this.windT = U.rand(3, 5); this.windTarget = this.windTarget ? 0 : (Math.random() < 0.5 ? -1 : 1) * 240; if (this.windTarget) this.emit('wind', { dir: Math.sign(this.windTarget) }); }
        this.wind = U.approach(this.wind, this.windTarget || 0, 260 * dt);
      }
      if (fx.currents) { this.currentX = Math.sin(this.t * 0.45) * 95; this.currentY = Math.cos(this.t * 0.7) * 30; }
      if (fx.risingLiquid) this.liquidY = (this.level.height - 2.2) * T - (Math.sin(this.t * 0.35) * 0.5 + 0.5) * 6 * T;
      if (fx.glitch) {
        this.glitchT -= dt; this.glitchPulse = Math.max(0, this.glitchPulse - dt * 2);
        if (this.glitchT <= 0) { this.glitchT = 6; this.convDir *= -1; this.glitchPulse = 1; this.emit('glitch', {}); }
      }
    }

    updateCamera(dt) {
      const c = this.camera, p = this.player, L = this.level;
      const maxX = Math.max(0, L.width * T - c.w);
      // AUTOSCROLL: la camara avanza sola y nunca retrocede; si te quedas detras, mueres.
      if (L.scroll && dt < 1 && this.state === 'play') {
        this.scrollX = Math.min(maxX, (this.scrollX || 0) + L.scrollSpeed * dt);
        c.x = this.scrollX;
        const ty0 = U.clamp(p.y + p.h / 2 - c.h * 0.55, 0, Math.max(0, L.height * T - c.h));
        c.y = U.lerp(c.y, ty0, Math.min(1, (dt * 8) * 0.8));
        // empuja al jugador para que no se quede detras del borde; si lo cruza, muere
        if (p.x < c.x + 2) { p.x = c.x + 2; if (p.vx < 0) p.vx = 0; }
        if (p.x + p.w > c.x + c.w - 2 && p.vx > 0) p.x = c.x + c.w - 2 - p.w; // tope derecho suave
        if (p.x + p.w < c.x - 4) this.die('fall');
        return;
      }
      let tx = U.clamp(p.x + p.w / 2 - c.w / 2 + p.face * 40, 0, maxX);
      // LIMITE DE SCROLL: una columna de suelo TANGIBLE de arriba abajo frena la camara (sala SMW).
      // Se busca la primera a la derecha del centro de la pantalla, dentro del rango visible.
      const camLimit = this.solidColumnLimit(c);
      if (camLimit != null) tx = Math.min(tx, camLimit);
      const ty = U.clamp(p.y + p.h / 2 - c.h * 0.55, 0, Math.max(0, L.height * T - c.h));
      const k = dt >= 1 ? 1 : Math.min(1, dt * 8);
      c.x = U.lerp(c.x, tx, k); c.y = U.lerp(c.y, ty, Math.min(1, k * 0.8));
    }
    // Primera columna completamente sólida (de arriba abajo) por delante de la mitad de la pantalla.
    // Devuelve el tope de cámara (px) para no enseñar más allá, o null si no hay.
    solidColumnLimit(c) {
      const L = this.level, H = L.height;
      const from = Math.floor((c.x + c.w * 0.5) / T) + 1, to = Math.min(L.width - 1, Math.floor((c.x + c.w) / T) + 2);
      for (let x = from; x <= to; x++) {
        let full = true;
        for (let y = 0; y < H; y++) { const t = L.get(x, y); if (!C.isSolid(t, L) || t === C.T.WATER) { full = false; break; } }
        if (full) return Math.max(0, (x + 1) * T - c.w); // la cámara no pasa de esta columna
      }
      return null;
    }

    // Monedas y punto de control
    collectTiles(p) {
      const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 1) / T);
      const y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 1) / T);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const t = this.level.get(x, y);
        const px = x * T + T / 2, py = y * T + T / 2;
        if (t === TT.COIN) { this.level.set(x, y, 0); this.addCoin(px, py); }
        // Moneda dentro del agua: se recoge y queda el AGUA (no vacio)
        else if (t === TT.WATERCOIN) { this.level.set(x, y, TT.WATER); this.addCoin(px, py); }
        else if (t === TT.RCOIN) { this.level.set(x, y, 0); this.addRedCoin(px, py); }
        else if (t === TT.VCOIN) { this.level.set(x, y, 0); this.addPurpleCoin(px, py); }
        // Bloque del Interruptor P que ahora mismo es moneda: se recoge (y ya no vuelve)
        else if (C.isPCoin(t, this.level.pActive)) { this.level.set(x, y, 0); this.addCoin(px, py); }
        else if (t === TT.GHID) { if (this.gTimer > 0) { this.level.set(x, y, 0); this.addValueCoin(px, py, C.coinValue(TT.GCOIN)); } }
        else if (C.isCoin(t)) { this.level.set(x, y, 0); this.addValueCoin(px, py, C.coinValue(t)); }
      }
    }

    checkHazards(p) {
      if (p.star > 0) return;
      // Pinchos: se comprueba un borde de 1px alrededor de la caja
      const pts = [[p.x - 1, p.y + p.h / 2], [p.x + p.w + 1, p.y + p.h / 2], [p.x + 3, p.y + p.h + 1], [p.x + p.w - 3, p.y + p.h + 1], [p.x + 3, p.y - 1], [p.x + p.w - 3, p.y - 1]];
      // El Glob de Jabón mientras patina ignora los pinchos
      if (!p.sliding && pts.some(([x, y]) => this.level.get(Math.floor(x / T), Math.floor(y / T)) === TT.SPIKE)) this.hurtPlayer();
      // Líquido peligroso (bloque, marea, o una ola de líquido en Sunlight Seaside Corrupto)
      const fx0 = p.x + p.w / 2, fy0 = p.y + p.h - 6;
      const footT = this.level.get(Math.floor(fx0 / T), Math.floor(fy0 / T)) || this.waveTileAt(fx0, fy0);
      if (footT === TT.LIQUID || p.y + p.h - 8 > this.liquidY) { this.die('liquid'); return; }
      // Barra Estelar
      for (const e of this.entities) if (e.type === 'firebar' && e.active && e.hits(p)) { this.hurtPlayer(); break; }
    }

    hurtPlayer() {
      const r = this.player.hurt();
      if (r === true) this.die('enemy');
      else if (r === 'shrink') this.emit('shrink', { x: this.player.x, y: this.player.y });
    }

    interactions(p) {
      for (const e of this.entities) {
        if (!e.active || e.remove || e.dying > 0) continue;
        // Proyectiles amigos contra enemigos
        if (e.friendly) {
          for (const o of this.entities) {
            if (!o.enemy || o.dying > 0 || o.remove || !o.active) continue;
            if (!U.overlap(e, o)) continue;
            if (o.intangible) continue;
            if (e.type === 'starwave') { if (o.boss) { if (o.damage) o.damage(this, 1, 'wave'); } else if (o.type !== 'eshot') { o.kill(this); this.addScore(200, o); } }
            else if (o.type === 'eshot' || o.type === 'meteor' || o.type === 'lightning' || o.type === 'icicle') continue;
            else {
              // los que no se pueden disparar (Knight Pyce, jefes fantasma...) hacen rebotar el disparo
              const hit = o.hitByShot(this);
              if (hit !== false && !o.boss && o.dying > 0) this.addScore(200, o);
              if (hit !== false && e.onHit) e.onHit(this);
              e.remove = true;
              if (hit !== false) this.emit('shotHit', { x: e.cx(), y: e.cy(), color: e.color });
            }
            break;
          }
          continue;
        }
        if (!U.overlap(p, e)) continue;
        if (e.item) { this.collectItem(e); continue; }
        // los interruptores "!" son gizmo pero SÍ reaccionan al tocarlos
        if (e.exk != null && e.onTouch) { e.onTouch(this, p); continue; }
        if (e.type === 'coinpop' || e.gizmo || e.intangible || e.type === 'sprayfog' || e.type === 'explosion' || e.type === 'goo') continue;
        // objetos con comportamiento propio al tocarlos (cápsula de SnowCapsule, Bomb encendida, Interruptor P...)
        if (e.onTouch && e.onTouch(this, p)) continue;
        if (e.type === 'spring') {
          if (p.vy > 0 && p.y + p.h - e.y < 18) { p.y = e.y - p.h; p.vy = -980; p.onGround = false; p.jumpHeld = true; p.pound = 0; e.squash = 1; this.emit('spring', { x: e.cx(), y: e.y }); }
          continue;
        }
        if (e.type === 'checkpoint') {
          if (!e.taken) { e.taken = true; this.checkpoint = { x: e.tx, y: e.ty }; this.emit('checkpoint', { x: e.cx(), y: e.y }); if (!p.big) p.setForm(1, null); }
          continue;
        }
        if (!e.enemy) continue;
        if (p.star > 0) { if (e.boss) { if (e.damage) e.damage(this, 1, 'star'); } else if (e.kill) { e.kill(this); this.addScore(200, e); } continue; }
        const falling = p.vy > 0 || p.pound > 0;
        const fromAbove = p.y + p.h - e.y < 14 + Math.max(0, p.vy) / 40;
        if (falling && fromAbove && (e.stompable || (p.pound > 0 && e.poundable))) {
          e.onStomp(this);
          if (!e.boss) this.addScore(100, e);
          p.vy = this.inputJump ? -560 : -400; p.pound = 0; p.jumpHeld = true; p.y = e.y - p.h;
          if (p.special === 'vacio') p.airJumps = 1;
        } else if (e.harmful) this.hurtPlayer();
        if (this.state !== 'play') return;
      }
    }

    collectItem(e) {
      const p = this.player;
      e.remove = true;
      const at = { x: e.cx(), y: e.cy() };
      // Moneda de valor múltiple (objeto 2×2): da 'value' monedas
      if (e.value) { this.addValueCoin(at.x, at.y, e.value); return; }
      // Moneda Estrella: coleccionable, suma al contador de estrellas del nivel
      if (e.collect) {
        this.stars++; this.addScore(1000, e);
        this.emit('starCoin', Object.assign({}, at, { got: this.stars, total: this.starTotal, skin: e.skin }));
        if (this.stars >= this.starTotal && this.starTotal > 0) this.emit('starCoinsDone', at);
        // Estrella de la Traición: la coges igual, pero te hace daño
        if (e.hurt) this.hurtPlayer();
        return;
      }
      if (e.type === 'evo') {
        // Gota Evo (champiñón): solo lleva de EVO1 a EVO2
        if (!p.special && p.evo < 1) { p.setForm(1, null); this.emit('evolve', Object.assign({}, at, { name: p.formName() })); }
        else { this.addScore(1000, e); this.emit('powerup', at); }
      } else if (e.type === 'flor') {
        // Flor Estelar: lleva de EVO2 a EVO3 (la forma de la habilidad). Si aún es pequeño, primero crece.
        if (!p.special && p.evo < 2) { p.setForm(Math.min(2, p.evo + 1), null); this.emit('evolve', Object.assign({}, at, { name: p.formName() })); }
        else { this.addScore(1000, e); this.emit('powerup', at); }
      } else if (e.type === 'caca' || e.type === 'vacio') {
        p.setForm(Math.max(1, p.evo), e.type);
        this.emit('evolve', Object.assign(at, { name: p.formName(), special: e.type }));
      } else if (e.type === 'brillo') { p.star = 9; this.emit('star', at); }
      else if (e.type === 'miniglob') this.oneUp(at.x, at.y);
      else if (e.type === 'gcoin') { this.addCoin(at.x, at.y); return; }
      else if (e.type === 'key') { this.keys++; this.emit('key', Object.assign(at, { keys: this.keys })); return; }
      else if (e.char) {
        // Cápsula de personaje: te conviertes en otro Glob (mantienes la evolución)
        p.setCharacter(e.char);
        this.emit('evolve', Object.assign(at, { name: p.formName(), capsule: e.char }));
      }
      this.addScore(1000, e);
    }

    // Golpear bloques desde abajo
    hitBlocksFromBelow(cells, p) {
      const cx = p.x + p.w / 2;
      cells.sort((a, b) => Math.abs((a.x + 0.5) * T - cx) - Math.abs((b.x + 0.5) * T - cx));
      const c = cells[0];
      this.hitBlock(c.x, c.y, p.big, true);
    }

    hitBlock(x, y, canBreak, fromBelow) {
      const t = this.level.get(x, y);
      const key = x + ',' + y;
      const content = this.level.contents[key];
      const bumpEnemies = () => {
        this.entities.forEach((e) => {
          if (e.enemy && e.active && !e.dying && e.x + e.w > x * T && e.x < (x + 1) * T && Math.abs(e.y + e.h - y * T) < 6) { e.kill(this); this.addScore(100, e); }
          if (e.item && Math.abs(e.y + e.h - y * T) < 6 && e.x + e.w > x * T && e.x < (x + 1) * T) { e.vy = -350; e.dir = e.cx() < (x + 0.5) * T ? -1 : 1; }
        });
        if (fromBelow && this.level.get(x, y - 1) === TT.COIN) { this.level.set(x, y - 1, 0); this.addCoin(x * T + T / 2, (y - 1) * T); }
      };
      // Interruptor G: activa las monedas verdes ocultas un rato (como el P)
      if (t === TT.SWG) { this.bumps.push({ x, y, t: 0 }); bumpEnemies(); this.gSwitch(); return; }
      // Interruptor P clásico: intercambia monedas P <-> bloques P durante un rato
      if (t === TT.PSW) { this.bumps.push({ x, y, t: 0 }); bumpEnemies(); this.pSwitch(); return; }
      // Interruptores A/B: cambian los bloques de su color
      if (C.isSwitch(t)) { this.bumps.push({ x, y, t: 0 }); bumpEnemies(); this.toggleAB(t - TT.SW0); return; }
      // POW: un solo uso
      if (t === TT.POW) { this.level.set(x, y, 0); bumpEnemies(); this.pow((x + 0.5) * T, y * T); return; }
      // Bloque Nota: rebota; si tiene contenido lo suelta una vez
      if (t === TT.NOTE) {
        this.bumps.push({ x, y, t: 0 }); bumpEnemies();
        if (content) { delete this.level.contents[key]; this.releaseContent(content, x, y, fromBelow); }
        this.emit('note', { x: (x + 0.5) * T, y: y * T });
        return;
      }
      if (t === TT.BOX || t === TT.HIDDEN || (t === TT.BRICK && content)) {
        this.level.set(x, y, TT.USED);
        delete this.level.contents[key];
        this.releaseContent(content || 'coin', x, y, fromBelow);
        this.bumps.push({ x, y, t: 0 }); bumpEnemies();
        this.emit('bump', { x: x * T + T / 2, y: y * T, content: content || 'coin' });
      } else if (t === TT.BRICK) {
        if (canBreak) {
          this.level.set(x, y, 0); this.score += 50;
          this.emit('break', { x: x * T + T / 2, y: y * T + T / 2 }); bumpEnemies();
        } else { this.bumps.push({ x, y, t: 0 }); bumpEnemies(); this.emit('bumpSoft', { x: x * T + T / 2, y: y * T }); }
      } else if (C.isSolid(t, this.level)) this.emit('bumpSoft', { x: x * T + T / 2, y: y * T });
    }

    // El jugador aterriza sobre un bloque: Nota (rebote alto) y POW / interruptores (culetazo)
    landOn(p, tx, ty, pounding, jumpHeld) {
      const t = this.level.get(tx, ty);
      if (t === TT.NOTE) {
        p.vy = jumpHeld ? -900 : -620; p.onGround = false; p.jumpHeld = jumpHeld; p.pound = 0;
        this.bumps.push({ x: tx, y: ty, t: 0 });
        const k = tx + ',' + ty;
        if (this.level.contents[k]) { const c = this.level.contents[k]; delete this.level.contents[k]; this.releaseContent(c, tx, ty, false); }
        this.emit('note', { x: (tx + 0.5) * T, y: ty * T });
        return true;
      }
      if (pounding && (t === TT.POW || C.isSwitch(t))) { this.hitBlock(tx, ty, true, false); return true; }
      return false;
    }

    releaseContent(content, x, y, up) {
      if (content === 'coin') {
        const e = Ents.create('coinpop', 0, 0); e.x = x * T + 6; e.y = (y - (up ? 1 : -1)) * T; e.active = true; this.spawn(e);
        this.addCoin(x * T + T / 2, y * T); return;
      }
      const e = Ents.create(content, x, y);
      if (!e) return;
      e.active = true;
      if (e.fromBox) e.fromBox(x, y);
      e.dir = this.player.face;
      this.spawn(e);
      this.emit('itemAppear', { x: x * T + T / 2, y: y * T });
    }

    groundPound(p) {
      this.emit('pound', { x: p.x + p.w / 2, y: p.y + p.h, heavy: p.ch.stats.heavy });
      const y = Math.floor((p.y + p.h + 2) / T);
      const x0 = Math.floor((p.x + 2) / T), x1 = Math.floor((p.x + p.w - 2) / T);
      // POW e interruptores A/B funcionan con cualquier tamaño
      for (let x = x0; x <= x1; x++) if (this.landOn(p, x, y, true, false)) return;
      if (!(p.big || p.ch.stats.heavy)) return;
      let broke = false;
      for (let x = x0; x <= x1; x++) {
        const t = this.level.get(x, y);
        if (t === TT.BRICK || t === TT.BOX || t === TT.HIDDEN || t === TT.NOTE) { this.hitBlock(x, y, true, false); broke = true; }
      }
      if (broke) { p.vy = -120; }
    }

    playerShoot(p) {
      const shots = this.entities.filter((e) => e.friendly && e.type !== 'starwave').length;
      if (shots >= 2) return;
      const type = p.special === 'caca' ? 'poop' : 'shot';
      const s = Ents.create(type, 0, 0);
      s.x = p.face > 0 ? p.x + p.w : p.x - s.w; s.y = p.y + p.h * 0.35;
      s.vx = p.face * 330 + p.vx * 0.3; s.vy = 80; s.active = true;
      if (type === 'shot') s.color = p.ch.shot;
      p.shootCd = 0.22;
      this.spawn(s);
      this.emit('shoot', { x: s.x, y: s.y, type, color: s.color });
    }

    starWave(p) {
      [-1, 1].forEach((d) => {
        const s = Ents.create('starwave', 0, 0);
        s.x = p.x + p.w / 2 - s.w / 2; s.y = p.y + p.h - s.h; s.vx = d * 320; s.active = true; s.dir = d;
        this.spawn(s);
      });
      this.emit('starWave', { x: p.x + p.w / 2, y: p.y + p.h });
    }

    die(reason) {
      if (this.state !== 'play') return;
      if (reason === 'enemy' && this.player.star > 0) return;
      const p = this.player; p.dead = true; p.vy = -560; p.vx = 0;
      this.state = 'dying'; this.stateT = 0;
      this.emit('die', { reason, x: p.x + p.w / 2, y: p.y + p.h / 2 });
    }

    afterDeath() {
      if (!this.testMode) this.lives--;
      if (!this.testMode && this.lives <= 0) { this.state = 'gameover'; this.emit('gameover', {}); return; }
      this.reset(false);
    }

    // ---------------------------------------------------------------- condición de victoria
    // ¿Aplica la condición de victoria a esta meta? (secret = meta oculta). target: both|normal|hidden
    winApplies(secret) { const tg = (this.level.win && this.level.win.target) || 'both'; return tg === 'both' || (secret ? tg === 'hidden' : tg === 'normal'); }
    winMet(secret) {
      // Event Hub (medalGate): la meta está sellada hasta coger todas las Monedas Estrella
      if (this.fx.medalGate && this.starTotal > 0 && this.stars < this.starTotal) return false;
      const w = this.level.win;
      if (!w || w.type === 'none') return true;
      if (secret !== undefined && !this.winApplies(secret)) return true;
      switch (w.type) {
        case 'nojump': return !this.jumped;
        case 'kills': return this.kills >= w.n;
        case 'coins': return this.coins >= w.n;
        case 'redcoins': return this.redTotal === 0 || this.redCoins >= this.redTotal;
      }
      return true;
    }
    // Progreso actual de la condición: { have, need } (need = 0 si no lleva número)
    winProgress() {
      const w = this.level.win;
      switch (w.type) {
        case 'kills': return { have: this.kills, need: w.n };
        case 'coins': return { have: this.coins, need: w.n };
        case 'redcoins': return { have: this.redCoins, need: this.redTotal };
        case 'nojump': return { have: this.jumped ? 0 : 1, need: 1 };
        default: return { have: 0, need: 0 };
      }
    }
    winText() {
      const w = this.level.win, types = S.Model.Level.WIN_TYPES, def = types[w.type] || types.none;
      if (this.fx.medalGate && this.starTotal > 0 && this.stars < this.starTotal) return `Coge las Monedas Estrella (${this.stars}/${this.starTotal})`;
      if (w.type === 'nojump') return 'Llega sin saltar';
      const tag = w.target === 'hidden' ? ' · meta oculta' : w.target === 'normal' ? ' · Medalla' : '';
      if (w.type === 'kills') return `Derrota ${w.n} enemigos (${Math.min(this.kills, w.n)}/${w.n})` + tag;
      if (w.type === 'coins') return `Junta ${w.n} monedas (${Math.min(this.coins, w.n)}/${w.n})` + tag;
      if (w.type === 'redcoins') return `Coge las monedas rojas (${this.redCoins}/${this.redTotal})` + tag;
      return def.name + tag;
    }

    reachGoal(secret) {
      const p = this.player, g = secret && this.goalHidden ? this.goalHidden : this.goal;
      this.secretClear = !!secret;
      this.clearGoal = g; // meta usada en la animación de clear
      this.state = 'clear'; this.stateT = 0;
      const h = U.clamp(1 - (p.y + p.h - g.y) / g.h, 0, 1);
      const bonus = [100, 400, 800, 2000, 5000][Math.min(4, Math.floor(h * 5))];
      this.addScore(bonus, { x: g.x, y: p.y, w: 0 });
      this.clearBonus = bonus; this.medals = 1;
      p.vx = 0; p.vy = 0; p.x = g.x - p.w + 4; p.pound = 0;
      g.grabY = p.y;
      this.emit('goal', { x: g.x, y: p.y, bonus, secret: !!secret });
    }

    updateClear(dt) {
      const p = this.player, g = this.clearGoal || this.goal;
      const ground = g.y + g.h;
      if (this.stateT < 1.2) { p.y = Math.min(ground - p.h, p.y + 260 * dt); g.medalY = Math.min(g.h - 30, (p.y - g.y)); }
      else if (this.stateT < 3.4) {
        p.face = 1; p.vx = 120; p.vy = Math.min(p.vy + 1700 * dt, 640);
        S.Model.Physics.move(p, this.level, dt);
        p.anim += dt;
      } else if (this.stateT < 5.5) {
        if (this.time > 0) { const d = Math.min(this.time, dt * 120); this.time -= d; this.score += Math.round(d * 10); this.emit('tally', {}); }
      } else if (this.state === 'clear') { this.state = 'done'; this.emit('cleared', { score: this.score, secret: !!this.secretClear }); }
      this.updateCamera(dt);
    }
  }

  S.Model.GameModel = GameModel;
})(window.SGM);
