// Prueba temporal: mecánicas concretas
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Level.js', 'model/LevelStorage.js', 'model/GldAccount.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js', 'model/EditorModel.js']
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

// Marejada (Sunlight Seaside Corrupto): el agua y el líquido hacen olas
const seaLevel = (mode) => {
  const L2 = base(); L2.theme = 'seaside'; L2.mode = mode;
  for (let x = 4; x < 14; x++) for (let y = gy - 2; y < gy; y++) L2.set(x, y, TT.WATER);
  for (let x = 30; x < 40; x++) for (let y = gy - 2; y < gy; y++) L2.set(x, y, TT.LIQUID);
  return L2;
};
// busca un instante en que la ola cubra un punto 20 px por encima de la superficie
const crest = (g2, px, surf) => { for (let k = 0; k < 4000; k++) { g2.t = k * 0.01; if (g2.waveTileAt(px, surf - 20)) return true; } return false; };
L = seaLevel('corrupt'); g = game(L);
const wx = 8.5 * T, wsurf = (gy - 2) * T;
ok('olas: el agua crece por encima de su superficie', crest(g, wx, wsurf) && g.waveTileAt(wx, wsurf - 20) === TT.WATER);
ok('olas: no pasan de 2 casillas', (() => { for (let k = 0; k < 4000; k++) { g.t = k * 0.01; if (g.waveTileAt(wx, wsurf - 2 * T - 4)) return false; } return true; })());
ok('olas: el agua ya no es venenosa', g.liquidAt(wx, wsurf + 10) === 'water');
crest(g, wx, wsurf); const tw = g.t; g.player.x = wx - g.player.w / 2; g.player.y = wsurf - 20 - g.player.h / 2; g.player.vy = 0;
g.player.update(g, 1 / 120, idle); g.t = tw;
ok('olas: dentro de una ola de agua se nada', g.player.swimming && !g.player.dead);
const lx = 34.5 * T, lsurf = (gy - 2) * T + 8;
ok('olas: el líquido también hace olas', crest(g, lx, lsurf) && g.waveTileAt(lx, lsurf - 20) === TT.LIQUID);
g.player.x = lx - g.player.w / 2; g.player.y = lsurf - 20 + 6 - g.player.h; g.player.star = 0; g.checkHazards(g.player);
ok('olas: una ola de líquido mata', g.state === 'dying' || g.player.dead);
L = seaLevel('peace'); g = game(L);
ok('olas: en modo Paz no hay olas', !crest(g, wx, wsurf));

// Squid Pyce (tipo Blooper)
const pool = () => { const L2 = base(); for (let x = 10; x < 40; x++) for (let y = gy - 8; y < gy; y++) L2.set(x, y, TT.WATER); L2.objects.push({ type: 'squid', x: 25, y: gy - 3 }); return L2; };
L = pool(); g = game(L); let sq = g.entities.find((e) => e.type === 'squid');
ok('squid: existe y está en el líquido', !!sq && g.liquidAt(sq.cx(), sq.cy()) === 'water');
g.player.x = 20 * T; g.player.y = (gy - 7) * T; // por encima del calamar, dentro del agua
sq.pulseT = 0; sq.think(g, 1 / 120);
ok('squid: da un tirón hacia ti (arriba y hacia el jugador)', sq.vy < 0 && sq.vx < 0 && ev['game:squidPulse'] > 0);
ok('squid: en el agua no se pisa', !sq.stompable);
sq.inkT = 0; sq.think(g, 1 / 120);
const ink = g.entities.find((e) => e.type === 'sprayfog' && e.ink);
ok('squid: suelta tinta', !!ink && ev['game:squidInk'] > 0);
// cerca de la superficie no se sale del agua
sq.y = (gy - 8) * T + 2; sq.vy = -200; sq.pulse = 0.5; sq.pulseT = 5; sq.think(g, 1 / 120);
ok('squid: no sale del líquido al subir', sq.vy >= 0);
// fuera del agua: se pisa y solo brinca
L = base(); L.objects.push({ type: 'squid', x: 20, y: gy - 1 }); g = game(L); sq = g.entities.find((e) => e.type === 'squid');
step(g, {}, 60);
ok('squid: fuera del agua se puede pisar', sq.stompable && !sq.inLiq);

// Builder Pyce (Hammer Bro) y Miner Pyce (Boomerang Bro)
L = base(); L.objects.push({ type: 'builder', x: 14, y: gy - 1 }); g = game(L);
let bu = g.entities.find((e) => e.type === 'builder');
const bx0 = bu.spawnX; let maxOff = 0, jumped = false;
for (let i = 0; i < 120 * 8; i++) { g.update(1 / 120, idle); g.player.inv = 5; if (!bu.onGround) jumped = true; maxOff = Math.max(maxOff, Math.abs(bu.x - bx0)); }
ok('builder: va y viene en un tramo corto', maxOff > T * 0.8 && maxOff < T * 2.5);
ok('builder: salta', jumped);
ok('builder: lanza martillos (que atraviesan paredes)', g.entities.some((e) => e.kind === 'hammer' && e.tiles === false) || (ev['game:enemyShoot'] || 0) > 0);
L = base(); L.objects.push({ type: 'miner', x: 14, y: gy - 1 }); g = game(L);
let mi = g.entities.find((e) => e.type === 'miner');
mi.throwT = 0; step(g, {}, 2); g.player.inv = 99;
let pk = g.entities.find((e) => e.kind === 'pickaxe');
ok('miner: lanza el pico', !!pk && mi.pick === pk);
step(g, {}, 30); mi.throwT = 0; step(g, {}, 2);
ok('miner: solo un pico a la vez', g.entities.filter((e) => e.kind === 'pickaxe').length === 1);
let far = 0, back = false;
for (let i = 0; i < 120 * 4 && !pk.remove; i++) { g.update(1 / 120, idle); g.player.inv = 99; far = Math.max(far, Math.abs(pk.cx() - mi.cx())); }
ok('miner: el pico va lejos y vuelve a sus manos', far > 3 * T && pk.remove && pk.life > 0 && ev['game:pickCatch'] > 0);

// Raíles (estilo SMM)
const Rail = S.Model.Rail;
const railL = () => {
  const L2 = base(); const ry = gy - 6;
  for (let x = 10; x <= 20; x++) L2.set(x, ry, TT.RAIL);          // tramo recto con dos topes
  for (let x = 30; x <= 34; x++) { L2.set(x, ry, TT.RAIL); L2.set(x, ry + 3, TT.RAIL); } // bucle 5x4
  for (let y = ry; y <= ry + 3; y++) { L2.set(30, y, TT.RAIL); L2.set(34, y, TT.RAIL); }
  for (let i = 0; i < 4; i++) L2.set(40 + i, ry + i, TT.RAIL);    // diagonal
  return { L2, ry };
};
let { L2: RL, ry } = railL();
ok('rail: uniones ortogonales y diagonales', Rail.links(RL, 12, ry).length === 2 && Rail.links(RL, 41, ry + 1).length === 2 && Rail.links(RL, 30, ry).length === 2);
ok('rail: la esquina en L no hace atajo diagonal', !Rail.links(RL, 30, ry + 1).some(([dx, dy]) => dx && dy));
RL.objects.push({ type: 'platform', x: 15, y: ry }, { type: 'stupid', x: 32, y: ry }, { type: 'platform', x: 41, y: ry + 1 }, { type: 'builder', x: 12, y: gy - 1 });
g = game(RL);
const pl = g.entities.find((e) => e.type === 'platform' && e.rail && e.rail.x <= 20);
const st2 = g.entities.find((e) => e.type === 'stupid');
const pd = g.entities.find((e) => e.type === 'platform' && e.rail && e.rail.x >= 40);
ok('rail: plataforma y Pyce se enganchan', !!pl && !!st2 && !!st2.rail && !!pd);
[pl, st2, pd].forEach((e) => { e.active = true; e.always = true; }); // fuera de cámara no se actualizan
step(g, {}, 120);
ok('rail: la plataforma espera hasta que te subes', Math.abs(pl.cx() - 15.5 * T) < 1 && st2.rail.k + Math.abs(st2.rail.x - 32) > 0);
pl.rail.go = true; pd.rail.go = true; // como si ya te hubieras subido
const xs = [], ys = [], dys = [];
for (let i = 0; i < 120 * 16; i++) { g.update(1 / 120, idle); g.player.inv = 99; xs.push(pl.cx()); ys.push(st2.cy()); dys.push(pd.cy()); }
const minX = Math.min(...xs), maxX = Math.max(...xs);
ok('rail: la plataforma recorre el tramo y da la vuelta en los topes', minX < 10.7 * T && maxX > 20.3 * T && Math.abs(pl.cy() - (ry + 0.5) * T) < 1);
ok('rail: el Pyce da la vuelta al bucle (baja y vuelve a subir)', Math.max(...ys) > (ry + 3.3) * T && st2.rail && !st2.dying);
ok('rail: en diagonal sube y baja', Math.max(...dys) - Math.min(...dys) > 2.5 * T);
const bro = g.entities.find((e) => e.type === 'builder');
ok('rail: lo que no está en el raíl sigue igual', bro && !bro.rail);
ok('rail: no es sólido', !C.isSolid(TT.RAIL));

// Copias y publicación (comparación de contenido)
const Lv = S.Model.Level;
const town = Lv.createDefault(); town.name = 'Pueblo';
for (let x = 10; x < 60; x += 3) for (let y = 12; y < 20; y++) town.set(x, y, TT.BRICK);
for (let x = 8; x < 70; x += 4) town.objects.push({ type: 'stupid', x, y: 20 });
const tj = town.toJSON();
let cp = Lv.copy(tj);
ok('copia: id nuevo, sin marca de publicado, recuerda el original', cp.id !== tj.id && !cp.publishedAt && cp.copyOf && cp.copyOf[0].name === 'Pueblo');
ok('copia idéntica: no se puede publicar', !Lv.copyCheck(cp.toJSON()).ok);
cp.set(30, 5, TT.BRICK); cp.objects.push({ type: 'noob', x: 40, y: 20 });
ok('copia con 1-2 cambios: no se puede publicar', !Lv.copyCheck(cp.toJSON()).ok);
cp = Lv.copy(tj); cp.tiles = cp.tiles.map((t, i) => (t === TT.BRICK && i % 7 === 0 ? 0 : t)); cp.objects.forEach((o) => { if (o.x > 2) o.x += 1; });
ok('copia desplazada 1 casilla: sigue contando como parecida', Lv.compare(Lv.copy(tj).toJSON(), (() => { const z = Lv.copy(tj); z.objects.forEach((o) => { o.x += 1; }); const t2 = z.tiles.slice(); for (let y = 0; y < z.height; y++) for (let x = z.width - 1; x > 0; x--) z.tiles[y * z.width + x] = t2[y * z.width + x - 1]; return z.toJSON(); })()).ratio < 0.1);
cp = Lv.copy(tj); cp.mode = 'corrupt';
ok('copia con otro modo (versión Corrupta): se puede publicar', Lv.copyCheck(cp.toJSON()).ok);
cp = Lv.copy(tj); cp.theme = 'city';
ok('copia con otro tema: se puede publicar', Lv.copyCheck(cp.toJSON()).ok);
cp = Lv.copy(tj); for (let x = 5; x < 110; x++) for (let y = 4; y < 9; y++) cp.set(x, y, TT.HARD);
ok('copia muy modificada: se puede publicar', Lv.copyCheck(cp.toJSON()).ok);
const pubd = Object.assign({}, tj, { publishedAt: Date.now() });
ok('nivel publicado: no se puede volver a publicar', S.Model.Gld.canPublish(pubd).error === 'already');
ok('la marca de publicado se guarda y se carga', new Lv(pubd).toJSON().publishedAt === pubd.publishedAt);
ok('exportar no incluye marcas ni historial', (() => { const c = Lv.content(Object.assign({}, cp.toJSON(), { publishedAt: 1, cloudId: 'x' })); return !c.publishedAt && !c.cloudId && !c.copyOf; })());
ok('firma: igual para el mismo contenido aunque cambie el nombre', Lv.signature(tj) === Lv.signature(Object.assign({}, tj, { name: 'Otro', id: 'zzz' })) && Lv.signature(tj) !== Lv.signature(cp.toJSON()));

// Monedas púrpura y a qué meta se aplica el requisito
L = base(); for (let i = 0; i < 6; i++) L.set(8 + i, gy - 1, TT.VCOIN);
g = game(L);
ok('púrpura: con monedas púrpura la Medalla empieza bloqueada', g.goalLocked && g.purpleNeed === 6);
g.player.x = g.goal.x - 4; g.player.y = g.goal.y + g.goal.h - g.player.h; step(g, {}, 3);
ok('púrpura: la Medalla bloqueada no se puede tocar', g.state === 'play');
g.player.x = 8 * T; g.player.y = (gy - 1) * T; for (let i = 0; i < 6; i++) { g.player.x = (8 + i) * T + 2; g.collectTiles(g.player); }
step(g, {}, 2);
ok('púrpura: al juntarlas aparece la Medalla', !g.goalLocked && g.purpleCoins === 6 && ev['game:goalAppear'] > 0);
L = base(); for (let i = 0; i < 130; i++) L.set(4 + (i % 100), 2 + Math.floor(i / 100), TT.VCOIN);
ok('púrpura: como mucho hacen falta 100', game(L).purpleNeed === 100);
L = base(); L.win = { type: 'kills', n: 3, target: 'hidden' }; g = game(L);
ok('requisito solo en la meta oculta: la normal sí deja pasar', g.winMet(false) && !g.winMet(true));
L = base(); L.win = { type: 'kills', n: 3, target: 'normal' }; g = game(L);
ok('requisito solo en la Medalla: la oculta sí deja pasar', !g.winMet(false) && g.winMet(true));
L = base(); L.win = { type: 'kills', n: 3 }; g = game(L);
ok('requisito en las dos (por defecto)', !g.winMet(false) && !g.winMet(true));
ok('el destino del requisito se guarda', new S.Model.Level(Object.assign(base().toJSON(), { win: { type: 'redcoins', target: 'hidden' } })).toJSON().win.target === 'hidden');
// Niveles descargados de Online
const dlj = Object.assign(base().toJSON(), { downloaded: { author: 'otro', cloudId: 'c9' } });
ok('descargado: se guarda quién lo hizo', new S.Model.Level(dlj).toJSON().downloaded.author === 'otro');
ok('descargado: no se puede publicar', S.Model.Gld.canPublish(dlj).error === 'downloaded');
ok('descargado: no va en el contenido exportable', !S.Model.Level.content(dlj).downloaded);

// Crear cuenta: mismas reglas de nombre que Glob Defenders
const Gd = S.Model.Gld;
ok('cuenta: KiroDEV es un nombre válido', Gd.checkUsername('KiroDEV') === null);
ok('cuenta: nombres demasiado cortos o con espacios no valen', Gd.checkUsername('ab') === 'bad-name' && Gd.checkUsername('kiro dev') === 'bad-name');
ok('cuenta: filtra nombres ofensivos (también con números)', Gd.checkUsername('sh1thead') === 'offensive' && Gd.checkUsername('digger') === null);

// Semisólidos de fondo
L = base(); const Ed = new S.Model.EditorModel(L); Ed.tool = { kind: 'tile', id: TT.SEMIBG };
for (let x = 10; x < 14; x++) for (let y = gy - 5; y < gy; y++) Ed.apply(x, y);
ok('semisólido de fondo: arriba borde, debajo relleno', L.get(11, gy - 5) === TT.SEMIBG && L.get(11, gy - 2) === TT.BGFILL);
ok('semisólido de fondo: el borde se pisa y el relleno no choca', C.isSemi(TT.SEMIBG) && !C.isSolid(TT.BGFILL) && !C.isSemi(TT.BGFILL));
Ed.apply(11, gy - 5, true);
ok('semisólido de fondo: al borrar el borde, el de debajo pasa a ser el borde', L.get(11, gy - 4) === TT.SEMIBG);
g = game(L); g.player.x = 12 * T; g.player.y = (gy - 8) * T; step(g, {}, 120);
ok('semisólido de fondo: te quedas encima', g.player.onGround && Math.abs(g.player.y + g.player.h - (gy - 5) * T) < 3);
