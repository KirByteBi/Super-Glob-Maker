/* Modelo: datos de un nivel (rejilla de bloques, objetos y contenido de cajas) */
(function (S) {
  'use strict';
  const U = S.util;
  const C = S.Model.Catalog;

  class Level {
    constructor(d) {
      d = d || {};
      this.id = d.id || U.uid();
      this.name = d.name || 'Nivel sin nombre';
      this.theme = d.theme || 'lake';
      this.mode = d.mode === 'corrupt' ? 'corrupt' : 'peace';
      this.character = d.character || 'green';
      this.width = U.clamp(d.width | 0 || 120, 32, 400);
      this.height = U.clamp(d.height | 0 || 24, 18, 40);
      this.time = U.clamp(d.time | 0 || 300, 10, 500);
      // Autoscroll: 0 = normal; 1 = la camara avanza sola (nivel de scroll forzado). Si te quedas
      // atras del borde izquierdo, mueres. Velocidad en 'scrollSpeed' (px/s).
      this.scroll = d.scroll ? 1 : 0;
      this.scrollSpeed = U.clamp(d.scrollSpeed | 0 || 40, 15, 120);
      const n = this.width * this.height;
      if (Array.isArray(d.tiles)) this.tiles = d.tiles.slice(0, n);
      else if (typeof d.tiles === 'string') this.tiles = Level.decode(d.tiles, n);
      else this.tiles = [];
      while (this.tiles.length < n) this.tiles.push(0);
      // Nombres antiguos de enemigos -> Pyces equivalentes
      const OLD = { gloopy: 'stupid', saltagel: 'symbol', pinchoglob: 'crystal', burbujo: 'pyce2h', tornibot: 'noob', glitchy: 'noir', gotero: 'icicle', canon: 'cannon', medusa: 'pysh', madstar: 'moonstar' };
      this.objects = (d.objects || []).map((o) => {
        const ob = { type: OLD[o.type] || o.type, x: o.x | 0, y: o.y | 0 };
        if (o.r != null) ob.r = o.r | 0;
        // orientación elegida en el editor (R/E): dir = -1/1 (izq/der), fv = 0/1 (volteo vertical)
        if (o.dir === 1 || o.dir === -1) ob.dir = o.dir;
        if (o.fv) ob.fv = 1;
        // destino manual de tuberías/puertas: { z: zona, i: índice del gizmo en esa zona }
        if (o.to && typeof o.to.z === 'number' && typeof o.to.i === 'number') ob.to = { z: o.to.z | 0, i: o.to.i | 0 };
        // color de la tubería (0-3)
        if (o.col != null) ob.col = o.col | 0;
        // orientación de la tubería: 1 = horizontal (0/ausente = vertical)
        if (o.hdir) ob.hdir = 1;
        // decoración visual (sin colisión): cuál es el adorno
        if (o.deco) ob.deco = o.deco;
        return ob;
      }).filter((o) => C.OBJECTS[o.type]);
      this.ab = [0, 0, 0]; // estado de los bloques A/B (solo en partida)
      this.contents = Object.assign({}, d.contents || {});
      // Condición de victoria: { type, n }. type: 'none' | 'nojump' | 'kills' | 'coins'
      this.win = Level.normWin(d.win);
      // Subzonas: zona base (este Level) + hasta 2 subzonas. 'subs' = array de datos de subzona.
      // Cada subzona es un objeto de nivel ligero: { tiles, objects, contents, theme, mode, width, height, win }.
      this.subs = Array.isArray(d.subs) ? d.subs.slice(0, 2).map((s) => Level.normSub(s)) : [];
      // Publicación (online): un nivel publicado queda marcado para siempre (Glob Cometa) y ya
      // no se puede volver a publicar. Para otra versión se hace una COPIA (copyOf = instantáneas
      // de los niveles de los que viene, para comprobar que la copia es lo bastante distinta).
      this.publishedAt = d.publishedAt || null;
      this.cloudId = d.cloudId || null;
      this.copyOf = Array.isArray(d.copyOf) && d.copyOf.length ? d.copyOf.slice(0, 3) : null;
      // Descargado de Online: se puede jugar, pero NO editar, copiar, exportar ni publicar.
      // Para editarlo, su creador tiene que pasarte el nivel (Exportar → Importar).
      this.downloaded = d.downloaded && typeof d.downloaded === 'object'
        ? { author: String(d.downloaded.author || 'desconocido').slice(0, 40), cloudId: d.downloaded.cloudId ? String(d.downloaded.cloudId) : null, at: d.downloaded.at || null } : null;
    }

    // ---------- copias y comparación de contenido (para publicar) ----------
    // Contenido "jugable" del nivel, sin datos de publicación ni de copia
    static content(j) {
      const c = Object.assign({}, j instanceof Level ? j.toJSON() : j);
      delete c.publishedAt; delete c.cloudId; delete c.copyOf; delete c.updated; delete c.downloaded;
      return c;
    }
    // Copia de un nivel: id nuevo, sin marca de publicado y recordando de dónde viene
    static copy(j, name) {
      const src = j instanceof Level ? j.toJSON() : j;
      const L = new Level(Object.assign({}, src, { id: U.uid(), name: name || (String(src.name || 'Nivel') + ' (copia)').slice(0, 40), publishedAt: null, cloudId: null, copyOf: null }));
      L.copyOf = [Level.content(src)].concat(src.copyOf || []).slice(0, 3);
      return L;
    }
    // Firma exacta del contenido (la usa el servidor para no admitir duplicados exactos)
    static signature(j) {
      const c = Level.content(j); delete c.id; delete c.name; delete c.character; delete c.v;
      const s = JSON.stringify(c); let h = 0x811c9dc5, h2 = 0x01000193;
      for (let i = 0; i < s.length; i++) { const k = s.charCodeAt(i); h = Math.imul(h ^ k, 16777619) >>> 0; h2 = Math.imul(h2 + k, 2246822519) >>> 0; }
      return h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + s.length.toString(16);
    }
    // ¿Cuánto se parecen dos niveles? Compara bloques, objetos y contenido de cajas de cada zona,
    // probando pequeños desplazamientos (así mover todo 1 casilla no cuenta como "cambio").
    // Devuelve { diff, total, ratio, styleChanged }
    static compare(a, b) {
      const zones = (j) => [j].concat(j.subs || []).map((z) => {
        const w = U.clamp(z.width | 0 || 120, 32, 400), h = U.clamp(z.height | 0 || 24, 18, 40);
        const t = Array.isArray(z.tiles) ? z.tiles : Level.decode(z.tiles || '0:' + w * h, w * h);
        return { w, h, t, o: (z.objects || []).map((o) => [o.type, o.x | 0, o.y | 0]), c: z.contents || {}, theme: z.theme, mode: z.mode };
      });
      const za = zones(a), zb = zones(b);
      const styleChanged = za.some((z, i) => zb[i] && (z.theme !== zb[i].theme || z.mode !== zb[i].mode));
      const weight = (z) => z.t.reduce((n, v) => n + (v ? 1 : 0), 0) + z.o.length + Object.keys(z.c).length;
      let diff = 0, total = 0;
      for (let i = 0; i < Math.max(za.length, zb.length); i++) {
        const A = za[i], B = zb[i];
        if (!A || !B) { const z = A || B; diff += weight(z); total += weight(z); continue; }
        total += Math.max(weight(A), weight(B));
        const getA = (x, y) => (x >= 0 && y >= 0 && x < A.w && y < A.h ? A.t[y * A.w + x] : 0);
        const getB = (x, y) => (x >= 0 && y >= 0 && x < B.w && y < B.h ? B.t[y * B.w + x] : 0);
        // alineados por abajo (como al cambiar el alto del nivel) + pequeños desplazamientos
        const baseDy = B.h - A.h;
        let best = Infinity;
        for (let dy = baseDy - 2; dy <= baseDy + 2; dy++) for (let dx = -4; dx <= 4; dx++) {
          let d = 0;
          const x0 = Math.min(0, dx), x1 = Math.max(A.w, B.w + dx), y0 = Math.min(0, dy), y1 = Math.max(A.h, B.h + dy);
          for (let y = y0; y < y1 && d < best; y++) for (let x = x0; x < x1; x++) if (getA(x, y) !== getB(x - dx, y - dy)) d++;
          if (d >= best) continue;
          const ka = new Set(A.o.map(([t, x, y]) => t + '@' + x + ',' + y)), kb = new Set(B.o.map(([t, x, y]) => t + '@' + (x + dx) + ',' + (y + dy)));
          ka.forEach((k) => { if (!kb.has(k)) d++; }); kb.forEach((k) => { if (!ka.has(k)) d++; });
          const ca = A.c, cb = {}; Object.keys(B.c).forEach((k) => { const [x, y] = k.split(',').map(Number); cb[(x + dx) + ',' + (y + dy)] = B.c[k]; });
          new Set(Object.keys(ca).concat(Object.keys(cb))).forEach((k) => { if (ca[k] !== cb[k]) d++; });
          best = Math.min(best, d);
        }
        diff += best;
      }
      return { diff, total, ratio: total ? diff / total : 0, styleChanged };
    }
    // ¿Se puede publicar esta copia? Basta con cambiar el tema o el modo (p. ej. versión Corrupta
    // del mismo pueblo); si no, al menos un 25 % del contenido (y 24 casillas/objetos) distinto.
    static copyCheck(j) {
      const src = j instanceof Level ? j.toJSON() : j;
      let worst = null;
      for (const orig of src.copyOf || []) {
        const r = Level.compare(src, orig);
        if (r.styleChanged) continue;
        if (r.ratio < Level.COPY_MIN_RATIO || r.diff < Level.COPY_MIN_DIFF) { if (!worst || r.ratio < worst.ratio) worst = Object.assign(r, { origName: orig.name }); }
      }
      return worst ? { ok: false, ratio: worst.ratio, diff: worst.diff, origName: worst.origName } : { ok: true };
    }
    static get COPY_MIN_RATIO() { return 0.25; }
    static get COPY_MIN_DIFF() { return 24; }

    // Normaliza los datos de una subzona (misma forma que un nivel, sin id/name/character)
    static normSub(s) {
      s = s || {};
      const L = new Level({ theme: s.theme, mode: s.mode, width: s.width, height: s.height, time: 300, tiles: s.tiles, objects: s.objects, contents: s.contents, win: s.win });
      return { theme: L.theme, mode: L.mode, width: L.width, height: L.height, tiles: Level.encode(L.tiles), objects: L.objects, contents: L.contents, win: L.win };
    }
    // Número total de zonas (base + subzonas)
    zoneCount() { return 1 + this.subs.length; }
    // Devuelve los datos de una zona (0 = base) como objeto tipo nivel
    zoneData(z) {
      if (!z) return this.toJSON();
      const s = this.subs[z - 1]; if (!s) return null;
      return Object.assign({ character: this.character, time: this.time }, s);
    }

    // Condiciones de victoria válidas y su número asociado (si lo llevan)
    static get WIN_TYPES() {
      return {
        none: { name: 'Llegar a la Medalla', hasN: false },
        nojump: { name: 'Sin saltar', hasN: false },
        kills: { name: 'Derrotar enemigos', hasN: true, def: 5, max: 99 },
        coins: { name: 'Juntar monedas', hasN: true, def: 20, max: 999 },
        redcoins: { name: 'Coger todas las monedas rojas', hasN: false }
      };
    }
    // A qué meta se aplica la condición: la Medalla normal, la meta oculta o las dos
    static get WIN_TARGETS() { return { both: 'Las dos metas', normal: 'Solo la Medalla normal', hidden: 'Solo la meta oculta' }; }
    static normWin(w) {
      const types = Level.WIN_TYPES;
      if (!w || !types[w.type] || w.type === 'none') return { type: 'none', n: 0 };
      const def = types[w.type];
      const n = def.hasN ? U.clamp(w.n | 0 || def.def, 1, def.max) : 0;
      const out = { type: w.type, n };
      if (w.target === 'normal' || w.target === 'hidden') out.target = w.target; // por defecto, las dos
      return out;
    }

    // style: 'test' = Campo de Pruebas (suelo en todo el nivel, por defecto)
    //        'classic' = Clásico (solo hay tierra bajo el spawn)
    //        'air' = Aireado (sin suelo)
    static createDefault(style) {
      const L = new Level({});
      const w = style === 'air' ? 0 : style === 'classic' ? 9 : L.width;
      for (let x = 0; x < w; x++) for (let y = L.height - 3; y < L.height; y++) L.set(x, y, C.T.GROUND);
      L.objects.push({ type: 'start', x: 3, y: L.height - 4 });
      L.objects.push({ type: 'goal', x: L.width - 6, y: L.height - 4 });
      return L;
    }

    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
    get(x, y) {
      if (x < 0 || x >= this.width) return C.T.WALL;
      if (y < 0 || y >= this.height) return C.T.EMPTY;
      return this.tiles[y * this.width + x];
    }
    set(x, y, v) { if (this.inBounds(x, y)) this.tiles[y * this.width + x] = v; }

    objectAt(x, y) { return this.objects.find((o) => o.x === x && o.y === y); }
    removeObjectAt(x, y) { const i = this.objects.findIndex((o) => o.x === x && o.y === y); if (i >= 0) return this.objects.splice(i, 1)[0]; return null; }

    resize(w, h) {
      w = U.clamp(w | 0, 32, 400); h = U.clamp(h | 0, 18, 40);
      if (w === this.width && h === this.height) return;
      const dy = h - this.height; // mantener alineado abajo
      const nt = new Array(w * h).fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const oy = y - dy;
        if (x < this.width && oy >= 0 && oy < this.height) nt[y * w + x] = this.tiles[oy * this.width + x];
      }
      const nc = {};
      Object.keys(this.contents).forEach((k) => { const [x, y] = k.split(',').map(Number); if (x < w && y + dy >= 0 && y + dy < h) nc[x + ',' + (y + dy)] = this.contents[k]; });
      this.objects.forEach((o) => { o.y += dy; });
      this.objects = this.objects.filter((o) => (o.type === 'start' || o.type === 'goal') || (o.x < w && o.y >= 0 && o.y < h));
      this.objects.forEach((o) => { o.x = U.clamp(o.x, 0, w - 1); o.y = U.clamp(o.y, 0, h - 1); });
      this.width = w; this.height = h; this.tiles = nt; this.contents = nc;
    }

    static encode(tiles) {
      const out = []; let prev = tiles[0], n = 0;
      for (const t of tiles) { if (t === prev) n++; else { out.push(prev + ':' + n); prev = t; n = 1; } }
      out.push(prev + ':' + n);
      return out.join(',');
    }
    static decode(str, n) {
      const out = [];
      str.split(',').forEach((p) => { const [v, c] = p.split(':').map(Number); for (let i = 0; i < c && out.length < n; i++) out.push(v); });
      return out;
    }

    toJSON() {
      return { v: 1, id: this.id, name: this.name, theme: this.theme, mode: this.mode, character: this.character,
        width: this.width, height: this.height, time: this.time, scroll: this.scroll || undefined, scrollSpeed: this.scroll ? this.scrollSpeed : undefined, tiles: Level.encode(this.tiles),
        objects: this.objects.map((o) => {
          const j = { type: o.type, x: o.x, y: o.y };
          if (o.r != null) j.r = o.r;
          if (o.dir === 1 || o.dir === -1) j.dir = o.dir;
          if (o.fv) j.fv = 1;
          if (o.to) j.to = { z: o.to.z, i: o.to.i };
          if (o.col != null) j.col = o.col;
          if (o.hdir) j.hdir = 1;
          if (o.deco) j.deco = o.deco;
          return j;
        }), contents: Object.assign({}, this.contents),
        win: Object.assign({ type: this.win.type, n: this.win.n }, this.win.target ? { target: this.win.target } : {}),
        subs: this.subs && this.subs.length ? this.subs.map((s) => ({ theme: s.theme, mode: s.mode, width: s.width, height: s.height, tiles: s.tiles, objects: s.objects, contents: s.contents, win: s.win })) : undefined,
        publishedAt: this.publishedAt || undefined, cloudId: this.cloudId || undefined, copyOf: this.copyOf || undefined,
        downloaded: this.downloaded || undefined };
    }
    clone() { return new Level(this.toJSON()); }
  }

  S.Model.Level = Level;
})(window.SGM);
