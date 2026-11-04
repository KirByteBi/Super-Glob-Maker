/* Modelo: Globs jugables, sus 3 evoluciones y los power-ups especiales (Glob Caca y Glob Vacío) */
(function (S) {
  'use strict';
  // Cada personaje tiene 3 evoluciones: EVO1 (pequeño), EVO2 (grande, rompe bloques), EVO3 (dispara).
  // En base los Globs son CASI iguales; solo se nota un poquito su rasgo (anticipo de la
  // habilidad del power-up EVO3). ability: qué hace la forma EVO3 (shoot / none).
  const list = [
    { id: 'green', name: 'Glob Verde', folder: 'GreenRewamp-SKIN', color: '#00ff66', shot: '#00ff66',
      evos: ['Glob Verde (EVO1).png', 'Emerald Glob (EVO3).png', 'Greenbow Glob (EVO4).png'],
      evoNames: ['Glob Verde', 'Glob Dorado', 'Glob Arcoíris'],
      stats: { speed: 1, jump: 1, traction: 1, float: 0, swim: 1 }, ability: 'none', desc: 'Equilibrado, no destaca en nada.' },
    { id: 'red', name: 'Glob Rojo', folder: 'RedRewamp-SKIN', color: '#ff3b1f', shot: '#ff7a00',
      evos: ['Red Glob (EVO1).png', 'Molten Glob (EVO2).png', 'Cyborg Glob (EVO3).png'],
      evoNames: ['Glob Rojo', 'Glob Fundido', 'Glob Ciborg'],
      stats: { speed: 1.06, jump: 1, traction: 1, float: 0, swim: 1 }, ability: 'none', desc: 'Un pelín más rápido.' },
    { id: 'blue', name: 'Glob de Jabón', folder: 'BlueRewamp_SKIN', color: '#7fd6ff', shot: '#9fe8ff',
      evos: ['Soap Glob (EVO1).png', 'Cotton Glob (SK-EVO2).png', 'ElectroClean Glob (EVO3).png'],
      evoNames: ['Glob de Jabón', 'Glob de Cotón', 'Glob Electroclean'],
      stats: { speed: 1, jump: 1, traction: 0.5, float: 0, swim: 1 }, slippery: true, ability: 'none', desc: 'Resbala al caminar; mientras resbala no le afectan cintas ni pinchos.' },
    { id: 'ducky', name: 'Glob Ducky', folder: 'DuckyRewamp-SKIN', color: '#ffd000', shot: '#ffb000',
      evos: ['Ducky Glob (EVO1).png', 'Golden Ducky Glob (EVO2).png', 'Rich Ducky Glob (EVO3).png'],
      evoNames: ['Glob Ducky', 'Glob Ducky Dorado', 'Glob Ducky Rico'],
      stats: { speed: 1, jump: 1.03, traction: 1, float: 1, swim: 1.1 }, ability: 'none', coinBonus: 1, desc: 'Planea al caer unos segundos y suma +1 a cada moneda que coge.' },
    { id: 'black', name: 'Glob Cometa', folder: 'BlackRewamp _SKIN', color: '#b44dff', shot: '#ff4df0',
      evos: ['Comet Glob (EVO1).png', 'Dark Glob (EVO2).png', 'Demonic Glob (EVO3).png'],
      evoNames: ['Glob Cometa', 'Glob Oscuro', 'DemGlob'],
      stats: { speed: 1, jump: 1.08, traction: 1, float: 0, swim: 1 }, ability: 'shoot', desc: 'Salta más alto y dispara con el power-up.' },
    { id: 'gray', name: 'Glob Antiguo', folder: 'GrayRewamp-SKIN', color: '#9a9a9a', shot: '#d0d0d0',
      evos: ['RewampedGray1.png', 'RewampedGray2.png', 'RewampedGray3.png'],
      evoNames: ['Glob Antiguo', 'Glob Pyce', 'Glob Espía'],
      stats: { speed: 1, jump: 1, traction: 1, float: 0, swim: 1, heavy: true }, ability: 'shoot', swimSpecial: 1.4, desc: 'Pesado (su culetazo rompe bloques); dispara con el power-up y de especial nada más rápido.' }
  ];
  list.forEach((c) => { c.paths = c.evos.map((f) => 'Globs/' + c.folder + '/' + f); });

  // Power-ups especiales: cualquier Glob se transforma en ellos (como los power-ups extra de SMM2).
  const specials = {
    caca: { id: 'caca', name: 'Glob Caca', item: 'Gota Caca', path: 'Globs/GreenRewamp-SKIN/Poop Glob (EVO2).png', color: '#8a5a2b',
      desc: 'Lanza bolas de caca que rebotan y dejan charcos pegajosos que frenan a los enemigos.' },
    vacio: { id: 'vacio', name: 'Glob Vacío', item: 'Fragmento del Vacío', path: 'Globs/BlackRewamp _SKIN/Void Glob (EVO4).png', color: '#2a0a45',
      desc: 'Doble salto estelar y caída lenta. Al aterrizar del doble salto lanza una onda de estrellas.' }
  };

  // Stats "base" (las del Glob verde): todos juegan igual con la norma "sin efectos especiales".
  const BASE_STATS = { speed: 1, jump: 1, traction: 1, float: 0, swim: 1 };

  S.Model.Characters = {
    list, specials,
    get(id) { return list.find((c) => c.id === id) || list[0]; },
    // Versión NEUTRALIZADA de un Glob: conserva su apariencia (id, nombre, sprites,
    // colores, evos) pero juega EXACTAMENTE como el verde: sin habilidad de disparo,
    // sin resbalar, sin planeo, sin bonus de monedas, sin nado especial ni peso.
    // Se usa cuando el nivel tiene la norma "sin efectos especiales" (y en multijugador).
    neutralized(id) {
      const c = this.get(id);
      return Object.assign({}, c, { stats: Object.assign({}, BASE_STATS), ability: 'none', slippery: false, coinBonus: 0, swimSpecial: 0, _neutral: true });
    },
    // Nombre de la forma actual del jugador
    formName(ch, evo, special) { return special ? specials[special].name : ch.evoNames[evo]; },
    formPath(ch, evo, special) { return special ? specials[special].path : ch.paths[evo]; },
    evoLabel(i) { return 'EVO' + (i + 1); }
  };
})(window.SGM);
