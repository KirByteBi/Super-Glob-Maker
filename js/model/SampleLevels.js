/* Modelo: "Modo Historia". Genera un nivel de ejemplo por mapa a partir de una semilla fija. */
(function (S) {
  'use strict';
  const U = S.util;
  const TT = S.Model.Catalog.T;
  const Level = S.Model.Level;

  // Pyces de cada mapa (los primeros mapas usan los más sencillos)
  const POOLS = {
    lake: ['stupid', 'symbol', 'stupid', 'symbol'], city: ['stupid', 'noob', 'guest', 'rebel'],
    seaside: ['stupid', 'umbrella', 'elf', 'pyce2'], ruins: ['zom', 'skelebone', 'ghost', 'so'],
    circus: ['toybomb', 'motions', 'elf', 'bomb'], snow: ['snowcap', 'elf', 'festive', 'stupid'],
    vortex: ['hacker', 'holo', 'crystal', 'pyce2'], underwater: ['pysh', 'clownpysh', 'axolotl', 'squid'],
    jungle: ['stupid', 'flower', 'symbol', 'wingel'], sky: ['wingel', 'umbrella', 'symbol', 'pyce2'],
    volcano: ['crystal', 'bomb', 'knight', 'pyce2'], factory: ['knight', 'noob', 'holo', 'strechy'],
    casino: ['noob', 'motions', 'guest', 'rebel'], clock: ['holo', 'hacker', 'symbol', 'knight'],
    disco: ['elf', 'motions', 'wingel', 'festive'], hub: ['holo', 'ghost', 'crystal', 'noob']
  };
  const AIR = new Set(['ghost', 'hacker', 'pysh', 'clownpysh', 'axolotl', 'squid']);
  const ORDER = ['lake', 'jungle', 'seaside', 'city', 'ruins', 'underwater', 'snow', 'circus', 'disco', 'casino', 'sky', 'clock', 'volcano', 'vortex', 'hub', 'factory'];

  function generate(themeId, index, mode) {
    const rnd = U.rng(U.strSeed(themeId + ':' + (mode || 'peace')));
    const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const W = 150, H = 24;
    const theme = S.Model.Themes.get(themeId);
    const L = new Level({ id: 'story-' + themeId + '-' + (mode || 'peace'), name: S.Model.Themes.name(theme, mode), theme: themeId, mode: mode || 'peace', width: W, height: H, time: 300 });
    const pool = POOLS[themeId] || POOLS.lake;
    const diff = index / ORDER.length; // 0..1
    const water = !!theme.swim;
    const isFactory = themeId === 'factory';
    const groundT = themeId === 'snow' ? TT.GROUND : TT.GROUND;
    const pitT = (themeId === 'volcano' || isFactory || themeId === 'vortex') ? TT.LIQUID : 0;
    let gy = H - 3;
    const col = (x, top, t) => { for (let y = top; y < H; y++) L.set(x, y, t || groundT); };
    const obj = (type, x, y) => { if (L.inBounds(x, y) && !L.objectAt(x, y)) L.objects.push({ type, x, y }); };
    const enemy = (x, y) => { const t = pick(pool); obj(t, x, AIR.has(t) ? y - 2 : y); };

    if (water) for (let x = 0; x < W; x++) { L.set(x, 0, TT.HARD); L.set(x, 1, TT.HARD); }

    // Zona de inicio segura
    for (let x = 0; x < 12; x++) col(x, gy);
    obj('start', 3, gy - 1);
    // Caja inicial con Gota Evo
    L.set(8, gy - 4, TT.BOX); L.contents['8,' + (gy - 4)] = 'evo';
    L.set(7, gy - 4, TT.BRICK); L.set(9, gy - 4, TT.BRICK);

    let x = 12;
    let checkpointDone = false;
    const segs = ['flat', 'gap', 'stairs', 'blocks', 'platforms', 'spikes', 'moving', 'bounce', 'cannon', 'pillars', 'coins', 'special'];
    while (x < W - 22) {
      if (!checkpointDone && x > W / 2 - 6) {
        for (let i = 0; i < 6; i++) col(x + i, gy);
        obj('checkpoint', x + 2, gy - 1); x += 6; checkpointDone = true; continue;
      }
      let s = pick(segs);
      if (water && (s === 'gap' || s === 'moving' || s === 'bounce')) s = pick(['flat', 'coins', 'pillars', 'blocks']);
      if (themeId === 'snow' && s === 'flat') s = 'ice';
      if (themeId === 'sky' && s === 'flat') s = 'clouds';
      if (isFactory && s === 'flat') s = 'conveyor';
      if (s === 'flat') {
        const n = ri(6, 10); for (let i = 0; i < n; i++) col(x + i, gy);
        enemy(x + ri(2, n - 2), gy - 1); if (rnd() < diff) enemy(x + ri(2, n - 2), gy - 1);
        x += n;
      } else if (s === 'ice' || s === 'conveyor') {
        const n = ri(7, 10); for (let i = 0; i < n; i++) { col(x + i, gy + 1); L.set(x + i, gy, s === 'ice' ? TT.ICE : (rnd() < 0.5 ? TT.CONV_L : TT.CONV_R)); }
        if (s === 'conveyor') { const t = rnd() < 0.5 ? TT.CONV_L : TT.CONV_R; for (let i = 0; i < n; i++) L.set(x + i, gy, t); }
        enemy(x + ri(2, n - 2), gy - 1); x += n;
      } else if (s === 'clouds') {
        const n = ri(8, 11); for (let i = 0; i < n; i++) if (i < 2 || i > n - 3) col(x + i, gy);
        for (let i = 2; i < n - 2; i++) L.set(x + i, gy - ri(2, 3), TT.CLOUD);
        for (let i = 3; i < n - 3; i++) L.set(x + i, gy - 5, TT.COIN);
        x += n;
      } else if (s === 'gap') {
        const n = ri(2, 3 + Math.round(diff * 2));
        for (let i = 0; i < n; i++) if (pitT) { L.set(x + i, H - 1, pitT); L.set(x + i, H - 2, pitT); }
        for (let i = 0; i < n; i++) L.set(x + i, gy - 4, TT.COIN);
        x += n;
        for (let i = 0; i < 3; i++) col(x + i, gy); x += 3;
      } else if (s === 'stairs') {
        const h = ri(3, 4);
        for (let i = 0; i < h; i++) { col(x + i, gy - i); for (let y = gy - i; y < gy; y++) L.set(x + i, y, TT.HARD); }
        x += h;
        const top = gy - h + 1;
        for (let i = 0; i < 2; i++) { col(x + i, top); for (let y = top; y < gy; y++) L.set(x + i, y, TT.HARD); }
        x += 2;
        if (rnd() < 0.5) { const n = ri(2, 3); for (let i = 0; i < n; i++) if (pitT) { L.set(x + i, H - 1, pitT); L.set(x + i, H - 2, pitT); } x += n; }
        for (let i = 0; i < h; i++) { col(x + i, top + i); for (let y = top + i; y < gy; y++) L.set(x + i, y, TT.HARD); }
        x += h;
        for (let i = 0; i < 3; i++) col(x + i, gy); x += 3;
      } else if (s === 'blocks') {
        const n = ri(8, 11); for (let i = 0; i < n; i++) col(x + i, gy);
        const by = gy - 4, bx = x + 2, bl = ri(3, 5);
        for (let i = 0; i < bl; i++) {
          const t = rnd() < 0.4 ? TT.BOX : TT.BRICK; L.set(bx + i, by, t);
          if (t === TT.BOX) L.contents[(bx + i) + ',' + by] = rnd() < 0.25 ? pick(['evo', 'caca', 'vacio', 'brillo']) : 'coin';
        }
        if (rnd() < 0.5) { L.set(bx + 1, by - 4, TT.BOX); L.contents[(bx + 1) + ',' + (by - 4)] = rnd() < 0.15 ? 'miniglob' : 'evo'; }
        enemy(x + n - 2, gy - 1);
        x += n;
      } else if (s === 'platforms') {
        const n = ri(9, 12); for (let i = 0; i < n; i++) col(x + i, gy);
        for (let i = 1; i < 5; i++) L.set(x + i, gy - 3, TT.SEMI);
        for (let i = 5; i < 9; i++) L.set(x + i, gy - 6, TT.SEMI);
        for (let i = 6; i < 8; i++) L.set(x + i, gy - 7, TT.COIN);
        enemy(x + 3, gy - 4); enemy(x + ri(5, n - 1), gy - 1);
        x += n;
      } else if (s === 'spikes') {
        const n = ri(7, 9); for (let i = 0; i < n; i++) col(x + i, gy);
        for (let i = 3; i < 3 + ri(1, 2); i++) L.set(x + i, gy - 1, TT.SPIKE);
        L.set(x + 2, gy - 5, TT.SEMI); L.set(x + 3, gy - 5, TT.SEMI); L.set(x + 4, gy - 5, TT.SEMI);
        x += n;
      } else if (s === 'moving') {
        const n = 8;
        for (let i = 0; i < n; i++) if (pitT) { L.set(x + i, H - 1, pitT); L.set(x + i, H - 2, pitT); }
        obj(rnd() < 0.5 ? 'platform' : 'platformV', x + 4, gy - 2);
        for (let i = 2; i < 6; i++) L.set(x + i, gy - 6, TT.COIN);
        x += n;
        for (let i = 0; i < 3; i++) col(x + i, gy); x += 3;
      } else if (s === 'bounce') {
        const n = 9; for (let i = 0; i < n; i++) col(x + i, gy);
        L.set(x + 2, gy - 1, TT.BOUNCE);
        for (let i = 4; i < 8; i++) L.set(x + i, gy - 8, TT.BRICK);
        L.set(x + 5, gy - 8, TT.BOX); L.contents[(x + 5) + ',' + (gy - 8)] = rnd() < 0.5 ? 'miniglob' : 'brillo';
        for (let i = 4; i < 8; i++) L.set(x + i, gy - 10, TT.COIN);
        if (rnd() < 0.5) obj('spring', x + 7, gy - 1);
        x += n;
      } else if (s === 'cannon') {
        const n = 9; for (let i = 0; i < n; i++) col(x + i, gy);
        L.set(x + 5, gy - 1, TT.HARD); obj('cannon', x + 5, gy - 2);
        enemy(x + 2, gy - 1);
        x += n;
      } else if (s === 'pillars') {
        const n = 10; for (let i = 0; i < n; i++) col(x + i, gy);
        [2, 6].forEach((k) => { const h = ri(2, 3); for (let y = gy - h; y < gy; y++) { L.set(x + k, y, TT.HARD); L.set(x + k + 1, y, TT.HARD); } });
        enemy(x + 4, gy - 1);
        if (water) for (let i = 0; i < 4; i++) L.set(x + 3 + i, gy - 6, TT.COIN);
        x += n;
      } else if (s === 'coins') {
        const n = 8; for (let i = 0; i < n; i++) col(x + i, gy);
        for (let i = 1; i < 7; i++) L.set(x + i, gy - 2 - Math.round(Math.sin(i / 6 * Math.PI) * 3), TT.COIN);
        L.set(x + 4, gy - 4, TT.HIDDEN); L.contents[(x + 4) + ',' + (gy - 4)] = 'miniglob';
        x += n;
      } else if (s === 'special') {
        // Variación propia del mapa
        const n = 10; for (let i = 0; i < n; i++) col(x + i, gy);
        if (themeId === 'lake' || themeId === 'jungle') { for (let i = 2; i < 8; i++) L.set(x + i, gy, TT.BOUNCE); }
        else if (themeId === 'ruins' || themeId === 'vortex') { for (let i = 3; i < 7; i++) { L.set(x + i, gy, pitT || TT.LIQUID); L.set(x + i, gy + 1, pitT || TT.LIQUID); } for (let i = 3; i < 7; i++) L.set(x + i, gy - 4, TT.SEMI); }
        else if (water) { for (let y = gy - 8; y < gy - 4; y++) L.set(x + 5, y, TT.SPIKE); obj('shark', x + 8, gy - 5); }
        else { L.set(x + 4, gy - 4, TT.BOX); L.contents[(x + 4) + ',' + (gy - 4)] = pick(['caca', 'vacio']); enemy(x + 7, gy - 1); }
        x += n;
      }
    }
    // Final: escalera, (jefe en la fábrica) y la Medalla
    if (isFactory) {
      for (let i = 0; i < 14 && x + i < W; i++) col(x + i, gy);
      for (let y = gy - 9; y < gy - 7; y++) for (let i = 0; i < 14; i++) L.set(x + i, y, TT.HARD);
      obj('noeye', x + 8, gy - 1);
      L.set(x + 2, gy - 4, TT.BOX); L.contents[(x + 2) + ',' + (gy - 4)] = 'evo';
      x += 14;
    }
    for (; x < W; x++) col(x, gy);
    for (let i = 0; i < 4; i++) for (let y = gy - 1 - i; y < gy; y++) L.set(W - 16 + i, y, TT.HARD);
    obj('goal', W - 8, gy - 1);
    if (water) for (let x2 = 0; x2 < W; x2++) { /* techo ya colocado */ }
    return L;
  }

  S.Model.SampleLevels = {
    ORDER,
    list(mode) { return ORDER.map((id, i) => ({ id, index: i, theme: S.Model.Themes.get(id), mode })); },
    build(themeId, mode) { return generate(themeId, ORDER.indexOf(themeId), mode); }
  };
})(window.SGM);
