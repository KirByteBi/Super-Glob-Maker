/* Modelo: LISTA FIJA de los niveles del Modo Historia (como la Historia de SMM2).
   Los niveles de la Historia son niveles de verdad, guardados como los de Mis niveles pero en
   una lista OCULTA y aparte (no salen en 📁 Mis niveles ni gastan sus huecos):
     1. BUILTIN: js/model/StoryPackData.js, los mismos para todos los jugadores (va con el juego;
        se genera con tools/story_export.js y luego queda fijo).
     2. CLOUD: ediciones del owner compartidas por Supabase.
     3. LOCAL: ediciones hechas en este dispositivo (admin: E sobre un nivel del mapa). Se guardan
        en localStorage 'sgm.storypack.v1' y tienen prioridad sobre la nube.
   Si un nodo no está en ninguna de las dos, el juego lo genera (StoryLevels) como antes.
   Clave de cada nivel: 'w1/n3/peace'. */
(function (S) {
  'use strict';
  const KEY = 'sgm.storypack.v1';
  let cloud = {};
  const key = (w, n, m) => w + '/' + n + '/' + (m === 'corrupt' ? 'corrupt' : 'peace');
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const writeLocal = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };

  const Pack = {
    key,
    builtin() { return (S.Model.StoryPackData && S.Model.StoryPackData.levels) || {}; },
    setCloud(levels) { cloud = levels && typeof levels === 'object' ? levels : {}; },
    setCloudLevel(w, n, m, data) { cloud[key(w, n, m)] = data; },
    // Datos del nivel de un nodo (o null si hay que generarlo)
    get(w, n, m) {
      const k = key(w, n, m), loc = readLocal()[k];
      const data = loc || cloud[k] || Pack.builtin()[k];
      if (!data) return null;
      const copy = JSON.parse(JSON.stringify(data));
      const node = S.Model.StoryMap && S.Model.StoryMap.world(w).map[n];
      if (node && node.secretNext && !copy.objects.some((o) => o.type === 'goalhidden')) {
        const goal = copy.objects.find((o) => o.type === 'goal');
        if (goal) copy.objects.push({ type: 'goalhidden', x: Math.max(0, goal.x - 4), y: goal.y });
      }
      return copy;
    },
    source(w, n, m) { const k = key(w, n, m); return readLocal()[k] ? 'local' : cloud[k] ? 'cloud' : Pack.builtin()[k] ? 'pack' : 'gen'; },
    saveLocal(w, n, m, data) {
      const o = readLocal(), d = S.Model.Level.content(data);
      d.id = 'story-' + key(w, n, m).replace(/\//g, '-'); d.name = data.name;
      o[key(w, n, m)] = d; return writeLocal(o);
    },
    removeLocal(w, n, m) { const o = readLocal(); delete o[key(w, n, m)]; return writeLocal(o); },
    localCount() { return Object.keys(readLocal()).length; },
    cloudCount() { return Object.keys(cloud).length; },
    // Archivo StoryPackData.js con el pack actual + ediciones locales y en la nube.
    exportJS() {
      const all = Object.assign({}, Pack.builtin(), cloud, readLocal());
      const keys = Object.keys(all).sort();
      const body = keys.map((k) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(all[k])).join(',\n');
      return '/* Modelo: DATOS de la lista fija del Modo Historia (generado; ver StoryPack.js). */\n' +
        '(function (S) {\n  \'use strict\';\n  S.Model.StoryPackData = { version: ' + Date.now() + ', levels: {\n' + body + '\n  } };\n})(window.SGM);\n';
    }
  };
  S.Model.StoryPack = Pack;
})(window.SGM);
