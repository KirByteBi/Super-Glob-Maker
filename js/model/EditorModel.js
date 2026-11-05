/* Modelo: estado del editor (nivel en edición, herramienta, deshacer/rehacer) */
(function (S) {
  'use strict';
  const C = S.Model.Catalog;
  const Level = S.Model.Level;
  const ITEM_TYPES = new Set(['evo', 'flor', 'caca', 'vacio', 'brillo', 'miniglob']);

  class EditorModel {
    constructor(level) {
      this.base = level || Level.createDefault(); // el nivel completo (con sus subs)
      this.activeZone = 0;                        // zona en edición (0 = base)
      this.level = this.base;                     // la zona que se está editando ahora
      this.linkFrom = null;                        // gizmo origen al enlazar (modo enlazar)
      this.tool = { kind: 'tile', id: C.T.GROUND };
      this.undoStack = []; this.redoStack = [];
      this.stroke = null; this.dirty = false;
      this.camX = 0; this.camY = Math.max(0, this.level.height * S.TILE - S.VIEW_H);
    }
    emit(n, d) { S.events.emit('editor:' + n, Object.assign({ editor: this }, d || {})); }

    // ---------------------------------------------------------------- subzonas
    zoneCount() { return this.base.zoneCount(); }
    // Guarda la zona que se edita de vuelta en base.subs (si es subzona)
    syncZone() {
      if (this.activeZone > 0) this.base.subs[this.activeZone - 1] = Level.normSub(this.level.toJSON());
      else this.base = this.level;
    }
    // Cambia la zona activa (0 = base, 1..2 = subzonas). Crea la subzona si no existe.
    setZone(z) {
      z = Math.max(0, Math.min(this.base.subs.length, z | 0));
      if (z === this.activeZone) return;
      this.syncZone();
      this.activeZone = z;
      if (z === 0) this.level = this.base;
      else { const s = this.base.subs[z - 1]; this.level = new Level(Object.assign({ character: this.base.character }, s)); }
      this.undoStack = []; this.redoStack = [];
      this.camX = 0; this.camY = Math.max(0, this.level.height * S.TILE - S.VIEW_H);
      this.emit('zone');
    }
    addZone() {
      if (this.base.subs.length >= 2) { this.emit('limit', { type: 'subzona' }); return; }
      this.syncZone();
      this.base.subs.push(Level.normSub({ theme: this.base.theme, mode: 'peace', width: 80, height: 24 }));
      this.dirty = true;
      this.setZone(this.base.subs.length);
    }
    removeZone(z) {
      if (z < 1 || z > this.base.subs.length) return;
      this.syncZone();
      this.base.subs.splice(z - 1, 1);
      // quita enlaces manuales que apuntaban a esa zona (en todas las zonas)
      const fix = (objs) => objs.forEach((o) => { if (o.to && o.to.z === z) delete o.to; else if (o.to && o.to.z > z) o.to.z--; });
      fix(this.base.objects); this.base.subs.forEach((s) => fix(s.objects));
      this.dirty = true;
      this.setZone(0);
    }
    // Devuelve el nivel COMPLETO (base con sus subs sincronizadas) para guardar/probar
    full() { this.syncZone(); return this.base; }

    // Al reconstruir la toolbar (p. ej. al cambiar de zona) se re-selecciona la misma
    // herramienta; en ese caso NO borramos el origen del enlace a medio hacer, para poder
    // enlazar cruzando zonas (marcar origen en una zona, destino en otra).
    setTool(t) { if (!(t && t.kind === 'link' && this.tool && this.tool.kind === 'link')) this.linkFrom = null; this.tool = t; this.emit('tool'); }
    setLevel(l) { this.base = l; this.activeZone = 0; this.level = l; this.undoStack = []; this.redoStack = []; this.dirty = false; this.camX = 0; this.camY = Math.max(0, l.height * S.TILE - S.VIEW_H); this.emit('level'); }

    snapshot() { return JSON.stringify(this.level.toJSON()); }
    beginStroke() { this.stroke = this.snapshot(); this.changed = false; this.pipeDrag = null; }
    endStroke() {
      // Clic (sin arrastrar) sobre una tubería del mismo tipo: cambia su color (0-3)
      const pdg = this.pipeDrag; this.pipeDrag = null;
      if (pdg && !pdg.moved && pdg.color) {
        if (pdg.o.to) this.emit('tubeLinked', {}); // enlazada: el color lo manda el enlace
        else { pdg.o.col = ((pdg.o.col | 0) + 1) % 4; this.changed = true; this.emit('tubeColor', { col: pdg.o.col }); }
      }
      if (this.stroke && this.changed) { this.undoStack.push(this.stroke); if (this.undoStack.length > 80) this.undoStack.shift(); this.redoStack = []; this.dirty = true; this.emit('change'); }
      this.stroke = null;
    }
    undo() { if (!this.undoStack.length) return; this.redoStack.push(this.snapshot()); this.restore(this.undoStack.pop()); }
    redo() { if (!this.redoStack.length) return; this.undoStack.push(this.snapshot()); this.restore(this.redoStack.pop()); }
    restore(s) { const l = new Level(JSON.parse(s)); l.id = this.level.id; this.level = l; this.dirty = true; this.emit('change'); }
    // Cambios de propiedades (tema, modo, tamaño...) con deshacer
    mutate(fn) { this.beginStroke(); fn(this.level); this.changed = true; this.endStroke(); }

    // Aplica la herramienta en una casilla. erase=true fuerza borrar (clic derecho)
    apply(x, y, erase) {
      const L = this.level;
      if (!L.inBounds(x, y)) return;
      const tool = erase ? { kind: 'erase' } : this.tool;
      const key = x + ',' + y;
      const tile = L.get(x, y);
      if (tool.kind === 'link') { this.linkObjectAt(x, y); return; }
      if (tool.kind === 'erase') {
        // Semisólido del mapa: borrar en cualquier casilla de su base lo quita
        const plat = !L.objectAt(x, y) && S.Model.Plat.at(L, x, y);
        if (plat) { L.removeObjectAt(plat.x, plat.y); this.changed = true; return; }
        // Tubería: borrar su BOCA la quita entera; borrar el CUERPO la recorta hasta ahí
        const pipe = !L.objectAt(x, y) && S.Model.Pipe.at(L, x, y);
        if (pipe) {
          const n = S.Model.Pipe.reach(pipe, x, y);
          if (S.Model.Pipe.inMouth(pipe, x, y) || n == null) L.removeObjectAt(pipe.x, pipe.y);
          else if (n - 1 > 0) pipe.len = n - 1; else delete pipe.len;
          this.changed = true; return;
        }
        const o = L.objectAt(x, y);
        if (o && o.type !== 'start' && o.type !== 'goal') { L.removeObjectAt(x, y); this.changed = true; return; }
        if (!o && tile) { L.set(x, y, 0); delete L.contents[key]; if (tile === C.T.SEMIBG || tile === C.T.BGFILL) EditorModel.fixSemiBg(L, x, y + 1); this.changed = true; }
        return;
      }
      if (tool.kind === 'tile') {
        // Moneda sobre una caja = caja con moneda
        if (tool.id === C.T.COIN && C.isContainer(tile)) { if (L.contents[key] !== 'coin') { L.contents[key] = 'coin'; this.changed = true; } return; }
        // Moneda + agua CONVIVEN: moneda sobre agua, o agua sobre moneda = WATERCOIN
        if (tool.id === C.T.COIN && (tile === C.T.WATER || tile === C.T.WATERCOIN)) { L.set(x, y, C.T.WATERCOIN); delete L.contents[key]; this.changed = true; return; }
        if (tool.id === C.T.WATER && (tile === C.T.COIN || tile === C.T.WATERCOIN)) { L.set(x, y, C.T.WATERCOIN); delete L.contents[key]; this.changed = true; return; }
        if (tile === tool.id) return;
        // Monedas rojas: set de máximo 8. Al poner la 9a desaparece la más vieja (FIFO).
        if (tool.id === C.T.RCOIN) { this.placeRedCoin(x, y); return; }
        const o = L.objectAt(x, y);
        // El raíl y los fondos van por detrás: se pintan bajo un objeto sin borrarlo
        if (tool.id === C.T.RAIL || tool.id === C.T.CAVEBG) { if (C.isSolid(tile)) return; L.set(x, y, tool.id); delete L.contents[key]; this.changed = true; return; }
        if (tool.id === C.T.SEMIBG) {
          if (tile === C.T.BGFILL) return;
          if (o && (o.type === 'start' || o.type === 'goal')) return;
          L.set(x, y, tool.id); delete L.contents[key]; EditorModel.fixSemiBg(L, x, y); this.changed = true; return;
        }
        if (o && (o.type === 'start' || o.type === 'goal')) return;
        if (o) L.removeObjectAt(x, y);
        L.set(x, y, tool.id);
        if (!C.isContainer(tool.id)) delete L.contents[key];
        this.changed = true;
        return;
      }
      if (tool.kind === 'obj') {
        const type = tool.type;
        // Objeto sobre caja/bloque = contenido de la caja
        if (ITEM_TYPES.has(type) && C.isContainer(tile)) { if (L.contents[key] !== type) { L.contents[key] = type; this.changed = true; this.emit('filled', { x, y, type }); } return; }
        if (type === 'start' || type === 'goal' || type === 'goalhidden') {
          const cur = L.objects.find((o) => o.type === type);
          if (cur && cur.x === x && cur.y === y) return;
          if (L.objectAt(x, y)) return;
          if (cur) { cur.x = x; cur.y = y; } else L.objects.push({ type, x, y });
          if (C.isSolid(tile)) L.set(x, y, 0);
          this.changed = true; return;
        }
        const def = C.OBJECTS[type] || {};
        const P = S.Model.Pipe, PL = S.Model.Plat;
        // Semisólido del mapa (seta / árbol / cadena): arrastrar hacia los lados cambia su ancho
        if (PL.is(type)) {
          if (this.pipeDrag) {
            const pg = this.pipeDrag.o, n = PL.reach(pg, x, y);
            if (n != null && n !== PL.width(pg)) { pg.w = n; this.pipeDrag.moved = true; this.changed = true; }
            return;
          }
          const hit = PL.at(L, x, y);
          if (hit) { this.pipeDrag = { o: hit, moved: false, color: false }; return; }
          if (L.objectAt(x, y) || PL.at(L, x + 1, y) || P.at(L, x, y) || C.isSolid(tile)) return;
          const no = { type, x, y, w: 3 };
          // que no pise otro semisólido del mapa
          while (no.w > 2 && PL.cells(no).some(([cx, cy]) => PL.at(L, cx, cy))) no.w--;
          L.objects.push(no); this.changed = true;
          this.pipeDrag = { o: no, moved: true, color: false }; // si sigues arrastrando, se ensancha
          return;
        }
        if (PL.at(L, x, y)) return; // nada encima de su base (sí delante del tronco)
        // Tuberías estilo SMM: pinchar una tubería y ARRASTRAR a lo largo de su eje la alarga o
        // la acorta. Un clic sin arrastrar (mismo tipo) cambia su color (ver endStroke).
        if (P.isPipe(type)) {
          if (this.pipeDrag) {
            const pg = this.pipeDrag.o, n = P.reach(pg, x, y);
            if (n != null && n !== P.lenOf(pg)) {
              if (n) pg.len = n; else delete pg.len;
              this.pipeDrag.moved = true; this.changed = true; this.emit('pipeLen', { len: n });
            }
            return;
          }
          const hit = P.at(L, x, y);
          if (hit) { this.pipeDrag = { o: hit, moved: false, color: hit.type === type }; return; }
          // tubería nueva: su boca 2×2 no puede pisar otra tubería
          if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dy]) => P.at(L, x + dx, y + dy))) return;
        } else if (P.at(L, x, y)) return; // nada dentro de una tubería
        // Clic de nuevo sobre un objeto con recorrido del mismo tipo: cambia su tamaño (cicla r)
        const existing = L.objectAt(x, y);
        if (existing && existing.type === type && def.range) {
          const steps = [2, 3, 5, 7]; const i = steps.indexOf(existing.r != null ? existing.r : 3);
          existing.r = steps[(i + 1) % steps.length];
          this.changed = true; this.emit('range', { x, y, r: existing.r }); return;
        }
        if (L.objectAt(x, y) || C.isSolid(tile)) return;
        // Monedas Estrella (coleccionables): máximo 3 por nivel y TODAS del mismo tipo
        // Admin (kirbytebi): sin límites de colocación
        const admin = !!(S.Model.Gld && S.Model.Gld._admin);
        if (def.collect && !admin) {
          const others = L.objects.filter((o) => (C.OBJECTS[o.type] || {}).collect);
          if (others.some((o) => o.type !== type)) { this.emit('collectMix', { type }); return; }
          if (others.length >= 3) { this.emit('limit', { type }); return; }
        }
        const limit = admin ? Infinity : def.boss ? 1 : 200;
        if (L.objects.filter((o) => o.type === type).length >= limit) { this.emit('limit', { type }); return; }
        const no = { type, x, y };
        if (def.range) no.r = 3;
        if (type === 'deco' && tool.deco) no.deco = tool.deco; // qué adorno es
        L.objects.push(no);
        this.changed = true;
        // recién puesta: si sigues arrastrando, se alarga (como en SMM)
        if (P.isPipe(type)) this.pipeDrag = { o: no, moved: true, color: false };
      }
    }

    // Coloca una moneda roja manteniendo el set en 8: si ya hay 8, borra la más vieja.
    placeRedCoin(x, y) {
      const L = this.level, key = x + ',' + y;
      if (L.get(x, y) === C.T.RCOIN) return;
      const o = L.objectAt(x, y);
      if (o && (o.type === 'start' || o.type === 'goal')) return;
      if (o) L.removeObjectAt(x, y);
      // reconstruir el orden a partir de los tiles reales, quitando las que ya no existen
      this.redOrder = (this.redOrder || []).filter((k) => { const [px, py] = k.split(',').map(Number); return L.get(px, py) === C.T.RCOIN; });
      L.set(x, y, C.T.RCOIN); delete L.contents[key];
      this.redOrder.push(key);
      while (this.redOrder.length > 8) {
        const old = this.redOrder.shift();
        const [px, py] = old.split(',').map(Number);
        if (L.get(px, py) === C.T.RCOIN) L.set(px, py, 0);
      }
      this.changed = true;
    }

    // Rotar el objeto de una casilla. axis: 'h' (R, izq/der) | 'v' (E, arriba/abajo).
    // Solo si el objeto admite esa rotación. Devuelve true si rotó.
    rotateObjectAt(x, y, axis) {
      const o = this.level.objectAt(x, y) || S.Model.Pipe.at(this.level, x, y);
      if (!o || !C.canRotate(o.type, axis)) return false;
      this.beginStroke();
      // Tuberías (como en SMM): R gira la boca ↑ → ↓ ← (conserva su largo)
      if (S.Model.Pipe.isPipe(o.type)) {
        const pd = (S.Model.Pipe.dirOf(o) + 1) % 4;
        if (pd) o.pd = pd; else delete o.pd;
        if (pd % 2) o.hdir = 1; else delete o.hdir;
      } else if (axis === 'v') o.fv = o.fv ? 0 : 1;
      else o.dir = o.dir === 1 ? -1 : 1;
      this.changed = true; this.endStroke();
      this.emit('rotate', { x, y, axis });
      return true;
    }

    // Modo enlazar tuberías/puertas: 1er clic = origen, 2º clic = destino (puede ser en otra zona).
    // Devuelve 'from' | 'done' | 'bad' | null.
    linkObjectAt(x, y) {
      const famOf = (t) => (t === 'warp' || t === 'lockwarp') ? 'pipe' : (t === 'door' || t === 'lockdoor') ? 'door' : null;
      // una tubería se puede pinchar en cualquier casilla suya (boca o cuerpo)
      const hitPipe = !this.level.objectAt(x, y) && S.Model.Pipe.at(this.level, x, y);
      if (hitPipe) { x = hitPipe.x; y = hitPipe.y; }
      const o = this.level.objectAt(x, y);
      if (!o || !famOf(o.type)) { if (this.linkFrom) { this.linkFrom = null; } this.emit('linkBad', {}); return 'bad'; }
      // 1er clic: marcar origen (zona + coords + familia)
      if (!this.linkFrom) { this.linkFrom = { z: this.activeZone, x, y, fam: famOf(o.type) }; this.emit('linkFrom', { x, y }); return 'from'; }
      // 2º clic: destino, debe ser de la misma familia
      if (famOf(o.type) !== this.linkFrom.fam) { this.emit('linkBad', {}); return 'bad'; }
      const dstZone = this.activeZone;
      const fam = this.linkFrom.fam;
      // índice del destino dentro de su zona (orden de colocación de esa familia)
      const famList = this.level.objects.filter((q) => famOf(q.type) === fam);
      const idx = famList.findIndex((q) => q.x === x && q.y === y);
      const dst = this.level.objectAt(x, y); // el objeto destino (en la zona activa)
      const from = this.linkFrom; this.linkFrom = null;
      if (idx < 0 || !dst) { this.emit('linkBad', {}); return 'bad'; }
      // Escribir el destino en el objeto origen. Si está en la zona activa, directo;
      // si está en otra zona, sincronizar, editar en base.subs y recargar.
      let src;
      if (from.z === dstZone) { src = this.level.objectAt(from.x, from.y); }
      else {
        // El origen está en otra zona: guardar la zona activa, escribir el destino en la zona origen.
        this.syncZone();
        const srcObjs = from.z === 0 ? this.base.objects : (this.base.subs[from.z - 1] || {}).objects || [];
        src = srcObjs.find((q) => q.x === from.x && q.y === from.y);
      }
      if (!src) { this.emit('linkBad', {}); return 'bad'; }
      src.to = { z: dstZone, i: idx };
      // Las tuberías enlazadas comparten color (el del origen); no se cambia por separado
      if (fam === 'pipe') { const col = src.col != null ? src.col : 0; src.col = col; dst.col = col; }
      // Puertas: cada pareja enlazada toma un color propio (las sin enlazar se quedan de madera),
      // así se ve de un vistazo qué puerta lleva a cuál. El destino también vuelve al origen.
      if (fam === 'door') {
        const all = [this.base].concat(this.base.subs || []).reduce((a, z) => a.concat((z.objects || [])), this.level.objects);
        const used = new Set(all.filter((q) => (q.type === 'door' || q.type === 'lockdoor') && q !== src && q !== dst && q.to && q.col).map((q) => q.col));
        let col = src.col && !used.has(src.col) ? src.col : 0;
        for (let k = 1; !col && k <= 6; k++) if (!used.has(k)) col = k;
        src.col = dst.col = col || 1 + Math.floor(Math.random() * 6);
        // ida y vuelta: si el destino no tenía enlace, vuelve a la puerta de origen
        if (!dst.to) {
          const srcList = (from.z === 0 ? this.base.objects : ((this.base.subs[from.z - 1] || {}).objects || (from.z === this.activeZone ? this.level.objects : []))).filter((q) => famOf(q.type) === 'door');
          const si = (from.z === this.activeZone ? this.level.objects.filter((q) => famOf(q.type) === 'door') : srcList).findIndex((q) => q.x === from.x && q.y === from.y);
          if (si >= 0) dst.to = { z: from.z, i: si };
        }
      }
      this.changed = true; this.dirty = true;
      this.emit('linkDone', { z: dstZone, i: idx }); this.emit('change');
      return 'done';
    }

    // Arrastre con la herramienta mano: mover objetos
    moveObject(fx, fy, tx, ty) {
      const L = this.level, o = L.objectAt(fx, fy);
      if (!o || !L.inBounds(tx, ty) || L.objectAt(tx, ty)) return false;
      o.x = tx; o.y = ty; this.changed = true; return true;
    }

    validate() {
      const L = this.full(); // valida sobre la zona base (donde deben estar inicio y meta)
      const errs = [];
      const start = L.objects.find((o) => o.type === 'start');
      const goal = L.objects.find((o) => o.type === 'goal');
      if (!start) errs.push('Falta el punto de inicio.');
      if (!goal) errs.push('Falta la Medalla (meta).');
      // El spawn no debe quedar enterrado en un bloque sólido (no se podría empezar)
      if (start && C.isSolid(L.get(start.x, start.y))) errs.push('El inicio está dentro de un bloque; déjale hueco.');
      // Event Hub: la meta solo se abre con todas las Monedas Estrella -> debe haber al menos una
      const theme = S.Model.Themes.get(L.theme);
      if (theme && theme.effect === 'medalGate' && L.mode === 'corrupt') {
        const stars = L.objects.filter((o) => (C.OBJECTS[o.type] || {}).collect).length;
        if (!stars) errs.push('En Event Hub Corrupto la salida se abre con Monedas Estrella: pon al menos una.');
      }
      // Condición de victoria por monedas: que haya monedas suficientes en el nivel
      if (L.win && L.win.type === 'coins') {
        let coins = 0;
        for (const t of L.tiles) if (t === C.T.COIN || t === C.T.RCOIN || t === C.T.BCOIN || t === C.T.GCOIN || t === C.T.KCOIN) coins++;
        L.objects.forEach((o) => { const v = (C.OBJECTS[o.type] || {}).value; if (v) coins += v; });
        Object.values(L.contents).forEach((c) => { if (c === 'coin') coins++; });
        if (coins < L.win.n) errs.push('La condición pide ' + L.win.n + ' monedas pero el nivel solo tiene ' + coins + '.');
      }
      return errs;
    }
  }

  // Semisólido de fondo: en cada columna, la casilla de ARRIBA es el borde pisable (SEMIBG) y las
  // de debajo, relleno (BGFILL). Se recalcula la columna desde (x, y) hacia abajo.
  EditorModel.fixSemiBg = (L, x, y) => {
    const SB = C.T.SEMIBG, BF = C.T.BGFILL, isBg = (t) => t === SB || t === BF;
    let top = y; while (top > 0 && isBg(L.get(x, top - 1))) top--;
    for (let yy = top; yy < L.height && isBg(L.get(x, yy)); yy++) L.set(x, yy, yy === top ? SB : BF);
  };
  S.Model.EditorModel = EditorModel;
})(window.SGM);
