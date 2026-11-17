/* Vista: NPCs (Globs que no son jugables). Son un objeto del nivel { type:'npc', x, y, npc:<id> }.
   No tienen colisión ni clase de entidad: son decoración viva. Capa de render:
   fondo (agua, raíles, fondo de cueva, semisólidos de fondo) < NPC < suelo/bloques < personajes.
   Los PNG se cargan la primera vez que hacen falta y se les quita el fondo blanco que toca el borde. */
(function (S) {
  'use strict';
  const T = S.TILE;
  const SIZE = 64;      // tamaño en mundo (2×2 casillas de 32 px)
  const PX = 160;       // resolución interna del recorte

  // Familias que se pueden colocar (los Trampas y Sunmons quedan fuera de momento)
  const LIST = [
    { id: 'blanca_1', name: 'Balloon Glob (EVO1)', src: 'Globs/NPCs/Familia Blanca/Balloon Glob (EVO1).png' },
    { id: 'blanca_2', name: 'Heliglob (EVO2)', src: 'Globs/NPCs/Familia Blanca/Heliglob (EVO2).png' },
    { id: 'blanca_3', name: 'Alien Glob (EVO3)', src: 'Globs/NPCs/Familia Blanca/Alien Glob (EVO3).png' },
    { id: 'rosa_1', name: 'Streamer Glob (EVO1)', src: 'Globs/NPCs/Familia Rosa/Streamer Glob (EVO1).png' },
    { id: 'rosa_2', name: 'Gamer Glob (EVO2)', src: 'Globs/NPCs/Familia Rosa/Gamer Glob (EVO2).png' },
    { id: 'rosa_3', name: 'Youtuber Glob (EVO3)', src: 'Globs/NPCs/Familia Rosa/Youtuber Glob (EVO3).png' },
    { id: 'marina_1', name: 'Crew Glob (EVO1)', src: 'Globs/NPCs/F. Marina/Crew Glob (EVO1).png' },
    { id: 'marina_2', name: 'PMate Glob (EVO2)', src: 'Globs/NPCs/F. Marina/PMate Glob (EVO2).png' },
    { id: 'marina_3', name: 'Bearded King Glob (EVO3)', src: 'Globs/NPCs/F. Marina/Bearded King Glob (EVO3).png' },
    { id: 'marina_4', name: 'Haunted Pirate Glob (EVO4)', src: 'Globs/NPCs/F. Marina/Haunted Pirate Glob (EVO4).png' },
    { id: 'marron_1', name: 'Bud Glob (mini)', src: 'Globs/NPCs/Familia Marron/Bud_Glob (Mini version).png' },
    { id: 'marron_2', name: 'Sprout Glob', src: 'Globs/NPCs/Familia Marron/Sprout_Glob.png' },
    { id: 'marron_3', name: 'Flower Glob', src: 'Globs/NPCs/Familia Marron/Flower_Glob.png' },
    { id: 'marron_4', name: 'Garden Glob', src: 'Globs/NPCs/Familia Marron/Garden_Glob.png' },
    { id: 'naranja_1', name: 'Worker Glob (EVO1)', src: 'Globs/NPCs/Familia Naranja/Worker Glob (EVO1).png' },
    { id: 'naranja_2', name: 'Police Glob (EVO2)', src: 'Globs/NPCs/Familia Naranja/Police Glob (EVO2).png' },
    { id: 'naranja_3', name: 'Planked Glob (EVO3)', src: 'Globs/NPCs/Familia Naranja/Planked Glob (EVO3).png' },
    { id: 'naranja_4', name: 'DJ Glob (EVO4)', src: 'Globs/NPCs/Familia Naranja/DJ Glob (EVO4).png' },
    { id: 'bomba_1', name: 'Bomb Glob (EVO1)', src: 'Globs/NPCs/Instantanea Explosiva/Bomb Glob (EVO1).png' },
    { id: 'bomba_2', name: 'TNT Glob (EVO2)', src: 'Globs/NPCs/Instantanea Explosiva/TNT Glob (EVO2).png' },
    { id: 'bomba_3', name: 'Nuclear Glob (EVO3)', src: 'Globs/NPCs/Instantanea Explosiva/Nuclear Glob (EVO3).png' }
  ];
  const byId = {};
  // Tamaño en casillas (ancho x alto). 2x2 si lleva decoración (transporte, arma, ambiente); 1x2 la flor.
  // PENDIENTES DE REVISAR (puestos en 1x1 sin mirarlos): marina_1..4, marron_4, naranja_2..4, bomba_2.
  const TILES = {
    blanca_1: [1, 1], blanca_2: [2, 2], blanca_3: [2, 2], rosa_1: [1, 1], rosa_2: [1, 1], rosa_3: [1, 1],
    marina_1: [1, 1], marina_2: [1, 1], marina_3: [1, 1], marina_4: [1, 1],
    marron_1: [1, 1], marron_2: [1, 1], marron_3: [1, 2], marron_4: [1, 1],
    naranja_1: [1, 1], naranja_2: [1, 1], naranja_3: [1, 1], naranja_4: [1, 1],
    bomba_1: [1, 1], bomba_2: [1, 1], bomba_3: [2, 2]
  };
  LIST.forEach((n) => { byId[n.id] = n; n.w = TILES[n.id][0]; n.h = TILES[n.id][1]; });

  // id -> { status: 'loading'|'ok'|'fail', canvas }
  const cache = {};

  // Quita el fondo blanco/gris claro que está conectado con el borde de la imagen.
  // El blanco interior (ojos, globos...) se conserva porque no toca el borde.
  function cutBackground(c) {
    const x = c.getContext('2d');
    const w = c.width, h = c.height;
    const d = x.getImageData(0, 0, w, h), p = d.data;
    const isBg = (i) => {
      const k = i * 4;
      if (p[k + 3] === 0) return true;
      const r = p[k], g = p[k + 1], b = p[k + 2];
      return Math.min(r, g, b) >= 228 && Math.max(r, g, b) - Math.min(r, g, b) <= 22;
    };
    const mark = new Uint8Array(w * h), stack = [];
    const seed = (i) => { if (!mark[i] && isBg(i)) { mark[i] = 1; stack.push(i); } };
    for (let xx = 0; xx < w; xx++) { seed(xx); seed((h - 1) * w + xx); }
    for (let yy = 0; yy < h; yy++) { seed(yy * w); seed(yy * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), xx = i % w, yy = (i / w) | 0;
      if (xx > 0) seed(i - 1);
      if (xx < w - 1) seed(i + 1);
      if (yy > 0) seed(i - w);
      if (yy < h - 1) seed(i + w);
    }
    for (let i = 0; i < w * h; i++) if (mark[i]) p[i * 4 + 3] = 0;
    x.putImageData(d, 0, 0);
  }

  function ensure(id) {
    if (cache[id]) return cache[id];
    const n = byId[id];
    if (!n) return null;
    cache[id] = { status: 'loading', canvas: null };
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = PX; c.height = PX;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      // la imagen es cuadrada (1080x1080): se reduce entera
      x.drawImage(img, 0, 0, PX, PX);
      try { cutBackground(c); } catch (e) { /* si falla se queda con el fondo original */ }
      cache[id] = { status: 'ok', canvas: c };
    };
    img.onerror = () => { cache[id] = { status: 'fail', canvas: null }; };
    img.src = encodeURI(n.src);
    return cache[id];
  }

  function canvasOf(id) {
    const e = ensure(id);
    return e && e.status === 'ok' ? e.canvas : null;
  }

  S.View.Npcs = {
    LIST,
    get(id) { return byId[id] || null; },
    // Para el selector del editor
    forMap() { return LIST.slice(); },
    // Dibuja un NPC colocado (o.x, o.y en casillas). Se apoya en la casilla: los pies sobre su borde inferior.
    drawObject(ctx, o, t) {
      const c = canvasOf(o.npc);
      if (!c) return;
      const n = byId[o.npc] || { w: 1, h: 1 }, side = 48 * Math.max(n.w, n.h);
      const cx = o.x * T + (n.w * T) / 2, by = (o.y + 1) * T;
      const bob = Math.sin((t || 0) * 2.2 + o.x) * 1.2;
      ctx.save();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(c, cx - side / 2, by - side + bob, side, side);
      ctx.restore();
    },
    // Icono en el selector del editor, dentro de un cuadro size×size en (x, y)
    drawIcon(ctx, id, size) {
      const c = canvasOf(id);
      if (!c) return false;
      ctx.drawImage(c, 0, 0, size, size);
      return true;
    },
    // Precarga (opcional): que el editor no muestre iconos vacíos la primera vez
    preload() { LIST.forEach((n) => ensure(n.id)); }
  };
})(window.SGM);
