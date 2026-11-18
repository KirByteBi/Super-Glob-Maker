/* Modelo: opciones de enlace para los NPC.
   Un enlace es { ev, key, n }: ev = evento, key = 'x,y' de la casilla del objeto, n = número de frase que dice.
   Eventos:
     exit   -> salir de una tubería o puerta
     defeat -> derrotar a un enemigo
     hurt   -> recibir daño de un enemigo
     hit    -> golpear un bloque */
(function (S) {
  'use strict';
  const K = (x, y) => x + ',' + y;
  const BLOCK_NAME = /bloque|ladrillo|caja|block|brick/i;

  // Todo lo que se puede enlazar en el nivel actual
  function options(L) {
    const C = S.Model.Catalog, out = [];
    L.objects.forEach((o) => {
      if (o.type === 'warp' || o.type === 'lockwarp') out.push({ ev: 'exit', key: K(o.x, o.y), label: 'Salir de tubería (' + o.x + ',' + o.y + ')' });
      else if (o.type === 'door' || o.type === 'lockdoor') out.push({ ev: 'exit', key: K(o.x, o.y), label: 'Salir de puerta (' + o.x + ',' + o.y + ')' });
      else if (C.ENEMY_TYPES.indexOf(o.type) !== -1) {
        const name = C.OBJECTS[o.type].name;
        out.push({ ev: 'defeat', key: K(o.x, o.y), label: 'Derrotar a ' + name + ' (' + o.x + ',' + o.y + ')' });
        out.push({ ev: 'hurt', key: K(o.x, o.y), label: 'Recibir daño de ' + name + ' (' + o.x + ',' + o.y + ')' });
      }
    });
    for (let y = 0; y < L.height; y++) for (let x = 0; x < L.width; x++) {
      const t = L.get(x, y);
      if (!t) continue;
      const name = (C.TILE_NAMES && C.TILE_NAMES[t]) || '';
      if (C.isContainer(t) || BLOCK_NAME.test(name)) out.push({ ev: 'hit', key: K(x, y), label: 'Golpear ' + (name || 'bloque') + ' (' + x + ',' + y + ')' });
    }
    return out;
  }

  // Destino de un enlace de NPC en la casilla (x, y), o null si no se puede enlazar ahí.
  // Lo usa la herramienta de enlace: primero clic en el NPC y después en el destino.
  function targetAt(L, x, y) {
    const C = S.Model.Catalog, o = L.objectAt(x, y);
    if (o && (o.type === 'warp' || o.type === 'lockwarp')) return { ev: 'exit', key: K(o.x, o.y), label: 'Salir de tubería (' + o.x + ',' + o.y + ')' };
    if (o && (o.type === 'door' || o.type === 'lockdoor')) return { ev: 'exit', key: K(o.x, o.y), label: 'Salir de puerta (' + o.x + ',' + o.y + ')' };
    if (o && o.type === 'key') return { ev: 'key', key: K(o.x, o.y), label: 'Recoger llave (' + o.x + ',' + o.y + ')' };
    if (o && (['evo', 'flor', 'caca', 'vacio', 'brillo', 'miniglob'].indexOf(o.type) !== -1 || /^cap_/.test(o.type))) return { ev: 'powerup', key: K(o.x, o.y), label: 'Coger powerup (' + o.x + ',' + o.y + ')' };
    if (o && (o.type === 'goal' || o.type === 'goalhidden')) return { ev: o.type, key: K(o.x, o.y), label: (o.type === 'goal' ? 'Tocar meta (' : 'Tocar meta oculta (') + o.x + ',' + o.y + ')' };
    if (o && /^exswitch/.test(o.type)) return { ev: 'exclaim', key: K(o.x, o.y), label: 'Pulsar interruptor ! (' + o.x + ',' + o.y + ')' };
    if (o && C.ENEMY_TYPES.indexOf(o.type) !== -1) return { ev: 'defeat', key: K(o.x, o.y), label: 'Derrotar a ' + C.OBJECTS[o.type].name + ' (' + o.x + ',' + o.y + ')' };
    const t = L.get(x, y);
    if (t && !o) {
      const name = (C.TILE_NAMES && C.TILE_NAMES[t]) || '';
      if (C.isContainer(t) || BLOCK_NAME.test(name)) return { ev: t === C.T.BRICK ? 'brick' : 'hit', key: K(x, y), label: 'Golpear ' + (name || 'bloque') + ' (' + x + ',' + y + ')' };
    }
    return null;
  }

  // Texto legible de un enlace guardado (si el objeto ya no existe, lo indica)
  function label(opts, l) {
    // "cualquier enemigo de tipo X": key = 'type:<tipo>'
    if (String(l.key).indexOf('type:') === 0) {
      const tp = String(l.key).slice(5), def = S.Model.Catalog.OBJECTS[tp] || {};
      return (l.ev === 'hurt' ? 'Recibir daño de cualquier ' : 'Derrotar cualquier ') + (def.name || tp) + (l.o ? ' · una vez' : '');
    }
    const o = opts.find((q) => q.ev === l.ev && q.key === l.key);
    if (o) return o.label + (l.o ? ' · una vez' : '');
    if (l.ev === 'kills') return 'Al derrotar ' + l.key + ' enemigos' + (l.o ? ' · una vez' : '');
    if (l.ev === 'coins') return 'Al juntar ' + l.key + ' monedas' + (l.o ? ' · una vez' : '');
    if (l.ev === 'tkills') { const p = String(l.key).split('|'), def = S.Model.Catalog.OBJECTS[p[1]] || {}; return 'Al derrotar ' + p[0] + ' ' + (def.name || p[1]) + (l.o ? ' · una vez' : ''); }
    if (l.ev === 'powerups') {
      const p = String(l.key).split('|'), tp = p[1] || '*', def = S.Model.Catalog.OBJECTS[tp] || {};
      return 'Al recoger ' + p[0] + ' ' + (tp === '*' ? 'powerups' : (def.name || tp)) + (l.o ? ' · una vez' : '');
    }
    const NAMES = { key: 'Recoger llave', powerup: 'Coger powerup', brick: 'Golpear ladrillo', goal: 'Tocar meta', goalhidden: 'Tocar meta oculta', exclaim: 'Pulsar interruptor !' };
    if (NAMES[l.ev]) return NAMES[l.ev] + ' (' + l.key + ')' + (l.o ? ' · una vez' : '');
    return l.ev + ' en ' + l.key + ' (ya no existe)';
  }

  S.Model.NpcLinks = { options, label, targetAt };
})(window.SGM);
