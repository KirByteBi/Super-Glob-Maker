// Genera js/model/StoryPackData.js: la LISTA FIJA de niveles del Modo Historia (todos los mundos,
// Paz y Corrupto) a partir del generador StoryLevels. Después los niveles quedan fijos (el
// generador puede cambiar sin cambiarlos) y se pueden retocar a mano desde el juego (admin: E).
// Uso: node tools/story_export.js         (no pisa niveles ya guardados en el pack)
//      node tools/story_export.js --all   (los regenera TODOS)
//      node tools/story_export.js --node w1/n6 (regenera solo un nodo, conservando el resto)
//      node tools/story_export.js --world w1 (rediseña un mundo; conserva W1-N3 y W1-N4 editados por el usuario)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
const files = ['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js',
  'model/SampleLevels.js', 'model/StoryMap.js', 'model/StoryLevels.js', 'model/StoryPackData.js', 'model/StoryPack.js'];
files.forEach((f) => { const p = path.join(root, 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); });
const S = ctx.SGM, Pack = S.Model.StoryPack, all = process.argv.includes('--all');
const { reach, nearSet } = require('./story_reach');
const nodeArg = process.argv.indexOf('--node'), selected = nodeArg >= 0 ? process.argv[nodeArg + 1] : null;
const worldArg = process.argv.indexOf('--world'), selectedWorld = worldArg >= 0 ? process.argv[worldArg + 1] : null;
if (nodeArg >= 0 && worldArg >= 0) { console.error('Usa --node o --world, no ambos.'); process.exit(1); }
if (all && (nodeArg >= 0 || worldArg >= 0)) { console.error('No combines --all con --node o --world.'); process.exit(1); }
if (nodeArg >= 0 && !/^(w[1-5])\/(n[1-9][0-9]*|cas[1-9][0-9]*|pal|alt[1-9][0-9]*)$/.test(selected || '')) {
  console.error('Uso: node tools/story_export.js --node w1/n6');
  process.exit(1);
}
if (worldArg >= 0 && !/^w[1-5]$/.test(selectedWorld || '')) {
  console.error('Uso: node tools/story_export.js --world w1');
  process.exit(1);
}
function placeCoins(L, mode, hideTunnelCoin) {
  L.objects = L.objects.filter((o) => !/^starcoin/.test(o.type));
  const swim = !!S.Model.Themes.get(L.theme).swim;
  const R = reach(S, L, swim, [0, 0, 0]);
  const H = L.height, W = L.width;
  const candidates = [];
  for (let y = 8; y < H - 1; y++) for (let x = 8; x < W - 4; x++) {
    if (!L.get(x, y) && nearSet(R, { x, y }, 0) &&
      !L.objects.some((o) => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1)) candidates.push({ x, y });
  }
  const chosen = [];
  const pick = (targetX, tunnelOnly) => {
    const pool = candidates.filter((p) => (tunnelOnly ? p.y >= H - 7 : p.y <= 16) &&
      chosen.every((q) => Math.abs(q.x - p.x) >= 7));
    pool.sort((a, b) => {
      const score = (p) => Math.abs(p.x - targetX) + Math.abs(p.y - (tunnelOnly ? H - 5 : 12)) * 1.5;
      return score(a) - score(b);
    });
    if (pool.length) chosen.push(pool[0]);
  };
  pick(Math.floor(W * 0.24), false);
  pick(Math.floor(W * 0.55), false);
  pick(Math.floor(W * 0.76), !hideTunnelCoin);
  if (chosen.length < 3) {
    for (const p of candidates) {
      if (chosen.every((q) => Math.abs(q.x - p.x) >= 7)) chosen.push(p);
      if (chosen.length === 3) break;
    }
  }
  if (chosen.length !== 3) throw new Error('No se pudieron colocar 3 monedas alcanzables en ' + L.name);
  const type = mode === 'corrupt' ? 'starcoin_moon' : 'starcoin';
  chosen.forEach((p) => L.objects.push({ type, x: p.x, y: p.y }));
}
const [nodeWorld, selectedNode] = selected ? selected.split('/') : [];
const levels = all ? {} : Object.assign({}, Pack.builtin());
let added = 0;
for (const w of S.Model.StoryMap.worlds) for (const n of w.nodes) {
  if (n.type === 'start') continue;
  if (selected && (w.id !== nodeWorld || n.id !== selectedNode)) continue;
  if (selectedWorld && w.id !== selectedWorld) continue;
  if (selectedWorld === 'w1' && ['n3', 'n4'].includes(n.id)) continue;
  for (const m of ['peace', 'corrupt']) {
    const k = Pack.key(w.id, n.id, m); if (!all && !selected && !selectedWorld && levels[k]) continue;
    const L = S.Model.StoryLevels.build(w.id, n.id, m);
    if (w.id !== 'w1') placeCoins(L, m, n.starHunt);
    const d = S.Model.Level.content(L.toJSON()); d.id = 'story-' + k.replace(/\//g, '-'); d.name = L.name;
    levels[k] = d; added++;
  }
}
if (selected && added !== 2) { console.error('Nodo no encontrado o no tiene dos variantes: ' + selected); process.exit(1); }
if (selectedWorld && added === 0) { console.error('No se generaron niveles para el mundo: ' + selectedWorld); process.exit(1); }
const keys = Object.keys(levels).sort();
const out = '/* Modelo: DATOS de la lista fija del Modo Historia (generado con tools/story_export.js; ver StoryPack.js). */\n' +
  '(function (S) {\n  \'use strict\';\n  S.Model.StoryPackData = { version: ' + Date.now() + ', levels: {\n' +
  keys.map((k) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(levels[k])).join(',\n') + '\n  } };\n})(window.SGM);\n';
fs.writeFileSync(path.join(root, 'js/model/StoryPackData.js'), out);
console.log('OK · ' + keys.length + ' niveles en el pack (' + added + (selected || selectedWorld ? ' actualizados' : ' nuevos') + ') · ' + Math.round(out.length / 1024) + ' KB');
