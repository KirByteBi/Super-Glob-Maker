/* Modelo: mapas (temas), paletas Paz/Corrupto y efectos del modo Corrupto */
(function (S) {
  'use strict';
  const U = S.util;

  const EFFECTS = {
    bouncy: 'Gelatina loca: tras saltar sigues rebotando',
    darkness: 'Apagón nocturno: solo tu Glob y los proyectiles dan luz',
    waves: 'Marejada: el agua y el líquido hacen olas que barren la orilla',
    ghosts: 'Noche espectral: los enemigos solo se ven de cerca',
    speedUp: 'Función acelerada: enemigos y obstáculos van más rápido',
    slippery: 'Ventisca: todo resbala',
    lowGravity: 'Gravedad del vacío: saltos lunares',
    abyss: 'Abismo ingrávido: saltos altos, gravedad baja y enemigos que nadan',
    movingShrooms: 'Setas vivas: las setas se mueven',
    mirror: 'Espejo: el nivel se invierte',
    meteors: 'Lluvia de meteoritos',
    stormClouds: 'Tormenta MadStars: las nubes se deshacen y lanzan rayos',
    roulette: 'Ruleta loca: cada rato cambia una regla del nivel',
    timewarp: 'Paradoja: el tiempo va a ratos lento y a ratos rápido',
    beat: 'A todo volumen: enemigos y plataformas laten al ritmo',
    medalGate: 'Dimensión sellada: la meta se abre con todas las Monedas Estrella'
  };

  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9, 12, 14],
    dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11]
  };

  const list = [
    { id: 'lake', name: 'Gelatin Lake', corruptName: 'Gelatin Lake Corrupto', group: 'Lago / Valle', bg: 'hills', effect: 'bouncy', liquidName: 'Gelatina tóxica', waterName: 'Gelatina verde',
      music: { root: 60, scale: 'major', tempo: 132, wave: 'square', prog: [0, 5, 3, 4] },
      pal: { skyTop: '#7fd3ff', skyBot: '#e6f8ff', ground: '#9a6440', groundDark: '#7a4b2e', top: '#00ff66', topDark: '#00b84a', brick: '#ff7ac8', liquid: '#ff4fa0', liquidTop: '#ffa6d2', water: '#1fc04a', far: '#b8eed3', mid: '#62d996', near: '#2fb36b', accent: '#ff9de0' } },
    { id: 'city', name: 'Urbanistic Road', corruptName: 'Urbanistic Road: Apagón', group: 'Ciudad', bg: 'city', effect: 'darkness', night: true, liquidName: 'Petróleo',
      music: { root: 57, scale: 'dorian', tempo: 120, wave: 'square', prog: [0, 3, 4, 3] },
      pal: { skyTop: '#ff9f6b', skyBot: '#ffe2b0', ground: '#4b4f5c', groundDark: '#363944', top: '#6c7285', topDark: '#ffd000', brick: '#c9643f', liquid: '#141418', liquidTop: '#3a3a44', far: '#f0a17c', mid: '#a5677a', near: '#5d4560', accent: '#ffd000' } },
    { id: 'seaside', name: 'Sunlight Seaside', corruptName: 'Sunlight Seaside: Marejada', group: 'Playa / Puerto', bg: 'sea', effect: 'waves', night: true, liquidName: 'Agua venenosa',
      music: { root: 62, scale: 'major', tempo: 126, wave: 'triangle', prog: [0, 4, 5, 3] },
      pal: { skyTop: '#2fbfff', skyBot: '#c4f2ff', ground: '#f2c879', groundDark: '#d6a552', top: '#fff3c4', topDark: '#e3cd8a', brick: '#ff8a5c', liquid: '#7a2fd0', liquidTop: '#c38bff', far: '#8adfff', mid: '#1fa3dd', near: '#167bb8', accent: '#ff5f5f' } },
    { id: 'ruins', name: 'Spooktacular Ruins', corruptName: 'Aridez Escalofriante', group: 'Desierto / Ruinas', bg: 'ruins', effect: 'ghosts', night: true, liquidName: 'Arenas movedizas',
      music: { root: 58, scale: 'harmonic', tempo: 112, wave: 'square', prog: [0, 1, 0, 4] },
      pal: { skyTop: '#ff9a55', skyBot: '#ffe1a1', ground: '#d98b3a', groundDark: '#b46b25', top: '#f5bf6e', topDark: '#c98d3f', brick: '#b0703a', liquid: '#9a6a35', liquidTop: '#c69257', far: '#f6c38c', mid: '#d8925a', near: '#a6623a', accent: '#9b4dff' } },
    { id: 'circus', name: 'Pumpkin Circus', corruptName: 'Pesadilla en el Circo', group: 'Circo / Halloween', bg: 'circus', effect: 'speedUp', liquidName: 'Jarabe de feria',
      music: { root: 57, scale: 'harmonic', tempo: 138, wave: 'square', prog: [0, 3, 4, 0] },
      pal: { skyTop: '#2b0f4f', skyBot: '#80408f', ground: '#e8323f', groundDark: '#fff2f2', top: '#ffae00', topDark: '#d98600', brick: '#9a4dff', liquid: '#e22338', liquidTop: '#ff6f85', far: '#4d2273', mid: '#8a2e6a', near: '#1b0b2e', accent: '#ff8a00' } },
    { id: 'snow', name: 'Frosty Christmas', corruptName: 'Frosty Christmas: Ventisca', group: 'Nieve / Navidad', bg: 'snow', effect: 'slippery', night: true, liquidName: 'Agua helada',
      music: { root: 65, scale: 'major', tempo: 118, wave: 'triangle', prog: [0, 3, 4, 0] },
      pal: { skyTop: '#9fd0ff', skyBot: '#f2f9ff', ground: '#6fb6e3', groundDark: '#4f95c4', top: '#ffffff', topDark: '#d4ebff', brick: '#e8434f', liquid: '#2f6fd0', liquidTop: '#a8d4ff', far: '#d8edff', mid: '#ffffff', near: '#2f8f5b', accent: '#ff3b3b' } },
    { id: 'vortex', name: 'Vórtice Oscuro', corruptName: 'Vórtice del Vacío', group: 'Fortaleza aérea', bg: 'vortex', effect: 'lowGravity', liquidName: 'Vacío',
      music: { root: 52, scale: 'phrygian', tempo: 128, wave: 'sawtooth', prog: [0, 1, 5, 4] },
      pal: { skyTop: '#0b0014', skyBot: '#3a0f5c', ground: '#140b20', groundDark: '#000000', top: '#b58cff', topDark: '#8a5cff', brick: '#6a2fbf', liquid: '#2a0a4f', liquidTop: '#7a2fd0', far: '#2a0a45', mid: '#541c86', near: '#8a3fd1', accent: '#ff4df0' } },
    { id: 'underwater', name: 'Abismo Gelatinoso', corruptName: 'Abismo sin Fondo', group: 'Acuático', bg: 'underwater', effect: 'abyss', liquidName: 'Anémona urticante', swim: true,
      music: { root: 60, scale: 'pent', tempo: 96, wave: 'sine', prog: [0, 5, 3, 4] },
      pal: { skyTop: '#1078c8', skyBot: '#0a2a66', ground: '#2fbfa0', groundDark: '#1f8f78', top: '#7affd6', topDark: '#3fdcb0', brick: '#ff7ab8', liquid: '#ff2f7a', liquidTop: '#ff8fbf', far: '#1a5fa8', mid: '#164784', near: '#ff7ab8', accent: '#ffd000' } },
    // Darkness Forest: de día un bosque normal; en modo Corrupto, bosque de setas alucinógenas
    { id: 'jungle', name: 'Darkness Forest', corruptName: 'Darkness Forest: Setas Alucinógenas', group: 'Bosque', bg: 'jungle', effect: 'movingShrooms', liquidName: 'Ciénaga venenosa',
      corruptOver: { skyTop: '#1a0033', skyBot: '#ff4fd8', top: '#ff2fd6', topDark: '#9b00ff', far: '#5a1a8a', mid: '#ff7a00', near: '#00e5a0', accent: '#fff000', ground: '#3a1050', groundDark: '#22082f' },
      music: { root: 55, scale: 'dorian', tempo: 124, wave: 'square', prog: [0, 6, 5, 4] },
      pal: { skyTop: '#2f8f6b', skyBot: '#bfe8a6', ground: '#6b3f22', groundDark: '#4f2d17', top: '#3fbf4f', topDark: '#23803a', brick: '#a0703a', liquid: '#9a3fd0', liquidTop: '#c88bff', far: '#5aa874', mid: '#2f7a4a', near: '#1b4f30', accent: '#fff3d6' } },
    // Enredados Nublasticos: cielo clasico estilo NSMBWii/U + SMW (azul y nubes blancas),
    // ya no el pastel rosa de antes.
    { id: 'sky', name: 'Enredados Nublásticos', corruptName: 'Enredados Nublásticos: Espejo', group: 'Cielo', bg: 'sky', effect: 'mirror', liquidName: 'Algodón eléctrico',
      music: { root: 67, scale: 'major', tempo: 140, wave: 'triangle', prog: [0, 4, 5, 3] },
      pal: { skyTop: '#3fa9f5', skyBot: '#bfe6ff', ground: '#eef6ff', groundDark: '#b9d4ec', top: '#ffffff', topDark: '#cfe4f5', brick: '#7fb8e6', liquid: '#ffe600', liquidTop: '#fff7a8', far: '#eaf4ff', mid: '#cfe7ff', near: '#a9d2f0', accent: '#ffd000' } },
    { id: 'volcano', name: 'Núcleo Fundido', corruptName: 'Erupción Total', group: 'Volcán', bg: 'volcano', effect: 'meteors', liquidName: 'Lava',
      music: { root: 50, scale: 'minor', tempo: 134, wave: 'sawtooth', prog: [0, 5, 6, 4] },
      pal: { skyTop: '#2b0a0a', skyBot: '#902c10', ground: '#3d2c2c', groundDark: '#ff5a1f', top: '#5c4343', topDark: '#2a1d1d', brick: '#7a3a2a', liquid: '#ff4a00', liquidTop: '#ffb000', far: '#5c1b10', mid: '#3a1010', near: '#1a0808', accent: '#ff8a00' } },
    { id: 'factory', name: 'Fábrica PixelStar', corruptName: 'Fábrica MadStars', group: 'Castillo (Fábrica)', bg: 'factory', effect: 'stormClouds', liquidName: 'Píxeles fundidos',
      music: { root: 53, scale: 'harmonic', tempo: 144, wave: 'square', prog: [0, 1, 4, 0] },
      pal: { skyTop: '#1f2633', skyBot: '#3d4a5c', ground: '#7a8494', groundDark: '#565f6e', top: '#ffd000', topDark: '#1a1a1a', brick: '#5f6b7d', liquid: '#00c8e5', liquidTop: '#8df2ff', far: '#283142', mid: '#384357', near: '#131820', accent: '#00e5ff' },
      // Fábrica MadStars (Corrupto): rojo con negro y blanco
      corruptOver: { skyTop: '#050505', skyBot: '#3a0008', ground: '#1c1c1f', groundDark: '#000000', top: '#ff1f3a', topDark: '#f2f2f2', brick: '#e8e8e8', liquid: '#ff1f3a', liquidTop: '#ffffff', far: '#24060a', mid: '#4a0a12', near: '#0a0a0a', accent: '#ffffff' } },
    // ----- MAPAS NUEVOS -----
    { id: 'casino', name: 'Gambling Gaming', corruptName: 'Gambling Gaming: Ruleta Loca', group: 'Casino', bg: 'casino', effect: 'roulette', liquidName: 'Ponche con premio',
      music: { root: 59, scale: 'major', tempo: 128, wave: 'square', prog: [0, 3, 4, 5] },
      pal: { skyTop: '#1a0606', skyBot: '#5c0f0f', ground: '#1f7a3a', groundDark: '#145526', top: '#e8323f', topDark: '#ffd000', brick: '#c0282f', liquid: '#ff3b3b', liquidTop: '#ffb0b0', far: '#7a1515', mid: '#b0282a', near: '#1f7a3a', accent: '#ffd000' } },
    { id: 'clock', name: 'Time Attack', corruptName: 'Time Attack: Paradoja', group: 'Espacio-tiempo', bg: 'clock', effect: 'timewarp', liquidName: 'Arena del tiempo',
      music: { root: 55, scale: 'dorian', tempo: 130, wave: 'triangle', prog: [0, 5, 3, 4] },
      pal: { skyTop: '#102b3a', skyBot: '#1f6f8f', ground: '#5a6b7a', groundDark: '#3d4a57', top: '#ffd27a', topDark: '#c99a4a', brick: '#8a6a4a', liquid: '#1f6fff', liquidTop: '#7ab0ff', far: '#1a4a5c', mid: '#2a7a94', near: '#3fb0c4', accent: '#ffd000' } },
    { id: 'disco', name: 'Sound Discotech', corruptName: 'Sound Discotech: A Todo Volumen', group: 'Discoteca', bg: 'disco', effect: 'beat', liquidName: 'Refresco burbujeante',
      music: { root: 60, scale: 'pent', tempo: 140, wave: 'sawtooth', prog: [0, 4, 5, 3] },
      pal: { skyTop: '#0a0a1a', skyBot: '#2a0a50', ground: '#1a1030', groundDark: '#0e0820', top: '#ff2fd6', topDark: '#c0209f', brick: '#4a2f8a', liquid: '#00e5ff', liquidTop: '#a0f7ff', far: '#2a0a50', mid: '#55158a', near: '#8a2fd0', accent: '#ffe600' } },
    { id: 'hub', name: 'Event Hub', corruptName: 'Event Hub: Dimensión Sellada', group: 'Interdimensional', bg: 'hub', effect: 'medalGate', liquidName: 'Energía dimensional',
      music: { root: 62, scale: 'major', tempo: 122, wave: 'triangle', prog: [0, 5, 6, 4] },
      pal: { skyTop: '#042a1a', skyBot: '#0f6b44', ground: '#1a4a30', groundDark: '#0f3020', top: '#3fffa0', topDark: '#23b870', brick: '#2f8a5a', liquid: '#0a3d22', liquidTop: '#1f7a44', far: '#0f5a38', mid: '#1a8a55', near: '#2fc47a', accent: '#ffe600' } }
  ];

  // Mapas "night": en modo Corrupto se hace de noche (azul marino, luna y estrellas).
  // El resto se tiñe de violeta corrupto.
  function corruptify(p, over, night) {
    const out = {};
    const tint = night ? '#0b1a3a' : '#5b1080';
    Object.keys(p).forEach((k) => { out[k] = U.shade(U.mix(p[k], tint, night ? 0.5 : 0.42), night ? -0.22 : -0.12); });
    out.skyTop = night ? '#03061a' : '#0c0014';
    out.skyBot = night ? '#1c2f5c' : U.mix(p.skyBot, '#6a0f4f', 0.72);
    // los líquidos y el color de acento siguen brillando de noche
    if (night) { out.liquidTop = U.mix(p.liquidTop, '#ffffff', 0.1); out.accent = p.accent; }
    return Object.assign(out, over || {});
  }

  // Las 2 variantes de semisólido de cada mapa (estilo con el que las dibuja la vista)
  const SEMIS = {
    lake: [['Plataforma de hierba', 'grass'], ['Puente de troncos', 'logs']],
    city: [['Edificio con tejado', 'building'], ['Vigas de obra', 'girder']],
    seaside: [['Muelle del puerto', 'dock'], ['Toldo de playa', 'awning']],
    ruins: [['Columna antigua', 'column'], ['Losa de tumba', 'tomb']],
    circus: [['Tambor de circo', 'drum'], ['Calabazas apiladas', 'pumpkins']],
    snow: [['Casa nevada', 'house'], ['Pila de regalos', 'gifts']],
    vortex: [['Roca del vacío', 'voidrock'], ['Cubierta de nave', 'deck']],
    underwater: [['Coral', 'coral'], ['Barco hundido', 'wreck']],
    // en modo Corrupto el tocón y la rama se dibujan como setas alucinógenas
    jungle: [['Tocón de árbol', 'stump'], ['Rama con hojas', 'branch']],
    sky: [['Pilar de algodón', 'cotton'], ['Puente arcoíris', 'rainbow']],
    volcano: [['Roca volcánica', 'basalt'], ['Rejilla metálica', 'grate']],
    factory: [['Vigas en construcción', 'girder'], ['Andamio', 'scaffold']],
    casino: [['Mesa de póker', 'pokertable'], ['Pila de fichas', 'chips']],
    clock: [['Reloj de arena', 'hourglass'], ['Engranaje', 'cog']],
    disco: [['Altavoz', 'speaker'], ['Teclado de piano', 'piano']],
    hub: [['Plataforma portal', 'portalpad'], ['Cristal verde', 'crystalpad']]
  };

  list.forEach((t) => {
    t.semis = SEMIS[t.id];
    t.corruptPal = corruptify(t.pal, t.corruptOver, t.night);
    t.effectLabel = EFFECTS[t.effect];
    t.scale = SCALES[t.music.scale];
  });

  S.Model.Themes = {
    list, EFFECTS, SCALES,
    get(id) { return list.find((t) => t.id === id) || list[0]; },
    palette(theme, mode) { return mode === 'corrupt' ? theme.corruptPal : theme.pal; },
    name(theme, mode) { const n = mode === 'corrupt' ? theme.corruptName : theme.name; return S.tr ? S.tr(n) : n; }
  };
})(window.SGM);
