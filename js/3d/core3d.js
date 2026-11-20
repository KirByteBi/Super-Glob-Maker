/* Modo 3D - núcleo. Carga three.js por CDN BAJO DEMANDA (solo al entrar al Modo 3D).
   Namespace propio S.G3 = { Model, View, Controller, ... } para no chocar con el 2D.
   Utilidades de vectores/mates que no dependen de THREE (para poder probarlas en node). */
(function (S) {
  'use strict';
  const G3 = S.G3 = S.G3 || {};
  G3.Model = G3.Model || {};
  G3.View = G3.View || {};
  G3.Controller = G3.Controller || {};

  // Versión fijada de three.js (UMD global THREE) + GLTFLoader a juego.
  G3.THREE_VERSION = '0.160.0';
  const CDN = (p) => 'https://unpkg.com/three@' + G3.THREE_VERSION + '/' + p;
  G3.CDN = {
    three: CDN('build/three.min.js'),
    gltf: CDN('examples/js/loaders/GLTFLoader.js')
  };

  // Carga un <script> una sola vez. Devuelve una promesa. Reusa cargas en vuelo.
  const scriptCache = {};
  G3.loadScript = function (src) {
    if (scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { delete scriptCache[src]; reject(new Error('no-cdn')); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  };

  // Carga three.js (y opcionalmente GLTFLoader). Si no hay red, rechaza con 'no-cdn'.
  // Resuelve con el objeto THREE global. Idempotente.
  G3.ensureThree = function (withGltf) {
    if (window.THREE && (!withGltf || (window.THREE.GLTFLoader))) return Promise.resolve(window.THREE);
    return G3.loadScript(G3.CDN.three).then(() => {
      if (!window.THREE) throw new Error('no-cdn');
      if (!withGltf) return window.THREE;
      return G3.loadScript(G3.CDN.gltf).then(() => window.THREE);
    });
  };

  // ---- Mates puras (sin THREE): se usan en física y tests headless ----
  const M = G3.math = {};
  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  // vector simple {x,y,z}
  M.v = (x, y, z) => ({ x: x || 0, y: y || 0, z: z || 0 });
  M.add = (a, b) => M.v(a.x + b.x, a.y + b.y, a.z + b.z);
  M.sub = (a, b) => M.v(a.x - b.x, a.y - b.y, a.z - b.z);
  M.scale = (a, s) => M.v(a.x * s, a.y * s, a.z * s);
  M.dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  M.len = (a) => Math.sqrt(M.dot(a, a));
  M.norm = (a) => { const l = M.len(a); return l > 1e-9 ? M.scale(a, 1 / l) : M.v(0, 0, 0); };
  M.dist = (a, b) => M.len(M.sub(a, b));
  // ¿el punto p (con radio r) toca la caja axis-aligned {x,y,z,w,h,d} (esquina+tamaño)?
  M.aabbPoint = (box) => ({ minx: box.x, miny: box.y, minz: box.z, maxx: box.x + box.w, maxy: box.y + box.h, maxz: box.z + box.d });

  // Namespace listo; el resto de módulos 3D cuelgan de G3.
  G3.ready = true;
})(window.SGM);
