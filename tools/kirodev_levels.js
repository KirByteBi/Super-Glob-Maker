// Genera los niveles de KiroDEV en niveles_kirodev/*.sgm.json (para Importar y Publicar desde el juego).
// Uso: node tools/kirodev_levels.js
// Cada nivel se comprueba: se puede ir de la salida a la(s) meta(s) saltando (comprobación aproximada
// con la física del Glob en EVO1), y se juega 20 s en el modelo real para ver que no peta.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f }));
const S = ctx.SGM, C = S.Model.Catalog, TT = C.T, Level = S.Model.Level;

// ------------------------------------------------------------------ utilidades de construcción
function make(o) {
  const L = new Level({ name: o.name, theme: o.theme, mode: o.mode || 'peace', width: o.w || 180, height: 24, time: o.time || 300, character: 'green' });
  L.id = 'kirodev-' + o.slug; L.objects = [];
  const B = {
    L, gy: 21,
    ground(x0, x1, top, t) { top = top == null ? 21 : top; for (let x = x0; x <= x1; x++) for (let y = top; y < 24; y++) L.set(x, y, t || TT.GROUND); return B; },
    fill(x0, y0, x1, y1, t) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) L.set(x, y, t); return B; },
    row(x0, x1, y, t) { return B.fill(x0, y, x1, y, t); },
    col(x, y0, y1, t) { return B.fill(x, y0, x, y1, t); },
    clear(x0, y0, x1, y1) { return B.fill(x0, y0, x1, y1, 0); },
    box(x, y, what) { L.set(x, y, TT.BOX); if (what) L.contents[x + ',' + y] = what; return B; },
    brick(x, y, what) { L.set(x, y, TT.BRICK); if (what) L.contents[x + ',' + y] = what; return B; },
    coins(x0, x1, y, t) { for (let x = x0; x <= x1; x++) L.set(x, y, t || TT.COIN); return B; },
    arc(x0, y0, n, t) { for (let i = 0; i < n; i++) L.set(x0 + i, y0 - Math.round(Math.sin((i / (n - 1)) * Math.PI) * 2), t || TT.COIN); return B; },
    obj(type, x, y, extra) { L.objects.push(Object.assign({ type, x, y }, extra || {})); return B; },
    // enemigo de pie sobre la fila 'top' (el suelo)
    foe(type, x, top, extra) { return B.obj(type, x, (top == null ? 21 : top) - 1, extra); },
    rail(cells) { cells.forEach(([x, y]) => L.set(x, y, TT.RAIL)); return B; },
    railLine(x0, y0, x1, y1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); const out = []; for (let i = 0; i <= n; i++) out.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)]); return B.rail(out); },
    railRect(x0, y0, x1, y1) { for (let x = x0; x <= x1; x++) { L.set(x, y0, TT.RAIL); L.set(x, y1, TT.RAIL); } for (let y = y0; y <= y1; y++) { L.set(x0, y, TT.RAIL); L.set(x1, y, TT.RAIL); } return B; },
    start(x, top) { return B.obj('start', x, (top == null ? 21 : top) - 1); },
    goal(x, top) { return B.obj('goal', x, (top == null ? 21 : top) - 1); },
    hidden(x, top) { return B.obj('goalhidden', x, (top == null ? 21 : top) - 1); }
  };
  return B;
}

// ------------------------------------------------------------------ comprobación de recorrido
// Casillas "de pie": libres (y la de encima libre) con algo pisable debajo. Saltos: hasta 4 arriba
// y 5 de hueco; caídas libres. Las plataformas móviles cuentan como suelo en todo su recorrido.
function reachable(L, fromX, fromY, extraStand) {
  const W = L.width, H = L.height;
  // los bloques ocultos cuentan como suelo: el diseño obliga a golpearlos desde abajo primero
  const solid = (x, y) => C.isSolid(L.get(x, y), L) || C.isSemi(L.get(x, y)) || C.isSlope(L.get(x, y)) || [TT.BOX, TT.BRICK, TT.NOTE, TT.HIDDEN].includes(L.get(x, y));
  const free = (x, y) => y < 0 || (!C.isSolid(L.get(x, y), L) && L.get(x, y) !== TT.LIQUID && L.get(x, y) !== TT.SPIKE && L.get(x, y) !== TT.HIDDEN);
  const stand = (x, y) => x >= 0 && x < W && y >= 0 && y < H - 1 && free(x, y) && free(x, y - 1) && (solid(x, y + 1) || (extraStand && extraStand.has(x + ',' + y)));
  const seen = new Set(), q = [];
  const push = (x, y) => { const k = x + ',' + y; if (!seen.has(k) && stand(x, y)) { seen.add(k); q.push([x, y]); } };
  // aterrizar cayendo en la columna x desde la fila y
  const land = (x, y) => { for (let yy = y; yy < H - 1; yy++) { if (!free(x, yy)) return null; if (stand(x, yy)) return yy; } return null; };
  push(fromX, fromY);
  while (q.length) {
    const [x, y] = q.shift();
    for (let dx = -6; dx <= 6; dx++) for (let up = 0; up <= 4; up++) {
      const tx = x + dx, ty = y - up;
      if (tx < 0 || tx >= W) continue;
      // trayectoria libre (aprox.): columna de despegue con hueco para subir y destino alcanzable
      if (Math.abs(dx) > (up >= 3 ? 4 : 6)) continue;
      let ok = true; for (let k = 1; k <= up + 1; k++) if (!free(x, y - k) && k <= up) ok = false;
      if (!ok) continue;
      if (stand(tx, ty)) push(tx, ty);
      else { const ly = land(tx, ty); if (ly != null) push(tx, ly); }
    }
  }
  return seen;
}
function platformCells(L) {
  const set = new Set(), Rail = S.Model.Rail;
  L.objects.forEach((o) => {
    if (!/^platform|^shroom/.test(o.type)) return;
    if (L.get(o.x, o.y) === TT.RAIL) {
      // todo el raíl conectado
      const seen = new Set([o.x + ',' + o.y]), q = [[o.x, o.y]];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Rail.links(L, x, y)) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
      seen.forEach((k) => { const [x, y] = k.split(',').map(Number); for (let i = -1; i <= 1; i++) set.add((x + i) + ',' + (y - 1)); });
    } else {
      const r = o.r != null ? o.r : 3, v = o.type === 'platformV' || o.type === 'shroomV';
      for (let s = -r; s <= r; s++) for (let i = -1; i <= 1; i++) set.add(v ? (o.x + i) + ',' + (o.y + s - 1) : (o.x + s + i) + ',' + (o.y - 1));
    }
  });
  return set;
}
function check(B, opt) {
  const L = B.L, errs = [];
  const st = L.objects.find((o) => o.type === 'start'), gl = L.objects.find((o) => o.type === 'goal'), gh = L.objects.find((o) => o.type === 'goalhidden');
  const R = reachable(L, st.x, st.y, platformCells(L));
  const near = (o) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -2; dy <= 1; dy++) if (R.has((o.x + dx) + ',' + (o.y + dy))) return true; return false; };
  if (!near(gl)) errs.push('no se llega a la Medalla');
  if (gh && !opt.secretViaPipe && !near(gh)) errs.push('no se llega a la meta oculta');
  // algo en el aire se coge si hay un sitio de pie alcanzable a <=3 de lado y como mucho 4 por debajo
  (opt.mustReach || []).forEach(([x, y, what]) => { let hit = false; for (let dx = -3; dx <= 3; dx++) for (let dy = 0; dy <= 4; dy++) if (R.has((x + dx) + ',' + (y + dy))) hit = true; if (!hit) errs.push('no se llega a ' + what + ' (' + x + ',' + y + ')'); });
  const count = (t) => L.tiles.filter((v) => v === t).length;
  if (opt.red != null && count(TT.RCOIN) !== opt.red) errs.push('monedas rojas: ' + count(TT.RCOIN));
  if (opt.purpleMin != null && count(TT.VCOIN) < opt.purpleMin) errs.push('monedas púrpura: ' + count(TT.VCOIN));
  // ningún enemigo a menos de 5 casillas de la salida o de un punto de control (reaparecer seguro)
  const spawns = L.objects.filter((o) => o.type === 'start' || o.type === 'checkpoint');
  L.objects.forEach((o) => { const d = C.OBJECTS[o.type] || {}; if (!d.tier && !d.boss) return; spawns.forEach((s) => { if (Math.abs(o.x - s.x) < 5 && Math.abs(o.y - s.y) < 5) errs.push(o.type + ' demasiado cerca de ' + s.type + ' (' + o.x + ',' + o.y + ')'); }); });
  const stars = L.objects.filter((o) => (C.OBJECTS[o.type] || {}).collect).length;
  if (stars > 3) errs.push('demasiadas Monedas Estrella: ' + stars);
  // (las entradas de tubería van encima de su tile de tubería, es lo normal)
  L.objects.forEach((o) => { if (C.isSolid(L.get(o.x, o.y), L) && !['flower', 'warp', 'lockwarp'].includes(o.type)) errs.push(o.type + ' dentro de un bloque en ' + o.x + ',' + o.y); });
  // 20 s de partida real sin tocar nada: no debe romperse
  try {
    const g = new S.Model.GameModel(JSON.parse(JSON.stringify(L.toJSON())), {});
    for (let i = 0; i < 120 * 20; i++) { g.update(1 / 120, { right: i % 240 < 200, jump: i % 50 < 22, jumpPressed: i % 50 === 0 }); if (g.state === 'dying') g.player.inv = 1; }
  } catch (e) { errs.push('error al jugar: ' + e.message); }
  // reutiliza las mismas mecánicas del juego para validar que es un nivel válido del editor
  return errs;
}

// ================================================================== 1. PixelStar Entrade
// Nivel de entrada (fácil): enseña lo básico paso a paso en la Fábrica PixelStar.
function pixelStar() {
  const B = make({ name: 'PixelStar Entrade', slug: 'pixelstar-entrade', theme: 'factory', w: 170, time: 350 });
  const G2 = TT.GROUND2;
  B.ground(0, 34).start(3);
  // 1) andar y el primer Pyce
  B.coins(8, 12, 18).foe('stupid', 20);
  // 2) cajas: Gota Evo y monedas
  B.box(14, 17, 'evo').brick(13, 17).brick(15, 17).box(16, 17, 'coin');
  // 3) primer hueco pequeño
  B.ground(38, 70);
  B.arc(34, 18, 5);
  // 4) escalones de suelo temático (estrellas pixel)
  B.fill(44, 19, 46, 20, G2).fill(48, 17, 50, 20, G2).fill(52, 15, 54, 20, G2);
  B.coins(52, 54, 13);
  B.obj('starcoin', 53, 12);
  B.foe('symbol', 60); B.foe('stupid', 66);
  // 5) cintas transportadoras de fábrica
  B.row(56, 61, 21, TT.CONV_R);
  // 6) muelle para subir a una plataforma alta
  B.obj('spring', 68, 20);
  B.row(66, 72, 14, TT.SEMI).coins(66, 72, 13);
  // 7) hueco más grande con plataforma móvil
  B.ground(80, 112);
  B.obj('platform', 75, 18, { r: 2 });
  B.obj('checkpoint', 84, 20);
  // 8) bloques ladrillo con la Flor Estelar escondida + Pyces
  B.brick(90, 17).box(91, 17, 'flor').brick(92, 17).box(93, 17, 'coin');
  B.foe('noob', 98); B.foe('stupid', 104); B.foe('stupid', 107);
  // 9) tubería y Monedas Estrella 2 encima de un pilar
  B.fill(100, 18, 101, 20, TT.PIPE);
  B.fill(108, 16, 110, 20, G2).obj('starcoin', 109, 14);
  // 10) recta final con raíl sencillo
  B.ground(122, 169);
  B.railLine(113, 18, 121, 18).obj('platform', 113, 18);
  B.coins(114, 120, 16);
  B.foe('elf', 132); B.foe('symbol', 140);
  B.row(144, 147, 17, TT.BRICK).obj('starcoin', 145, 15);
  B.fill(150, 20, 151, 20, G2).fill(152, 19, 153, 20, G2).fill(154, 18, 155, 20, G2);
  B.goal(162);
  return [B, { mustReach: [[53, 12, 'la Moneda Estrella 1'], [109, 14, 'la Moneda Estrella 2'], [145, 15, 'la Moneda Estrella 3']] }];
}

// ================================================================== 2. Nitrogenic Casino
// Casino loco: plataformas en raíles sobre ponche, bloques A/B, Notas, arcades y muchos Pyces.
function casino() {
  const B = make({ name: 'Nitrogenic Casino', slug: 'nitrogenic-casino', theme: 'casino', w: 210, time: 400 });
  const G2 = TT.GROUND2, LQ = TT.LIQUID;
  B.ground(0, 22).start(3);
  B.box(8, 17, 'evo').coins(12, 16, 17);
  // arcades (columnas de suelo temático de 1-2 de ancho)
  B.fill(18, 18, 18, 20, G2).fill(20, 16, 21, 20, G2);
  // 1) foso de ponche con plataforma en raíl en bucle
  B.fill(23, 22, 44, 23, LQ);
  B.railRect(26, 15, 40, 19).obj('platform', 26, 19);
  B.coins(29, 37, 13);
  B.ground(45, 62);
  B.foe('toybomb', 50); B.foe('motions', 56);
  // 2) Bloques Nota para cruzar
  B.fill(63, 22, 78, 23, LQ);
  [65, 69, 73, 77].forEach((x, i) => B.row(x, x, 19 - (i % 2), TT.NOTE));
  B.coins(64, 78, 14);
  B.ground(79, 100);
  // 3) bloques A/B (rojo/azul): el interruptor cambia cuál es sólido
  B.obj('checkpoint', 81, 20);
  B.row(84, 84, 17, TT.SW0);
  B.fill(88, 20, 88, 20, TT.A0).fill(89, 19, 89, 20, TT.A0).fill(90, 18, 90, 20, TT.B0);
  B.foe('elf', 94); B.foe('builder', 98);
  // 4) escalera de arcades con una Moneda Estrella arriba
  B.fill(92, 17, 92, 20, G2).fill(95, 14, 96, 20, G2).obj('starcoin', 96, 11);
  // 5) gran foso: raíles en diagonal arriba-abajo y Barra Estelar en raíl
  B.fill(101, 22, 132, 23, LQ);
  B.railLine(102, 19, 110, 13).railLine(111, 13, 118, 13).railLine(119, 13, 126, 19).obj('platform', 102, 19);
  B.railLine(112, 17, 124, 17).obj('firebar', 116, 17, { r: 3 });
  B.ground(133, 150);
  B.foe('bomb', 138); B.foe('motions', 144); B.foe('toybomb', 147);
  // 6) ruleta (masa de suelo temático) con cajas de monedas
  B.fill(151, 18, 156, 20, G2).ground(151, 160);
  B.box(153, 14, 'coin').box(154, 14, 'flor').box(155, 14, 'coin');
  B.obj('coin50', 158, 17);
  // 7) setas en raíl y Pyces en raíl
  B.fill(161, 22, 180, 23, LQ);
  B.railLine(161, 18, 180, 18).obj('shroomH', 162, 18);
  B.railLine(166, 12, 176, 12).foe('crystal', 170, 13);
  B.obj('starcoin', 171, 15);
  B.ground(181, 209);
  B.fill(186, 18, 186, 20, G2).fill(189, 17, 190, 20, G2).obj('starcoin', 189, 15);
  B.foe('builder', 195); B.foe('elf', 199);
  B.goal(204);
  return [B, { mustReach: [[96, 11, 'la Moneda Estrella 1'], [171, 15, 'la Moneda Estrella 2'], [189, 15, 'la Moneda Estrella 3']] }];
}

// ================================================================== 3. City Trial: Day
// Ciudad de día. La Medalla está al final de la calle; la META OCULTA, en las azoteas:
// se sube por unos bloques ocultos junto a la grúa (vigas) del principio.
function cityDay() {
  const B = make({ name: 'City Trial: Day', slug: 'city-trial-day', theme: 'city', w: 200, time: 320 });
  const G2 = TT.GROUND2;
  B.ground(0, 199).start(3);
  B.box(10, 17, 'evo').brick(9, 17).brick(11, 17).foe('stupid', 16);
  // grúa de vigas (suelo temático) y bloques ocultos que dan acceso a las azoteas
  // bloques ocultos en columna: golpea el de abajo, súbete y golpea el de arriba
  B.col(22, 12, 20, G2).row(22, 27, 12, G2);
  B.row(18, 18, 17, TT.HIDDEN).row(20, 20, 13, TT.HIDDEN);
  B.coins(23, 27, 11);
  // 1) calle con edificios bajos (semisólidos) y Pyces de ciudad
  B.fill(30, 17, 34, 20, TT.HARD).row(30, 34, 17, TT.SEMI);
  B.foe('noob', 38); B.foe('guest', 46);
  B.fill(50, 18, 51, 20, TT.PIPE).fill(58, 17, 59, 20, TT.PIPE);
  B.foe('rebel', 64);
  B.obj('checkpoint', 70, 20);
  B.box(76, 17, 'flor').brick(75, 17).brick(77, 17);
  B.foe('builder', 84); B.foe('stupid', 92); B.foe('noob', 98);
  // obra: vigas a distintas alturas
  B.fill(104, 19, 105, 20, G2).fill(108, 17, 109, 20, G2).fill(112, 19, 113, 20, G2);
  B.foe('guest', 120); B.foe('rebel', 130);
  B.coins(134, 140, 18);
  B.foe('builder', 146); B.foe('stupid', 152);
  B.goal(186);
  // ---- azoteas (ruta secreta): fila de tejados a la altura 9-11, con huecos y un raíl
  B.row(28, 40, 11, TT.SEMI).coins(30, 38, 10);
  B.row(45, 60, 10, TT.SEMI).foe('noob', 52, 10);
  B.railLine(62, 9, 74, 9).obj('platform', 62, 9);
  B.row(77, 95, 10, TT.SEMI).obj('starcoin', 86, 8).foe('guest', 90, 10);
  B.row(99, 116, 11, TT.SEMI).foe('builder', 108, 11);
  B.row(120, 140, 10, TT.SEMI).coins(122, 138, 9, TT.BCOIN);
  B.row(144, 160, 11, TT.SEMI);
  B.hidden(158, 11);
  return [B, { mustReach: [[86, 8, 'la Moneda Estrella de las azoteas']] }];
}

// ================================================================== 4. City Trial: Night Challenge
// La misma ciudad, de noche y en Apagón (Corrupto). 100 monedas púrpura hacen aparecer la Medalla;
// la META OCULTA pide las 8 monedas rojas. Bloques de luz marcan el camino.
function cityNight() {
  const B = make({ name: 'City Trial: Night Challenge', slug: 'city-trial-night', theme: 'city', mode: 'corrupt', w: 200, time: 400 });
  const G2 = TT.GROUND2, V = TT.VCOIN, R = TT.RCOIN, LT = TT.LIGHT;
  B.L.win = Level.normWin({ type: 'redcoins', target: 'hidden' });
  B.ground(0, 199).start(3);
  B.row(6, 6, 17, LT).box(10, 17, 'evo');
  B.coins(12, 21, 19, V); // 10
  B.col(22, 12, 20, G2).row(22, 27, 12, G2).row(18, 18, 17, TT.HIDDEN).row(20, 20, 13, TT.HIDDEN);
  B.coins(23, 27, 11, V); // 5
  B.set = (x, y, t) => B.L.set(x, y, t);
  B.set(25, 9, R); // roja 1 (sobre la grúa)
  B.fill(30, 17, 34, 20, TT.HARD).row(30, 34, 17, TT.SEMI).row(32, 32, 14, LT);
  B.coins(30, 34, 16, V); // 5
  B.foe('noob', 38); B.coins(36, 47, 19, V); // 12
  B.fill(50, 18, 51, 20, TT.PIPE).fill(58, 17, 59, 20, TT.PIPE);
  B.set(54, 15, R); // roja 2 (entre tuberías, salto)
  B.coins(52, 57, 19, V); // 6
  B.foe('miner', 64); B.row(66, 66, 17, LT);
  B.obj('checkpoint', 70, 20);
  B.box(76, 17, 'flor').brick(75, 17).brick(77, 17);
  B.coins(72, 83, 19, V); // 12
  B.set(76, 13, R); // roja 3 (encima de las cajas)
  B.foe('builder', 84); B.foe('stupid', 92);
  B.coins(86, 99, 19, V); // 14
  B.fill(104, 19, 105, 20, G2).fill(108, 17, 109, 20, G2).fill(112, 19, 113, 20, G2).row(108, 108, 13, LT);
  B.coins(104, 105, 18, V).coins(108, 109, 16, V).coins(112, 113, 18, V); // 6
  B.set(110, 12, R); // roja 4
  B.foe('miner', 120); B.coins(116, 131, 19, V); // 16
  B.foe('rebel', 130); B.row(136, 136, 17, LT);
  B.coins(134, 145, 18, V); // 12
  B.foe('builder', 146);
  B.coins(147, 160, 19, V); // 14  -> total base: 112
  // ---- azoteas: aquí están las otras 4 rojas y la meta oculta
  B.row(28, 40, 11, TT.SEMI).row(36, 36, 7, LT);
  B.set(38, 9, R); // roja 5
  B.row(45, 60, 10, TT.SEMI).foe('miner', 52, 10);
  B.railLine(62, 9, 74, 9).obj('platform', 62, 9);
  B.set(68, 6, R); // roja 6 (encima del raíl)
  B.row(77, 95, 10, TT.SEMI).row(86, 86, 6, LT).obj('starcoin', 86, 8);
  B.row(99, 116, 11, TT.SEMI).foe('builder', 108, 11);
  B.set(112, 9, R); // roja 7
  B.row(120, 140, 10, TT.SEMI).row(130, 130, 6, LT);
  B.set(138, 8, R); // roja 8
  B.row(144, 160, 11, TT.SEMI);
  B.hidden(158, 11);
  B.row(180, 180, 17, LT);
  B.goal(186);
  return [B, { red: 8, purpleMin: 100, mustReach: [[25, 9, 'roja 1'], [54, 15, 'roja 2'], [76, 13, 'roja 3'], [110, 12, 'roja 4'], [38, 9, 'roja 5'], [68, 6, 'roja 6'], [112, 9, 'roja 7'], [138, 8, 'roja 8']] }];
}

// ================================================================== 5. Vórtice Overclock
// Fortaleza aérea en el Vórtice del Vacío (Corrupto, gravedad lunar). Nada de suelo: islas
// flotantes, raíles sobre el vacío y Pyces hacker. La gravedad baja engaña: saltas lejos, pero
// las Barras Estelares en raíl y los 1x1x1x1 (atraviesan paredes) no perdonan. Condición: derrota
// 8 enemigos para la Medalla (la meta oculta, al fondo de un desvío, no la pide).
function vortex() {
  const B = make({ name: 'Vórtice Overclock', slug: 'vortice-overclock', theme: 'vortex', mode: 'corrupt', w: 200, time: 260 });
  const G2 = TT.GROUND2, LQ = TT.LIQUID;
  B.L.win = Level.normWin({ type: 'kills', n: 8, target: 'normal' });
  B.fill(0, 23, 199, 23, LQ);                       // el vacío abajo
  B.ground(0, 12, 19).start(3, 19);
  B.box(8, 15, 'evo');
  // islas pequeñas de runas cada vez más separadas
  B.fill(17, 18, 19, 22, G2).foe('hacker', 18, 18);
  B.fill(25, 16, 27, 22, G2).foe('holo', 26, 16);
  B.fill(33, 19, 34, 22, G2);
  // 1) raíl en zigzag sobre el vacío con una Barra Estelar en otro raíl cruzándolo
  B.railLine(37, 18, 43, 12).railLine(44, 12, 50, 18).obj('platform', 37, 18);
  B.railLine(40, 15, 48, 15).obj('firebar', 44, 15, { r: 2 });
  // isla del punto de control: segura (los Pyces van en la isla siguiente, no encima de la bandera)
  B.fill(53, 17, 58, 22, G2);
  B.obj('checkpoint', 54, 16);
  // 2) escalera de islas de 1 casilla (arcade de runas) con Wingel
  [[62, 15], [66, 13], [70, 15], [74, 12]].forEach(([x, y]) => B.fill(x, y, x, 22, G2));
  B.foe('wingel', 68, 10); B.obj('starcoin', 74, 9);
  B.foe('crystal', 66, 13).foe('hacker', 70, 15);
  // 3) desvío: abajo del todo, sobre el vacío, la meta oculta (raíl vertical que baja)
  B.railLine(78, 12, 78, 19).obj('platformV', 78, 12);
  B.row(80, 86, 20, TT.SEMI).hidden(85, 20).coins(80, 84, 19);
  // ruta principal: arriba
  B.row(80, 92, 10, TT.SEMI).foe('holo', 84, 10).foe('hacker', 89, 10);
  B.fill(95, 14, 100, 22, G2).foe('crystal', 97, 14).foe('pyce2', 99, 14);
  // 4) bucle grande con dos plataformas en sentidos opuestos y Pyces montados en raíl
  B.railRect(103, 9, 121, 17).obj('platform', 103, 17).obj('platform', 121, 9);
  B.railLine(106, 13, 118, 13).foe('hacker', 112, 14);
  B.obj('starcoin', 112, 6);
  B.fill(124, 15, 131, 22, G2).foe('holo', 127, 15).foe('crystal', 130, 15);
  // 5) tramo final: islas de 1 casilla con Barras Estelares girando entre ellas
  [134, 139, 144, 149].forEach((x, i) => { B.fill(x, 14 - (i % 2) * 2, x, 22, G2); if (i < 3) B.obj('firebar', x + 2, 10 + (i % 2) * 2, { r: 2 }); });
  B.fill(153, 16, 165, 22, G2).foe('hacker', 157, 16).foe('pyce2', 160, 16).foe('holo', 163, 16);
  B.obj('starcoin', 159, 11);
  B.fill(168, 18, 199, 22, G2).foe('crystal', 175, 18);
  B.goal(190, 18);
  return [B, { mustReach: [[74, 9, 'la Moneda Estrella 1'], [112, 6, 'la Moneda Estrella 2'], [159, 11, 'la Moneda Estrella 3']] }];
}

// ================================================================== 6. Tidal Reboot
// Sunlight Seaside en Marejada (Corrupto): el muelle se inunda de olas de agua venenosa.
// Se nada entre pilotes con Squid y Pysh, se corre por los tablones cuando la ola baja, y las
// 60 monedas púrpura (por debajo y por encima del agua) hacen aparecer la Medalla.
// La meta oculta está bajo el muelle: una cueva de agua a la que se entra por una tubería.
function tidal() {
  const B = make({ name: 'Tidal Reboot', slug: 'tidal-reboot', theme: 'seaside', mode: 'corrupt', w: 210, time: 320 });
  const G2 = TT.GROUND2, WA = TT.WATER, LQ = TT.LIQUID, V = TT.VCOIN;
  B.ground(0, 14).start(3);
  B.coins(6, 12, 18, V); // 7
  // 1) primer tramo de muelle (tablones a la altura 17) sobre veneno, con huecos
  B.fill(15, 21, 70, 23, LQ);
  [[15, 21], [25, 31], [35, 41], [45, 51], [55, 60]].forEach(([a, b]) => { B.row(a, b, 17, G2); B.col(a, 18, 20, G2); B.col(b, 18, 20, G2); });
  B.coins(16, 20, 16, V).coins(26, 30, 16, V).coins(36, 40, 16, V).coins(46, 50, 16, V).coins(56, 59, 16, V); // 24
  B.foe('pysh', 23, 22).foe('pysh', 33, 22).foe('clownpysh', 43, 22).foe('pysh', 53, 22);
  B.foe('rebel', 28, 17).foe('miner', 48, 17);
  B.obj('starcoin', 33, 12);
  // 2) piscina de agua (se nada) entre dos paredes, con Squid
  B.ground(61, 64, 17).ground(90, 94, 17);
  B.fill(65, 12, 89, 20, WA).ground(65, 89, 21);
  B.foe('squid', 70, 15).foe('squid', 82, 18).foe('axolotl', 76, 19);
  B.coins(67, 87, 14, V); // 21
  B.obj('checkpoint', 92, 16);
  // 3) tablones flotantes en raíl sobre veneno (la ola los moja: hay que subir alto)
  B.fill(95, 21, 140, 23, LQ);
  B.railLine(96, 16, 112, 16).obj('platform', 96, 16);
  B.railLine(114, 13, 128, 13).obj('platform', 128, 13);
  B.row(118, 120, 18, G2).col(119, 19, 20, G2).foe('shark', 119, 22);
  B.coins(100, 110, 14, V); // 11
  B.obj('starcoin', 121, 10);
  // entrada secreta: tubería en el pilote del medio que baja a la cueva. La entrada de tubería
  // (warp) YA es una tubería 2x2: no lleva tiles de tubería debajo (salía doble y desalineada).
  B.fill(131, 15, 134, 20, G2);
  // 4) recta final del puerto con Pyces y bros
  B.ground(141, 209);
  B.foe('builder', 150).foe('rebel', 158).foe('miner', 166).foe('umbrella', 172, 15);
  B.coins(144, 149, 18, V).coins(160, 165, 18, V); // 12
  B.obj('starcoin', 178, 14).row(176, 180, 17, TT.SEMI);
  B.goal(196);
  // cueva cerrada bajo el muelle (agua) con la meta oculta: SOLO se entra por la tubería del pilote
  B.row(135, 140, 16, G2).col(141, 16, 20, G2).fill(135, 17, 140, 20, WA).ground(135, 140, 21).hidden(139, 21);
  // las dos entradas se llevan de una a otra (enlace manual en la misma zona); apoyadas en suelo
  B.obj('warp', 132, 14, { to: { z: 0, i: 1 } }).obj('warp', 137, 20, { to: { z: 0, i: 0 } });
  return [B, { purpleMin: 60, secretViaPipe: true, mustReach: [[33, 12, 'la Moneda Estrella 1'], [121, 10, 'la Moneda Estrella 2'], [178, 14, 'la Moneda Estrella 3']] }];
}

// ================================================================== 7. MadStars Assembly Line
// La Fábrica MadStars (Corrupto, rojo/negro/blanco): cadena de montaje. Cintas en contra,
// nubes que se deshacen al pisarlas y sueltan rayos, Builder y Miner en las pasarelas,
// y Barras Estelares sobre raíles que recorren la nave. Pocas cajas y un solo punto de control.
// Meta oculta: detrás del horno, saltando sobre la cinta que te empuja hacia el vacío.
function madstars() {
  const B = make({ name: 'MadStars Assembly Line', slug: 'madstars-assembly', theme: 'factory', mode: 'corrupt', w: 200, time: 280 });
  const G2 = TT.GROUND2, LQ = TT.LIQUID, CL = TT.CONV_L, CR = TT.CONV_R;
  B.fill(0, 22, 199, 23, LQ);
  B.ground(0, 16, 19).start(3, 19);
  B.box(9, 15, 'evo');
  // 1) cinta larga hacia atrás con Pyces que vienen hacia ti
  B.row(17, 40, 19, CL).fill(17, 20, 40, 21, G2);
  B.foe('stupid', 26, 19).foe('knight', 33, 19).foe('stupid', 38, 19);
  B.obj('firebar', 30, 15, { r: 3 });
  // 2) nubes que desaparecen (1 s) sobre el vacío
  [44, 49, 54, 59].forEach((x, i) => B.row(x, x + 2, 17 - (i % 2) * 2, TT.CLOUD));
  B.obj('starcoin', 50, 11);
  // 3) pasarela de dos pisos con los bros
  B.fill(63, 18, 90, 21, G2).row(66, 88, 13, TT.SEMI);
  B.foe('builder', 70, 18).foe('miner', 82, 18).foe('builder', 77, 13);
  B.box(76, 9, 'flor');
  B.obj('checkpoint', 64, 17);
  // 4) raíl que recorre la nave con DOS Barras Estelares
  B.railRect(93, 10, 125, 19).obj('platform', 93, 19);
  B.railLine(97, 14, 121, 14).obj('firebar', 101, 14, { r: 3 }).obj('firebar', 117, 14, { r: 3 });
  B.fill(107, 20, 111, 21, G2).foe('noob', 109, 20).obj('starcoin', 109, 17);
  // 5) horno: cinta hacia el vacío; si saltas hacia atrás al final, la meta oculta
  B.row(128, 150, 18, CR).fill(128, 19, 150, 21, G2);
  B.foe('knight', 134, 18).foe('bomb', 141, 18);
  B.fill(146, 12, 150, 17, TT.HARD);              // el horno
  B.row(152, 155, 15, TT.SEMI).hidden(154, 15);   // detrás del horno, flotando
  // ruta principal: por encima del horno, escalón y nubes que se deshacen
  B.row(136, 138, 14, TT.SEMI).row(140, 143, 10, TT.CLOUD).row(146, 150, 11, TT.SEMI);
  B.row(153, 156, 9, TT.CLOUD);
  B.obj('starcoin', 148, 8);
  // 6) final: escalera de cintas alternas y un último bro
  B.fill(160, 17, 199, 21, G2);
  B.row(160, 166, 17, CL).row(170, 176, 15, CR).fill(170, 16, 176, 16, G2).row(180, 186, 13, CL).fill(180, 14, 186, 16, G2);
  B.foe('miner', 184, 13).foe('knight', 165, 17);
  B.goal(194, 17);
  return [B, { mustReach: [[50, 11, 'la Moneda Estrella 1'], [109, 17, 'la Moneda Estrella 2'], [148, 8, 'la Moneda Estrella 3']] }];
}

// ------------------------------------------------------------------ generar
const outDir = path.join(root, 'niveles_kirodev');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
let bad = 0;
[pixelStar, casino, cityDay, cityNight, vortex, tidal, madstars].forEach((fn) => {
  const [B, opt] = fn();
  const errs = check(B, opt);
  const j = Level.content(B.L.toJSON());
  const file = path.join(outDir, B.L.id.replace('kirodev-', '') + '.sgm.json');
  fs.writeFileSync(file, JSON.stringify(j));
  const count = (t) => B.L.tiles.filter((v) => v === t).length;
  console.log((errs.length ? 'FALLA ' : 'OK    ') + B.L.name.padEnd(30) + ' ' + B.L.width + ' casillas · ' + B.L.objects.length + ' objetos · púrpura ' + count(TT.VCOIN) + ' · rojas ' + count(TT.RCOIN) + (errs.length ? '\n        - ' + errs.join('\n        - ') : ''));
  if (errs.length) bad++;
});
process.exitCode = bad ? 1 : 0;
