/* Vista: SEMISÓLIDO DEL MAPA (objeto 'treeplat'), estilo seta de SMM / árbol de SMW.
   Es UN elemento del editor; según el mapa se dibuja de una forma u otra:
     - SETA ........ sombrero redondo + tallo hasta el suelo (Darkness Forest, Circo, Abismo)
     - ÁRBOL ....... copa de hojas + tronco (Lago, Playa = palmera, Navidad = pino, Nubes)
     - PILAR/POSTE . losa sobre columna o farola (Ruinas, Ciudad)
     - CADENA ...... plataforma colgada del techo con cadenas (mapas de INTERIOR: Fábrica, Casino,
                     Reloj, Discoteca, Volcán, Vórtice, Event Hub)
   Solo se pisa la fila de arriba (la copa / el sombrero / la plancha). El tallo, el tronco y las
   cadenas son decoración: llegan solos hasta el primer bloque de abajo (o de arriba). */
(function (S) {
  'use strict';
  const T = S.TILE;
  const Sp = () => S.View.Sprites;

  // kind: shroom | tree | palm | pine | pillar | pole | chain. c = colores (modo Paz)
  const STYLES = {
    lake: { kind: 'tree', name: 'Árbol', c: { cap: '#3fd46a', capDark: '#1f9a45', spot: '#8af0a8', stem: '#9a6440', stemDark: '#6e4529' } },
    city: { kind: 'pole', name: 'Farola con plataforma', c: { cap: '#ffd000', capDark: '#c99a00', spot: '#2b2b33', stem: '#6c7285', stemDark: '#4b4f5c' } },
    seaside: { kind: 'palm', name: 'Palmera', c: { cap: '#3fbf4f', capDark: '#23803a', spot: '#a8f0a0', stem: '#d6a552', stemDark: '#a87a35' } },
    ruins: { kind: 'pillar', name: 'Pilar de piedra', c: { cap: '#e8c48a', capDark: '#b48a4f', spot: '#fff0cc', stem: '#d9b07a', stemDark: '#a6814e' } },
    circus: { kind: 'shroom', name: 'Seta calabaza', c: { cap: '#ff8a00', capDark: '#c25a00', spot: '#ffd27a', stem: '#fff1d6', stemDark: '#d9c39a' } },
    snow: { kind: 'pine', name: 'Pino nevado', c: { cap: '#2f8f5b', capDark: '#1d5e3b', spot: '#ffffff', stem: '#8a5a3a', stemDark: '#5e3c25' } },
    vortex: { kind: 'chain', name: 'Cadenas del vacío', c: { cap: '#6a2fbf', capDark: '#3d1873', spot: '#b58cff', stem: '#b58cff', stemDark: '#5a3a8a' } },
    underwater: { kind: 'shroom', name: 'Seta de coral', c: { cap: '#ff7ab8', capDark: '#c94a86', spot: '#ffd0e6', stem: '#ffb3a1', stemDark: '#d98270' } },
    jungle: { kind: 'shroom', name: 'Seta gigante', c: { cap: '#e8323f', capDark: '#a81f2a', spot: '#ffffff', stem: '#f2e3c4', stemDark: '#c9b48a' } },
    sky: { kind: 'tree', name: 'Árbol de nubes', c: { cap: '#ffffff', capDark: '#bcd8ef', spot: '#ffffff', stem: '#5fd47a', stemDark: '#2f9a4a' } },
    volcano: { kind: 'chain', name: 'Plataforma con cadenas', c: { cap: '#5c4343', capDark: '#2a1d1d', spot: '#ff5a1f', stem: '#8a8f99', stemDark: '#4a4f59' } },
    factory: { kind: 'chain', name: 'Grúa con cables', c: { cap: '#ffd000', capDark: '#1a1a1a', spot: '#1a1a1a', stem: '#9aa3b2', stemDark: '#5f6b7d' } },
    casino: { kind: 'chain', name: 'Lámpara colgante', c: { cap: '#c0282f', capDark: '#7a1218', spot: '#ffd000', stem: '#ffd000', stemDark: '#b08a00' } },
    clock: { kind: 'chain', name: 'Péndulo con cadenas', c: { cap: '#c99a4a', capDark: '#8a6a2a', spot: '#ffd27a', stem: '#b08a4a', stemDark: '#6e5428' } },
    disco: { kind: 'chain', name: 'Plataforma colgante', c: { cap: '#ff2fd6', capDark: '#a0129a', spot: '#00e5ff', stem: '#c9c9d9', stemDark: '#7a7a8a' } },
    hub: { kind: 'chain', name: 'Plataforma de energía', c: { cap: '#1a4a30', capDark: '#0f3020', spot: '#3fffa0', stem: '#3fffa0', stemDark: '#23b870' } }
  };
  function style(theme, mode, pal) {
    const st = STYLES[(theme && theme.id) || 'lake'] || STYLES.lake;
    if (mode !== 'corrupt' || !pal) return st;
    // Corrupto: mismos dibujos con la paleta corrupta del mapa (setas alucinógenas, etc.)
    return { kind: st.kind, name: st.name, c: { cap: pal.top || st.c.cap, capDark: pal.topDark || st.c.capDark, spot: pal.accent || st.c.spot, stem: st.kind === 'chain' ? (pal.accent || st.c.stem) : (pal.ground || st.c.stem), stemDark: pal.groundDark || st.c.stemDark } };
  }
  const width = (o) => S.Model.Plat.width(o);
  const hangs = (theme) => (STYLES[(theme && theme.id) || 'lake'] || STYLES.lake).kind === 'chain';

  // ¿hasta dónde llega el tronco (abajo, hasta el suelo) o la cadena (arriba, hasta el techo)?
  // en casillas. ceil = true si de verdad hay un bloque arriba (si no, la cadena cuelga de un
  // enganche propio a CHAIN_FREE casillas: nunca cuelga "de la nada").
  const CHAIN_FREE = 3;
  function reachDown(L, x, y) { let n = 0; for (let yy = y + 1; yy < L.height && n < 60; yy++, n++) { const t = L.get(x, yy); if (t && S.Model.Catalog.isSolid(t, L)) break; } return n; }
  function reachUp(L, x, y) { for (let yy = y - 1, n = 0; yy >= 0 && n < 12; yy--, n++) { const t = L.get(x, yy); if (t && S.Model.Catalog.isSolid(t, L)) return { n, ceil: true }; } return { n: CHAIN_FREE, ceil: false }; }

  function rr(ctx, x, y, w, h, r) { Sp().rr(ctx, x, y, w, h, r); }
  const fs = (ctx, c, lw) => Sp().fillStroke(ctx, c, lw);

  // ---- partes
  function stalk(ctx, cx, top, h, c, wd) { rr(ctx, cx - wd / 2, top, wd, h, 6); fs(ctx, c.stem, 3.5); ctx.fillStyle = c.stemDark; ctx.fillRect(cx + wd / 2 - 8, top + 4, 4, Math.max(0, h - 8)); }
  function trunk(ctx, cx, top, h, c) {
    rr(ctx, cx - 10, top, 20, h, 4); fs(ctx, c.stem, 3.5);
    ctx.strokeStyle = c.stemDark; ctx.lineWidth = 2;
    for (let y = top + 14; y < top + h - 6; y += 22) { ctx.beginPath(); ctx.moveTo(cx - 6, y); ctx.quadraticCurveTo(cx, y + 4, cx + 6, y); ctx.stroke(); }
    // raíces
    ctx.fillStyle = c.stem; ctx.strokeStyle = Sp().INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 10, top + h); ctx.lineTo(cx - 18, top + h); ctx.lineTo(cx - 10, top + h - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, top + h); ctx.lineTo(cx + 18, top + h); ctx.lineTo(cx + 10, top + h - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function chainLine(ctx, x, y0, y1, c) {
    ctx.lineWidth = 3;
    for (let y = y0; y < y1; y += 10) {
      ctx.beginPath(); ctx.ellipse(x, y + 5, (Math.floor(y / 10) % 2) ? 2.5 : 4.5, 5, 0, 0, 7);
      ctx.fillStyle = c.stem; ctx.fill(); ctx.strokeStyle = Sp().INK; ctx.stroke();
    }
  }

  // Dibujo completo. o = { x, y, w } (x, y = casilla izquierda de la plataforma)
  function draw(ctx, o, L, theme, mode, pal, t) {
    const st = style(theme, mode, pal), c = st.c, w = width(o), px = o.x * T, py = o.y * T, W = w * T, cx = px + W / 2;
    const midX = o.x + Math.floor(w / 2);
    ctx.save(); ctx.lineJoin = 'round';
    if (st.kind === 'chain') {
      // ARRIBA siempre hay algo: el enganche (soporte atornillado al techo, o una viga propia
      // con un gancho si no hay techo) del que salen las cadenas; ABAJO, la base que se pisa.
      const up = reachUp(L, midX, o.y), top = (o.y - up.n) * T;
      const xs = w >= 4 ? [px + T * 0.6, px + W - T * 0.6] : [cx];
      if (!up.ceil) {
        // viga de enganche propia, del ancho de la base (como en los castillos de SMW)
        rr(ctx, px + 4, top - 14, W - 8, 14, 4); fs(ctx, c.stemDark, 3.5);
        ctx.fillStyle = c.stem; ctx.fillRect(px + 9, top - 10, W - 18, 3);
        ctx.fillStyle = Sp().INK; [px + 10, px + W - 10].forEach((x) => { ctx.beginPath(); ctx.arc(x, top - 7, 2.2, 0, 7); ctx.fill(); });
      }
      xs.forEach((x) => {
        // soporte del enganche (placa + anilla)
        rr(ctx, x - 9, top - (up.ceil ? 0 : 2), 18, 7, 2); fs(ctx, c.stemDark, 3);
        ctx.beginPath(); ctx.arc(x, top + 9, 4.5, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = Sp().INK; ctx.stroke();
        chainLine(ctx, x, top + 12, py + 2, c);
      });
      // plancha / viga
      rr(ctx, px, py, W, T * 0.62, 5); fs(ctx, c.cap, 3.5);
      ctx.fillStyle = c.capDark; ctx.fillRect(px + 4, py + T * 0.42, W - 8, 4);
      ctx.fillStyle = c.spot; for (let x = px + 10; x < px + W - 4; x += T) { ctx.beginPath(); ctx.arc(x, py + 9, 2.6, 0, 7); ctx.fill(); }
      if (theme && theme.id === 'casino') { for (let x = px + 12; x < px + W - 6; x += 18) { ctx.fillStyle = (Math.floor(x / 18 + (t || 0) * 4) % 2) ? '#fff6a0' : '#ffd000'; ctx.beginPath(); ctx.arc(x, py + T * 0.62 + 5, 3.5, 0, 7); ctx.fill(); } }
      if (theme && theme.id === 'hub') { ctx.globalAlpha = 0.25 + Math.sin((t || 0) * 4) * 0.1; ctx.fillStyle = c.spot; ctx.fillRect(px, py + T * 0.62, W, 6); ctx.globalAlpha = 1; }
      ctx.restore(); return;
    }
    const down = reachDown(L, midX, o.y), stemTop = py + T * 0.6, stemH = Math.max(T * 0.4, (o.y + 1 + down) * T - stemTop);
    if (st.kind === 'shroom') {
      stalk(ctx, cx, stemTop, stemH, c, Math.min(W * 0.36, 44));
      // sombrero: cúpula ancha
      ctx.beginPath(); ctx.moveTo(px, py + T * 0.72); ctx.quadraticCurveTo(px, py - 2, px + T * 0.6, py); ctx.lineTo(px + W - T * 0.6, py); ctx.quadraticCurveTo(px + W, py - 2, px + W, py + T * 0.72); ctx.closePath(); fs(ctx, c.cap, 3.5);
      ctx.fillStyle = c.capDark; ctx.fillRect(px + 4, py + T * 0.55, W - 8, 4);
      ctx.fillStyle = c.spot; for (let i = 0; i < w; i++) { const sx = px + T * (i + 0.5) + (i % 2 ? 4 : -4); ctx.beginPath(); ctx.ellipse(sx, py + 9 + (i % 2) * 3, 5, 3.5, 0, 0, 7); ctx.fill(); }
    } else if (st.kind === 'tree' || st.kind === 'pine' || st.kind === 'palm') {
      if (st.kind === 'palm') {
        // tronco de palmera algo curvado, por segmentos
        for (let y = stemTop, i = 0; y < stemTop + stemH; y += 14, i++) { const off = Math.sin(i * 0.5) * 4; rr(ctx, cx - 9 + off, y, 18, 15, 5); fs(ctx, i % 2 ? c.stem : c.stemDark, 3); }
      } else trunk(ctx, cx, stemTop, stemH, c);
      if (st.kind === 'palm') {
        // hojas que cuelgan a los lados + franja pisable
        ctx.fillStyle = c.cap;
        [[-1, 0.9], [1, 0.9], [-1, 0.4], [1, 0.4]].forEach(([d, k]) => { ctx.beginPath(); ctx.moveTo(cx, py + 6); ctx.quadraticCurveTo(cx + d * W * 0.5 * k, py - 4, cx + d * (W * 0.5 + 8) * k, py + T * 0.9); ctx.quadraticCurveTo(cx + d * W * 0.3 * k, py + 6, cx, py + 10); ctx.closePath(); fs(ctx, c.cap, 3); });
        rr(ctx, px + 2, py, W - 4, T * 0.4, 6); fs(ctx, c.capDark, 3);
        ctx.fillStyle = '#8a5a2b'; [-8, 8].forEach((d) => { ctx.beginPath(); ctx.arc(cx + d, py + T * 0.5, 5, 0, 7); fs(ctx, '#8a5a2b', 2.5); });
      } else {
        // copa: nube de hojas (bultos), arriba plana para pisarla
        const n = Math.max(2, w);
        for (let i = 0; i < n; i++) { const bx = px + (i + 0.5) * (W / n); ctx.beginPath(); ctx.arc(bx, py + T * 0.42, Math.min(T * 0.62, W / n * 0.75), 0, 7); fs(ctx, c.cap, 3); }
        rr(ctx, px, py, W, T * 0.55, 8); fs(ctx, c.cap, 3.5);
        ctx.fillStyle = c.capDark; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(px + (i + 0.5) * (W / n), py + T * 0.62, 4, 0, 7); ctx.fill(); }
        if (st.kind === 'pine') { rr(ctx, px - 1, py - 3, W + 2, 10, 5); fs(ctx, '#ffffff', 3); ctx.fillStyle = '#d4ebff'; ctx.fillRect(px + 6, py + 3, W - 12, 3); }
        else { ctx.fillStyle = c.spot; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(px + (i + 0.3) * (W / n), py + 8, 3, 0, 7); ctx.fill(); } }
      }
    } else if (st.kind === 'pillar') {
      rr(ctx, cx - 16, stemTop, 32, stemH, 3); fs(ctx, c.stem, 3.5);
      ctx.fillStyle = c.stemDark; for (let x = cx - 10; x <= cx + 8; x += 9) ctx.fillRect(x, stemTop + 4, 3, Math.max(0, stemH - 8));
      rr(ctx, cx - 22, stemTop - 2, 44, 10, 3); fs(ctx, c.capDark, 3);
      rr(ctx, px, py, W, T * 0.55, 4); fs(ctx, c.cap, 3.5);
      ctx.fillStyle = c.spot; ctx.fillRect(px + 6, py + 4, W - 12, 3);
    } else { // pole: farola + plataforma metálica
      rr(ctx, cx - 6, stemTop, 12, stemH, 3); fs(ctx, c.stem, 3.5);
      ctx.fillStyle = c.stemDark; ctx.fillRect(cx + 1, stemTop + 3, 3, Math.max(0, stemH - 6));
      rr(ctx, px, py, W, T * 0.5, 4); fs(ctx, c.cap, 3.5);
      ctx.fillStyle = c.spot; for (let x = px + 6; x < px + W - 10; x += 16) { ctx.beginPath(); ctx.moveTo(x, py + T * 0.5 - 2); ctx.lineTo(x + 8, py + 3); ctx.lineTo(x + 12, py + 3); ctx.lineTo(x + 4, py + T * 0.5 - 2); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  }
  // Icono de la paleta (con el estilo del mapa actual)
  function icon(ctx, size, theme, mode, pal) {
    const fakeL = { width: 3, height: 3, get: (x, y) => (y >= 2 ? S.Model.Catalog.T.GROUND : 0) };
    const st = style(theme, mode, pal);
    ctx.save(); const k = size / (3 * T); ctx.scale(k, k);
    if (st.kind === 'chain') { ctx.translate(0, -T * 0.7); draw(ctx, { x: 0, y: 2, w: 3 }, { width: 3, height: 3, get: (x, y) => (y === 0 ? S.Model.Catalog.T.GROUND : 0) }, theme, mode, pal, 0); }
    else { ctx.translate(0, T * 0.3); draw(ctx, { x: 0, y: 0, w: 3 }, fakeL, theme, mode, pal, 0); }
    ctx.restore();
  }

  S.View.MapPlats = { STYLES, style, draw, icon, width, hangs };
})(window.SGM);
