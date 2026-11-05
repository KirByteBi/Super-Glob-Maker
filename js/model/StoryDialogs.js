/* Modelo: GUION del Modo Historia (dialogos y cinematicas). Solo DATOS: la vista
   (MenuView.storyDialog) los pinta y el AppController los dispara. Aislado: si falta,
   el Modo Historia sigue funcionando sin narrativa (los enganches van con guardas).

   Un dialogo = { id, pages: [ { speaker, side, sprite, text } ] }.
     speaker: nombre que se muestra ('NOeye', 'Pyce', 'player'...).
     side: 'left' | 'right' (lado del retrato).
     sprite: ruta de imagen (Enemigos/...). null = usa el Glob del jugador.
     text: una pagina de texto.

   Claves: 'wX/intro' (al abrir el mundo), 'wX/castle' (antes del castillo),
   'wX/boss' (tras derrotar al jefe). Si una clave no existe, no se muestra nada. */
(function (S) {
  'use strict';
  const PA = (S.View && S.View.PyceArt) || {};
  const SP = (id, fallback) => (PA[id] && PA[id].src) || fallback; // ruta del sprite de un Pyce
  const NOEYE = SP('noeye', 'Enemigos/NOeye_Pyce.png');
  const MOON = SP('moonstar', 'Enemigos/MoonStar_Pyce.png');
  const NOSENSE = SP('nosense', 'Enemigos/NOsense Pyce.png');
  const NOIR = SP('noir', 'Enemigos/NOIRrupt Pyce.png');
  const NOEYE_B = SP('noeye', 'Enemigos/NOeye_Pyce.png'); // jefe de castillo generico (NOeye) 
  const PYCE = 'Enemigos/Pyce2.png'; // Pyce generico (celoso)

  const foe = (name, sprite, text) => ({ speaker: name, side: 'left', sprite, text });
  const hero = (text) => ({ speaker: 'player', side: 'right', sprite: null, text });

  const DIALOGS = {
    // ---------------- Mundo 1: Globland Isle ----------------
    'w1/intro': { pages: [
      foe('Pyce', PYCE, '¡Alto ahi, Glob! Esta isla era nuestra mucho antes de que vosotros aparecierais... o eso dicen.'),
      foe('Pyce', PYCE, 'Ahora todos os quieren a VOSOTROS. ¿Y nosotros, los Pyces? Arrinconados. No es justo.'),
      hero('(No parece que quiera hablar. Parece... dolido.)')
    ] },
    'w1/castle': { pages: [
      foe('Pyce capataz', PYCE, 'Esta fabrica es de PixelStar. Aqui NO entran animales como tu.'),
      hero('¿Animales? Solo quiero pasar.'),
      foe('Pyce capataz', PYCE, 'Pues tendras que ganartelo. ¡Adelante, si te atreves!')
    ] },
    'w1/boss': { pages: [
      foe('Pyce capataz', PYCE, 'Imposible... un Glob, pensando. No teniais que ser capaces de esto.'),
      hero('No pensamos mucho. Pero aprendemos a base de tropezar.')
    ] },

    // ---------------- Mundo 2: Wildsand Leaf ----------------
    'w2/intro': { pages: [
      foe('Pyce', PYCE, 'Mira al salvaje. Nosotros tenemos ORDEN, jerarquia, un mando. Vosotros... cada uno a lo suyo.'),
      hero('(Y aun asi avanzamos. Curioso.)')
    ] },
    'w2/castle': { pages: [
      foe('NOsense', NOSENSE, 'Je, je... ¿hueles eso? Es NAVIDAD. La ODIO. Y pienso borrarla de todos los mundos.'),
      foe('NOsense', NOSENSE, 'Me hicieron mezclando esa fecha asquerosa con un trozo de... EL. De NOeye. Y lo detesto a el tambien.'),
      hero('¿Quien es NOeye?'),
      foe('NOsense', NOSENSE, '¡No pronuncies su nombre! Caiste tu primero. ¡Al fin algo que machacar!')
    ] },
    'w2/boss': { pages: [
      foe('NOsense', NOSENSE, 'Me derrotaron una vez en Techspawn... pero volvi como fantasma. Volvere otra vez. SIEMPRE vuelvo.'),
      hero('(Un fantasma con rencor. Esto es mas grande de lo que creia.)')
    ] },

    // ---------------- Mundo 3: Wonders Circus ----------------
    'w3/intro': { pages: [
      foe('Pyce', PYCE, '¡Pasen y vean! El gran espectaculo Pyce. Aqui todo es un truco... hasta nosotros.'),
      hero('(Algo no cuadra. Estos Pyces no estan al mando de verdad.)')
    ] },
    'w3/castle': { pages: [
      foe('NOeye', NOEYE, '...'),
      hero('¿No vas a decir nada?'),
      foe('NOeye', NOEYE, '(Te mira en silencio. No ataca. Se aparta y te deja pasar... por ahora.)'),
      hero('(Dicen que quien se cruza en su camino lo paga caro. Pero a mi me ha dejado ir.)')
    ] },
    'w3/boss': { pages: [
      foe('NOeye', NOEYE, '(No luchaba contra ti. Luchaba contra los OTROS. Los que de verdad quieren destruirlo todo.)'),
      hero('¿Entonces... estabas de nuestro lado?')
    ] },

    // ---------------- Mundo 4: Tormenta Volcanica ----------------
    'w4/intro': { pages: [
      foe('Pyce', PYCE, 'La corrupcion crece. Nosotros solo teniamos celos... esto ya no lo controlamos.'),
      hero('(Los Pyces parecen tan asustados como yo.)')
    ] },
    'w4/castle': { pages: [
      foe('NOIRrupt', NOIR, 'Mirame bien: soy EL, pero en negro y blanco. Lo que NOsense seria si se acercara del todo a NOeye.'),
      foe('NOIRrupt', NOIR, 'Mas fuerte. Mas vacio. Y tu estas en mi camino.'),
      hero('¡He llegado hasta aqui, no pienso parar!')
    ] },
    'w4/boss': { pages: [
      foe('NOIRrupt', NOIR, 'Tsk... solo soy un eco de algo peor. Lo entenderas cuando llegues al Vortice.'),
      hero('(El Vortice. Ahi esta el final de todo esto.)')
    ] },

    // ---------------- Mundo 5: Ruptura Dimensional (Vortice) ----------------
    'w5/intro': { pages: [
      foe('NOeye', NOEYE, '(Aqui empieza el fin de los tiempos. Toda la corrupcion que dejaron los Pyces... y EL.)'),
      hero('¿Vienes conmigo?'),
      foe('NOeye', NOEYE, '(Asiente, en silencio. Solo busca un hogar para los suyos. Hoy, ese hogar lo defendemos juntos.)')
    ] },
    'w5/castle': { pages: [
      foe('MoonStar Pyce', MOON, 'Yo soy la corrupcion. El BITCORE me modifico, me rompio, y con lo que quedo... voy a conquistarlo TODO.'),
      foe('MoonStar Pyce', MOON, 'Esa energia ancestral daño a la estrella Pyce. Me daño a MI. Ahora el mundo pagara por ello.'),
      hero('¡Se acabo, MoonStar! ¡Por los Pyces y por los Globs!')
    ] },
    'w5/boss': { pages: [
      foe('MoonStar Pyce', MOON, 'El Bitcore... se apaga... pero volvera. Siempre... vuelve...'),
      foe('NOeye', NOEYE, '(Se queda mirando el Vortice en calma. Por fin, un hogar a salvo. Al menos, por hoy.)'),
      hero('Pyces y Globs. Quiza no somos tan distintos despues de todo.')
    ] }
  };

  S.Model.StoryDialogs = {
    get(id) { return DIALOGS[id] || null; },
    has(id) { return !!DIALOGS[id]; },
    all() { return DIALOGS; }
  };
})(window.SGM);
