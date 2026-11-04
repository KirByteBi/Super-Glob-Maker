/* Modelo: geometría de las TUBERÍAS enlazables (warp / lockwarp), estilo Super Mario Maker.
   Una tubería es UN objeto: (x, y) = esquina de arriba a la izquierda de su BOCA (2×2).
   - pd  = hacia dónde mira la boca: 0 arriba · 1 derecha · 2 abajo · 3 izquierda (R la gira).
   - len = casillas de CUERPO detrás de la boca (0-30). En el editor se alarga ARRASTRANDO.
   Niveles antiguos: hdir = 1 era "horizontal con la boca a la izquierda" -> pd 3. */
(function (S) {
  'use strict';
  const MAX_LEN = 30;
  const isPipe = (t) => t === 'warp' || t === 'lockwarp';
  const dirOf = (o) => (o && o.pd != null ? ((o.pd | 0) % 4 + 4) % 4 : (o && o.hdir ? 3 : 0));
  const lenOf = (o) => Math.max(0, Math.min(MAX_LEN, (o && o.len) | 0));

  // Caja de la tubería entera (boca + cuerpo) en casillas
  function bbox(o) {
    const d = dirOf(o), n = lenOf(o), x = o.x, y = o.y;
    if (d === 0) return { x, y, w: 2, h: 2 + n };
    if (d === 2) return { x, y: y - n, w: 2, h: 2 + n };
    if (d === 3) return { x, y, w: 2 + n, h: 2 };
    return { x: x - n, y, w: 2 + n, h: 2 };
  }
  // ¿la casilla es de la boca (2×2)?
  const inMouth = (o, cx, cy) => cx >= o.x && cx <= o.x + 1 && cy >= o.y && cy <= o.y + 1;
  function contains(o, cx, cy) { const b = bbox(o); return cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h; }
  function cells(o) { const b = bbox(o), out = []; for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) out.push([b.x + i, b.y + j]); return out; }
  // Largo que hace falta para que la tubería llegue hasta (cx, cy) siguiendo su eje, o null si
  // la casilla no está en su franja de 2 de ancho. Sirve para alargar Y acortar al arrastrar.
  function reach(o, cx, cy) {
    const d = dirOf(o);
    if (d === 0 || d === 2) { if (cx < o.x || cx > o.x + 1) return null; return Math.max(0, Math.min(MAX_LEN, d === 0 ? cy - (o.y + 1) : o.y - cy)); }
    if (cy < o.y || cy > o.y + 1) return null;
    return Math.max(0, Math.min(MAX_LEN, d === 3 ? cx - (o.x + 1) : o.x - cx));
  }
  // Tubería de un nivel que ocupa (cx, cy)
  const at = (L, cx, cy) => (L.objects || []).find((o) => isPipe(o.type) && contains(o, cx, cy)) || null;

  S.Model.Pipe = { MAX_LEN, isPipe, dirOf, lenOf, bbox, inMouth, contains, cells, reach, at };
})(window.SGM);
