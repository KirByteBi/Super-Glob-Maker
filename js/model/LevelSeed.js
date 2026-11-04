/* Modelo: CÓDIGOS de nivel (estilo Super Mario Maker). Las SEEDS (estilo Glob Defenders) son
   de las salas del multijugador, no de los niveles.
   - CÓDIGO (corto, online): como SMM, "GGNN-NGNN-GNGN" (G = letra, N = número), p. ej.
     "KX47-2B91-R3T8". Letras sin O ni I (no se confunden con 0 y 1). Sale del id del nivel
     publicado en la nube (no hace falta guardarlo en el servidor): "Cargar" busca el nivel
     cuyo id cae en el rango de ese código.
   - CÓDIGO COMPLETO (sin internet): el nivel entero comprimido en texto ("GLOB1." + base64url).
     Sirve para cualquier nivel, publicado o no. "GLOB0." = sin comprimir (navegadores viejos).
   El JSON de antes se sigue aceptando al cargar. */
(function (S) {
  'use strict';
  const LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ', NUM = '0123456789'; // 24 letras (sin O ni I) y 10 cifras
  const PAT = 'GGNNNGNNGNGN';                                 // GGNN-NGNN-GNGN sin guiones
  const RAD = PAT.split('').map((c) => (c === 'G' ? 24n : 10n));
  const N = RAD.reduce((a, r) => a * r, 1n), TWO64 = 1n << 64n; // 24^5 · 10^7 ≈ 8·10^13 códigos
  const SHORT_RE = /^[A-HJ-NP-Z]{2}[0-9]{3}[A-HJ-NP-Z][0-9]{2}[A-HJ-NP-Z][0-9][A-HJ-NP-Z][0-9]$/;
  const dash = (s) => s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);

  // ---------------------------------------------------------------- código corto <-> id de la nube
  // Los primeros 64 bits del uuid se reparten en N códigos por igual (s = u·N / 2^64).
  function fromId(uuid) {
    const hex = String(uuid || '').replace(/-/g, '').slice(0, 16);
    if (!/^[0-9a-f]{16}$/i.test(hex)) return null;
    let s = (BigInt('0x' + hex) * N) >> 64n, out = '';
    for (let i = PAT.length - 1; i >= 0; i--) { const d = Number(s % RAD[i]); s /= RAD[i]; out = (PAT[i] === 'G' ? LET[d] : NUM[d]) + out; }
    return dash(out);
  }
  // Rango de ids [lo, hi) que corresponden a un código (hi = null: hasta el final)
  function idRange(code) {
    code = clean(code); if (!SHORT_RE.test(code)) return null;
    let s = 0n;
    for (let i = 0; i < PAT.length; i++) s = s * RAD[i] + BigInt((PAT[i] === 'G' ? LET : NUM).indexOf(code[i]));
    const ceilDiv = (a, b) => (a + b - 1n) / b;
    const lo = ceilDiv(s * TWO64, N), hi = ceilDiv((s + 1n) * TWO64, N);
    const toUuid = (v) => { const h = v.toString(16).padStart(16, '0') + '0000000000000000'; return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); };
    return { lo: toUuid(lo), hi: hi >= TWO64 ? null : toUuid(hi) };
  }
  // Admite "CÓDIGO: kx47 2b91 r3t8", "ID:", espacios y guiones
  function clean(str) { return String(str || '').toUpperCase().replace(/^\s*(C[OÓ]DIGO|CODE|ID)\s*:?\s*/, '').replace(/[\s-]/g, ''); }
  const pretty = (str) => { const c = clean(str); return SHORT_RE.test(c) ? dash(c) : c; };
  function isShort(str) { return SHORT_RE.test(clean(str)); }

  // ---------------------------------------------------------------- código completo (nivel entero)
  const b64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64url = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
  const canZip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate'))).arrayBuffer()); }

  async function pack(levelData) {
    const bytes = new TextEncoder().encode(JSON.stringify(levelData));
    if (canZip()) { try { return 'GLOB1.' + b64url(await pipe(bytes, CompressionStream)); } catch (e) { /* sin compresión */ } }
    return 'GLOB0.' + b64url(bytes);
  }
  // Texto pegado -> datos del nivel. Acepta seed completa (GLOB1./GLOB0.) o el JSON antiguo.
  async function unpack(str) {
    const t = String(str || '').trim().replace(/\s+/g, '');
    let json;
    if (/^GLOB1\./i.test(t)) { if (!canZip()) throw new Error('zip'); json = new TextDecoder().decode(await pipe(unb64url(t.slice(6)), DecompressionStream)); }
    else if (/^GLOB0\./i.test(t)) json = new TextDecoder().decode(unb64url(t.slice(6)));
    else json = String(str).trim();
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object' || !d.tiles) throw new Error('formato');
    return d;
  }
  const isFull = (str) => /^\s*(GLOB[01]\.|\{)/i.test(String(str || ''));

  S.Model.LevelCode = { fromId, idRange, clean, pretty, isShort, isFull, pack, unpack };
  S.Model.Seed = S.Model.LevelCode; // nombre antiguo
})(window.SGM);
