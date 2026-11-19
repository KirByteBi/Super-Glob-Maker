/* © 2026 KirByte_Bi · OWNER: KirByte_Bi · Todos los derechos reservados. Ver LICENSE. */
/* Modelo: filtro de texto para las frases de los NPC.
   Si una línea contiene una palabra inapropiada (en español o inglés), se sustituye entera por "Hello World!".
   La comparación ignora mayúsculas y acentos, y solo mira palabras completas. */
(function (S) {
  'use strict';
  // Lista inicial, en minúsculas y sin acentos. Se puede ampliar aquí.
  const BAD = [
    // español
    'puta', 'puto', 'putas', 'putos', 'mierda', 'joder', 'jodido', 'jodida', 'cabron', 'cabrona', 'gilipollas', 'cono',
    'mamon', 'mamona', 'capullo', 'zorra', 'hijoputa', 'hijo de puta', 'pendejo', 'pendeja', 'maricon', 'subnormal',
    // inglés
    'fuck', 'fucking', 'fucker', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'bastard', 'whore', 'slut', 'faggot',
    'nigger', 'retard', 'retarded'
  ];
  const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isBad = (text) => {
    const words = norm(text).replace(/[^a-z ]+/g, ' ').split(' ').filter(Boolean);
    // también cuenta el plural (mierdas, zorras...) quitando una "s" final
    return words.some((w) => BAD.indexOf(w) !== -1 || (w.length > 3 && BAD.indexOf(w.replace(/s$/, '')) !== -1))
      || BAD.some((b) => b.indexOf(' ') !== -1 && (' ' + words.join(' ') + ' ').indexOf(' ' + b + ' ') !== -1);
  };
  S.Model.TextFilter = {
    isBad,
    // Devuelve el texto tal cual o "Hello World!" si contiene algo inapropiado
    clean(text) { return isBad(text) ? 'Hello World!' : String(text); }
  };
})(window.SGM);
