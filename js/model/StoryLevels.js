/* Modelo: niveles del MODO HISTORIA. Cada nodo del mapamundi tiene su propio nivel, construido
   por "salas" alrededor de UNA lección (una mecánica: bloques, muelles, raíles, A/B, agua, Bros...).
   El mundo marca la dificultad (1..5). Mismo nodo = mismo nivel siempre (semilla fija).

   Modo Corrupto: el MISMO nivel, con el efecto del mapa y RUTAS ALTERNAS: en uno o dos puntos la
   superficie queda bloqueada (muro con tubería rota, campo de pinchos o un lago de líquido) y hay
   que bajar por una tubería a un TÚNEL bajo tierra que sale al otro lado. En modo Paz ese túnel
   existe igual, como atajo opcional con monedas.

   Palacio "!": nivel de reto que acaba en el interruptor "!" del color del mundo. Activarlo hace
   sólidos los bloques "!" de ese color en el resto del mundo (atajos y premios).
   Castillo: lección del mundo + sala del jefe al final. */
(function (S) {
  'use strict';
  const C = S.Model.Catalog, TT = C.T, U = S.util, Level = S.Model.Level;
  const H = 28, GY = 19;               // alto del nivel y fila de la superficie
  const TUN_TOP = 22, TUN_FLOOR = 26;  // túnel: aire en 22..25, suelo desde 26

  // ---------------------------------------------------------------- constructor de niveles
  function builder(o) {
    const L = new Level({ name: o.name, theme: o.theme, mode: o.mode, width: o.w, height: H, time: o.time || 300, character: 'green' });
    L.id = o.id; L.objects = [];
    const B = {
      L, gy: GY, warps: [],
      set(x, y, t) { L.set(x, y, t); return B; },
      fill(x0, y0, x1, y1, t) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) L.set(x, y, t); return B; },
      ground(x0, x1, top) { return B.fill(x0, top == null ? GY : top, x1, H - 1, o.groundT || TT.GROUND); },
      pit(x0, x1, liquid) { B.fill(x0, GY, x1, TUN_TOP - 1, 0); if (liquid) B.fill(x0, GY + 2, x1, TUN_TOP - 1, TT.LIQUID); return B; },
      row(x0, x1, y, t) { return B.fill(x0, y, x1, y, t); },
      box(x, y, what) { L.set(x, y, TT.BOX); if (what) L.contents[x + ',' + y] = what; return B; },
      coins(x0, x1, y, t) { for (let x = x0; x <= x1; x++) if (!L.get(x, y)) L.set(x, y, t || TT.COIN); return B; },
      obj(type, x, y, extra) { if (!L.objects.some((q) => q.x === x && q.y === y)) L.objects.push(Object.assign({ type, x, y }, extra || {})); return B; },
      foe(type, x, top, extra) { return B.obj(type, x, (top == null ? GY : top) - 1, extra); },
      // tubería (entrada 2x2) apoyada sobre la fila 'top'; devuelve su índice para enlazarla
      // (siempre se coloca: quita lo que hubiera en sus 2x2 casillas; si no, los enlaces se cruzan)
      warp(x, top) {
        L.objects = L.objects.filter((q) => !(q.x >= x - 1 && q.x <= x + 2 && q.y >= top - 3 && q.y <= top - 1));
        B.fill(x, top - 2, x + 1, top - 1, 0);
        const w = { type: 'warp', x, y: top - 1 }; L.objects.push(w); B.warps.push(w); return B.warps.length - 1;
      },
      // enlaza por OBJETO; los índices reales (orden de tuberías en el nivel) se fijan al final
      link(a, b) { B.warps[a].toObj = B.warps[b]; B.warps[b].toObj = B.warps[a]; return B; },
      fixLinks() {
        const fam = L.objects.filter((q) => q.type === 'warp' || q.type === 'lockwarp');
        fam.forEach((q) => { if (q.toObj) { const i = fam.indexOf(q.toObj); if (i >= 0) q.to = { z: 0, i }; delete q.toObj; } });
      }
    };
    return B;
  }

  // ---------------------------------------------------------------- temas
  const POOLS = {
    lake: ['stupid', 'symbol', 'pyce2'], city: ['stupid', 'noob', 'guest', 'rebel'], seaside: ['stupid', 'umbrella', 'elf', 'pyce2'],
    ruins: ['zom', 'skelebone', 'so', 'ghost'], circus: ['toybomb', 'motions', 'elf', 'bomb'], snow: ['snowcap', 'elf', 'festive', 'stupid'],
    vortex: ['hacker', 'holo', 'crystal', 'pyce2'], underwater: ['pysh', 'clownpysh', 'axolotl', 'squid'], jungle: ['stupid', 'flower', 'symbol', 'wingel'],
    sky: ['wingel', 'umbrella', 'symbol', 'pyce2'], volcano: ['crystal', 'bomb', 'knight', 'pyce2'], factory: ['knight', 'noob', 'holo', 'strechy'],
    casino: ['toybomb', 'motions', 'guest', 'builder'], clock: ['holo', 'motions', 'knight', 'miner'], disco: ['elf', 'motions', 'wingel', 'festive'], hub: ['holo', 'ghost', 'crystal', 'noob']
  };
  const FLYERS = new Set(['ghost', 'hacker', 'wingel', 'pysh', 'clownpysh', 'axolotl', 'squid', 'umbrella']);
  const BOSS = { 1: 'noeye', 2: 'nosense', 3: 'noeye', 4: 'noir', 5: 'moonstar' };

  // ---------------------------------------------------------------- salas
  // Cada sala recibe (B, x, ctx) y devuelve su ancho. ctx = { d: dificultad 1..5, rnd, pool, theme, ex }.
  const pick = (c, arr) => arr[Math.floor(c.rnd() * arr.length)];
  const enemy = (B, c, x, top) => { const t = pick(c, c.pool); B.foe(t, x, FLYERS.has(t) ? (top == null ? GY : top) - 2 : top); };
  const hazardPit = (c) => (['volcano', 'factory', 'vortex'].includes(c.theme) ? TT.LIQUID : 0);
  const gapW = (c) => U.clamp(1 + c.d + Math.floor(c.rnd() * 2), 2, 5);

  const ROOMS = {
    // --- genéricas
    flat(B, x, c) { const w = 10; B.ground(x, x + w - 1); for (let i = 0; i < Math.min(3, c.d); i++) enemy(B, c, x + 3 + i * 3); B.coins(x + 2, x + 5, GY - 3); return w; },
    gap(B, x, c) { const g = gapW(c), w = g + 8; B.ground(x, x + w - 1).pit(x + 4, x + 3 + g, hazardPit(c)); B.coins(x + 4, x + 3 + g, GY - 4); if (c.d > 2) enemy(B, c, x + w - 2); return w; },
    stairs(B, x, c) { const w = 12; B.ground(x, x + w - 1); for (let i = 0; i < 4; i++) B.fill(x + 2 + i, GY - 1 - i, x + 2 + i, GY - 1, TT.HARD); B.fill(x + 6, GY - 4, x + 7, GY - 1, TT.HARD); B.pit(x + 8, x + 8 + Math.min(2, c.d - 1), hazardPit(c)); return w; },
    // --- lecciones
    blocks(B, x, c) { const w = 14; B.ground(x, x + w - 1); B.row(x + 3, x + 7, GY - 4, TT.BRICK).box(x + 5, GY - 4, c.d < 3 ? 'evo' : 'flor').box(x + 4, GY - 4, 'coin'); B.set(x + 9, GY - 4, TT.HIDDEN); B.L.contents[(x + 9) + ',' + (GY - 4)] = 'miniglob'; B.row(x + 5, x + 9, GY - 8, TT.BRICK); B.coins(x + 5, x + 9, GY - 9); enemy(B, c, x + 11); return w; },
    semis(B, x, c) { const w = 16; B.ground(x, x + 1).ground(x + w - 2, x + w - 1).pit(x + 2, x + w - 3, hazardPit(c)); [[x + 2, GY - 2], [x + 6, GY - 4], [x + 10, GY - 3], [x + 12, GY - 6]].forEach(([a, b], i) => { B.row(a, a + 2, b, i % 2 ? TT.SEMI2 : TT.SEMI); B.coins(a, a + 2, b - 1); }); if (c.d > 1) enemy(B, c, x + 7, GY - 4); return w; },
    springs(B, x, c) { const w = 14; B.ground(x, x + w - 1); B.fill(x + 6, GY - 6 - Math.min(2, c.d), x + 7, GY - 1, TT.HARD); B.obj('spring', x + 4, GY - 1); B.coins(x + 6, x + 7, GY - 10 - Math.min(2, c.d)); enemy(B, c, x + 10); return w; },
    pipes(B, x, c) { const w = 16; B.ground(x, x + w - 1); [[x + 3, 2], [x + 8, 3 + Math.min(1, c.d - 1)], [x + 13, 2]].forEach(([a, h]) => { B.fill(a, GY - h, a + 1, GY - 1, TT.PIPE); if (c.d > 1 && a === x + 8) B.obj('flower', a, GY - h, { }); }); enemy(B, c, x + 6); enemy(B, c, x + 11); return w; },
    moving(B, x, c) { const g = 6 + c.d, w = g + 6; B.ground(x, x + 2).ground(x + w - 3, x + w - 1).pit(x + 3, x + 2 + g, hazardPit(c)); B.obj(c.d % 2 ? 'platformV' : 'platform', x + 3 + Math.floor(g / 2), GY - 2, { r: 2 }); B.coins(x + 4, x + 1 + g, GY - 6); return w; },
    rails(B, x, c) { const g = 10 + c.d, w = g + 6; B.ground(x, x + 2).ground(x + w - 3, x + w - 1).pit(x + 3, x + 2 + g, hazardPit(c)); const y0 = GY - 2, y1 = GY - 5; for (let i = 0; i <= g; i++) { const yy = i < g / 3 ? y0 - Math.round(i * (y0 - y1) / (g / 3)) : i > (2 * g) / 3 ? y1 + Math.round((i - (2 * g) / 3) * (y0 - y1) / (g / 3)) : y1; B.set(x + 2 + i, yy, TT.RAIL); } B.obj('platform', x + 2, y0); if (c.d > 2) { for (let i = 3; i <= g - 3; i++) B.set(x + 2 + i, y1 - 3, TT.RAIL); B.obj('firebar', x + 2 + Math.floor(g / 2), y1 - 3, { r: 2 }); } B.coins(x + 4, x + g, y1 - 2); return w; },
    notes(B, x, c) { const n = 2 + c.d, w = n * 3 + 6; B.ground(x, x + 2).ground(x + w - 3, x + w - 1).pit(x + 3, x + w - 4, hazardPit(c)); for (let i = 0; i < n; i++) B.set(x + 4 + i * 3, GY - 1 - (i % 2), TT.NOTE); B.coins(x + 4, x + w - 5, GY - 7); return w; },
    ab(B, x, c) { const w = 18, k = (c.seed + c.d) % 3; const A = TT.A0 + k * 2, Bb = A + 1, SW = TT.SW0 + k; B.ground(x, x + 3).ground(x + w - 3, x + w - 1).pit(x + 4, x + w - 4, hazardPit(c)); B.set(x + 2, GY - 4, SW); for (let i = 4; i < w - 3; i++) B.set(x + i, GY - 1, i % 6 < 3 ? A : Bb); B.row(x + 6, x + 11, GY - 5, Bb); B.coins(x + 6, x + 11, GY - 6); return w; },
    pswitch(B, x, c) { const w = 16; B.ground(x, x + 3).ground(x + w - 3, x + w - 1).pit(x + 4, x + w - 4, hazardPit(c)); B.set(x + 2, GY - 1, TT.PSW); B.row(x + 4, x + w - 4, GY - 1, TT.PBLK); B.coins(x + 5, x + w - 5, GY - 4); return w; },
    conveyor(B, x, c) { const w = 16; B.ground(x, x + w - 1); B.row(x + 2, x + w - 3, GY, c.d % 2 ? TT.CONV_L : TT.CONV_R); B.fill(x + 6, GY - 2, x + 7, GY - 1, TT.HARD); for (let i = 0; i < c.d; i++) enemy(B, c, x + 9 + i * 2); return w; },
    ice(B, x, c) { const w = 16; B.ground(x, x + w - 1); B.row(x + 1, x + w - 2, GY, TT.ICE); B.pit(x + 7, x + 7 + Math.min(3, c.d), hazardPit(c)); B.obj('icicle', x + 5, GY - 7); B.obj('icicle', x + 12, GY - 7); enemy(B, c, x + 13); return w; },
    water(B, x, c) { const w = 18; B.ground(x, x + w - 1); B.fill(x + 3, GY, x + w - 4, TUN_TOP - 1, TT.WATER); B.ground(x + 3, x + w - 4, TUN_TOP); B.foe('pysh', x + 7, TUN_TOP - 1); if (c.d > 1) B.foe('squid', x + 11, TUN_TOP - 1); B.coins(x + 5, x + 13, GY + 1, TT.BCOIN); return w; },
    cannons(B, x, c) { const w = 16; B.ground(x, x + w - 1); B.foe('cannon', x + 5, GY); if (c.d > 2) B.foe('cannon', x + 11, GY); B.row(x + 7, x + 9, GY - 4, TT.SEMI); B.coins(x + 7, x + 9, GY - 5); return w; },
    firebars(B, x, c) { const w = 16; B.ground(x, x + w - 1); B.fill(x + 4, GY - 3, x + 4, GY - 1, TT.HARD).fill(x + 11, GY - 3, x + 11, GY - 1, TT.HARD); B.obj('firebar', x + 4, GY - 4, { r: c.d > 2 ? 3 : 2 }); if (c.d > 1) B.obj('firebar', x + 11, GY - 4, { r: 2 }); B.coins(x + 6, x + 9, GY - 2); return w; },
    bros(B, x, c) { const w = 18; B.ground(x, x + w - 1); B.row(x + 4, x + 12, GY - 4, TT.SEMI); B.foe(c.d > 3 ? 'miner' : 'builder', x + 8, GY - 4); if (c.d > 2) B.foe('builder', x + 14); B.box(x + 2, GY - 4, 'flor'); return w; },
    donuts(B, x, c) { const w = 16; B.ground(x, x + 2).ground(x + w - 3, x + w - 1).pit(x + 3, x + w - 4, hazardPit(c)); B.row(x + 3, x + w - 4, GY - 1, TT.DONUT); B.coins(x + 4, x + w - 5, GY - 3); return w; },
    clouds(B, x, c) { const w = 18; B.ground(x, x + 1).ground(x + w - 2, x + w - 1).pit(x + 2, x + w - 3, hazardPit(c)); [[x + 3, GY - 1], [x + 7, GY - 3], [x + 11, GY - 2], [x + 14, GY - 4]].forEach(([a, b]) => B.row(a, a + 1, b, TT.CLOUD)); enemy(B, c, x + 9, GY - 4); return w; },
    keys(B, x, c) { const w = 18; B.ground(x, x + w - 1); B.box(x + 4, GY - 4, 'key'); B.fill(x + 10, 0, x + 10, GY - 3, TT.HARD); B.obj('lockdoor', x + 8, GY - 1); B.obj('door', x + 13, GY - 1); enemy(B, c, x + 6); return w; },
    purple(B, x, c) { const w = 14; B.ground(x, x + w - 1); B.coins(x + 2, x + 11, GY - 1, TT.VCOIN); B.row(x + 4, x + 9, GY - 5, TT.SEMI); B.coins(x + 4, x + 9, GY - 6, TT.VCOIN); enemy(B, c, x + 12); return w; },
    // bloques "!" del color del mundo: sólidos solo si ya pasaste el palacio. Atajo con premio.
    exbridge(B, x, c) { const w = 16, EX = TT.EX0 + (c.ex || 0); B.ground(x, x + 2).ground(x + w - 3, x + w - 1).pit(x + 3, x + w - 4, hazardPit(c)); B.row(x + 3, x + w - 4, GY - 1, EX); B.row(x + 5, x + 9, GY - 4, TT.SEMI); B.obj('platform', x + 7, GY - 2, { r: 2 }); B.coins(x + 4, x + w - 5, GY - 2, TT.BCOIN); return w; }
  };
  // salas de calentamiento de cada lección (versión fácil, para enseñar sin castigar)
  const INTRO = { pipes: 'pipes', moving: 'moving', rails: 'rails', notes: 'notes', water: 'water', bros: 'bros', firebars: 'firebars', conveyor: 'conveyor' };

  // ---------------------------------------------------------------- mundos
  // Cada mundo: idea, dificultad y la lección de cada nivel (n1..nN, en orden del mapa).
  const WORLD_PLAN = {
    w1: { d: 1, lessons: ['basics', 'blocks', 'semis', 'pipes', 'springs', 'moving', 'redcoins', 'keys', 'notes', 'rails'], castle: ['conveyor', 'firebars'] },
    w2: { d: 2, lessons: ['moving', 'semis', 'notes', 'ice', 'springs', 'cannons', 'donuts', 'ice', 'pipes', 'keys', 'clouds'], castle: ['rails', 'firebars'] },
    w3: { d: 3, lessons: ['rails', 'ab', 'notes', 'bros', 'pswitch', 'purple', 'conveyor', 'cannons', 'ab', 'keys'], castle: ['firebars', 'bros'] },
    w4: { d: 4, lessons: ['firebars', 'clouds', 'water', 'cannons', 'rails', 'water', 'donuts', 'clouds', 'bros', 'firebars'], castle: ['conveyor', 'rails'] },
    w5: { d: 5, lessons: ['rails', 'bros', 'water', 'ab', 'pswitch', 'firebars', 'purple', 'notes', 'clouds', 'cannons', 'donuts', 'keys', 'bros'], castle: ['rails', 'firebars'] }
  };
  const LESSON_NAME = {
    basics: 'Primeros pasos', blocks: 'Bloques y cajas', semis: 'Plataformas', pipes: 'Tuberías', springs: 'Muelles', moving: 'Plataformas móviles',
    redcoins: 'Monedas rojas', keys: 'Llaves y puertas', notes: 'Bloques Nota', rails: 'Raíles', ice: 'Hielo', cannons: 'Cañones', donuts: 'Rosquillas',
    clouds: 'Nubes', ab: 'Bloques A/B', bros: 'Los Bros', pswitch: 'Interruptor P', purple: 'Monedas púrpura', conveyor: 'Cintas', water: 'Agua',
    firebars: 'Barras Estelares', palace: 'Palacio "!"', castle: 'Castillo'
  };

  // ---------------------------------------------------------------- túnel (ruta alterna)
  // Bajo la sala [x0, x1]: túnel con monedas y un Pyce, tubería de bajada antes y de subida después.
  // En Corrupto la superficie de esa sala queda bloqueada, así que el túnel es el ÚNICO camino.
  function tunnel(B, c, x0, x1, block) {
    B.fill(x0, TUN_TOP, x1, TUN_FLOOR - 1, 0);                 // aire del túnel
    B.fill(x0 - 2, TUN_TOP, x0 - 1, H - 1, TT.HARD).fill(x1 + 1, TUN_TOP, x1 + 2, H - 1, TT.HARD);
    B.fill(x0, TUN_FLOOR, x1, H - 1, TT.HARD);
    B.fill(x0, TUN_TOP - 1, x1, TUN_TOP - 1, TT.HARD);         // techo (también suelo de pozos)
    B.coins(x0 + 4, x1 - 4, TUN_TOP + 1, c.d > 2 ? TT.BCOIN : TT.COIN);
    enemy(B, c, Math.floor((x0 + x1) / 2), TUN_FLOOR);
    // tuberías: bajada en la superficie justo antes de la sala, llegada al principio del túnel;
    // salida al final del túnel y llegada en la superficie justo después de la sala
    const a = B.warp(x0 - 4, GY), b = B.warp(x0 + 1, TUN_FLOOR), cc = B.warp(x1 - 2, TUN_FLOOR), d = B.warp(x1 + 3, GY);
    B.link(a, b).link(cc, d);
    if (!block) return;
    // bloqueo de la superficie (solo Corrupto)
    const kind = block % 3;
    if (kind === 0) { B.fill(x0, 0, x0 + 1, GY - 1, TT.HARD); B.fill(x0 + 2, GY - 3, x0 + 3, GY - 1, TT.PIPE); } // muro + tubería rota
    else if (kind === 1) { B.fill(x0, GY - 1, x1, GY - 1, TT.SPIKE); B.fill(x0, 0, x1, 1, TT.SPIKE); B.fill(x0, 2, x1, GY - 6, TT.SPIKE); } // pinchos
    else { B.fill(x0, GY, x1, TUN_TOP - 2, TT.LIQUID); B.fill(x0, 0, x1, GY - 6, TT.HARD); }              // lago de líquido
  }

  // ---------------------------------------------------------------- un nivel
  function buildNode(world, node, mode, idx) {
    const plan = WORLD_PLAN[world.id] || WORLD_PLAN.w1;
    const corrupt = mode === 'corrupt';
    // En CORRUPTO la semilla cambia: la secuencia de salas, los extras y los patrones
    // deterministas (ab/pswitch, bloqueos de tunel) salen distintos -> otra relectura del nivel.
    const seed = U.strSeed(world.id + '/' + node.id + (corrupt ? '/corrupt' : ''));
    const rnd = U.rng(seed);
    const theme = S.Model.Themes.get(node.theme);
    const isCastle = node.type === 'castle', isPalace = node.type === 'palace';
    const d = U.clamp(plan.d + (isCastle ? 1 : 0) + (isPalace ? 1 : 0) + (idx > 5 ? 0.5 : 0), 1, 5) | 0;
    const lesson = isPalace ? 'palace' : isCastle ? 'castle' : plan.lessons[(idx - 1) % plan.lessons.length] || 'basics';
    const name = (isCastle ? '🏰 ' : isPalace ? '⚠ ' : '') + S.Model.Themes.name(theme, mode) + ' · ' + (LESSON_NAME[lesson] || lesson);
    const B = builder({ id: 'story-' + world.id + '-' + node.id + '-' + mode, name, theme: node.theme, mode, w: 400, time: isCastle ? 400 : 320 });
    const c = { d, rnd, seed, pool: POOLS[node.theme] || POOLS.lake, theme: node.theme, ex: world.excolor != null ? world.excolor : (world.nodes.find((n) => n.type === 'palace') || {}).excolor || 0 };
    const swim = !!theme.swim;
    if (swim) B.fill(0, 0, 399, 1, TT.HARD);
    // salida
    let x = 0;
    B.ground(0, 11); B.obj('start', 3, GY - 1); B.box(7, GY - 4, 'evo');
    x = 12;
    // secuencia de salas
    // Niveles normales: la leccion PRINCIPAL manda (identidad del nivel), pero se mezclan
    // 1-2 secundarias por semilla para dar variedad tipo New SMB (plataformas, luego muelles,
    // luego huecos...). Palacios y castillos mantienen su set fijo.
    const main = isPalace ? ['semis', 'moving', 'rails', 'notes', 'clouds'] : isCastle ? plan.castle.concat(plan.castle) : [lesson];
    const seq = [];
    if (!isPalace && !isCastle) {
      const L1 = lesson === 'basics' ? 'flat' : lesson === 'redcoins' ? 'semis' : lesson;
      // pool de secundarias "compatibles" (evita agua en niveles secos, etc.)
      const dry = ['blocks', 'semis', 'springs', 'moving', 'notes', 'stairs', 'gap', 'donuts', 'clouds'];
      const wet = ['water', 'semis', 'moving', 'notes'];
      const base = swim ? wet : dry;
      const sec = base.filter((r) => r !== L1 && ROOMS[r]);
      // elige 1-2 secundarias de forma determinista (mas variedad a mayor dificultad)
      const nSec = 1 + (d >= 3 ? 1 : 0);
      const picks = [];
      for (let k = 0; k < nSec && sec.length; k++) { const j = Math.floor(rnd() * sec.length); picks.push(sec.splice(j, 1)[0]); }
      if (lesson === 'basics') {
        seq.push('flat', 'gap', 'flat', 'stairs', 'gap', 'blocks', 'flat');
      } else {
        // patron variado: intro facil -> principal -> secundaria A -> transicion -> principal
        //                 -> secundaria B -> transicion -> principal (remate)
        seq.push(INTRO[L1] ? L1 : 'flat', L1, picks[0] || 'gap', 'gap', L1, picks[1] || 'stairs', 'stairs', L1);
      }
    } else seq.push(...main, 'gap', ...main.slice(0, 2));
    // ¿atajo con bloques "!" del mundo? (niveles a partir de la 2ª mitad)
    if (!isPalace && idx > 4 && world.nodes.some((n) => n.type === 'palace')) seq.splice(3, 0, 'exbridge');
    // salas donde va el túnel (rutas alternas): 1 en mundos fáciles, 2 a partir del 3
    const tunnelAt = new Set([2]); if (d >= 3 && seq.length > 6) tunnelAt.add(4);
    const tunnels = []; // tramos [x0, x1] con túnel (en Corrupto la superficie está cortada)
    let checkpoint = false, redPlaced = 0;
    seq.forEach((room, i) => {
      if (!checkpoint && i === Math.floor(seq.length / 2)) { B.ground(x, x + 5); B.obj('checkpoint', x + 2, GY - 1); x += 6; checkpoint = true; }
      if (tunnelAt.has(i) && !swim) {
        // sala tranquila encima del túnel (en Corrupto, bloqueada)
        B.ground(x - 6, x - 1); const w = 18; B.ground(x, x + w - 1); B.coins(x + 3, x + w - 4, GY - 3);
        tunnel(B, c, x, x + w - 1, corrupt ? (seed + i) % 3 + 3 : 0);
        tunnels.push([x - 6, x + w + 5]);
        x += w; B.ground(x, x + 5); x += 6; return;
      }
      const fn = ROOMS[room] || ROOMS.flat;
      const w = fn(B, x, c);
      // Lección "monedas rojas": 8 rojas repartidas por el nivel (la meta oculta las pide)
      if (lesson === 'redcoins' && redPlaced < 8) { const n = Math.min(2, 8 - redPlaced); for (let k = 0; k < n; k++) { const rx = x + 2 + k * 4; let ry = GY - 6; while (ry > 2 && B.L.get(rx, ry)) ry--; B.set(rx, ry, TT.RCOIN); redPlaced++; } }
      x += w;
    });
    // final del nivel
    if (isCastle) {
      // sala del jefe: arena cerrada por arriba, el jefe delante de la meta
      B.ground(x, x + 30); B.fill(x, 0, x + 30, 2, TT.HARD); B.obj(BOSS[plan.d] || 'noeye', x + 16, GY - 2); B.box(x + 4, GY - 4, 'flor');
      x += 22;
    }
    B.ground(x, x + 14);
    if (isPalace) { B.obj('exswitch' + c.ex, x + 7, GY - 1); }
    else B.obj('goal', x + 8, GY - 1);
    // meta oculta (si este nodo abre un camino secreto): por las alturas, con bloques ocultos de escalera
    if (node.secretNext && !isPalace) {
      // la ruta secreta va después del último túnel (por encima de un tramo bloqueado no se podría)
      let sx = x - 40; const lastT = tunnels.length ? tunnels[tunnels.length - 1][1] + 2 : 0;
      if (sx < lastT) sx = lastT;
      const len = Math.max(12, Math.min(26, x - 4 - sx));
      B.set(sx, GY - 4, TT.HIDDEN).set(sx + 2, GY - 8, TT.HIDDEN);
      B.row(sx + 4, sx + len, GY - 11, TT.SEMI); B.coins(sx + 6, sx + len - 4, GY - 12); B.obj('goalhidden', sx + len - 2, GY - 12);
    }
    if (lesson === 'redcoins') B.L.win = Level.normWin({ type: 'redcoins', target: node.secretNext ? 'hidden' : 'both' });
    x += 15;
    B.fixLinks();
    // recortar el ancho y cerrar
    const L = B.L, W = Math.min(400, x);
    if (W < L.width) L.resize(W, H);
    return L;
  }

  S.Model.StoryLevels = {
    LESSON_NAME, WORLD_PLAN,
    lessonOf(worldId, nodeId) {
      const w = S.Model.StoryMap.world(worldId), n = w.map[nodeId]; if (!n) return null;
      if (n.type === 'castle') return 'castle'; if (n.type === 'palace') return 'palace';
      const idx = w.nodes.filter((q) => q.type === 'level').indexOf(n) + 1;
      return (WORLD_PLAN[worldId] || WORLD_PLAN.w1).lessons[(idx - 1) % (WORLD_PLAN[worldId] || WORLD_PLAN.w1).lessons.length];
    },
    build(worldId, nodeId, mode) {
      const w = S.Model.StoryMap.world(worldId), n = w.map[nodeId];
      if (!n || n.type === 'start') return null;
      const idx = n.type === 'level' ? w.nodes.filter((q) => q.type === 'level').indexOf(n) + 1 : w.nodes.length;
      return buildNode(w, n, mode === 'corrupt' ? 'corrupt' : 'peace', idx);
    }
  };
})(window.SGM);
