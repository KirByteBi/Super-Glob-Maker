/* Modelo: colisiones AABB contra la rejilla de bloques (con pendientes y bloques A/B) */
(function (S) {
  'use strict';
  const T = S.TILE;
  const C = S.Model.Catalog;

  const solid = (L, t) => C.isSolid(t, L);

  const Physics = {
    solidAt(level, px, py, semi) {
      const t = level.get(Math.floor(px / T), Math.floor(py / T));
      if (C.isSlope(t)) return (py - Math.floor(py / T) * T) >= C.slopeY(t, (px % T) / T, T);
      return solid(level, t) || (!!semi && C.isSemi(t));
    },

    // Altura del suelo de pendiente bajo el punto (px, footY) o null
    slopeFloor(level, px, footY) {
      const tx = Math.floor(px / T);
      for (let ty = Math.floor((footY - T * 0.6) / T); ty <= Math.floor((footY + T * 0.6) / T); ty++) {
        const t = level.get(tx, ty);
        if (!C.isSlope(t)) continue;
        const fx = (px - tx * T) / T;
        return ty * T + C.slopeY(t, Math.min(1, Math.max(0, fx)), T);
      }
      return null;
    },

    // Mueve la entidad resolviendo X y luego Y. opt: pushX, pushY, hidden, dropThrough, noSlopes
    move(e, level, dt, opt) {
      opt = opt || {};
      const res = { wall: 0, landed: false, ceil: [], groundTile: 0, slope: false };
      const wasGround = e.onGround;
      const dx = e.vx * dt + (opt.pushX || 0);
      e.x += dx;
      if (dx !== 0) {
        const top = Math.floor((e.y + 2) / T), bot = Math.floor((e.y + e.h - 2) / T);
        const check = (tx) => {
          for (let ty = top; ty <= bot; ty++) {
            const t = level.get(tx, ty);
            if (solid(level, t)) {
              // la fila del pie puede ser el borde alto de una pendiente: dejar subir
              if (ty === bot && !opt.noSlopes && C.isSlope(level.get(tx - Math.sign(dx), ty))) continue;
              return true;
            }
          }
          return false;
        };
        if (dx > 0) { const tx = Math.floor((e.x + e.w) / T); if (check(tx)) { e.x = tx * T - e.w - 0.001; res.wall = 1; } }
        else { const tx = Math.floor(e.x / T); if (check(tx)) { e.x = (tx + 1) * T + 0.001; res.wall = -1; } }
      }
      const prevTop = e.y, prevBottom = e.y + e.h;
      const dy = e.vy * dt + (opt.pushY || 0);
      e.y += dy;
      e.onGround = false;
      const left = Math.floor((e.x + 1) / T), right = Math.floor((e.x + e.w - 1) / T);
      if (dy > 0) {
        const ty = Math.floor((e.y + e.h) / T);
        for (let tx = left; tx <= right; tx++) {
          const t = level.get(tx, ty);
          if (C.isSlope(t)) continue;
          if (solid(level, t) || (C.isSemi(t) && prevBottom <= ty * T + 0.5 && !opt.dropThrough)) {
            // no aterrizar sobre el bloque que está justo bajo el final de una pendiente
            e.y = ty * T - e.h; e.vy = 0; e.onGround = true; res.landed = true; break;
          }
        }
      } else if (dy < 0) {
        const ty = Math.floor(e.y / T);
        for (let tx = left; tx <= right; tx++) {
          const t = level.get(tx, ty);
          if (solid(level, t) || (opt.hidden && t === C.T.HIDDEN && prevTop >= (ty + 1) * T - 0.5)) res.ceil.push({ x: tx, y: ty, t });
        }
        if (res.ceil.length) { e.y = (ty + 1) * T; e.vy = 0; }
      }
      // Pendientes: el pie central sigue la superficie
      if (!opt.noSlopes && e.vy >= 0) {
        const cx = e.x + e.w / 2;
        const fy = Physics.slopeFloor(level, cx, e.y + e.h);
        if (fy != null) {
          const snap = wasGround ? 14 : 2;
          if (e.y + e.h >= fy - snap && e.y + e.h <= fy + T * 0.6) {
            if (!e.onGround && e.vy > 0) res.landed = true;
            e.y = fy - e.h; e.vy = 0; e.onGround = true; res.slope = true;
          }
        }
      }
      if (e.onGround) {
        const gy = Math.floor((e.y + e.h + 1) / T);
        let g = level.get(Math.floor((e.x + e.w / 2) / T), gy);
        if (!g) g = level.get(left, gy) || level.get(right, gy);
        res.groundTile = g;
        res.groundX = Math.floor((e.x + e.w / 2) / T); res.groundY = gy;
      }
      return res;
    }
  };
  S.Model.Physics = Physics;
})(window.SGM);
