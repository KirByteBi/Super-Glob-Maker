/* Núcleo: idiomas (Español / English). El juego está escrito en español; tr(texto) devuelve la
   traducción si el idioma es inglés. Se traduce al CREAR cada texto (botones, carteles, HUD...),
   así que al cambiar de idioma se vuelve a dibujar la pantalla. Textos con números o nombres usan
   PATRONES (expresiones regulares). Lo que no esté en el diccionario se queda en español. */
(function (S) {
  'use strict';
  const KEY = 'sgm.lang';
  let lang = 'es';
  try { lang = localStorage.getItem(KEY) || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en'); } catch (e) { /* nada */ }

  const D = {
    // ---- menú principal y generales
    '▶ Modo Historia': '▶ Story Mode', '✏ Crear nivel': '✏ Create level', '📁 Mis niveles': '📁 My levels', '🌐 Online': '🌐 Online',
    '🌌 Modo 3D (próximamente)': '🌌 3D Mode (coming soon)', '🎮 Controles': '🎮 Controls', '🔊 Sonido': '🔊 Sound', '🔇 Sonido': '🔇 Sound',
    'Versión 2D · Los Globs y sus amigos': '2D version · The Globs and friends', 'El modo 3D estilo SM64 / Galaxy llegará en la próxima versión.': 'The SM64 / Galaxy style 3D mode is coming in a future version.',
    '← Volver': '← Back', 'Cerrar': 'Close', 'Cancelar': 'Cancel', 'Aceptar': 'OK', 'Sí': 'Yes', 'No': 'No', 'Entendido': 'Got it', '¿Seguro?': 'Are you sure?',
    'Continuar': 'Continue', 'Reiniciar': 'Restart', 'Reintentar': 'Retry', 'Salir al menú': 'Quit to menu', 'Volver al editor': 'Back to editor', 'Pausa': 'Pause',
    'Cargando…': 'Loading…', 'Importar': 'Import', 'Exportar': 'Export', '＋ Nuevo': '＋ New', '▶ Jugar': '▶ Play', '✏ Editar': '✏ Edit', '🔒 Editar': '🔒 Edit',
    '🌐 Publicar': '🌐 Publish', '☄ Publicado': '☄ Published', 'Publicado': 'Published', '📄 Copiar': '📄 Copy', '📤 Exportar': '📤 Export', 'Mis niveles': 'My levels',
    'Aún no has guardado niveles. ¡Crea el primero!': "You haven't saved any levels yet. Make your first one!",
    '¡Nivel superado!': 'Level cleared!', 'Fin de la partida': 'Game over', 'Te has quedado sin vidas…': 'You ran out of lives…', '¡Medalla conseguida!': 'Medal get!',
    '🏅 ¡Has conseguido la Medalla!': '🏅 You got the Medal!', '🏅 ¡Medalla por META OCULTA!': '🏅 Medal via the HIDDEN GOAL!',
    '🔍 Este nivel esconde una META OCULTA y un interruptor "!"': '🔍 This level hides a HIDDEN GOAL and a "!" switch', '🔍 Este nivel esconde una META OCULTA': '🔍 This level hides a HIDDEN GOAL', '🔍 Este nivel esconde un interruptor "!"': '🔍 This level hides a "!" switch',
    '¡Ups!': 'Oops!', 'Idioma': 'Language', '¡Aún no!': 'Not yet!', '🔓 ¡Abierta!': '🔓 Open!', '🔒 Necesitas una llave': '🔒 You need a key', 'Esta puerta no lleva a ningún sitio': "This door doesn't lead anywhere", 'Esta tubería no lleva a ningún sitio': "This pipe doesn't lead anywhere", 'Salida': 'Start', '⚠ Palacio del interruptor "!"': '⚠ "!" Switch Palace',
    // ---- controles
    'Controles': 'Controls', 'Moverse': 'Move', 'Saltar (mantén para saltar más)': 'Jump (hold to jump higher)', 'Correr': 'Run', 'Disparar (EVO3 y Glob Caca)': 'Shoot (EVO3 and Poop Glob)',
    'Culetazo (rompe bloques si eres grande)': 'Ground pound (breaks blocks when big)', 'Colocar': 'Place', 'Borrar': 'Erase', 'Desplazar': 'Scroll', 'Deshacer / rehacer': 'Undo / redo',
    'Probar nivel': 'Test level', 'Volver al editor al instante': 'Back to the editor instantly', 'Categorías': 'Categories', '↓ / S en el aire': '↓ / S in the air', 'Esc / Enter': 'Esc / Enter',
    'Evoluciones: EVO1 → EVO2 (grande, rompe bloques) → EVO3 (dispara). Si te golpean bajas una evolución. Glob Caca y Glob Vacío son power-ups especiales.': 'Evolutions: EVO1 → EVO2 (big, breaks blocks) → EVO3 (shoots). Getting hit drops one evolution. Poop Glob and Void Glob are special power-ups.',
    'Elige tu Glob': 'Choose your Glob', 'Glob del nivel': "Level's Glob", 'Power-ups especiales (para todos)': 'Special power-ups (for everyone)',
    // ---- modo historia / mapa
    'Modo Historia': 'Story Mode', '☠ Modo Corrupto': '☠ Corrupt Mode', '☀ Modo Paz': '☀ Peace Mode', 'Flechas: mover · Z/Enter: entrar · Esc: salir': 'Arrows: move · Z/Enter: enter · Esc: exit',
    'Palacio "!"': '"!" Palace', 'Castillo': 'Castle', 'Primeros pasos': 'First steps', 'Bloques y cajas': 'Blocks and boxes', 'Plataformas': 'Platforms', 'Tuberías': 'Pipes', 'Muelles': 'Springs',
    'Plataformas móviles': 'Moving platforms', 'Monedas rojas': 'Red coins', 'Llaves y puertas': 'Keys and doors', 'Bloques Nota': 'Note blocks', 'Raíles': 'Rails', 'Hielo': 'Ice', 'Cañones': 'Cannons',
    'Rosquillas': 'Donuts', 'Nubes': 'Clouds', 'Bloques A/B': 'A/B blocks', 'Los Bros': 'The Bros', 'Interruptor P': 'P Switch', 'Monedas púrpura': 'Purple coins', 'Cintas': 'Conveyors', 'Agua': 'Water', 'Barras Estelares': 'Star Bars',
    'Mundo 1 · Globland Isle': 'World 1 · Globland Isle', 'Mundo 2 · Wildsand Leaf': 'World 2 · Wildsand Leaf', 'Mundo 3 · Wonders Circus': 'World 3 · Wonders Circus', 'Mundo 4 · Tormenta Volcánica': 'World 4 · Volcanic Storm', 'Mundo 5 · Ruptura Dimensional': 'World 5 · Dimensional Rift',
    // ---- editor
    'Terreno': 'Terrain', 'Bloques': 'Blocks', 'Pyces': 'Pyces', 'Pyces raros': 'Rare Pyces', 'Objetos': 'Items', 'Mecanismos': 'Gizmos', 'Decoración': 'Decoration', 'Especial': 'Special',
    'Jugar': 'Play', 'Mapa': 'Map', 'Paz': 'Peace', 'Corrupto': 'Corrupt', 'Glob': 'Glob', 'Ajustes': 'Settings', 'Guardar': 'Save', 'Salir': 'Exit', 'Base': 'Base', 'Herramienta': 'Tool',
    'Ajustes del nivel': 'Level settings', 'Nombre': 'Name', 'Ancho (32-400)': 'Width (32-400)', 'Alto (18-40)': 'Height (18-40)', 'Tiempo (10-500)': 'Time (10-500)', 'Condición de victoria': 'Win condition', 'Cantidad': 'Amount', 'Se aplica a': 'Applies to',
    'Aplicar': 'Apply', '🗑 Vaciar': '🗑 Clear', '¿Borrar todo el contenido del nivel?': 'Delete everything in the level?', 'Llegar a la Medalla': 'Reach the Medal', 'Sin saltar': 'No jumping', 'Derrotar enemigos': 'Defeat enemies', 'Juntar monedas': 'Collect coins', 'Coger todas las monedas rojas': 'Get all the red coins',
    'Las dos metas': 'Both goals', 'Solo la Medalla normal': 'Normal Medal only', 'Solo la meta oculta': 'Hidden goal only', 'Hay cambios sin guardar. ¿Salir igualmente?': 'There are unsaved changes. Exit anyway?',
    '¿Se puede superar?': 'Can it be beaten?', 'Guardar igualmente': 'Save anyway', '▶ Probarlo': '▶ Test it', 'No parece que se pueda llegar a la Medalla desde la salida.': "It doesn't look like the Medal can be reached from the start.", 'No parece que se pueda llegar a la meta oculta.': "It doesn't look like the hidden goal can be reached.", 'El nivel no tiene Medalla.': 'The level has no Medal.',
    'La comprobación mira si se puede ir saltando desde la salida (sin contar enemigos). Pruébalo con ▶ Jugar antes de publicarlo.': 'The check looks at whether you can jump your way from the start (ignoring enemies). Test it with ▶ Play before publishing.',
    'Eso no se puede girar': "That can't be rotated", 'Nivel sin nombre': 'Untitled level', 'Inicio': 'Start', 'Medalla (meta)': 'Medal (goal)', 'Meta oculta': 'Hidden goal', 'Borrador': 'Eraser', 'Enlazar tubería/puerta': 'Link pipe/door',
    'Probando nivel · Esc: volver al editor · P: pausa': 'Testing level · Esc: back to editor · P: pause',
    // ---- cuenta / online
    'Cuenta Glob Defenders': 'Glob Defenders account', 'Usuario de Glob Defenders': 'Glob Defenders username', 'Contraseña': 'Password', 'Iniciar sesión': 'Log in', '✨ Crear cuenta': '✨ Create account', '🔑 Iniciar sesión': '🔑 Log in',
    'Usa tu MISMA cuenta de Glob Defenders. ¿No tienes? Créala aquí: sirve para los dos juegos.': "Use your SAME Glob Defenders account. Don't have one? Create it here: it works for both games.",
    'Cerrar sesión (desvincular)': 'Log out (unlink)', 'Sesión cerrada': 'Logged out', 'Sin conexión con Glob Defenders.': 'No connection to Glob Defenders.', 'Usuario o contraseña incorrectos.': 'Wrong username or password.',
    'El usuario debe tener 3-24 caracteres: letras, números, puntos, guiones o guiones bajos.': 'Usernames need 3-24 characters: letters, numbers, dots, dashes or underscores.', 'Ese nombre de usuario no está permitido.': "That username isn't allowed.", 'La contraseña debe tener al menos 6 caracteres.': 'The password needs at least 6 characters.', 'Ese usuario ya existe. Si es tuyo, inicia sesión.': 'That user already exists. If it is yours, log in.',
    '⭐ Destacados': '⭐ Featured', '🏆 Top 10': '🏆 Top 10', '🆕 Recientes': '🆕 Recent', '🔥 Más jugados': '🔥 Most played', '💀 Más difíciles': '💀 Hardest', '🔍 Buscar': '🔍 Search', '👥 Amigos': '👥 Friends', '👤 Mi perfil': '👤 My profile',
    '📅 Nivel del día': '📅 Level of the day', '🏆 Lo mejor ahora mismo': '🏆 Best right now', '👑 Niveles GOD': '👑 GOD levels', '🌐 Todos sus niveles': '🌐 All their levels', '🌐 En la nube': '🌐 In the cloud', '📁 Niveles de este dispositivo sin publicar': '📁 Unpublished levels on this device',
    'Buscar': 'Search', 'Nombre del nivel o @autor': 'Level name or @author', 'Escribe algo para buscar.': 'Type something to search.', 'Todavía no hay niveles publicados. ¡Sé el primero!': 'No published levels yet. Be the first!',
    'Sin conexión con Glob Defenders. Lo online necesita internet.': 'No connection to Glob Defenders. Online needs internet.', 'Inicia sesión con tu cuenta de Glob Defenders para publicar niveles y ver tu perfil.': 'Log in with your Glob Defenders account to publish levels and see your profile.',
    'Aún no has publicado niveles. Ve a 📁 Mis niveles, impórtalos o créalos y pulsa 🌐 Publicar.': "You haven't published any levels. Go to 📁 My levels, import or create them and press 🌐 Publish.",
    '🙈 Ocultar': '🙈 Hide', 'Oculto': 'Hidden', '☄ Público': '☄ Public', '🦆 Favorito': '🦆 Favorite', '➕ Añadir': '➕ Add', 'Usuario de tu amigo': "Your friend's username", 'Aún no tienes amigos añadidos.': "You haven't added any friends yet.", 'Inicia sesión para tener amigos.': 'Log in to have friends.',
    'En línea ahora': 'Online now', 'Nunca visto': 'Never seen', '🌐 Sus niveles': '🌐 Their levels', '👍 Me gusta': '👍 Like', '👎 No me gusta': '👎 Dislike', 'Inicia sesión en 🌐 Online para votar este nivel.': 'Log in on 🌐 Online to vote for this level.',
    '👑 GOD': '👑 GOD', '🛡 Moderar': '🛡 Moderate', 'Solo para admin': 'Admins only',
    '🛡 Moderación: los 100 niveles más recientes de todos los jugadores. 👑 GOD los destaca arriba en ⭐ Destacados; 🛡🗑 los borra para todos.': '🛡 Moderation: the 100 most recent levels from every player. 👑 GOD pins them at the top of ⭐ Featured; 🛡🗑 deletes them for everyone.',
    '🛡 El servidor aún no te reconoce como admin: ejecuta kiro/supabase_admin_fix.sql en Supabase': "🛡 The server doesn't recognize you as admin yet: run kiro/supabase_admin_fix.sql in Supabase", '👑 Quitar GOD': '👑 Remove GOD', '☄ Nivel ya publicado': '☄ Level already published', '📄 Copia demasiado parecida': '📄 Copy too similar',
    'Este nivel ya está publicado y no se puede volver a publicar. Si quieres otra versión, haz una COPIA (📄) y cámbiale el tema, el modo o bastantes cosas.': 'This level is already published and cannot be published again. For another version, make a COPY (📄) and change its theme, mode or plenty of things.',
    '📋 Copiar al portapapeles': '📋 Copy to clipboard', '💾 Descargar archivo': '💾 Download file', 'Copiado': 'Copied', 'Publicando…': 'Publishing…', 'Sin conexión': 'Offline', 'No se pudo publicar': "Couldn't publish",
    '⬇ Guardado en 📁 Mis niveles': '⬇ Saved to 📁 My levels', 'Ya lo tienes en 📁 Mis niveles': 'You already have it in 📁 My levels', 'Descargando…': 'Downloading…', 'No se pudo descargar': "Couldn't download",
    // ---- HUD
    'ESPECIAL': 'SPECIAL', '¡Medalla!': 'Medal!', 'Llega sin saltar': 'Finish without jumping', 'Probando nivel': 'Testing level',
    // ---- personajes / power-ups
    'Glob Verde': 'Green Glob', 'Glob Rojo': 'Red Glob', 'Glob Azul': 'Blue Glob', 'Glob Cometa': 'Comet Glob', 'Glob Antiguo': 'Ancient Glob', 'Glob Ducky': 'Ducky Glob', 'Glob Caca': 'Poop Glob', 'Glob Vacío': 'Void Glob',
    'Gota Evo': 'Evo Drop', 'Flor Estelar': 'Star Flower', 'Brillo Estelar': 'Star Shine', 'Gota Caca': 'Poop Drop', 'Fragmento del Vacío': 'Void Shard',
    // ---- bloques y objetos más usados
    'Suelo': 'Ground', 'Bloque Gel (rompible)': 'Gel Block (breakable)', 'Caja Sorpresa': 'Surprise Box', 'Bloque Duro': 'Hard Block', 'Semisólido A': 'Semisolid A', 'Semisólido B': 'Semisolid B', 'Bloque Pincho': 'Spike Block',
    'Bloque Gelatina (rebota)': 'Jelly Block (bouncy)', 'Líquido peligroso': 'Dangerous liquid', 'Nube': 'Cloud', 'Globin (moneda)': 'Globin (coin)', 'Caja Oculta': 'Hidden Box', 'Cinta ←': 'Conveyor ←', 'Cinta →': 'Conveyor →',
    'Agua (se nada)': 'Water (swim)', 'Rosquilla (cae)': 'Donut (falls)', 'Bloque Nota': 'Note Block', 'Interruptor A/B rojo-azul': 'A/B switch red-blue', 'Tubería': 'Pipe', 'Bloque POW': 'POW Block', 'Bloque de luz': 'Light block',
    'Moneda roja (8 = 1UP)': 'Red coin (8 = 1UP)', 'Moneda azul': 'Blue coin', 'Moneda verde (interruptor G)': 'Green coin (G switch)', 'Moneda rosa (oculta)': 'Pink coin (hidden)', 'Interruptor G': 'G Switch',
    'Suelo temático (según el mapa)': 'Themed ground (per map)', 'Tubería pequeña (decoración)': 'Small pipe (decoration)', 'Moneda púrpura (junta 100 y aparece la Medalla)': 'Purple coin (collect 100 and the Medal appears)',
    'Semisólido de fondo (pinta un bloque: arriba se pisa, el resto es fondo del mapa)': 'Background semisolid (paint a block: the top is walkable, the rest is map background)', 'Fondo de cueva (sin colisión: para cuevas y túneles)': 'Cave background (no collision: for caves and tunnels)',
    'Raíl (pon encima plataformas, setas, Barras Estelares o Pyces y lo seguirán; las plataformas arrancan al subirte)': 'Rail (put platforms, mushrooms, Star Bars or Pyces on it and they follow it; platforms start when you step on)',
    'Punto de control': 'Checkpoint', 'Muelle': 'Spring', 'Llave': 'Key', 'Puerta': 'Door', 'Puerta con llave': 'Locked door', 'Entrada de tubería': 'Pipe entrance', 'Tubería con tapa': 'Capped pipe', 'Barra Estelar': 'Star Bar', 'Carámbano': 'Icicle',
    'Plataforma ↔': 'Platform ↔', 'Plataforma ↕': 'Platform ↕', 'Seta móvil ↔': 'Moving mushroom ↔', 'Seta móvil ↕': 'Moving mushroom ↕', 'Moneda Estrella': 'Star Coin'
  };
  // Patrones para textos con números / nombres
  const P = [
    [/^Junta (\d+) monedas \((\d+)\/(\d+)\)(.*)$/, (m) => `Collect ${m[1]} coins (${m[2]}/${m[3]})${tag(m[4])}`],
    [/^Derrota (\d+) enemigos \((\d+)\/(\d+)\)(.*)$/, (m) => `Defeat ${m[1]} enemies (${m[2]}/${m[3]})${tag(m[4])}`],
    [/^Coge las monedas rojas \((\d+)\/(\d+)\)(.*)$/, (m) => `Get the red coins (${m[1]}/${m[2]})${tag(m[3])}`],
    [/^Coge las Monedas Estrella \((\d+)\/(\d+)\)$/, (m) => `Get the Star Coins (${m[1]}/${m[2]})`],
    [/^Puntos: (.*)$/, (m) => 'Score: ' + m[1]], [/^Globins: (.*)$/, (m) => 'Globins: ' + m[1]], [/^Forma final: (.*)$/, (m) => 'Final form: ' + m[1]], [/^Vidas: (.*)$/, (m) => 'Lives: ' + m[1]],
    [/^⭐ Monedas Estrella: (.*?)( ¡todas!)?$/, (m) => '⭐ Star Coins: ' + m[1] + (m[2] ? ' all of them!' : '')],
    [/^¿Borrar "(.*)"\?(.*)$/, (m) => `Delete "${m[1]}"?` + (m[2] ? ' (the online version is not deleted)' : '')],
    [/^📄 Copia de "(.*)"$/, (m) => `📄 Copy of "${m[1]}"`], [/^(.*) \(copia\)$/, (m) => m[1] + ' (copy)'],
    [/^Visto hace (.*)$/, (m) => 'Seen ' + m[1].replace('min', 'min').replace(' h', ' h').replace('días', 'days') + ' ago'],
    [/^(\d+) \/ 120 publicados · (.*)$/, (m) => `${m[1]} / 120 published · ${m[2].replace('partidas', 'plays')}`],
    [/^(\d+) niveles · (.*)$/, (m) => `${m[1]} levels · ${m[2].replace('partidas', 'plays')}`],
    [/^💾 Nivel guardado \((.*)\)$/, (m) => `💾 Level saved (${m[1]})`],
    [/^¡Vinculado como (.*)!$/, (m) => `Linked as ${m[1]}!`], [/^Sesión iniciada como: (.*)$/, (m) => 'Logged in as: ' + m[1]],
    [/^Exportar "(.*)"$/, (m) => `Export "${m[1]}"`], [/^🔒 Nivel de @(.*)$/, (m) => `🔒 Level by @${m[1]}`], [/^⬇ de @(.*) · solo jugar$/, (m) => `⬇ by @${m[1]} · play only`],
    [/^🦆 Favoritos de @(.*)$/, (m) => `🦆 @${m[1]}'s favorites`], [/^Mundo (\d) · (.*)$/, (m) => `World ${m[1]} · ${m[2]}`],
    [/^(.*) · (Primeros pasos|Bloques y cajas|Plataformas|Tuberías|Muelles|Plataformas móviles|Monedas rojas|Llaves y puertas|Bloques Nota|Raíles|Hielo|Cañones|Rosquillas|Nubes|Bloques A\/B|Los Bros|Interruptor P|Monedas púrpura|Cintas|Agua|Barras Estelares|Palacio "!"|Castillo)$/, (m) => tr(m[1]) + ' · ' + tr(m[2])]
  ];
  const tag = (s) => (s || '').replace(' · meta oculta', ' · hidden goal').replace(' · Medalla', ' · Medal');

  function tr(s) {
    if (lang === 'es' || s == null || typeof s !== 'string') return s;
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    for (const [re, fn] of P) { const m = s.match(re); if (m) return fn(m); }
    return s;
  }
  S.i18n = {
    tr, get lang() { return lang; },
    set(l) { lang = l === 'en' ? 'en' : 'es'; try { localStorage.setItem(KEY, lang); } catch (e) { /* nada */ } document.documentElement.lang = lang; },
    add(dict) { Object.assign(D, dict); }
  };
  S.tr = tr;
  try { document.documentElement.lang = lang; } catch (e) { /* node */ }
})(window.SGM);
