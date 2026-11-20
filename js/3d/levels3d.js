/* Modo 3D (Model): niveles de ejemplo. Fase 1: un patio Clásico 3D (SM64) con suelo,
   unas plataformas escalonadas y una Medalla que recoger. */
(function (S) {
  'use strict';
  const G3 = S.G3;

  // Suelo grande como una sola caja fina + plataformas.
  function playground() {
    const blocks = [];
    // suelo 40x40 centrado en el origen, grosor 1 (de y=-1 a y=0)
    blocks.push({ type: 'ground', x: -20, y: -1, z: -20, w: 40, h: 1, d: 40 });
    // escalera de plataformas hacia la Medalla
    blocks.push({ type: 'hard', x: 4, y: 0, z: -2, w: 3, h: 1, d: 3 });
    blocks.push({ type: 'hard', x: 8, y: 1, z: -2, w: 3, h: 1, d: 3 });
    blocks.push({ type: 'hard', x: 12, y: 2, z: -2, w: 3, h: 1, d: 3 });
    // una isla alta
    blocks.push({ type: 'ground', x: -12, y: 3, z: -12, w: 6, h: 1, d: 6 });
    // muretes para probar colisión lateral
    blocks.push({ type: 'hard', x: -6, y: 0, z: 6, w: 1, h: 2, d: 8 });
    blocks.push({ type: 'hard', x: 6, y: 0, z: 10, w: 8, h: 2, d: 1 });

    return new G3.Model.World3D({
      mode: 'flat', theme: 'lake', name: 'Patio 3D',
      spawn: { x: 0, y: 2, z: 0 },
      blocks,
      medals: [
        { x: 13.5, y: 3.5, z: -0.5, kind: 'main' },   // encima de la escalera
        { x: -9, y: 4.5, z: -9, kind: 'extra' }        // en la isla alta
      ],
      pyces: [
        { type: 'stupid', x: -4, y: 0.6, z: -6, range: 4 },   // camina y cae al pisarlo (:D)
        { type: 'pyce2', x: 6, y: 0.6, z: 5, range: 3 },      // se enfada al golpearlo (^^)
        { type: 'symbol', x: 0, y: 0.6, z: 8, range: 2 },     // brinca avanzando
        { type: 'zom', x: -8, y: 0.6, z: 2, range: 3 },       // lento, se levanta una vez
        { type: 'noob', x: 10, y: 0.6, z: -6, range: 3 },     // te embiste si te acercas
        { type: 'knight', x: -2, y: 0.6, z: 11, range: 2.5 }  // caballero: carga hacia ti
      ],
      goal: { x: 0, y: 0.5, z: -14 }
    });
  }

  G3.Model.levels3d = {
    playground,
    list: [{ id: 'playground', name: 'Patio 3D', build: playground }],
    get(id) { const e = this.list.find((l) => l.id === id) || this.list[0]; return e.build(); }
  };
})(window.SGM);
