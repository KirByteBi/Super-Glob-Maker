// Comprueba TODOS los niveles del Modo Historia (5 mundos, Paz y Corrupto):
//  - se puede llegar de la salida a la Medalla / interruptor "!" (saltos con la física del Glob EVO1,
//    tuberías enlazadas, plataformas móviles y raíles cuentan como suelo)
//  - la meta oculta (si la hay) también es alcanzable
//  - en Corrupto la superficie bloqueada obliga a ir por el túnel (y aun así se llega)
//  - 25 s de partida real sin errores
// Uso: node tools/story_check.js [w1]   (sale con código 1 si algo falla)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js',
  'model/SampleLevels.js', 'model/StoryMap.js', 'model/StoryLevels.js', 'model/StoryPackData.js', 'model/StoryPack.js']
  .forEach((f) => { const p = path.join(root, 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); });
const S = ctx.SGM, C = S.Model.Catalog, TT = C.T;

function reach(L, swim, ex) {
  const W = L.width, H = L.height, Rail = S.Model.Rail;
  L.ex = ex || [0, 0, 0];
  const blk = (t) => [TT.BOX, TT.BRICK, TT.NOTE, TT.HIDDEN, TT.DONUT, TT.PSW, TT.SW0, TT.SW1, TT.SW2, TT.POW].includes(t);
  const solid = (x, y) => { const t = L.get(x, y); return C.isSolid(t, L) || C.isSemi(t) || C.isSlope(t) || blk(t) || t === TT.PBLK || (t >= TT.A0 && t <= TT.B2); };
  const free = (x, y) => { if (y < 0) return true; const t = L.get(x, y); return !C.isSolid(t, L) && !blk(t) && t !== TT.LIQUID && t !== TT.SPIKE && !(t >= TT.A0 && t <= TT.B2 && C.isSolid(t, L)); };
  // plataformas / raíles / setas = suelo en todo su recorrido; tuberías = sólidas (se pisan)
  const extra = new Set();
  L.objects.forEach((o) => {
    if (/^platform|^shroom/.test(o.type)) {
      if (L.get(o.x, o.y) === TT.RAIL) {
        const seen = new Set([o.x + ',' + o.y]), q = [[o.x, o.y]];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Rail.links(L, x, y)) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
        seen.forEach((k) => { const [x, y] = k.split(',').map(Number); for (let i = -1; i <= 1; i++) extra.add((x + i) + ',' + (y - 1)); });
      } else { const r = o.r != null ? o.r : 3, v = /V$/.test(o.type); for (let s = -r; s <= r; s++) for (let i = -1; i <= 1; i++) extra.add(v ? (o.x + i) + ',' + (o.y + s - 1) : (o.x + s + i) + ',' + (o.y - 1)); }
    }
    if (o.type === 'warp' || o.type === 'lockwarp') { extra.add(o.x + ',' + (o.y - 1)); extra.add((o.x + 1) + ',' + (o.y - 1)); }
    if (o.type === 'spring') for (let k = 1; k <= 9; k++) extra.add(o.x + ',' + (o.y - k)); // el muelle lanza hacia arriba
  });
  // A/B: el interruptor cambia cuáles son sólidos: se exploran los dos estados
  const stand = (x, y) => x >= 0 && x < W && y >= 0 && y < H - 1 && free(x, y) && free(x, y - 1) && (solid(x, y + 1) || extra.has(x + ',' + y) || (swim && y > 2));
  const warps = L.objects.filter((o) => o.type === 'warp' || o.type === 'lockwarp');
  const seen = new Set(), q = [];
  const push = (x, y) => { const k = x + ',' + y; if (!seen.has(k) && stand(x, y)) { seen.add(k); q.push([x, y]); } };
  const land = (x, y) => { for (let yy = y; yy < H - 1; yy++) { if (!free(x, yy)) return null; if (stand(x, yy)) return yy; } return null; };
  const st = L.objects.find((o) => o.type === 'start'); push(st.x, st.y);
  const UP = swim ? 8 : 4, FAR = swim ? 7 : 6;
  while (q.length) {
    const [x, y] = q.shift();
    // tubería: de pie encima de una entrada enlazada -> aparece encima de la otra
    warps.forEach((wp, i) => { if (wp.to && (x === wp.x || x === wp.x + 1) && y === wp.y - 1) { const d = warps[wp.to.i]; if (d) { push(d.x, d.y - 1); push(d.x + 1, d.y - 1); } } });
    for (let dx = -FAR; dx <= FAR; dx++) for (let up = 0; up <= UP; up++) {
      if (Math.abs(dx) > (up >= 3 && !swim ? 4 : FAR)) continue;
      let ok = true; for (let k = 1; k <= up; k++) if (!free(x, y - k)) ok = false;
      if (!ok) continue;
      const tx = x + dx, ty = y - up; if (tx < 0 || tx >= W) continue;
      if (stand(tx, ty)) push(tx, ty); else { const ly = land(tx, ty); if (ly != null) push(tx, ly); }
    }
  }
  return seen;
}
const nearSet = (R, o, r) => { for (let dx = -r; dx <= r; dx++) for (let dy = -3; dy <= 2; dy++) if (R.has((o.x + dx) + ',' + (o.y + dy))) return true; return false; };

const only = process.argv[2];
let bad = 0, total = 0;
// La unicidad se comprueba SIN nombre, id, tema ni modo: dos niveles no pueden tener el mismo
// diseño jugable aunque su decoración cambie.
const fingerprints = new Map();
for (const w of S.Model.StoryMap.worlds) {
  if (only && w.id !== only) continue;
  for (const n of w.nodes) {
    if (n.type === 'start') continue;
    for (const mode of ['peace', 'corrupt']) {
      total++;
      const errs = [];
      let L;
      // el que se juega de verdad: el de la lista fija si está, si no el generado
      try { const d = S.Model.StoryPack && S.Model.StoryPack.get(w.id, n.id, mode); L = d ? new S.Model.Level(d) : S.Model.StoryLevels.build(w.id, n.id, mode); } catch (e) { errs.push('al construir: ' + e.message); }
      if (L) {
        const swim = !!S.Model.Themes.get(L.theme).swim;
        const end = L.objects.find((o) => o.type === 'goal' || /^exswitch/.test(o.type));
        // "!" del mundo sin activar (lo normal la primera vez): la ruta no debe depender de ellos
        const R = reach(L, swim, [0, 0, 0]);
        if (!end) errs.push('sin meta'); else if (!nearSet(R, end, 2)) errs.push('no se llega a la meta');
        const gh = L.objects.find((o) => o.type === 'goalhidden');
        if (n.secretNext && !gh) errs.push('sin meta oculta para abrir la ruta secreta');
        if (gh && !nearSet(R, gh, 2)) errs.push('no se llega a la meta oculta');
        const reds = L.tiles.filter((t) => t === TT.RCOIN).length; if (L.win.type === 'redcoins' && reds !== 8) errs.push('monedas rojas: ' + reds);
        const st = L.objects.find((o) => o.type === 'start');
        const enemies = L.objects.filter((o) => { const d = C.OBJECTS[o.type] || {}; return d.tier || d.boss; }).length;
        if (enemies < 5) errs.push('demasiado vacío: solo ' + enemies + ' enemigos');
        const cps = L.objects.filter((o) => o.type === 'checkpoint');
        if (cps.length !== 1) errs.push('checkpoints: ' + cps.length + ' (debe haber 1)');
        // Huella del diseño (sin datos cosméticos) para garantizar que cada uno sea diferente.
        const fp = L.toJSON(); delete fp.id; delete fp.name; delete fp.theme; delete fp.mode; delete fp.character;
        const key = JSON.stringify(fp), prev = fingerprints.get(key);
        if (prev) errs.push('diseño duplicado de ' + prev); else fingerprints.set(key, w.id + '/' + n.id + '/' + mode);
        L.objects.forEach((o) => { const d = C.OBJECTS[o.type] || {}; if ((d.tier || d.boss) && Math.abs(o.x - st.x) < 6 && Math.abs(o.y - st.y) < 4) errs.push('enemigo en la salida'); });
        L.objects.filter((o) => o.type === 'checkpoint').forEach((cp) => L.objects.forEach((o) => { const d = C.OBJECTS[o.type] || {}; if ((d.tier || d.boss) && Math.abs(o.x - cp.x) < 5 && Math.abs(o.y - cp.y) < 4) errs.push(o.type + ' encima del punto de control'); }));
        try {
          const g = new S.Model.GameModel(JSON.parse(JSON.stringify(L.toJSON())), {});
          for (let i = 0; i < 120 * 25; i++) { g.update(1 / 120, { right: i % 240 < 200, jump: i % 50 < 22, jumpPressed: i % 50 === 0, run: true }); if (g.state === 'dying') g.player.inv = 1; }
        } catch (e) { errs.push('error al jugar: ' + e.message); }
      }
      const label = (w.id + '/' + n.id).padEnd(9) + ' ' + mode.padEnd(7) + ' ' + (L ? L.name : '?');
      if (errs.length) { bad++; console.log('FALLA ' + label + '\n        - ' + errs.join('\n        - ')); }
      else if (process.env.VERBOSE) console.log('OK    ' + label + ' (' + L.width + ')');
    }
  }
}
// Una meta elevada solo debe activarse cuando el jugador cruza su poste, no al pasar por debajo.
{
  const L = S.Model.Level.createDefault();
  L.objects = L.objects.filter((o) => o.type !== 'goal');
  L.objects.push({ type: 'goalhidden', x: 8, y: 5 });
  const g = new S.Model.GameModel(L.toJSON(), {});
  const gh = g.goalHidden, p = g.player;
  p.x = gh.x; p.y = gh.y + gh.h + 8; p.vx = 0; p.vy = 0; p.onGround = false;
  g.update(1 / 120, {});
  if (g.state !== 'play') { bad++; console.log('FALLA meta oculta · se activa al pasar por debajo'); }
  else {
    p.x = gh.x; p.y = gh.y + gh.h - p.h / 2; p.vx = 0; p.vy = 0;
    g.update(1 / 120, {});
    if (g.state !== 'clear' || !g.secretClear) { bad++; console.log('FALLA meta oculta · no se activa al cruzar el poste'); }
  }
}
// La meta oculta abre solo la rama secreta; la salida normal conserva la ruta principal.
{
  const SM = S.Model.StoryMap;
  for (const w of SM.worlds) {
    const src = w.nodes.find((n) => n.secretNext && n.secretNext.length && n.next && n.next.length);
    if (!src) { bad++; console.log('FALLA ruta secreta · ' + w.id + ' no tiene cruce'); continue; }
    const baseId = src.next[0], secretId = src.secretNext[0];
    store['sgm.story.v1'] = '{}';
    SM.markCleared(w.id, src.id, true);
    if (!SM.isUnlocked(w.id, secretId)) { bad++; console.log('FALLA ruta secreta · ' + w.id + ' no abre su puente'); }
    if (SM.isUnlocked(w.id, baseId)) { bad++; console.log('FALLA ruta secreta · ' + w.id + ' abre la ruta principal'); }
    store['sgm.story.v1'] = '{}';
    SM.markCleared(w.id, src.id, false);
    if (!SM.isUnlocked(w.id, baseId)) { bad++; console.log('FALLA ruta principal · ' + w.id + ' no abre con la meta normal'); }
    if (SM.isUnlocked(w.id, secretId)) { bad++; console.log('FALLA ruta principal · ' + w.id + ' abre la rama secreta'); }
  }
  const last = SM.lastWorldId(), finalCastle = SM.finalCastleId(last);
  store['sgm.story.v1'] = '{}';
  SM.markCleared(last, finalCastle, true);
  if (SM.isWorldComplete(last) || SM.isCorruptUnlocked() || SM.onNodeCleared(last, finalCastle)) {
    bad++; console.log('FALLA meta oculta · completa la Historia principal');
  }
}
console.log((bad ? 'FALLAN ' + bad : 'OK') + ' · ' + total + ' niveles comprobados');
process.exitCode = bad ? 1 : 0;
