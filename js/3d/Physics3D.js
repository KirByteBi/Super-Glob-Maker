/* Modo 3D (Model): física. SOLO mates, sin THREE -> probable en node (tests headless).
   DOS modos: 'flat' (gravedad -Y, colisión contra cajas AABB) y 'sphere' (fase posterior).
   El jugador se modela como una ESFERA de radio r centrada en pos {x,y,z}. */
(function (S) {
  'use strict';
  const G3 = S.G3;
  const M = G3.math;

  const GRAV = -22;        // gravedad (u/s^2) hacia -Y
  const MAX_FALL = -30;    // velocidad de caída máxima

  // Colisión esfera vs caja AABB. Devuelve el vector de penetración mínimo (por eje) o null.
  // box = { x,y,z,w,h,d } (esquina + tamaño). center = {x,y,z}, r = radio.
  function sphereBox(center, r, box) {
    const minx = box.x, miny = box.y, minz = box.z;
    const maxx = box.x + box.w, maxy = box.y + box.h, maxz = box.z + box.d;
    // punto más cercano de la caja al centro
    const cx = M.clamp(center.x, minx, maxx);
    const cy = M.clamp(center.y, miny, maxy);
    const cz = M.clamp(center.z, minz, maxz);
    const dx = center.x - cx, dy = center.y - cy, dz = center.z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) return null; // no toca
    // Si el centro está DENTRO de la caja (d2 ~ 0), empuja por la cara más cercana
    if (d2 < 1e-9) {
      const px = Math.min(center.x - minx, maxx - center.x);
      const py = Math.min(center.y - miny, maxy - center.y);
      const pz = Math.min(center.z - minz, maxz - center.z);
      const m = Math.min(px, py, pz);
      if (m === py) return { axis: 'y', push: (center.y - (miny + box.h / 2) < 0 ? -1 : 1) * (py + r) };
      if (m === px) return { axis: 'x', push: (center.x - (minx + box.w / 2) < 0 ? -1 : 1) * (px + r) };
      return { axis: 'z', push: (center.z - (minz + box.d / 2) < 0 ? -1 : 1) * (pz + r) };
    }
    const dist = Math.sqrt(d2);
    const overlap = r - dist;
    const nx = dx / dist, ny = dy / dist, nz = dz / dist;
    // eje dominante de la normal -> resolvemos por ese eje (estilo plataformas)
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    if (ay >= ax && ay >= az) return { axis: 'y', push: ny * overlap, up: ny > 0 };
    if (ax >= az) return { axis: 'x', push: nx * overlap };
    return { axis: 'z', push: nz * overlap };
  }

  const Physics3D = {
    GRAV, MAX_FALL,
    sphereBox,

    // Avanza un paso de física en modo 'flat'. Muta player.pos / player.vel / player.onGround.
    // player: { pos:{x,y,z}, vel:{x,y,z}, r, onGround }
    // blocks: lista de cajas World3D.boxOf(b)
    stepFlat(player, blocks, dt) {
      const p = player.pos, v = player.vel;
      // gravedad
      v.y += GRAV * dt;
      if (v.y < MAX_FALL) v.y = MAX_FALL;
      // integra
      p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
      // resuelve colisiones (varias pasadas por estabilidad)
      player.onGround = false;
      for (let it = 0; it < 4; it++) {
        let hit = false;
        for (const b of blocks) {
          const res = sphereBox(p, player.r, b);
          if (!res) continue;
          hit = true;
          if (res.axis === 'y') {
            p.y += res.push;
            if (res.push > 0) { player.onGround = true; if (v.y < 0) v.y = 0; }  // tocó suelo
            else if (v.y > 0) v.y = 0;                                           // tocó techo
          } else if (res.axis === 'x') { p.x += res.push; v.x = 0; }
          else { p.z += res.push; v.z = 0; }
        }
        if (!hit) break;
      }
      return player;
    }
  };

  G3.Model.Physics3D = Physics3D;
})(window.SGM);
