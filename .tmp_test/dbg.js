const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'); const store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f }));
const S = ctx.SGM, TT = S.Model.Catalog.T, T = S.TILE;
const L = S.Model.Level.createDefault(); const gy = L.height - 3;
L.objects.push({ type: 'mimic', x: 30, y: gy - 1 });
const g = new S.Model.GameModel(JSON.parse(JSON.stringify(L.toJSON())), { testMode: true });
console.log('tras crear:', g.entities.map((e) => e.type + '@' + Math.round(e.x / T) + ',' + Math.round(e.y / T)).join(' '));
for (let i = 0; i < 30; i++) g.update(1 / 120, {});
console.log('tras 30:', g.entities.map((e) => e.type + ' rm=' + e.remove + ' dy=' + e.dying).join(' '));
// rosquilla
const L2 = S.Model.Level.createDefault(); for (let x = 3; x < 9; x++) L2.set(x, gy, TT.DONUT);
L2.objects.find((o) => o.type === 'start').y = gy - 1; L2.objects.find((o) => o.type === 'start').x = 5;
const g2 = new S.Model.GameModel(JSON.parse(JSON.stringify(L2.toJSON())), { testMode: true });
for (let i = 0; i < 60; i++) g2.update(1 / 120, {});
const p = g2.player; console.log('jugador suelo', p.onGround, 'tile', p.groundTile, 'gx', p.groundX, 'gy', p.groundY, 'y', p.y / T);
