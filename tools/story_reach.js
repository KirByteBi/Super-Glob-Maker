'use strict';

function reach(S, L, swim, ex) {
  const C = S.Model.Catalog, TT = C.T, W = L.width, H = L.height, Rail = S.Model.Rail;
  L.ex = ex || [0, 0, 0];
  const blk = (t) => [TT.BOX, TT.BRICK, TT.NOTE, TT.HIDDEN, TT.DONUT, TT.PSW, TT.SW0, TT.SW1, TT.SW2, TT.POW].includes(t);
  const solid = (x, y) => { const t = L.get(x, y); return C.isSolid(t, L) || C.isSemi(t) || C.isSlope(t) || blk(t) || t === TT.PBLK || (t >= TT.A0 && t <= TT.B2); };
  const free = (x, y) => { if (y < 0) return true; const t = L.get(x, y); return !C.isSolid(t, L) && !blk(t) && t !== TT.LIQUID && t !== TT.SPIKE && !(t >= TT.A0 && t <= TT.B2 && C.isSolid(t, L)); };
  const extra = new Set();
  L.objects.forEach((o) => {
    if (o.type === 'treeplat') {
      for (let x = o.x; x < o.x + S.Model.Plat.width(o); x++) extra.add(x + ',' + (o.y - 1));
    }
    if (/^platform|^shroom/.test(o.type)) {
      if (L.get(o.x, o.y) === TT.RAIL) {
        const seen = new Set([o.x + ',' + o.y]), q = [[o.x, o.y]];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Rail.links(L, x, y)) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
        seen.forEach((k) => { const [x, y] = k.split(',').map(Number); for (let i = -1; i <= 1; i++) extra.add((x + i) + ',' + (y - 1)); });
      } else { const r = o.r != null ? o.r : 3, v = /V$/.test(o.type); for (let s = -r; s <= r; s++) for (let i = -1; i <= 1; i++) extra.add(v ? (o.x + i) + ',' + (o.y + s - 1) : (o.x + s + i) + ',' + (o.y - 1)); }
    }
    if (o.type === 'warp' || o.type === 'lockwarp') { extra.add(o.x + ',' + (o.y - 1)); extra.add((o.x + 1) + ',' + (o.y - 1)); }
    if (o.type === 'spring') for (let k = 1; k <= 9; k++) extra.add(o.x + ',' + (o.y - k));
  });
  const stand = (x, y) => x >= 0 && x < W && y >= 0 && y < H - 1 && free(x, y) && free(x, y - 1) && (solid(x, y + 1) || extra.has(x + ',' + y) || (swim && y > 2));
  const warps = L.objects.filter((o) => o.type === 'warp' || o.type === 'lockwarp');
  const seen = new Set(), q = [];
  const push = (x, y) => { const k = x + ',' + y; if (!seen.has(k) && stand(x, y)) { seen.add(k); q.push([x, y]); } };
  const land = (x, y) => { for (let yy = y; yy < H - 1; yy++) { if (!free(x, yy)) return null; if (stand(x, yy)) return yy; } return null; };
  const st = L.objects.find((o) => o.type === 'start');
  if (!st) return seen;
  push(st.x, st.y);
  const UP = swim ? 8 : 4, FAR = swim ? 7 : 6;
  while (q.length) {
    const [x, y] = q.shift();
    warps.forEach((wp) => { if (wp.to && (x === wp.x || x === wp.x + 1) && y === wp.y - 1) { const d = warps[wp.to.i]; if (d) { push(d.x, d.y - 1); push(d.x + 1, d.y - 1); } } });
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

function nearSet(R, o, r) {
  for (let dx = -r; dx <= r; dx++) for (let dy = -3; dy <= 2; dy++) if (R.has((o.x + dx) + ',' + (o.y + dy))) return true;
  return false;
}

module.exports = { reach, nearSet };
