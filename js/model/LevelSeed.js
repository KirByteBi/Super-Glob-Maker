/* Modelo: SEEDS de nivel (con los mismos términos que Glob Defenders).
   - SEED (corta, online): 7 caracteres como en GlD, p. ej. "G3K7Q2X". Primera letra G/K/P/W/B/N/A
     y 6 caracteres 0-9/A-Z sin O ni I. Sale del id del nivel publicado en la nube (no hace falta
     guardarla en el servidor): "Cargar" busca el nivel cuyo id cae en el rango de esa seed.
   - SEED COMPLETA (sin internet): el nivel entero comprimido en texto ("GLOB1." + base64url).
     Sirve para cualquier nivel, publicado o no. "GLOB0." = sin comprimir (navegadores viejos).
   El JSON de antes se sigue aceptando al cargar. */
(function (S) {
  'use strict';
  const FIRST = ['G', 'K', 'P', 'W', 'B', 'N', 'A'];          // como generateSeed() de Glob Defenders
  const DIG = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';          // 34 caracteres (sin O ni I)
  const B34 = 34n ** 6n, N = BigInt(FIRST.length) * B34, TWO64 = 1n << 64n;
  const SHORT_RE = /^[GKPWBNA][0-9A-HJ-NP-Z]{6}$/;

  // ---------------------------------------------------------------- seed corta <-> id de la nube
  // Los primeros 64 bits del uuid se reparten en N seeds por igual (s = u·N / 2^64).
  function fromId(uuid) {
    const hex = String(uuid || '').replace(/-/g, '').slice(0, 16);
    if (!/^[0-9a-f]{16}$/i.test(hex)) return null;
    let s = (BigInt('0x' + hex) * N) >> 64n;
    const first = FIRST[Number(s / B34)]; s %= B34;
    let out = '';
    for (let i = 0; i < 6; i++) { out = DIG[Number(s % 34n)] + out; s /= 34n; }
    return first + out;
  }
  // Rango de ids [lo, hi) que corresponden a una seed (hi = null: hasta el final)
  function idRange(seed) {
    seed = clean(seed); if (!SHORT_RE.test(seed)) return null;
    let s = BigInt(FIRST.indexOf(seed[0])) * B34;
    let r = 0n; for (let i = 1; i < 7; i++) r = r * 34n + BigInt(DIG.indexOf(seed[i]));
    s += r;
    const ceilDiv = (a, b) => (a + b - 1n) / b;
    const lo = ceilDiv(s * TWO64, N), hi = ceilDiv((s + 1n) * TWO64, N);
    const toUuid = (v) => { const h = v.toString(16).padStart(16, '0') + '0000000000000000'; return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); };
    return { lo: toUuid(lo), hi: hi >= TWO64 ? null : toUuid(hi) };
  }
  // Admite "SEED: g3k7-q2x", espacios y guiones
  function clean(str) { return String(str || '').toUpperCase().replace(/^\s*SEED\s*:?\s*/, '').replace(/[\s-]/g, ''); }
  function isShort(str) { return SHORT_RE.test(clean(str)); }

  // ---------------------------------------------------------------- seed completa (nivel entero)
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

  S.Model.Seed = { fromId, idRange, clean, isShort, isFull, pack, unpack };
})(window.SGM);
