/* Vista: carga de imágenes de los Globs (pre-escaladas para dibujar rápido) */
(function (S) {
  'use strict';
  const cache = {};
  const SIZE = 160;

  function load(path) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, SIZE, SIZE);
        cache[path] = { img, canvas: c };
        res(true);
      };
      img.onerror = () => { cache[path] = null; res(false); };
      img.src = encodeURI(path);
    });
  }

  // Pyces: se recortan a su zona visible y se escalan manteniendo la proporción
  const pyces = {};
  const PYCE_MAX = 128;
  function loadPyce(id, art) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const [bx, by, bw, bh] = art.box;
        const k = Math.min(1, PYCE_MAX / Math.max(bw, bh)) * (img.naturalWidth / art.w);
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw * k)); c.height = Math.max(1, Math.round(bh * k));
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        const s = img.naturalWidth / art.w;
        x.drawImage(img, bx * s, by * s, bw * s, bh * s, 0, 0, c.width, c.height);
        pyces[id] = c; res(true);
      };
      img.onerror = () => { pyces[id] = null; res(false); };
      img.src = encodeURI(art.src);
    });
  }

  S.View.Assets = {
    loadAll(onProgress) {
      const paths = [];
      S.Model.Characters.list.forEach((c) => c.paths.forEach((p) => paths.push(p)));
      Object.values(S.Model.Characters.specials).forEach((s) => paths.push(s.path));
      const art = S.View.PyceArt || {};
      const ids = Object.keys(art);
      const total = paths.length + ids.length;
      let done = 0;
      const tick = () => { done++; if (onProgress) onProgress(done / total); };
      return Promise.all(paths.map((p) => load(p).then(tick)).concat(ids.map((id) => loadPyce(id, art[id]).then(tick))));
    },
    get(path) { const a = cache[path]; return a ? a.canvas : null; },
    pyce(id) { return pyces[id] || null; },
    // URL para usar en <img> del DOM
    url(path) { return encodeURI(path); }
  };
})(window.SGM);
