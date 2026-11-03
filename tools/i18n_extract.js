// Saca los textos en español visibles (literales entre comillas con letras y espacio o tilde)
// de vistas, controladores y catálogos -> tools/i18n_strings.txt (uno por línea, sin repetir).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = ['js/view/MenuView.js', 'js/view/HUDView.js', 'js/view/EditorView.js', 'js/controller/AppController.js', 'js/controller/EditorController.js', 'js/controller/MapController.js', 'js/controller/GameController.js', 'js/model/Catalog.js', 'js/model/Themes.js', 'js/model/Characters.js', 'js/model/Level.js', 'js/model/StoryMap.js', 'js/model/StoryLevels.js', 'js/model/LevelCheck.js', 'js/view/Decorations.js', 'js/view/TouchControls.js'];
const out = new Set();
const skip = /^(#|rgba|hsla|bold |900 |600 |[a-z]+\/|[a-z_]+$|sgm\.|https?:|\.|[A-Z]{1,4}$)/;
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const re = /'((?:[^'\\\n]|\\.){2,200})'/g; let m;
  while ((m = re.exec(src))) {
    const s = m[1];
    if (skip.test(s)) continue;
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡]/.test(s)) continue;
    if (!/[ áéíóúñÁÉÍÓÚÑ¿¡·…]/.test(s) && !/^[A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñ]+$/.test(s)) continue;
    if (/^[\w-]+\.(png|js|json)$/.test(s) || /^\w+\(/.test(s)) continue;
    out.add(s.replace(/\\'/g, "'"));
  }
}
fs.writeFileSync(path.join(__dirname, 'i18n_strings.txt'), [...out].join('\n'));
console.log(out.size);
