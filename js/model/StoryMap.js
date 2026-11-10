/* Modelo: MAPAMUNDI del Modo Historia (world-map estilo SMW). AISLADO en su modulo.
   Define MUNDOS con NODOS (inicio, niveles, palacio "!", castillo) colocados en una rejilla,
   conectados por CAMINOS (con cruces). El progreso vive en localStorage 'sgm.story.v1' y se
   sincroniza con la cuenta de Glob Defenders cuando hay sesión.

   Un nodo:
     { id, type:'start'|'level'|'palace'|'castle', x, y, theme, mode?,
       next:[idDestino...],                 // caminos a los que avanza al completar
       secretNext?:[idDestino...],          // caminos que SOLO abre la meta oculta / palacio
       win?, excolor? }                     // (palace) color del interruptor "!"
   x,y en celdas de la rejilla del mapa (0..cols-1 / 0..rows-1). */
(function (S) {
  'use strict';
  const PROG = 'sgm.story.v1';

  // ---- Mundo 1 (de momento solo este; los demas se anaden igual) ----
  // 9 niveles (n1..n9) + castillo (cas) + un palacio secreto (pal). Hay un CRUCE en n3:
  // el camino normal va a n4; la META OCULTA de n3 abre el atajo al palacio.
  // ---- Constructor de mundos en SERPENTEO (como SMW) ----
  // seq = lista de tramos. Cada tramo: { t:tema, type?:'level'|'castle' }. Se colocan en
  // zigzag por filas. Opcionalmente se cuelga un PALACIO secreto de un nivel (cruce + meta oculta).
  // opts.palaceAfter = indice (1-based) del nivel del que sale el camino secreto al palacio;
  // opts.palaceTheme/excolor = tema y color "!" del palacio; el palacio reengancha al nodo siguiente.
  // parallelRoutes añade niveles secretos opcionales entre dos nodos de la ruta principal.
  function buildWorld(id, name, seq, opts) {
    opts = opts || {};
    const perRow = opts.perRow || 6, nodes = [];
    const pos = (i) => { const row = Math.floor(i / perRow); const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow); return { x: col, y: 1 + row * 2 }; };
    // start
    const s0 = pos(0); nodes.push({ id: 'start', type: 'start', x: s0.x, y: s0.y, next: ['n1'] });
    seq.forEach((seg, k) => {
      const i = k + 1, p = pos(i), id2 = (seg.type === 'castle') ? ('cas' + (opts.castleIdx ? opts.castleIdx(k) : '')) : ('n' + i);
      const nxt = (k + 1 < seq.length) ? [(seq[k + 1].type === 'castle') ? ('cas' + (opts.castleIdx ? opts.castleIdx(k + 1) : '')) : ('n' + (i + 1))] : [];
      const node = { id: (seg.type === 'castle') ? ('cas' + (k + 1)) : ('n' + i), type: seg.type || 'level', theme: seg.t, x: p.x, y: p.y, next: nxt.length ? [(seq[k + 1].type === 'castle') ? ('cas' + (k + 2)) : ('n' + (i + 1))] : [] };
      nodes.push(node);
    });
    // reconstruir 'next' de forma simple y robusta: cada nodo apunta al siguiente del array
    for (let i = 1; i < nodes.length; i++) nodes[i - 1].next = [nodes[i].id];
    nodes[nodes.length - 1].next = [];
    // palacio secreto (cruce + meta oculta)
    if (opts.palaceAfter) {
      const src = nodes[opts.palaceAfter]; // nodo del que sale el camino secreto (1-based -> incluye start en 0)
      if (src) {
        const pp = pos(opts.palaceAfter); const pal = { id: 'pal', type: 'palace', hidden: true, theme: opts.palaceTheme || src.theme, x: pp.x, y: Math.max(0, pp.y - 1), excolor: opts.excolor != null ? opts.excolor : 1, next: src.next.slice() };
        src.secretNext = (src.secretNext || []).concat('pal');
        nodes.push(pal);
      }
    }
    (opts.parallelRoutes || []).forEach((route, i) => {
      const src = nodes.find((n) => n.id === route.from);
      const dest = src && nodes.find((n) => n.id === (route.to || (src.next || [])[0]));
      if (!src || !dest) return;
      const branchId = route.id || ('alt' + (i + 1));
      nodes.push({
        id: branchId, type: 'level', hidden: true, theme: route.theme || src.theme,
        x: Math.round((src.x + dest.x) / 2),
        y: Math.round((src.y + dest.y) / 2) + (route.side === 'up' ? -1 : 1),
        next: [dest.id]
      });
      src.secretNext = (src.secretNext || []).concat(branchId);
    });
    return { id, name, cols: perRow, rows: 2 + Math.ceil(seq.length / perRow) * 2, nodes, scenery: opts.scenery || 'isle' };
  }

  const WORLDS = [
    // 1. Globland Isle — GL, UR, SS; castillo Fabrica. 10 niveles.
    buildWorld('w1', 'Mundo 1 · Globland Isle', [
      { t: 'lake' }, { t: 'lake' }, { t: 'city' }, { t: 'seaside' }, { t: 'lake' },
      { t: 'city' }, { t: 'seaside' }, { t: 'city' }, { t: 'seaside' }, { t: 'lake' },
      { t: 'factory', type: 'castle' }
    ], { perRow: 6, palaceAfter: 3, palaceTheme: 'lake', excolor: 0, parallelRoutes: [{ from: 'n6' }], scenery: 'isle' }),

    // 2. Wildsand Leaf — Jungla, Circo, Ruinas, Nieve; castillo Time Attack. 11 niveles.
    buildWorld('w2', 'Mundo 2 · Wildsand Leaf', [
      { t: 'jungle' }, { t: 'ruins' }, { t: 'circus' }, { t: 'snow' }, { t: 'jungle' },
      { t: 'ruins' }, { t: 'circus' }, { t: 'snow' }, { t: 'jungle' }, { t: 'ruins' }, { t: 'snow' },
      { t: 'clock', type: 'castle' }
    ], { perRow: 7, palaceAfter: 5, palaceTheme: 'jungle', excolor: 1, parallelRoutes: [{ from: 'n8' }], scenery: 'wild' }),

    // 3. Wonders Circus — Circo, Casino y bizarros (disco, hub); castillo Fabrica. 10 niveles.
    buildWorld('w3', 'Mundo 3 · Wonders Circus', [
      { t: 'circus' }, { t: 'casino' }, { t: 'disco' }, { t: 'circus' }, { t: 'hub' },
      { t: 'casino' }, { t: 'disco' }, { t: 'circus' }, { t: 'casino' }, { t: 'hub' },
      { t: 'factory', type: 'castle' }
    ], { perRow: 6, palaceAfter: 4, palaceTheme: 'casino', excolor: 2, parallelRoutes: [{ from: 'n8' }], scenery: 'circus' }),

    // 4. Tormenta Volcanica — Volcan, Nubes, GL, variados; castillo Fabrica. 10 niveles.
    buildWorld('w4', 'Mundo 4 · Tormenta Volcánica', [
      { t: 'volcano' }, { t: 'sky' }, { t: 'lake' }, { t: 'volcano' }, { t: 'sky' },
      { t: 'underwater' }, { t: 'volcano' }, { t: 'sky' }, { t: 'lake' }, { t: 'volcano' },
      { t: 'factory', type: 'castle' }
    ], { perRow: 6, palaceAfter: 6, palaceTheme: 'volcano', excolor: 0, parallelRoutes: [{ from: 'n8' }], scenery: 'volcano' }),

    // 5. Ruptura Dimensional — todos los mapas, 3 castillos (tras cada tercio). Final: Vortice.
    buildWorld('w5', 'Mundo 5 · Ruptura Dimensional', [
      { t: 'lake' }, { t: 'city' }, { t: 'seaside' }, { t: 'factory', type: 'castle' },
      { t: 'jungle' }, { t: 'ruins' }, { t: 'circus' }, { t: 'snow' }, { t: 'factory', type: 'castle' },
      { t: 'casino' }, { t: 'disco' }, { t: 'volcano' }, { t: 'sky' }, { t: 'vortex', type: 'castle' }
    ], { perRow: 5, palaceAfter: 2, palaceTheme: 'hub', excolor: 2, parallelRoutes: [{ from: 'n11' }], scenery: 'dimension' })
  ];

  const byId = {};
  WORLDS.forEach((w) => { w.map = {}; w.nodes.forEach((n) => { w.map[n.id] = n; byId[w.id + '/' + n.id] = n; }); });

  function read() { try { return JSON.parse(localStorage.getItem(PROG) || '{}'); } catch (e) { return {}; } }
  function write(p) { try { localStorage.setItem(PROG, JSON.stringify(p)); } catch (e) { /* nada */ } }

  S.Model.StoryMap = {
    worlds: WORLDS,
    world(id) { return WORLDS.find((w) => w.id === id) || WORLDS[0]; },

    // ---- progreso ----
    // normal y secret guardan salidas independientes; cleared conserva el estado total.
    progress() { return read(); },
    mergeProgress(incoming) {
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return read();
      const p = read();
      const truth = (v) => v === true || v === 1;
      WORLDS.forEach((w) => {
        w.nodes.forEach((n) => {
          const key = w.id + '/' + n.id, src = incoming[key];
          if (!src || typeof src !== 'object' || Array.isArray(src)) return;
          const dst = p[key] || {};
          const normal = truth(dst.normal) || (dst.normal == null && truth(dst.cleared)) || truth(src.normal) || (src.normal == null && truth(src.cleared));
          const secret = truth(dst.secret) || truth(src.secret);
          const cleared = truth(dst.cleared) || truth(src.cleared) || normal || secret;
          if (cleared || normal || secret) p[key] = { cleared, normal, secret };
        });
        if (incoming.worlds && truth(incoming.worlds[w.id]) || p.worlds && truth(p.worlds[w.id])) {
          p.worlds = p.worlds || {};
          p.worlds[w.id] = true;
        }
        const srcEx = incoming.ex && incoming.ex[w.id], dstEx = p.ex && p.ex[w.id];
        if (Array.isArray(srcEx) || Array.isArray(dstEx)) {
          p.ex = p.ex || {};
          p.ex[w.id] = [0, 1, 2].map((i) => truth(srcEx && srcEx[i]) || truth(dstEx && dstEx[i]) ? 1 : 0);
        }
        const srcSeen = incoming.seen && incoming.seen[w.id], dstSeen = p.seen && p.seen[w.id];
        ['intro', 'castle', 'boss'].forEach((kind) => {
          if (truth(srcSeen && srcSeen[kind]) || truth(dstSeen && dstSeen[kind])) {
            p.seen = p.seen || {};
            p.seen[w.id] = p.seen[w.id] || {};
            p.seen[w.id][kind] = true;
          }
        });
      });
      write(p);
      return p;
    },
    nodeState(worldId, nodeId) { return read()[worldId + '/' + nodeId] || null; },
    isCleared(worldId, nodeId) { const s = this.nodeState(worldId, nodeId); return !!(s && s.cleared); },
    isNormal(worldId, nodeId) {
      const s = this.nodeState(worldId, nodeId);
      return !!(s && (s.normal === true || (s.normal == null && s.cleared)));
    },
    isSecret(worldId, nodeId) { const s = this.nodeState(worldId, nodeId); return !!(s && s.secret); },

    // Marca un nodo como completado (normal o por meta oculta/palacio).
    markCleared(worldId, nodeId, secret) {
      const p = read(); const key = worldId + '/' + nodeId;
      // normal / secret = qué meta se ha usado alguna vez (los dos huecos del mapa)
      const s = p[key] || {};
      if (s.normal == null) s.normal = !!s.cleared;
      s.cleared = true;
      if (secret) s.secret = true; else s.normal = true;
      p[key] = s;
      // interruptor "!" persistente del mundo: un palacio activa su color
      const node = this.world(worldId).map[nodeId];
      if (node && node.type === 'palace' && node.excolor != null) {
        p.ex = p.ex || {}; const ex = p.ex[worldId] || [0, 0, 0]; ex[node.excolor] = 1; p.ex[worldId] = ex;
      }
      write(p);
    },
    exState(worldId) { const p = read(); return (p.ex && p.ex[worldId]) || [0, 0, 0]; },

    // ¿Está desbloqueado un nodo? El inicio siempre; los demas, si algun nodo previo que
    // apunta a el (por next o secretNext ya abierto) esta completado.
    isUnlocked(worldId, nodeId) {
      if (nodeId === 'start') return true;
      const w = this.world(worldId);
      const startCleared = this.isCleared(worldId, 'start');
      for (const n of w.nodes) {
        if (n.next && n.next.includes(nodeId) && (n.id === 'start' || this.isNormal(worldId, n.id))) return true;
        // un camino secreto solo cuenta si ese nodo se paso por META OCULTA
        if (n.secretNext && n.secretNext.includes(nodeId) && this.isSecret(worldId, n.id)) return true;
      }
      // el primer nivel se desbloquea desde el inicio
      if (w.map.start && w.map.start.next.includes(nodeId)) return true;
      return startCleared && false;
    },

    // Nodo inicial donde aparece el Glob al abrir el mundo (ultimo desbloqueado o el inicio)
    firstNode(worldId) {
      const w = this.world(worldId);
      // coloca el cursor en el primer nodo jugable no completado, o en el inicio
      for (const n of w.nodes) { if (n.type !== 'start' && this.isUnlocked(worldId, n.id) && !this.isCleared(worldId, n.id)) return n.id; }
      return w.nodes[0].next[0] || 'start';
    },

    // ---- mundos (desbloqueo entre mundos) ----
    // El mundo 1 siempre esta disponible; los demas se abren al superar el CASTILLO FINAL
    // del mundo anterior.
    worldIndex(worldId) { return WORLDS.findIndex((w) => w.id === worldId); },
    nextWorldId(worldId) { const i = this.worldIndex(worldId); return (i >= 0 && i + 1 < WORLDS.length) ? WORLDS[i + 1].id : null; },
    // El castillo final de un mundo = el ultimo nodo tipo 'castle' del array.
    finalCastleId(worldId) {
      const w = this.world(worldId); let id = null;
      w.nodes.forEach((n) => { if (n.type === 'castle') id = n.id; });
      return id;
    },
    isWorldUnlocked(worldId) {
      if (this.worldIndex(worldId) <= 0) return true; // el primero siempre
      const p = read(); return !!(p.worlds && p.worlds[worldId]);
    },
    unlockWorld(worldId) {
      if (!worldId) return; const p = read(); p.worlds = p.worlds || {}; p.worlds[worldId] = true; write(p);
    },
    // ¿El mundo esta completado (su castillo final superado)? Abre el siguiente.
    isWorldComplete(worldId) {
      const fc = this.finalCastleId(worldId); return fc ? this.isNormal(worldId, fc) : false;
    },
    // Llamar tras superar un nodo: si era el castillo final, desbloquea el mundo siguiente.
    // Devuelve el id del mundo recien desbloqueado (o null).
    onNodeCleared(worldId, nodeId) {
      if (nodeId !== this.finalCastleId(worldId) || !this.isNormal(worldId, nodeId)) return null;
      const nx = this.nextWorldId(worldId);
      if (nx && !this.isWorldUnlocked(nx)) { this.unlockWorld(nx); return nx; }
      return null;
    },
    unlockedWorlds() { return WORLDS.filter((w) => this.isWorldUnlocked(w.id)).map((w) => w.id); },

    // ---- cinematicas/dialogos ya vistos (para no repetirlos) ----
    // kind: 'intro' | 'castle' | 'boss' (por mundo). Se guarda en p.seen[worldId][kind].
    seen(worldId, kind) { const p = read(); return !!(p.seen && p.seen[worldId] && p.seen[worldId][kind]); },
    markSeen(worldId, kind) { const p = read(); p.seen = p.seen || {}; (p.seen[worldId] = p.seen[worldId] || {})[kind] = true; write(p); },

    // ---- HISTORIA CORRUPTA ----
    // El ultimo mundo (el que lleva el castillo del Vortice). Completarlo = terminar la Normal.
    lastWorldId() { return WORLDS[WORLDS.length - 1].id; },
    // La Historia Corrupta se desbloquea al superar el CASTILLO FINAL del ultimo mundo.
    isCorruptUnlocked() {
      const w = this.lastWorldId(); const fc = this.finalCastleId(w);
      return fc ? this.isNormal(w, fc) : false;
    }
  };
})(window.SGM);
