// Prueba temporal: mecánicas concretas
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f }));
const S = ctx.SGM, C = S.Model.Catalog, TT = C.T, T = S.TILE;
const ev = {}; S.events.on('*', (e) => { ev[e] = (ev[e] || 0) + 1; });
const idle = { left: false, right: false, jump: false, down: false, up: false };
const step = (g, inp, n) => { for (let i = 0; i < n; i++) g.update(1 / 120, Object.assign({}, idle, inp || {})); };
const press = (g, k) => { step(g, { [k]: true, [k + 'Pressed']: true }, 1); step(g, { [k]: true }, 60); };
const ok = (name, cond) => console.log((cond ? 'OK   ' : 'FALLA') + ' ' + name);
const base = () => { const L = S.Model.Level.createDefault(); L.objects = L.objects.filter((o) => o.type !== 'start'); L.objects.push({ type: 'start', x: 5, y: L.height - 4 }); return L; };
const game = (L) => { const g = new S.Model.GameModel(JSON.parse(JSON.stringify(L.toJSON())), { testMode: true }); g.t = 3; step(g, {}, 30); return g; };
const gy = 24 - 3;

// Puerta normal: ↑ te lleva a la otra
let L = base(); L.objects.push({ type: 'door', x: 5, y: gy - 1 }, { type: 'door', x: 60, y: gy - 1 });
let g = game(L); press(g, 'up'); step(g, {}, 120);
ok('puerta normal teletransporta', Math.abs(g.player.x - 60 * T) < 40);

// Puerta con llave: sin llave no abre, con llave sí y se queda abierta
L = base(); L.objects.push({ type: 'lockdoor', x: 5, y: gy - 1 }, { type: 'door', x: 60, y: gy - 1 });
g = game(L); press(g, 'up'); step(g, {}, 60);
ok('puerta con llave cerrada sin llave', g.player.x < 10 * T && ev['game:locked'] > 0);
g.keys = 1; press(g, 'up'); step(g, {}, 120);
ok('puerta con llave abre gastando la llave', Math.abs(g.player.x - 60 * T) < 40 && g.keys === 0 && ev['game:unlock'] > 0);

// Tubería normal y con tapa: ↓ encima de la tubería
L = base();
[5, 60].forEach((x) => { L.set(x, gy - 1, TT.PIPE); L.set(x, gy - 2, TT.PIPE); });
L.objects = L.objects.filter((o) => o.type !== 'start'); L.objects.push({ type: 'start', x: 5, y: gy - 3 });
L.objects.push({ type: 'lockwarp', x: 5, y: gy - 2 }, { type: 'warp', x: 60, y: gy - 2 });
g = game(L); step(g, { down: true }, 60);
ok('tubería con tapa no deja entrar sin llave', g.player.x < 10 * T);
g.keys = 1; step(g, { down: true }, 150);
ok('tubería con tapa se abre con llave y teletransporta', Math.abs(g.player.x + g.player.w / 2 - 60.5 * T) < 30 && g.keys === 0);

// Llave dentro de una caja
L = base(); L.set(6, gy - 3, TT.BOX); L.contents['6,' + (gy - 3)] = 'key';
g = game(L); g.player.x = 6 * T + 2; press(g, 'jump'); step(g, {}, 200);
const keyEnt = g.entities.find((e) => e.type === 'key');
if (keyEnt) { g.player.x = keyEnt.x; g.player.y = keyEnt.y; step(g, {}, 5); }
ok('llave sale de la caja y se recoge', g.keys === 1);

// Rosquilla: cae si te quedas encima
L = base(); for (let x = 3; x < 9; x++) L.set(x, gy, TT.DONUT);
L.objects = L.objects.filter((o) => o.type !== 'start'); L.objects.push({ type: 'start', x: 5, y: gy - 1 });
g = game(L); step(g, {}, 120);
ok('rosquilla cae', ev['game:donutFall'] > 0);

// Bloque Nota: rebote
L = base(); for (let x = 3; x < 9; x++) L.set(x, gy, TT.NOTE);
L.objects = L.objects.filter((o) => o.type !== 'start'); L.objects.push({ type: 'start', x: 5, y: gy - 4 });
g = game(L); let minY = 1e9; for (let i = 0; i < 240; i++) { step(g, {}, 1); minY = Math.min(minY, g.player.y); }
ok('bloque nota rebota', ev['game:note'] > 0 && minY < (gy - 4) * T);

// A/B: interruptor cambia qué bloques son sólidos
L = base(); L.set(10, gy - 3, TT.A0); L.set(11, gy - 3, TT.B0);
g = game(L);
const before = [C.isSolid(TT.A0, g.level), C.isSolid(TT.B0, g.level)]; g.toggleAB(0);
ok('A/B cambia sólidos', before[0] && !before[1] && !C.isSolid(TT.A0, g.level) && C.isSolid(TT.B0, g.level));

// Pysh: salta fuera del agua y en lava se vuelve ígneo
L = base(); for (let x = 20; x < 40; x++) for (let y = gy - 4; y < gy; y++) L.set(x, y, TT.WATER);
L.objects.push({ type: 'pysh', x: 30, y: gy - 2 });
g = game(L); g.player.x = 25 * T; step(g, {}, 120 * 8);
ok('Pysh salta fuera del agua', ev['game:pyshLeap'] > 0);
L = base(); for (let x = 20; x < 40; x++) for (let y = gy - 4; y < gy; y++) L.set(x, y, TT.LIQUID);
L.theme = 'volcano'; L.objects.push({ type: 'pysh', x: 30, y: gy - 2 });
g = game(L); g.player.x = 25 * T; step(g, {}, 60);
const py = g.entities.find((e) => e.type === 'pysh');
ok('Pysh en lava se vuelve ígneo y no se pisa', py && py.element === 'lava' && !py.stompable);
L = base(); L.objects.push({ type: 'pysh', x: 30, y: gy - 1 });
g = game(L); step(g, {}, 240); const dry = g.entities.find((e) => e.type === 'pysh');
ok('Pysh sin agua solo brinca', dry && !dry.leap && dry.onGround !== undefined);

// Knight inmune a disparos, Mimic 10 pisotones y 1UP
L = base(); L.objects.push({ type: 'knight', x: 9, y: gy - 1 });
g = game(L); const kn = g.entities.find((e) => e.type === 'knight'); kn.active = true;
ok('Knight inmune a proyectiles', kn.hitByShot(g) === false && !kn.dying);
L = base(); L.objects.push({ type: 'mimic', x: 30, y: gy - 1 });
g = game(L); const mm = g.entities.find((e) => e.type === 'mimic'); const lives = g.lives;
let n = 0; while (!mm.dying && n < 20) { mm.hurtT = 0; mm.onStomp(g); n++; }
ok('Mimic muere al 10º pisotón y da 1UP', n === 10 && g.lives === lives + 1);

// Cápsula de personaje
L = base(); L.objects.push({ type: 'cap_red', x: 6, y: gy - 1 });
g = game(L); step(g, { right: true }, 60);
ok('cápsula cambia a Glob Rojo', g.player.ch.id === 'red');

// Jefe fantasma: los disparos no le hacen nada, solo se le pisa mareado
L = base(); L.objects.push({ type: 'nosense', x: 20, y: gy - 3 });
g = game(L); const gb = g.entities.find((e) => e.type === 'nosense');
const hp0 = gb.hp; gb.hitByShot(g); gb.onStomp(g); const hp1 = gb.hp; gb.state = 'dizzy'; gb.onStomp(g);
ok('jefe fantasma: inmune a disparos, se pisa mareado', hp0 === 4 && hp1 === 4 && gb.hp === 3);

// SkeleBone se desmonta al pisarlo
L = base(); L.objects.push({ type: 'skelebone', x: 20, y: gy - 1 });
g = game(L); const sk = g.entities.find((e) => e.type === 'skelebone'); sk.onStomp(g);
ok('SkeleBone se desmonta', sk.pile > 0 && !sk.harmful && ev['game:bonesScatter'] > 0);

// Puerto envenenado (Sunlight Seaside Corrupto)
L = base(); L.theme = 'seaside'; L.mode = 'corrupt'; for (let x = 4; x < 8; x++) for (let y = gy - 2; y < gy; y++) L.set(x, y, TT.WATER);
L.objects = L.objects.filter((o) => o.type !== 'start'); L.objects.push({ type: 'start', x: 5, y: gy - 4 });
g = game(L); step(g, {}, 120);
ok('agua envenenada mata', g.state === 'dying' || g.state === 'play' && g.player.dead);
