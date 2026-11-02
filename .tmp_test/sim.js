// Prueba temporal: simula los modelos sin navegador
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {};
const ctx = { console, Math, JSON, Date, Promise, setTimeout, clearTimeout, performance: { now: () => Date.now() },
  localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
const files = ['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js', 'model/EditorModel.js', 'model/SampleLevels.js'];
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f }));
const S = ctx.SGM;
const counts = {};
S.events.on('*', (e) => { counts[e] = (counts[e] || 0) + 1; });
let fails = 0, clears = 0, runs = 0;
const bot = (g, frames) => {
  for (let f = 0; f < frames; f++) {
    const t = f / 120;
    const inp = { right: true, left: false, run: Math.floor(t * 2) % 3 !== 0, down: f % 300 > 280, up: f % 200 < 5, jump: (f % 70) < 30, pause: false };
    inp.jumpPressed = f % 70 === 0; inp.shootPressed = f % 40 === 0; inp.downPressed = f % 400 === 200; inp.upPressed = f % 200 === 0;
    g.update(1 / 120, inp);
    if (g.state === 'done') return 'done';
  }
  return g.state;
};
// 1) todos los mapas del Modo Historia
const chars = S.Model.Characters.list.map((c) => c.id);
for (const mode of ['peace', 'corrupt']) for (const id of S.Model.SampleLevels.ORDER) for (const ch of chars) {
  runs++;
  try {
    const L = S.Model.SampleLevels.build(id, mode);
    const g = new S.Model.GameModel(JSON.parse(JSON.stringify(L.toJSON())), { character: ch, testMode: true });
    if (bot(g, 120 * 60) === 'done') clears++;
  } catch (e) { fails++; console.log('FAIL', mode, id, ch, e.stack.split('\n').slice(0, 4).join(' | ')); if (fails > 5) process.exit(1); }
}
console.log('historia: runs', runs, 'fails', fails, 'clears (bot)', clears);

// 2) un nivel con TODOS los objetos y bloques nuevos
const C = S.Model.Catalog, TT = C.T;
const L = S.Model.Level.createDefault(); L.resize(200, 24);
const gy = L.height - 3;
let x = 8;
Object.keys(C.OBJECTS).filter((k) => C.OBJECTS[k].cat && k !== 'start' && k !== 'goal').forEach((k) => {
  L.objects.push({ type: k, x, y: C.OBJECTS[k].anchor === 'top' ? gy - 6 : gy - 1, r: C.OBJECTS[k].range ? 3 : undefined });
  x += 2;
});
[TT.NOTE, TT.POW, TT.SW0, TT.A0, TT.B0, TT.DONUT, TT.S45U, TT.G1U, TT.G2U, TT.SEMI2, TT.WATER, TT.CLOUD].forEach((t, i) => L.set(10 + i * 3, gy - 4, t));
L.set(30, gy - 4, TT.NOTE); L.contents['30,' + (gy - 4)] = 'key';
const lj = JSON.parse(JSON.stringify(L.toJSON()));
const missing = Object.keys(C.OBJECTS).filter((k) => C.OBJECTS[k].cat && k !== 'start' && k !== 'goal' && !S.Model.Entities.has(k));
console.log('objetos sin clase:', missing.join(',') || 'ninguno');
for (const th of S.Model.Themes.list) for (const mode of ['peace', 'corrupt']) for (const ch of ['green', 'gray']) {
  try {
    const d = Object.assign({}, lj, { theme: th.id, mode });
    const g = new S.Model.GameModel(d, { character: ch, testMode: true });
    g.player.star = 0; bot(g, 120 * 40);
    // fuerza mecánicas: explosión, POW, A/B, P, warp, cápsula
    g.explode(g.player.x, g.player.y, 50); g.pow(0, 0); g.toggleAB(0); g.pSwitch(); bot(g, 120 * 12);
  } catch (e) { fails++; console.log('FAIL todo', th.id, mode, ch, e.stack.split('\n').slice(0, 4).join(' | ')); if (fails > 8) process.exit(1); }
}
console.log('nivel completo: fails', fails);
// 3) editor y guardado
const ed = new S.Model.EditorModel();
ed.beginStroke(); ed.setTool({ kind: 'tile', id: TT.BOX }); ed.apply(10, 10); ed.setTool({ kind: 'obj', type: 'caca' }); ed.apply(10, 10); ed.setTool({ kind: 'obj', type: 'stupid' }); ed.apply(12, 20); ed.endStroke();
console.log('caja con', ed.level.contents['10,10'], '| objs', ed.level.objects.length);
const St = S.Model.LevelStorage;
let last = 'ok'; for (let i = 0; i < 210 && last === 'ok'; i++) last = St.save({ id: 'L' + i, name: 'n' + i });
console.log('guardado: limite', St.limit(), 'guardados', St.count(), 'ultimo', last);
const old = new S.Model.Level({ objects: [{ type: 'gloopy', x: 3, y: 3 }, { type: 'madstar', x: 5, y: 5 }] });
console.log('traduccion antiguos:', old.objects.map((o) => o.type).join(','));
console.log('eventos:', Object.keys(counts).length, 'tipos;', ['pipeIn', 'doorIn', 'unlock', 'locked', 'key', 'note', 'pow', 'abToggle', 'pSwitch', 'explode', 'donutFall', 'cloudPoof', 'boltWarn', 'meteorWarn', 'bonesScatter', 'pyshLeap', 'kick', 'deflect'].map((k) => k + '=' + (counts['game:' + k] || 0)).join(' '));
