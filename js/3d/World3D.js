/* Modo 3D (Model): el nivel 3D. Serializable a JSON (como Level en el 2D).
   Coordenadas en UNIDADES de mundo (1 unidad = 1 bloque). Y = arriba en modo 'flat'. */
(function (S) {
  'use strict';
  const G3 = S.G3;

  const DEFAULT = () => ({
    mode: 'flat',            // 'flat' (SM64) | 'galaxy' (SMG, fase posterior)
    theme: 'lake',
    name: 'Nivel 3D',
    spawn: { x: 0, y: 2, z: 0 },
    blocks: [],              // { type, x, y, z, w, h, d }  cajas sólidas (esquina + tamaño)
    planets: [],             // { x, y, z, r, gravity, theme }  solo galaxy
    medals: [],              // { x, y, z, kind }  Medallas (= estrellas de SM64)
    pyces: [],               // { type, x, y, z }  enemigos (reusan ids del 2D)
    goal: null,              // { x, y, z }  meta / portal de salida (opcional)
    deco: []                 // { type, x, y, z }
  });

  class World3D {
    constructor(data) {
      const d = Object.assign(DEFAULT(), data || {});
      this.mode = d.mode; this.theme = d.theme; this.name = d.name;
      this.spawn = d.spawn;
      this.blocks = d.blocks.map((b) => Object.assign({ type: 'ground', w: 1, h: 1, d: 1 }, b));
      this.planets = d.planets.slice();
      this.medals = d.medals.slice();
      this.pyces = d.pyces.slice();
      this.goal = d.goal;
      this.deco = d.deco.slice();
    }

    // Caja AABB de un bloque: esquina mínima + tamaño
    static boxOf(b) { return { x: b.x, y: b.y, z: b.z, w: b.w || 1, h: b.h || 1, d: b.d || 1 }; }

    toJSON() {
      return {
        mode: this.mode, theme: this.theme, name: this.name, spawn: this.spawn,
        blocks: this.blocks, planets: this.planets, medals: this.medals,
        pyces: this.pyces, goal: this.goal, deco: this.deco
      };
    }

    static default() { return new World3D(DEFAULT()); }
  }

  G3.Model.World3D = World3D;
})(window.SGM);
