// Comprueba TODOS los niveles del Modo Historia (5 mundos, Paz y Corrupto):
//  - se puede llegar de la salida a la Medalla / interruptor "!" (saltos con la física del Glob EVO1,
//    tuberías enlazadas, plataformas móviles y raíles cuentan como suelo)
//  - la meta oculta (si la hay) también es alcanzable
//  - en Corrupto la superficie bloqueada obliga a ir por el túnel (y aun así se llega)
//  - 25 s de partida real sin errores
// Uso: node tools/story_check.js [w1] [--generated] [--pack archivo.js]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js',
  'model/SampleLevels.js', 'model/StoryMap.js', 'model/StoryLevels.js', 'model/StoryPackData.js', 'model/StoryPack.js']
  .forEach((f) => { const p = path.join(root, 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); });
const S = ctx.SGM, C = S.Model.Catalog, TT = C.T;
const { reach, nearSet } = require('./story_reach');
const packArg = process.argv.indexOf('--pack');
if (packArg >= 0 && process.argv[packArg + 1]) {
  const packPath = path.resolve(process.argv[packArg + 1]);
  vm.runInContext(fs.readFileSync(packPath, 'utf8'), ctx, { filename: packPath });
}

const only = process.argv.slice(2).find((arg) => /^w[1-5]$/.test(arg));
const generated = process.argv.includes('--generated');
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
      // N3 y N4 del primer mundo son niveles hechos por el usuario y se conservan en el pack.
      try {
        const preserved = w.id === 'w1' && (n.id === 'n3' || n.id === 'n4');
        const d = (!generated || preserved) && S.Model.StoryPack && S.Model.StoryPack.get(w.id, n.id, mode);
        L = d ? new S.Model.Level(d) : S.Model.StoryLevels.build(w.id, n.id, mode);
      } catch (e) { errs.push('al construir: ' + e.message); }
      if (L) {
        const swim = !!S.Model.Themes.get(L.theme).swim;
        const end = L.objects.find((o) => o.type === 'goal' || /^exswitch/.test(o.type));
        // "!" del mundo sin activar (lo normal la primera vez): la ruta no debe depender de ellos
        const R = reach(S, L, swim, [0, 0, 0]);
        if (!end) errs.push('sin meta'); else if (!nearSet(R, end, 2)) errs.push('no se llega a la meta');
        const gh = L.objects.find((o) => o.type === 'goalhidden');
        if (n.secretNext && !gh) errs.push('sin meta oculta para abrir la ruta secreta');
        if (gh && !nearSet(R, gh, 2)) errs.push('no se llega a la meta oculta');
        if (n.starHunt && gh && gh.y < L.height - 6) errs.push('la búsqueda de la estrella no está escondida en el túnel');
        const coins = L.objects.filter((o) => /^starcoin/.test(o.type));
        const expected = mode === 'corrupt' ? 'starcoin_moon' : 'starcoin';
        if (coins.length !== 3) errs.push('debe haber 3 monedas de Historia');
        if (coins.some((o) => o.type !== expected)) errs.push('tipo de moneda incorrecto para el modo');
        if (n.starHunt && gh && coins.some((o) => Math.abs(o.x - gh.x) < 4 && Math.abs(o.y - gh.y) < 4)) errs.push('una moneda de Historia delata la meta estrella');
        if (n.starHunt && gh) {
          for (let dx = -3; dx <= 3; dx++) for (let dy = -1; dy <= 1; dy++) {
            if ([TT.COIN, TT.BCOIN, TT.GCOIN, TT.KCOIN].includes(L.get(gh.x + dx, gh.y + dy))) errs.push('monedas guía junto a la meta estrella');
          }
        }
        const unreachableCoins = coins.filter((o) => !nearSet(R, o, 2));
        if (unreachableCoins.length) errs.push('moneda(s) de Historia fuera de alcance: ' + unreachableCoins.map((o) => o.x + ',' + o.y).join(' '));
        if (w.id === 'w1' && ['n1', 'n2', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'alt1', 'pal'].includes(n.id)) {
          if (!coins.some((o) => o.y <= 14)) errs.push('falta una moneda elevada que cueste alcanzar');
          if (coins.some((o) => o.y > 16 && !(n.id === 'n2' && o.y > L.height - 6))) errs.push('moneda visible demasiado cerca del suelo');
          if (n.id === 'n2' && !coins.some((o) => o.y > L.height - 6)) errs.push('falta la moneda escondida en el túnel');
        }
        if (w.id === 'w1' && n.id === 'n6') {
          if (!L.name.startsWith('Azoteas a contrarreloj')) errs.push('el nombre no describe el reto de W1-N6');
          if (!L.objects.some((o) => /^platform/.test(o.type))) errs.push('falta la plataforma móvil del reto');
          if (coins.some((o) => o.y >= 16)) errs.push('hay una moneda demasiado fácil, a nivel del suelo');
        }
        if (n.type === 'star' && (!L.name.startsWith('★ DESAFÍO ESTRELLA') || L.time > 180 || !L.noPowers)) {
          errs.push('el nodo estrella no es una variante de reto extremo');
        }
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
      const stars = w.nodes.filter((n) => n.type === 'star');
      if (stars.length !== 1) { bad++; console.log('FALLA ruta estrella · ' + w.id + ' tiene ' + stars.length + ' estrellas'); }
      const star = stars[0], source = star && w.nodes.find((n) => (n.secretNext || []).includes(star.id));
      if (!star || !source || !source.starHunt || !star.hidden || !star.starOf || !w.map[star.starOf] || w.map[star.starOf].type !== 'level') {
        bad++; console.log('FALLA ruta estrella · ' + w.id + ' no tiene origen secreto/base de nivel válidos');
      } else {
        store['sgm.story.v1'] = '{}';
        if (SM.isUnlocked(w.id, star.id)) { bad++; console.log('FALLA ruta estrella · ' + w.id + ' se revela sin encontrar la meta oculta'); }
        SM.markCleared(w.id, source.id, false);
        if (SM.isUnlocked(w.id, star.id)) { bad++; console.log('FALLA ruta estrella · ' + w.id + ' se revela con la meta normal'); }
        store['sgm.story.v1'] = '{}';
        SM.markCleared(w.id, source.id, true);
        if (!SM.isUnlocked(w.id, star.id)) { bad++; console.log('FALLA ruta estrella · ' + w.id + ' no se revela con la meta oculta'); }
      }
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
{
  const SM = S.Model.StoryMap;
  store['sgm.story.v1'] = JSON.stringify({
    'w1/n1': { cleared: true, normal: true },
    worlds: { w2: true }, ex: { w1: [1, 0, 0] }, seen: { w1: { intro: true } }
  });
  const merged = SM.mergeProgress({
    'w1/n1': { cleared: true, secret: true },
    'w1/n2': { cleared: true, normal: true },
    worlds: { w3: true }, ex: { w1: [0, 1, 0] }, seen: { w1: { boss: true } }
  });
  if (!merged['w1/n1'].normal || !merged['w1/n1'].secret || !merged['w1/n2'].cleared ||
      !merged.worlds.w2 || !merged.worlds.w3 || merged.ex.w1.join(',') !== '1,1,0' ||
      !merged.seen.w1.intro || !merged.seen.w1.boss) {
    bad++; console.log('FALLA sincronización de progreso · no conserva la unión local y remota');
  }
}
console.log((bad ? 'FALLAN ' + bad : 'OK') + ' · ' + total + ' niveles comprobados');
process.exitCode = bad ? 1 : 0;
