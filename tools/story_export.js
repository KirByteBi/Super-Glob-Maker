// Genera js/model/StoryPackData.js: la LISTA FIJA de niveles del Modo Historia (todos los mundos,
// Paz y Corrupto) a partir del generador StoryLevels. Después los niveles quedan fijos (el
// generador puede cambiar sin cambiarlos) y se pueden retocar a mano desde el juego (admin: E).
// Uso: node tools/story_export.js         (no pisa niveles ya guardados en el pack)
//      node tools/story_export.js --all   (los regenera TODOS)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), store = {};
const ctx = { console, Math, JSON, Date, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; vm.createContext(ctx);
const files = ['core/sgm.js', 'model/Characters.js', 'model/Themes.js', 'model/Catalog.js', 'model/Pipe.js', 'model/Level.js', 'model/LevelStorage.js', 'model/Physics.js',
  'model/entities/Entity.js', 'model/entities/Enemies.js', 'model/entities/EnemiesSpecial.js', 'model/entities/Objects.js', 'model/Player.js', 'model/GameModel.js',
  'model/SampleLevels.js', 'model/StoryMap.js', 'model/StoryLevels.js', 'model/StoryPackData.js', 'model/StoryPack.js'];
files.forEach((f) => { const p = path.join(root, 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); });
const S = ctx.SGM, Pack = S.Model.StoryPack, all = process.argv.includes('--all');
const levels = all ? {} : Object.assign({}, Pack.builtin());
let added = 0;
for (const w of S.Model.StoryMap.worlds) for (const n of w.nodes) {
  if (n.type === 'start') continue;
  for (const m of ['peace', 'corrupt']) {
    const k = Pack.key(w.id, n.id, m); if (levels[k]) continue;
    const L = S.Model.StoryLevels.build(w.id, n.id, m);
    const d = S.Model.Level.content(L.toJSON()); d.id = 'story-' + k.replace(/\//g, '-'); d.name = L.name;
    levels[k] = d; added++;
  }
}
const keys = Object.keys(levels).sort();
const out = '/* Modelo: DATOS de la lista fija del Modo Historia (generado con tools/story_export.js; ver StoryPack.js). */\n' +
  '(function (S) {\n  \'use strict\';\n  S.Model.StoryPackData = { version: ' + Date.now() + ', levels: {\n' +
  keys.map((k) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(levels[k])).join(',\n') + '\n  } };\n})(window.SGM);\n';
fs.writeFileSync(path.join(root, 'js/model/StoryPackData.js'), out);
console.log('OK · ' + keys.length + ' niveles en el pack (' + added + ' nuevos) · ' + Math.round(out.length / 1024) + ' KB');
