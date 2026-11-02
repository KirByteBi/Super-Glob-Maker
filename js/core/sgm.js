/* Super Glob Maker - núcleo: espacio de nombres, constantes, utilidades y bus de eventos */
window.SGM = window.SGM || {};
(function (S) {
  'use strict';
  S.TILE = 32;
  S.VIEW_W = 1024;
  S.VIEW_H = 576;
  S.Model = S.Model || {};
  S.View = S.View || {};
  S.Controller = S.Controller || {};

  const U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.deepClone = (o) => JSON.parse(JSON.stringify(o));
  U.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  U.hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  U.hash2 = (a, b) => U.hash(a * 57.31 + b * 13.77);
  U.strSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  U.rng = (seed) => function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  U.hexToRgb = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  U.mix = (a, b, t) => { const A = U.hexToRgb(a), B = U.hexToRgb(b); return U.rgbToHex(U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)); };
  U.shade = (c, amt) => (amt < 0 ? U.mix(c, '#000000', -amt) : U.mix(c, '#ffffff', amt));
  U.rgba = (c, a) => { const A = U.hexToRgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
  S.util = U;

  class EventBus {
    constructor() { this.h = {}; }
    on(e, f) { (this.h[e] || (this.h[e] = [])).push(f); return () => this.off(e, f); }
    off(e, f) { const l = this.h[e]; if (l) this.h[e] = l.filter((x) => x !== f); }
    emit(e, d) { const l = this.h[e]; if (l) l.slice().forEach((f) => f(d || {})); const a = this.h['*']; if (a) a.forEach((f) => f(e, d || {})); }
  }
  S.EventBus = EventBus;
  S.events = new EventBus();

  // Polyfill de roundRect para navegadores antiguos
  const P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (P && !P.roundRect) {
    P.roundRect = function (x, y, w, h, r) {
      let rr = Array.isArray(r) ? r : [r, r, r, r];
      if (rr.length === 1) rr = [rr[0], rr[0], rr[0], rr[0]];
      const [tl, tr, br, bl] = rr.map((v) => Math.min(v || 0, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y); this.arcTo(x + w, y, x + w, y + tr, tr);
      this.lineTo(x + w, y + h - br); this.arcTo(x + w, y + h, x + w - br, y + h, br);
      this.lineTo(x + bl, y + h); this.arcTo(x, y + h, x, y + h - bl, bl);
      this.lineTo(x, y + tl); this.arcTo(x, y, x + tl, y, tl);
      this.closePath();
    };
  }
})(window.SGM);
