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
        return ob;
      }).filter((o) => C.OBJECTS[o.type]);
      this.ab = [0, 0, 0]; // estado de los bloques A/B (solo en partida)
      this.contents = Object.assign({}, d.contents || {});
      // Condición de victoria: { type, n }. type: 'none' | 'nojump' | 'kills' | 'coins'
      this.win = Level.normWin(d.win);
      // Subzonas: zona base (este Level) + hasta 2 subzonas. 'subs' = array de datos de subzona.
      // Cada subzona es un objeto de nivel ligero: { tiles, objects, contents, theme, mode, width, height, win }.
      this.subs = Array.isArray(d.subs) ? d.subs.slice(0, 2).map((s) => Level.normSub(s)) : [];
    }

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
        coins: { name: 'Juntar monedas', hasN: true, def: 20, max: 999 }
      };
    }
    static normWin(w) {
      const types = Level.WIN_TYPES;
      if (!w || !types[w.type] || w.type === 'none') return { type: 'none', n: 0 };
      const def = types[w.type];
      const n = def.hasN ? U.clamp(w.n | 0 || def.def, 1, def.max) : 0;
      return { type: w.type, n };
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
        width: this.width, height: this.height, time: this.time, tiles: Level.encode(this.tiles),
        objects: this.objects.map((o) => {
          const j = { type: o.type, x: o.x, y: o.y };
          if (o.r != null) j.r = o.r;
          if (o.dir === 1 || o.dir === -1) j.dir = o.dir;
          if (o.fv) j.fv = 1;
          if (o.to) j.to = { z: o.to.z, i: o.to.i };
          if (o.col != null) j.col = o.col;
          return j;
        }), contents: Object.assign({}, this.contents),
        win: { type: this.win.type, n: this.win.n },
        subs: this.subs && this.subs.length ? this.subs.map((s) => ({ theme: s.theme, mode: s.mode, width: s.width, height: s.height, tiles: s.tiles, objects: s.objects, contents: s.contents, win: s.win })) : undefined };
    }
    clone() { return new Level(this.toJSON()); }
  }

  S.Model.Level = Level;
})(window.SGM);
