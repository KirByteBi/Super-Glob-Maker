/* Modelo: catálogo de bloques, objetos (Pyces, power-ups, mecanismos) y paleta del editor */
(function (S) {
  'use strict';
  const T = {
    EMPTY: 0, GROUND: 1, BRICK: 2, BOX: 3, HARD: 4, SEMI: 5, SPIKE: 6, BOUNCE: 7, ICE: 8, LIQUID: 9, USED: 10, CLOUD: 11, COIN: 12, HIDDEN: 13,
    CONV_L: 14, CONV_R: 15, WATER: 16, SEMI2: 17, DONUT: 18, NOTE: 19,
    A0: 20, B0: 21, A1: 22, B1: 23, A2: 24, B2: 25, SW0: 26, SW1: 27, SW2: 28,
    S45U: 29, S45D: 30, G1U: 31, G2U: 32, G1D: 33, G2D: 34, PSW: 35, POW: 36, PIPE: 37,
    // Interruptor P clásico (PSW) + sus dos bloques, temporizado (level.pActive):
    //   PBLK = por defecto MONEDA recogible; con el P activo se vuelve BLOQUE sólido.
    //   PCOIN = por defecto BLOQUE sólido; con el P activo se vuelve MONEDA recogible.
    PBLK: 42, PCOIN: 43,
    // Monedas tile 1x1: roja (8 = 1UP), azul (vale mas), verde (interruptor G), rosa (oculta).
    // SWG = interruptor G, GHID = verde latente. Las numeradas (x10/x30/x50/x100) son OBJETOS 2x2.
    RCOIN: 38, BCOIN: 39, GCOIN: 40, KCOIN: 41, SWG: 46, GHID: 47, LIGHT: 48,
    // Bloques "!" de 3 colores (rojo/verde/rosa): empiezan intangibles y se vuelven sólidos
    // al activar el interruptor "!" de su color (estado persistente). EX0=rojo, EX1=verde, EX2=rosa.
    EX0: 49, EX1: 50, EX2: 51, PIPEDECO: 52,
    // Segundo suelo "tematico": misma colision que GROUND, pero su DIBUJO depende del mapa
    // (vigas, montaña rusa, casas, runas...). Se dibuja en js/view/GroundStyles.js.
    GROUND2: 53,
    // Raíl (no sólido): las plataformas y enemigos colocados encima lo siguen (ver Rail en Entity.js)
    RAIL: 54,
    // Moneda púrpura: si el nivel tiene, la Medalla normal NO aparece hasta juntar 100
    // (o todas las que haya, si son menos de 100)
    VCOIN: 55,
    // Semisólido DE FONDO (estilo SMM): SEMIBG = borde de arriba (semisólido, se pisa);
    // BGFILL = su cuerpo de relleno (sin colisión, se pinta detrás). El editor solo ofrece SEMIBG
    // y convierte solo las casillas de debajo en cuerpo. CAVEBG = pared de cueva de fondo.
    SEMIBG: 56, BGFILL: 57, CAVEBG: 58,
    // Moneda DENTRO del agua: agua + moneda conviven. Al recogerla queda WATER (no vacio).
    // Se crea al pintar moneda sobre agua (o agua sobre moneda) en el editor.
    WATERCOIN: 59,
    // Cuerpo SÓLIDO e invisible de una tubería enlazable (lo pone la partida en las casillas de
    // su boca + cuerpo; el dibujo lo hace la propia tubería). Nunca se guarda en el nivel.
    PIPEX: 60,
    // Parte de ARRIBA (pisable, semisólida) del "semisólido del mapa" (seta / árbol / cadena):
    // invisible, la pone la partida; el dibujo lo hace el objeto 'treeplat'.
    SEMIX: 61, WALL: 99
  };
  const EXCLAIM = [{ c: '#ffd000', name: 'amarillo' }, { c: '#2fd46a', name: 'verde' }, { c: '#ff4fd8', name: 'rosa' }];
  const SOLID = new Set([T.GROUND, T.GROUND2, T.BRICK, T.BOX, T.HARD, T.SPIKE, T.BOUNCE, T.ICE, T.USED, T.CONV_L, T.CONV_R, T.DONUT, T.NOTE, T.SW0, T.SW1, T.SW2, T.SWG, T.PSW, T.POW, T.PIPE, T.LIGHT, T.WALL, T.PIPEX]);
  const SEMI = new Set([T.SEMI, T.SEMI2, T.CLOUD, T.SEMIBG, T.SEMIX]);
  const CONTAINERS = new Set([T.BOX, T.BRICK, T.HIDDEN, T.NOTE]);
  const SLOPES = new Set([T.S45U, T.S45D, T.G1U, T.G2U, T.G1D, T.G2D]);
  // Monedas de valor (se recogen al tocarlas). RCOIN se cuenta aparte (8 = 1UP).
  // GHID (verde latente) solo se recoge mientras el interruptor G está activo.
  const COIN_VALUE = { [T.COIN]: 1, [T.BCOIN]: 5, [T.GCOIN]: 8, [T.KCOIN]: 12 };
  const COINS = new Set(Object.keys(COIN_VALUE).map(Number).concat([T.RCOIN, T.GHID, T.VCOIN]));
  const PURPLE_NEED = 100; // monedas púrpura que hacen aparecer la Medalla
  // Pares A/B: 3 colores para A y 3 para B (6 variaciones) + 3 interruptores
  const AB = [{ a: '#ff3b3b', b: '#3b8bff', name: 'Rojo / Azul' }, { a: '#00d45a', b: '#ffd000', name: 'Verde / Amarillo' }, { a: '#ff4fd8', b: '#00e5ff', name: 'Rosa / Cian' }];
  const abInfo = (t) => (t >= T.A0 && t <= T.B2 ? { k: (t - T.A0) >> 1, b: (t - T.A0) & 1 } : null);

  const TILE_NAMES = {
    1: 'Suelo', 2: 'Bloque Gel (rompible)', 3: 'Caja Sorpresa', 4: 'Bloque Duro', 5: 'Semisólido A', 6: 'Bloque Pincho',
    7: 'Bloque Gelatina (rebota)', 8: 'Hielo', 9: 'Líquido peligroso', 11: 'Nube', 12: 'Globin (moneda)', 13: 'Caja Oculta',
    14: 'Cinta ←', 15: 'Cinta →', 16: 'Agua (se nada)', 17: 'Semisólido B', 18: 'Rosquilla (cae)', 19: 'Bloque Nota',
    20: 'Bloque A rojo', 21: 'Bloque B azul', 22: 'Bloque A verde', 23: 'Bloque B amarillo', 24: 'Bloque A rosa', 25: 'Bloque B cian',
    26: 'Interruptor A/B rojo-azul', 27: 'Interruptor A/B verde-amarillo', 28: 'Interruptor A/B rosa-cian',
    29: 'Pendiente empinada ↗', 30: 'Pendiente empinada ↘', 31: 'Pendiente suave ↗ (baja)', 32: 'Pendiente suave ↗ (alta)',
    33: 'Pendiente suave ↘ (alta)', 34: 'Pendiente suave ↘ (baja)', 35: 'Interruptor P', 36: 'Bloque POW', 37: 'Tubería',
    42: 'Bloque P (moneda → bloque)', 43: 'Bloque P (bloque → moneda)',
    38: 'Moneda roja (8 = 1UP)', 39: 'Moneda azul', 40: 'Moneda verde (interruptor G)', 41: 'Moneda rosa (oculta)',
    46: 'Interruptor G', 47: 'Moneda verde oculta', 48: 'Bloque de luz',
    49: 'Bloque "!" amarillo', 50: 'Bloque "!" verde', 51: 'Bloque "!" rosa',
    52: 'Tubería pequeña (decoración)',
    53: 'Suelo temático (según el mapa)',
    54: 'Raíl (pon encima plataformas, setas, Barras Estelares o Pyces y lo seguirán; las plataformas arrancan al subirte)',
    55: 'Moneda púrpura (junta 100 y aparece la Medalla)',
    56: 'Semisólido de fondo (pinta un bloque: arriba se pisa, el resto es fondo del mapa)',
    57: 'Relleno de semisólido de fondo',
    58: 'Fondo de cueva (sin colisión: para cuevas y túneles)'
  };

  // anchor: bottom = apoyado en el suelo de la casilla, center, top = colgando del techo
  // tier = cuanto más básico es el dibujo del Pyce, más sencillo es el enemigo (1..5)
  const OBJECTS = {
    start: { name: 'Inicio', cat: 'special', w: 24, h: 22 },
    goalhidden: { name: 'Meta oculta', cat: 'special', w: 24, h: 192, desc: 'Segunda meta secreta: pasa el nivel por meta oculta.' },
    goal: { name: 'Medalla (meta)', cat: 'special', w: 24, h: 192 },
    checkpoint: { name: 'Punto de control', cat: 'item', w: 24, h: 64 },
    // ----- Pyces -----
    stupid: { name: 'Stupid Pyce', w: 28, h: 24, tier: 1, desc: 'El más simple: camina y cae al pisarlo.' },
    so: { name: 'SO Pyce', w: 26, h: 26, tier: 1, desc: 'Casi transparente. Se da la vuelta en los bordes.' },
    symbol: { name: 'Symbol Pyce', w: 28, h: 24, tier: 1, desc: 'Borroso y saltarín.' },
    pyce2: { name: 'Pyce 2.0', w: 28, h: 30, tier: 2, desc: 'Necesita dos golpes. Al primero se enfada y acelera.' },
    guest: { name: 'Guest Pyce', w: 28, h: 30, tier: 2, desc: 'Atacante de espada sencillo.' },
    noob: { name: 'Noob Pyce', w: 26, h: 28, tier: 2, desc: 'Dispara con su pistola.' },
    elf: { name: 'Elf Pyce', w: 26, h: 30, tier: 2, desc: 'Brinca sin parar hacia ti.' },
    umbrella: { name: 'Umbrella Pyce', w: 30, h: 34, tier: 2, desc: 'Baja flotando con su paraguas.' },
    zom: { name: 'ZomPyce', w: 28, h: 32, tier: 2, desc: 'Lento, pero se levanta una vez tras pisarlo.' },
    crystal: { name: 'Crystal Pyce', w: 28, h: 30, tier: 3, desc: 'Cristales en la cabeza: no se puede pisar.' },
    knight: { name: 'Knight Pyce', w: 30, h: 32, tier: 3, desc: 'Armadura inmune a los proyectiles.' },
    rebel: { name: 'Rebel Pyce', w: 28, h: 30, tier: 3, desc: 'Su spray crea nubes de niebla.' },
    skelebone: { name: 'SkeleBone Pyce', w: 28, h: 30, tier: 3, desc: 'Se desmonta al pisarlo y se vuelve a montar. Lanza huesos.' },
    builder: { name: 'Builder Pyce', w: 28, h: 30, tier: 3, desc: 'Tipo Hammer Bro: va y viene, salta y te lanza martillos en arco (atraviesan paredes).' },
    miner: { name: 'Miner Pyce', w: 28, h: 30, tier: 4, desc: 'Tipo Boomerang Bro, poseído por cristales: lanza su pico de cristal, que vuelve a sus manos.' },
    snowcap: { name: 'SnowCapsule Pyce', w: 28, h: 28, tier: 3, desc: 'Al pisarlo se vuelve cápsula: ¡patéala!' },
    festive: { name: 'Festive Pyce', w: 28, h: 30, tier: 3, desc: 'Lanza regalos en parábola.' },
    bomb: { name: 'Bomb Pyce', w: 26, h: 30, tier: 3, desc: 'Al pisarlo se enciende la mecha y explota.' },
    toybomb: { name: 'ToyBomb Pyce', w: 26, h: 28, tier: 3, desc: 'Juguete de cuerda que corre hacia ti y explota.' },
    wingel: { name: 'Wingel Pyce', w: 30, h: 28, tier: 3, desc: 'Vuela a saltos. Al pisarlo pierde las alas.' },
    strechy: { name: 'Strechy Pyce', w: 24, h: 30, tier: 3, desc: 'Se estira hacia arriba. Pisa su cabeza.' },
    flower: { name: 'Flower Pyce', w: 28, h: 34, tier: 3, desc: 'Planta fija que escupe pétalos. No se pisa.' },
    cannon: { name: 'Cannon Pycer', w: 32, h: 32, tier: 3, desc: 'Cañón que dispara balas estelares.' },
    ghost: { name: 'Ghost Pyce', w: 30, h: 30, anchor: 'center', tier: 4, desc: 'Se acerca cuando le das la espalda.' },
    holo: { name: 'HoloPyce', w: 28, h: 28, tier: 4, desc: 'Holograma: a ratos es intangible.' },
    motions: { name: '4motions Pyce', w: 28, h: 28, tier: 4, desc: 'Cambia de emoción: feliz, enfadado, triste o asustado.' },
    hacker: { name: '1x1x1x1 Pyce', w: 28, h: 30, tier: 5, desc: 'Hacker: sus píxeles atraviesan paredes.' },
    // acuáticos (familia Pysh): Clown Pysh es la versión fuerte de Pysh
    pysh: { name: 'Pysh', w: 28, h: 24, anchor: 'center', tier: 2, water: true, desc: 'Nada y salta fuera del agua o del líquido. En lava/veneno se vuelve ígneo/venenoso. Sin agua solo brinca.' },
    clownpysh: { name: 'Clown Pysh', w: 28, h: 26, anchor: 'center', tier: 3, water: true, hp: 2, desc: 'Versión fuerte de Pysh: más rápido y salta más alto hacia ti. 2 golpes.' },
    axolotl: { name: 'Axolotl Pyce', w: 30, h: 26, anchor: 'center', tier: 3, water: true, desc: 'Nada y dispara burbujas. Fuera del agua es lento.' },
    squid: { name: 'Squid Pyce', w: 28, h: 30, anchor: 'center', tier: 3, water: true, desc: 'Calamar tipo Blooper: se hunde despacio y da tirones hacia ti. Suelta nubes de tinta. Solo se pisa fuera del líquido.' },
    shark: { name: 'Shark Pyce', w: 34, h: 26, anchor: 'center', tier: 4, water: true, desc: 'Te embiste en el agua. No se pisa. Fuera del agua se arrastra.' },
    // raros: 10 pisotones y dan vida
    mimic: { name: 'Mimic Pyce', w: 30, h: 34, tier: 5, rare: true, desc: 'RARO: cofre que muerde. 10 pisotones. Da 1UP.' },
    dirty: { name: 'Dirty Pyce', w: 30, h: 34, tier: 5, rare: true, desc: 'RARO: mimic sucio y rápido. 10 pisotones. Da 1UP.' },
    nomic: { name: 'NOmic Pyce', w: 30, h: 34, tier: 5, rare: true, desc: 'RARO: lanza ojos. 10 pisotones. Da 1UP.' },
    goldmimic: { name: 'Golden MimicPyce', w: 32, h: 34, tier: 5, rare: true, desc: 'RARO: vuela y suelta monedas. 10 pisotones. Da 3UP.' },
    // jefes
    noeye: { name: 'NOeye Pyce (jefe)', w: 60, h: 60, tier: 5, boss: true, desc: 'Mini-jefe: corre, gira y salta. 3 golpes.' },
    // jefes fantasma: atraviesan paredes, se esconden si los miras y solo se les puede pisar cuando se marean tras atacar
    nosense: { name: 'NOsense Pyce (jefe fantasma)', w: 60, h: 60, anchor: 'center', tier: 5, boss: true, ghost: true, desc: 'Jefe fantasma. Se mueve sin sentido y lanza ojos. Písalo cuando se maree. 4 golpes.' },
    noir: { name: 'NOIRrupt Pyce (jefe fantasma)', w: 60, h: 60, anchor: 'center', tier: 5, boss: true, ghost: true, desc: 'Versión fuerte de NOsense: se teletransporta, dispara en abanico e invoca Ghost Pyces. 6 golpes.' },
    moonstar: { name: 'MoonStar Pyce (jefe final)', w: 92, h: 92, tier: 5, boss: true, desc: 'El gran jefe de los Pyces. 5 golpes.' },
    // ----- objetos -----
    evo: { name: 'Gota Evo', cat: 'item', w: 24, h: 26, desc: 'Champiñón: hace crecer tu Glob (EVO1 → EVO2).' },
    flor: { name: 'Flor Estelar', cat: 'item', w: 24, h: 28, desc: 'Flor: lleva a tu Glob a su 3ª evolución (EVO2 → EVO3), la de la habilidad.' },
    brillo: { name: 'Brillo Estelar', cat: 'item', w: 26, h: 26, desc: 'Invencible un rato.' },
    miniglob: { name: 'Mini Glob (1UP)', cat: 'item', w: 26, h: 22, desc: 'Vida extra.' },
    caca: { name: 'Gota Caca', cat: 'item', w: 26, h: 26, desc: 'Te convierte en Glob Caca.' },
    vacio: { name: 'Fragmento del Vacío', cat: 'item', w: 26, h: 26, desc: 'Te convierte en Glob Vacío.' },
    // Monedas Estrella: coleccionables del nivel (estilo Star Coin). Las reskins solo cambian
    // el dibujo (skin), no el comportamiento. 'star'/'giga'/'rgstar' = familia estándar;
    // 'moon'/'noeye'/'magic' = familia lunar (pensadas para el modo Corrupto).
    starcoin: { name: 'Moneda Estrella', cat: 'item', collect: true, skin: 'star', w: 60, h: 60, anchor: 'center', desc: 'Coleccionable del nivel (2×2).' },
    starcoin_giga: { name: 'Gigamoneda rosada', cat: 'item', collect: true, skin: 'giga', w: 60, h: 60, anchor: 'center', desc: 'Moneda Estrella (reskin, 2×2).' },
    starcoin_moon: { name: 'Moneda Lunar', cat: 'item', collect: true, skin: 'moon', w: 60, h: 60, anchor: 'center', desc: 'Coleccionable (versión Corrupto, 2×2).' },
    starcoin_rg: { name: 'Estrella verde/roja', cat: 'item', collect: true, skin: 'rgstar', w: 60, h: 60, anchor: 'center', desc: 'Moneda Estrella con forma de estrella (2×2).' },
    starcoin_magic: { name: 'Estrella mágica', cat: 'item', collect: true, skin: 'magic', w: 60, h: 60, anchor: 'center', desc: 'Moneda Estrella con forma de estrella (2×2).' },
    starcoin_traitor: { name: 'Estrella de la Traición', cat: 'item', collect: true, skin: 'traitor', hurt: true, w: 60, h: 60, anchor: 'center', desc: '¡Te daña al tocarla! Pero cuenta como coleccionable (2×2).' },
    // Monedas de valor múltiple: objetos 2×2 que dan varias monedas al cogerlas
    // Interruptor "!" (2×2): al activarlo, los bloques "!" de su color se vuelven sólidos (persistente)
    exswitch0: { name: 'Interruptor "!" amarillo', cat: 'gizmo', exk: 0, w: 56, h: 56, anchor: 'center', desc: 'Activa los bloques "!" amarillos (2×2). Cuenta como meta oculta.' },
    exswitch1: { name: 'Interruptor "!" verde', cat: 'gizmo', exk: 1, w: 56, h: 56, anchor: 'center', desc: 'Activa los bloques "!" verdes (2×2). Cuenta como meta oculta.' },
    exswitch2: { name: 'Interruptor "!" rosa', cat: 'gizmo', exk: 2, w: 56, h: 56, anchor: 'center', desc: 'Activa los bloques "!" rosas (2×2). Cuenta como meta oculta.' },
    coin10: { name: 'Moneda ×10', cat: 'item', value: 10, w: 56, h: 56, anchor: 'center', desc: 'Da 10 monedas (2×2).' },
    coin30: { name: 'Moneda ×30', cat: 'item', value: 30, w: 56, h: 56, anchor: 'center', desc: 'Da 30 monedas (2×2).' },
    coin50: { name: 'Moneda ×50', cat: 'item', value: 50, w: 56, h: 56, anchor: 'center', desc: 'Da 50 monedas (2×2).' },
    coin100: { name: 'Moneda ×100', cat: 'item', value: 100, w: 56, h: 56, anchor: 'center', desc: 'Da 100 monedas (2×2).' },
    spring: { name: 'Muelle', cat: 'item', w: 30, h: 24 },
    platform: { name: 'Plataforma ↔', cat: 'item', w: 96, h: 16, anchor: 'center', range: true },
    platformV: { name: 'Plataforma ↕', cat: 'item', w: 96, h: 16, anchor: 'center', range: true },
    platformD1: { name: 'Plataforma raíl ↗↙', cat: 'item', w: 80, h: 16, anchor: 'center', range: true, desc: 'Recorre un raíl diagonal. Clic otra vez para cambiar el recorrido.' },
    platformD2: { name: 'Plataforma raíl ↘↖', cat: 'item', w: 80, h: 16, anchor: 'center', range: true, desc: 'Recorre un raíl diagonal. Clic otra vez para cambiar el recorrido.' },
    shroomH: { name: 'Seta móvil ↔', cat: 'item', w: 96, h: 18, anchor: 'center', range: true, desc: 'Semisólido que solo se mueve con alguien encima. Clic otra vez para cambiar el recorrido.' },
    shroomV: { name: 'Seta móvil ↕', cat: 'item', w: 96, h: 18, anchor: 'center', range: true, desc: 'Semisólido que solo se mueve con alguien encima. Clic otra vez para cambiar el recorrido.' },
    warp: { name: 'Entrada de tubería', cat: 'gizmo', w: 62, h: 62, desc: 'Tubería 2×2. Se conecta con la siguiente (pulsa ↓).' },
    door: { name: 'Puerta', cat: 'gizmo', w: 30, h: 62, desc: 'Puerta (1 ancho × 2 alto). Se conecta con la siguiente puerta (pulsa ↑).' },
    key: { name: 'Llave', cat: 'item', w: 22, h: 26, desc: 'Abre una puerta con llave o una tubería con tapa.' },
    lockdoor: { name: 'Puerta con llave', cat: 'gizmo', w: 30, h: 62, desc: 'Necesita una llave. Una vez abierta queda abierta. Se conecta como una puerta normal.' },
    lockwarp: { name: 'Tubería con tapa', cat: 'gizmo', w: 62, h: 62, desc: 'Tubería 2×2 con tapa. Necesita una llave para quitar la tapa.' },
    firebar: { name: 'Barra Estelar', cat: 'gizmo', w: 32, h: 32, anchor: 'center', range: true, desc: 'Barra giratoria de estrellas. Clic otra vez para alargarla.' },
    icicle: { name: 'Carámbano', cat: 'gizmo', w: 22, h: 30, anchor: 'top', desc: 'Cae cuando pasas por debajo.' },
    // Decoración visual (SIN colisión). El adorno concreto va en o.deco; el set es por mapa
    // (ver js/view/Decorations.js). No tiene clase de entidad: el modelo la ignora.
    deco: { name: 'Decoración', cat: 'deco', w: 24, h: 24, decoration: true, desc: 'Adorno visual sin colisión (según el mapa).' },
    // Semisólido estilo seta de SMM / árbol de SMW. Según el mapa: seta, árbol, palmera, pino,
    // pilar, farola o plataforma colgada con cadenas (mapas de interior). Arrastra para ensancharlo.
    treeplat: { name: 'Semisólido del mapa (seta / árbol / cadena)', cat: 'terrain', w: 96, h: 64, desc: 'Solo se pisa la parte de arriba. Según el mapa es una seta, un árbol o una plataforma con cadenas; el tallo o las cadenas llegan solos hasta el suelo o el techo. Arrastra hacia los lados para cambiar su ancho.' },
    // ----- solo en tiempo de juego -----
    starbullet: { w: 28, h: 22, anchor: 'center' }, eshot: { w: 14, h: 10, anchor: 'center' }, shot: { w: 14, h: 14, anchor: 'center' }, coinpop: { w: 20, h: 20, anchor: 'center' },
    poop: { w: 16, h: 16, anchor: 'center' }, goo: { w: 32, h: 6 }, starwave: { w: 18, h: 18, anchor: 'center' },
    explosion: { w: 96, h: 96, anchor: 'center' }, sprayfog: { w: 200, h: 140, anchor: 'center' }, meteor: { w: 30, h: 30, anchor: 'center' },
    lightning: { w: 14, h: 32 }, donutfall: { w: 32, h: 32 }, bonepile: { w: 28, h: 14 }
  };
  // Cápsulas para cambiar de personaje (una por Glob)
  S.Model.Characters.list.forEach((c) => {
    OBJECTS['cap_' + c.id] = { name: 'Cápsula ' + c.name, cat: 'item', w: 26, h: 26, char: c.id, desc: 'Te transforma en ' + c.name + '.' };
  });

  const ENEMY_TYPES = Object.keys(OBJECTS).filter((k) => OBJECTS[k].tier);
  ENEMY_TYPES.forEach((k) => { OBJECTS[k].cat = 'enemy'; });

  // Rotación en el editor: R = horizontal (hacia dónde mira / se mueve), E = vertical (arriba/abajo).
  // Solo objetos con sentido; el terreno y los bloques no se rotan.
  // Todos los enemigos pueden mirar a izq/der.
  ENEMY_TYPES.forEach((k) => { OBJECTS[k].rotH = true; });
  // Vertical: lo que apunta o cae arriba/abajo.
  ['cannon', 'flower', 'firebar', 'icicle'].forEach((k) => { if (OBJECTS[k]) OBJECTS[k].rotV = true; });
  // Mecanismos direccionales horizontales.
  ['spring'].forEach((k) => { if (OBJECTS[k]) OBJECTS[k].rotH = true; });
  // Tuberias: R alterna vertical / horizontal (via o.hdir, ver EditorModel.rotateObjectAt)
  ['warp', 'lockwarp'].forEach((k) => { if (OBJECTS[k]) OBJECTS[k].rotH = true; });
  const canRotate = (type, axis) => { const d = OBJECTS[type]; return !!(d && (axis === 'v' ? d.rotV : d.rotH)); };

  const BOX_ITEMS = ['coin', 'evo', 'flor', 'caca', 'vacio', 'brillo', 'miniglob', 'key'].concat(S.Model.Characters.list.map((c) => 'cap_' + c.id));

  const tiles = (ids) => ids.map((id) => ({ kind: 'tile', id }));
  const objs = (ids) => ids.map((type) => ({ kind: 'obj', type }));
  const PALETTE = [
    { id: 'terrain', name: 'Terreno', items: tiles([1, 53, 5, 17]).concat(objs(['treeplat'])).concat(tiles([56, 58, 11, 29, 30, 31, 32, 33, 34, 37, 52, 8, 6, 9, 16, 14, 15, 48])) },
    { id: 'blocks', name: 'Bloques', items: tiles([2, 3, 13, 4, 7, 19, 18, 36, 12, 38, 55, 39, 41, 40, 47, 46, 20, 21, 22, 23, 24, 25, 26, 27, 28, 49, 50, 51, 35, 42, 43]) },
    { id: 'pyces', name: 'Pyces', items: objs(['stupid', 'so', 'symbol', 'pyce2', 'guest', 'noob', 'elf', 'umbrella', 'zom', 'crystal', 'knight', 'rebel', 'skelebone', 'builder', 'miner', 'snowcap', 'festive', 'bomb', 'toybomb', 'wingel', 'strechy', 'flower', 'cannon']) },
    { id: 'pyces2', name: 'Pyces raros', items: objs(['ghost', 'holo', 'motions', 'hacker', 'pysh', 'clownpysh', 'axolotl', 'squid', 'shark', 'mimic', 'dirty', 'nomic', 'goldmimic', 'noeye', 'nosense', 'noir', 'moonstar']) },
    { id: 'items', name: 'Objetos', items: objs(['evo', 'flor', 'caca', 'vacio', 'brillo', 'miniglob'].concat(S.Model.Characters.list.map((c) => 'cap_' + c.id)).concat(['coin10', 'coin30', 'coin50', 'coin100', 'spring', 'checkpoint', 'starcoin', 'starcoin_giga', 'starcoin_moon', 'starcoin_rg', 'starcoin_magic', 'starcoin_traitor'])) },
    { id: 'gizmos', name: 'Mecanismos', items: tiles([54]).concat(objs(['platform', 'platformV', 'platformD1', 'platformD2', 'shroomH', 'shroomV', 'warp', 'lockwarp', 'door', 'lockdoor', 'key', 'firebar', 'icicle', 'exswitch0', 'exswitch1', 'exswitch2'])) },
    // Decoración: los items se rellenan dinámicamente según el mapa (ver EditorView.refreshItems)
    { id: 'deco', name: 'Decoración', items: [], dynamic: 'deco' },
    { id: 'special', name: 'Especial', items: [{ kind: 'obj', type: 'start' }, { kind: 'obj', type: 'goal' }, { kind: 'obj', type: 'goalhidden' }, { kind: 'link' }, { kind: 'erase' }] }
  ];

  // Sólido según el estado A/B del nivel (L.ab = [0|1, 0|1, 0|1]); sin nivel, A es sólido
  function isSolid(t, L) {
    if (SOLID.has(t)) return true;
    const ab = abInfo(t);
    if (ab) return ((L && L.ab ? L.ab[ab.k] : 0) === ab.b);
    // Bloques "!": sólidos solo si su color está activado (L.ex)
    if (t >= T.EX0 && t <= T.EX2) return !!(L && L.ex && L.ex[t - T.EX0]);
    // Bloques del Interruptor P: PBLK es sólido con el P activo; PCOIN, con el P inactivo
    const pActive = !!(L && L.pActive);
    if (t === T.PBLK) return pActive;
    if (t === T.PCOIN) return !pActive;
    return false;
  }
  // ¿El tile es una moneda recogible del Interruptor P dado el estado pActive?
  const isPCoin = (t, pActive) => (t === T.PBLK && !pActive) || (t === T.PCOIN && pActive);
  const exInfo = (t) => (t >= T.EX0 && t <= T.EX2 ? t - T.EX0 : -1);

  S.Model.Catalog = {
    T, OBJECTS, PALETTE, TILE_NAMES, BOX_ITEMS, AB, ENEMY_TYPES, COIN_VALUE, EXCLAIM, PURPLE_NEED,
    isSolid, abInfo, canRotate, exInfo, isPCoin,
    isSemi: (t) => SEMI.has(t),
    isSlope: (t) => SLOPES.has(t),
    isContainer: (t) => CONTAINERS.has(t),
    isSwitch: (t) => (t >= T.SW0 && t <= T.SW2) || t === T.SWG,
    isCoin: (t) => COINS.has(t),
    coinValue: (t) => COIN_VALUE[t] || 0,
    // Altura de la superficie de una pendiente (px desde arriba de la casilla), fx de 0 a 1
    slopeY(t, fx, TS) {
      switch (t) {
        case T.S45U: return TS * (1 - fx);
        case T.S45D: return TS * fx;
        case T.G1U: return TS - fx * TS / 2;
        case T.G2U: return TS / 2 - fx * TS / 2;
        case T.G1D: return fx * TS / 2;
        case T.G2D: return TS / 2 + fx * TS / 2;
      }
      return TS;
    },
    itemName(it) {
      const tr = S.tr || ((s) => s);
      if (it.kind === 'tile') return tr(TILE_NAMES[it.id] || 'Bloque');
      if (it.kind === 'erase') return tr('Borrador');
      if (it.kind === 'link') return tr('Enlazar tubería/puerta');
      return tr((OBJECTS[it.type] && OBJECTS[it.type].name) || it.type);
    }
  };
})(window.SGM);
