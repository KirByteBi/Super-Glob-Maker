// PLAYTEST con la física y los enemigos REALES del juego (GameModel), como un jugador que reintenta.
// Busca una forma de llegar a la meta probando, cada 12 fotogramas, varias decisiones (andar,
// correr, saltar corto/largo, esperar, retroceder). Se queda con los mejores intentos (beam).
// Además mide el DESAFÍO: en cuántos momentos la mayoría de decisiones acaban en muerte.
//   node tools/playtest.js w1 n1 peace       -> un nivel de la Historia
//   node tools/playtest.js file niveles/x.json
// Exporta playtest(levelJSON, opts) para usarlo desde otras herramientas.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js',
  'model/SampleLevels.js', 'model/StoryMap.js', 'model/StoryLevels.js', 'model/StoryPackData.js', 'model/StoryPack.js']
  .forEach((f) => { const p = path.join(root, 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); });
const S = ctx.SGM, T = S.TILE;

const STEP = 12, DT = 1 / 120;
// decisiones: [derecha, correr, saltar, izquierda]
const OPTS = [
  { r: 1 }, { r: 1, run: 1 }, { r: 1, j: 1 }, { r: 1, run: 1, j: 1 }, { r: 1, jShort: 1 },
  { r: 1, run: 1, jShort: 1 }, {}, { l: 1 }, { l: 1, j: 1 }, { down: 1 }
];
function makeInput(o, prev, k) {
  const jumpHeld = !!(o.j || (o.jShort && k < 4));
  const prevJump = !!(prev && (prev.j || (prev.jShort && false)));
  return { right: !!o.r, left: !!o.l, run: !!o.run, down: !!o.down, jump: jumpHeld, jumpPressed: jumpHeld && k === 0 && !prevJump };
}
// Copia profunda del estado de la partida conservando las clases (prototipos) y las referencias
// cruzadas (enlaces de tuberías, raíles...). Así cada rama sigue desde donde iba, sin repetir.
function deepClone(src, seen) {
  if (src === null || typeof src !== 'object') return src;
  if (seen.has(src)) return seen.get(src);
  if (typeof src.getContext === 'function' || src === S || src === ctx) return src;
  let out;
  if (Array.isArray(src)) { out = new Array(src.length); seen.set(src, out); for (let i = 0; i < src.length; i++) out[i] = deepClone(src[i], seen); return out; }
  if (ArrayBuffer.isView(src)) { out = src.slice(); seen.set(src, out); return out; }
  if (src instanceof Set) { out = new Set(); seen.set(src, out); src.forEach((v) => out.add(deepClone(v, seen))); return out; }
  if (src instanceof Map) { out = new Map(); seen.set(src, out); src.forEach((v, k) => out.set(k, deepClone(v, seen))); return out; }
  out = Object.create(Object.getPrototypeOf(src)); seen.set(src, out);
  for (const k of Object.keys(src)) out[k] = deepClone(src[k], seen);
  return out;
}
const fork = (g) => deepClone(g, new Map());
function advance(g, oi, prevOi) {
  const o = OPTS[oi], prev = prevOi == null ? null : OPTS[prevOi];
  for (let k = 0; k < STEP; k++) { g.update(DT, makeInput(o, prev, k)); if (g.state !== 'play') return; }
}
// silenciar los eventos (sonidos/partículas) durante la búsqueda
S.events.emit = () => {};
function playtest(data, opts) {
  opts = opts || {};
  const beamW = opts.beam || 24, maxSteps = opts.maxSteps || 900;
  const goal = (data.objects || []).find((o) => o.type === 'goal' || /^exswitch/.test(o.type));
  const goalX = goal ? goal.x * T : data.width * T;
  const g0 = new S.Model.GameModel(JSON.parse(JSON.stringify(data)), { lives: 1 }); g0.t = 3;
  let beam = [{ hist: [], score: 0, g: g0 }];
  let best = 0, challenges = [], won = null;
  const seen = new Set();
  for (let step = 0; step < maxSteps && beam.length; step++) {
    const next = [];
    let deaths = 0, tries = 0;
    for (const b of beam) {
      for (let oi = 0; oi < OPTS.length; oi++) {
        const hist = b.hist.concat(oi), g = fork(b.g);
        advance(g, oi, b.hist[b.hist.length - 1]);
        tries++;
        if (g.state === 'clear' || g.state === 'done') { won = { hist, steps: hist.length, secs: (hist.length * STEP * DT).toFixed(1) }; break; }
        if (g.state !== 'play' || g.player.dead) { deaths++; continue; }
        const p = g.player, key = Math.round(p.x / 8) + ',' + Math.round(p.y / 8) + ',' + Math.round(p.vy / 120) + ',' + (p.onGround ? 1 : 0) + ',' + g.zone;
        if (seen.has(key)) continue; seen.add(key);
        const sc = p.x + (g.zone ? 5000 * g.zone : 0) - Math.abs(p.vx) * 0 + g.coins * 2;
        next.push({ hist, score: sc, x: p.x, g });
      }
      if (won) break;
    }
    if (won) break;
    if (tries && deaths / tries > 0.45 && beam[0]) challenges.push(Math.round((beam[0].x || 0) / T));
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, beamW);
    if (beam[0]) best = Math.max(best, beam[0].x);
    if (opts.verbose && step % 25 === 0) console.log('  paso', step, 'x', Math.round(best / T), '/', Math.round(goalX / T));
  }
  // agrupar momentos de desafío cercanos (un mismo salto/enemigo cuenta una vez)
  const groups = []; challenges.sort((a, b) => a - b).forEach((x) => { if (!groups.length || x - groups[groups.length - 1] > 4) groups.push(x); });
  return { beaten: !!won, secs: won ? +won.secs : null, reached: Math.round(best / T), goal: Math.round(goalX / T), challenges: groups, hist: won ? won.hist : null };
}
module.exports = { playtest, S };
if (require.main === module) {
  const a = process.argv.slice(2);
  let data;
  if (a[0] === 'file') data = JSON.parse(fs.readFileSync(a[1], 'utf8'));
  else { const d = S.Model.StoryPack.get(a[0] || 'w1', a[1] || 'n1', a[2] || 'peace'); data = d || S.Model.StoryLevels.build(a[0] || 'w1', a[1] || 'n1', a[2] || 'peace').toJSON(); }
  const t0 = Date.now(), r = playtest(data, { verbose: true });
  console.log(r.beaten ? 'SUPERADO en ' + r.secs + ' s' : 'NO SUPERADO: llega a x=' + r.reached + ' de ' + r.goal);
  console.log('momentos de desafío (casilla x):', r.challenges.join(', ') || 'ninguno', ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s de cálculo');
}
