/* Modelo: comprobación aproximada de que un nivel SE PUEDE SUPERAR (la usa el editor al guardar
   y tools/story_check.js). Recorre las casillas "de pie" alcanzables desde la salida con la física
   del Glob EVO1 (saltos de hasta 4 casillas de alto y 4-6 de largo). Cuentan como suelo: bloques,
   semisólidos, plataformas y raíles (en todo su recorrido), tuberías (y se viaja por las enlazadas),
   muelles (lanzan hacia arriba). Los enemigos NO se tienen en cuenta.
   Es una ayuda: puede haber niveles superables con trucos que no detecta (lo avisa, no lo impide). */
(function (S) {
  'use strict';
  const C = S.Model.Catalog, TT = C.T;

  function reach(L, opt) {
    opt = opt || {};
    const W = L.width, H = L.height, Rail = S.Model.Rail;
    const swim = !!opt.swim;
    L.ex = opt.ex || L.ex || [0, 0, 0];
    const blk = (t) => [TT.BOX, TT.BRICK, TT.NOTE, TT.HIDDEN, TT.DONUT, TT.PSW, TT.SW0, TT.SW1, TT.SW2, TT.SWG, TT.POW].includes(t);
    const ab = (t) => t >= TT.A0 && t <= TT.B2;
    // casillas ocupadas por tuberías enlazables (boca + cuerpo): sólidas como en la partida
    const Pipe = S.Model.Pipe, pipeCell = new Set();
    if (Pipe) L.objects.forEach((o) => { if (Pipe.isPipe(o.type)) Pipe.cells(o).forEach(([x, y]) => pipeCell.add(x + ',' + y)); });
    const solid = (x, y) => { const t = L.get(x, y); return pipeCell.has(x + ',' + y) || C.isSolid(t, L) || C.isSemi(t) || C.isSlope(t) || blk(t) || t === TT.PBLK || t === TT.PCOIN || ab(t); };
    const free = (x, y) => { if (y < 0) return true; if (pipeCell.has(x + ',' + y)) return false; const t = L.get(x, y); return !C.isSolid(t, L) && !blk(t) && t !== TT.LIQUID && t !== TT.SPIKE && !(ab(t) && C.isSolid(t, L)); };
    const extra = new Set();
    L.objects.forEach((o) => {
      if (/^platform|^shroom/.test(o.type)) {
        if (Rail && L.get(o.x, o.y) === TT.RAIL) {
          const seen = new Set([o.x + ',' + o.y]), q = [[o.x, o.y]];
          while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Rail.links(L, x, y)) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
          seen.forEach((k) => { const [x, y] = k.split(',').map(Number); for (let i = -1; i <= 1; i++) extra.add((x + i) + ',' + (y - 1)); });
        } else { const r = o.r != null ? o.r : 3, v = /V$/.test(o.type); for (let s = -r; s <= r; s++) for (let i = -1; i <= 1; i++) extra.add(v ? (o.x + i) + ',' + (o.y + s - 1) : (o.x + s + i) + ',' + (o.y - 1)); }
      }

      if (o.type === 'spring') for (let k = 1; k <= 9; k++) extra.add(o.x + ',' + (o.y - k));
    });
    const stand = (x, y) => x >= 0 && x < W && y >= 0 && y < H - 1 && free(x, y) && free(x, y - 1) && (solid(x, y + 1) || extra.has(x + ',' + y) || (swim && y > 2));
    const warps = L.objects.filter((o) => o.type === 'warp' || o.type === 'lockwarp');
    // casillas desde las que se entra / a las que se sale de una tubería (fuera de su boca)
    const mouthSpots = (o) => {
      const pd = Pipe ? Pipe.dirOf(o) : 0;
      if (pd === 0) return [[o.x, o.y - 1], [o.x + 1, o.y - 1]];
      if (pd === 2) return [[o.x, o.y + 2], [o.x + 1, o.y + 2]];
      if (pd === 3) return [[o.x - 1, o.y + 1]];
      return [[o.x + 2, o.y + 1]];
    };
    // sin enlace manual, cada tubería lleva a la siguiente (como en el juego)
    const dest = (i) => { const w = warps[i]; if (w.to) return w.to.z === 0 ? warps[w.to.i] : null; return warps.length > 1 ? warps[(i + 1) % warps.length] : null; };
    const doors = L.objects.filter((o) => o.type === 'door' || o.type === 'lockdoor');
    const seen = new Set(), q = [];
    const push = (x, y) => { const k = x + ',' + y; if (!seen.has(k) && stand(x, y)) { seen.add(k); q.push([x, y]); } };
    const land = (x, y) => { for (let yy = y; yy < H - 1; yy++) { if (!free(x, yy)) return null; if (stand(x, yy)) return yy; } return null; };
    const st = L.objects.find((o) => o.type === 'start'); if (!st) return seen;
    push(st.x, st.y);
    const UP = swim ? 8 : 4, FAR = swim ? 7 : 6;
    while (q.length) {
      const [x, y] = q.shift();
      // entrar por la boca (según hacia dónde mire) y salir por la boca del destino
      warps.forEach((wp, i) => { if (mouthSpots(wp).some(([mx, my]) => Math.abs(x - mx) <= 1 && Math.abs(y - my) <= 2)) { const d = dest(i); if (d) mouthSpots(d).forEach(([mx, my]) => { push(mx, my); const ly = land(mx, my); if (ly != null) push(mx, ly); }); } });
      doors.forEach((dr, i) => { if (x === dr.x && Math.abs(y - dr.y) <= 1) { const d = doors[dr.to && dr.to.z === 0 ? dr.to.i : (i + 1) % doors.length]; if (d && d !== dr) push(d.x, d.y); } });
      for (let dx = -FAR; dx <= FAR; dx++) for (let up = 0; up <= UP; up++) {
        if (Math.abs(dx) > (up >= 3 && !swim ? 4 : FAR)) continue;
        let ok = true; for (let k = 1; k <= up; k++) if (!free(x, y - k)) ok = false;
        if (!ok) continue;
        const tx = x + dx, ty = y - up; if (tx < 0 || tx >= W) continue;
        if (stand(tx, ty)) push(tx, ty); else { const ly = land(tx, ty); if (ly != null) push(tx, ly); }
      }
    }
    return seen;
  }
  const near = (R, o, r) => { for (let dx = -r; dx <= r; dx++) for (let dy = -3; dy <= 2; dy++) if (R.has((o.x + dx) + ',' + (o.y + dy))) return true; return false; };

  S.Model.LevelCheck = {
    reach, near,
    // { ok, goal, hidden, problems:[texto] }. Solo comprueba la zona base (las subzonas, a ojo).
    check(L) {
      const swim = !!(S.Model.Themes.get(L.theme) || {}).swim;
      const R = reach(L, { swim });
      const problems = [];
      const goal = L.objects.find((o) => o.type === 'goal'), sw = L.objects.find((o) => /^exswitch/.test(o.type)), gh = L.objects.find((o) => o.type === 'goalhidden');
      const hasSubs = L.subs && L.subs.length;
      const goalOk = goal ? near(R, goal, 2) : false, ghOk = gh ? near(R, gh, 2) : true, swOk = sw ? near(R, sw, 2) : false;
      if (!goal && !sw) problems.push('El nivel no tiene Medalla.');
      else if (!goalOk && !swOk && !hasSubs) problems.push('No parece que se pueda llegar a la Medalla desde la salida.');
      if (gh && !ghOk && !hasSubs) problems.push('No parece que se pueda llegar a la meta oculta.');
      return { ok: !problems.length, problems, reach: R.size };
    }
  };
})(window.SGM);
