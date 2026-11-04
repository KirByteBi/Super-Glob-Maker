/* Modelo: cuenta de Glob Defenders (GlD) via Supabase.
   Se usa la MISMA cuenta que Glob Defenders (no hay cuentas propias de SGM).
   Login: signInWithPassword con <usuario>@accounts.glob-defenders.invalid.
   Las tablas (sgm_links, sgm_levels, sgm_level_likes) y las RPC estan en el
   Supabase de GlD (ver kiro/supabase_setup.sql).
   Carga supabase-js por CDN bajo demanda; si no hay red, todo sigue funcionando
   en local (el juego nunca depende de la nube para jugar/editar). */
(function (S) {
  'use strict';
  const URL = 'https://ptrbixfozzumtzraxtsm.supabase.co';
  // Clave publica "publishable" de GlD. Los datos van protegidos por RLS.
  const ANON_KEY = 'sb_publishable_457I4GFOpe68eulNbWTR2Q_rGE3f-uF';
  const EMAIL_DOMAIN = '@accounts.glob-defenders.invalid';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  // Mismas reglas que el registro de Glob Defenders (Controlador/game.js: getSupabaseAuthEmail,
  // isOffensiveUsername), para que una cuenta creada aquí sea idéntica a una creada en GlD.
  const USER_RE = /^[a-z0-9_.-]{3,24}$/;
  const OFFENSIVE = [
    'dick', 'dig', 'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard',
    'slut', 'whore', 'motherfucker', 'idiot', 'crap', 'damn', 'piss',
    'prick', 'wanker', 'twat', 'dumbass', 'jackass', 'douche', 'douchebag',
    'fuckface', 'fuckwit', 'shithead', 'dipshit', 'bullshit', 'horseshit',
    'arsehole', 'arse', 'tosser', 'bollocks', 'scumbag', 'fucker', 'jerkoff',
    'loser', 'moron', 'stupid', 'cretin', 'imbecile',
    'puta', 'puto', 'mierda', 'cabron', 'joder', 'gilipollas', 'pendejo',
    'maricon', 'imbecil', 'estupido', 'zorra', 'cono', 'jilipollas',
    'cagada', 'cagar', 'cagon', 'culero', 'mamon', 'mamona', 'pinche',
    'chingado', 'chingada', 'chingar', 'carajo', 'mierdero', 'mierdoso',
    'jodido', 'jodete', 'cabrona', 'cabronazo', 'pendeja', 'pendejazo',
    'putisima', 'putazo', 'putero', 'perra', 'marica', 'maricona',
    'capullo', 'retrasado', 'subnormal', 'baboso', 'babosa', 'estupida',
    String.fromCharCode(110, 105, 103, 103, 101, 114)
  ];
  function isOffensive(name) {
    const n = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[013457@$]/g, (c) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' })[c] || c);
    const tokens = n.split(/[^a-z0-9]+/).filter(Boolean), compact = n.replace(/[^a-z0-9]/g, '');
    return tokens.some((tk) => OFFENSIVE.some((w) => (w === 'dig' ? tk === w : tk.includes(w)))) || OFFENSIVE.some((w) => w !== 'dig' && compact.includes(w));
  }

  let client = null, loading = null;
  const emit = (n, d) => S.events.emit('gld:' + n, d || {});

  // Carga supabase-js una sola vez (si falla, devuelve null y seguimos offline)
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (loading) return loading;
    loading = new Promise((res) => {
      const s = document.createElement('script'); s.src = CDN;
      s.onload = () => res(window.supabase || null);
      s.onerror = () => res(null);
      document.head.appendChild(s);
    });
    return loading;
  }

  async function getClient() {
    if (client) return client;
    if (!ANON_KEY) return null; // sin clave configurada: offline
    const lib = await loadLib();
    if (!lib) return null;
    client = lib.createClient(URL, ANON_KEY, { auth: { persistSession: true, storageKey: 'sgm.gld.session' } });
    return client;
  }

  const Gld = {
    configured() { return !!ANON_KEY; },
    // cliente de Supabase (lo usa el multijugador para Realtime); null si no hay red
    client() { return getClient(); },
    // 👑 Coronas de Torneo (kiro/supabase_multiplayer.sql). Sin el SQL: { ok:false, error:'no-mp' }
    async awardCrown(roomSeed) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { data, error } = await c.rpc('sgm_award_crown', { p_room: roomSeed });
      return error ? { ok: false, error: /function|schema cache/i.test(error.message) ? 'no-mp' : error.message } : { ok: true, crowns: data };
    },
    async crowns(username) {
      const c = await getClient(); if (!c || !username) return 0;
      const { data, error } = await c.rpc('sgm_crowns', { p_username: username });
      return error ? 0 : (data | 0);
    },
    // ¿hay sesión guardada?
    async user() {
      const c = await getClient(); if (!c) return null;
      const { data } = await c.auth.getUser(); return data && data.user || null;
    },
    async username() {
      const c = await getClient(); if (!c) return null;
      const { data } = await c.from('sgm_links').select('username').maybeSingle();
      return data && data.username || null;
    },
    // Iniciar sesion con la cuenta de GlD y vincular SGM
    async login(username, password) {
      const c = await getClient();
      if (!c) { return { ok: false, error: 'offline' }; }
      if (!USER_RE.test(String(username).trim().toLowerCase())) return { ok: false, error: 'bad-name' };
      const email = String(username).trim().toLowerCase() + EMAIL_DOMAIN;
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await c.rpc('link_super_glob_maker_account', { p_username: username });
      S.Model.LevelStorage.setLinked(true);
      emit('login', { username }); return { ok: true, username };
    },
    // Verifica una contraseña de una cuenta de GlD SIN tocar la sesion actual (usa un cliente
    // temporal aislado). Se usa para "reclamar" un nivel descargado: demuestra que la cuenta
    // del autor es tuya. Devuelve { ok } o { ok:false, error }.
    async verifyPassword(username, password) {
      const lib = await loadLib(); if (!lib) return { ok: false, error: 'offline' };
      if (!USER_RE.test(String(username).trim().toLowerCase())) return { ok: false, error: 'bad-name' };
      // cliente aparte, sin persistir sesion, para no desloguear al usuario actual
      const tmp = lib.createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sgm.gld.verify' } });
      const email = String(username).trim().toLowerCase() + EMAIL_DOMAIN;
      const { error } = await tmp.auth.signInWithPassword({ email, password });
      try { await tmp.auth.signOut(); } catch (e) { /* nada */ }
      return error ? { ok: false, error: 'bad-pass' } : { ok: true };
    },
    // ¿Nombre válido para una cuenta? null = sí; si no, código de error
    checkUsername(username) {
      const u = String(username || '').trim().toLowerCase();
      if (!USER_RE.test(u)) return 'bad-name';
      if (isOffensive(u)) return 'offensive';
      return null;
    },
    // Crear una cuenta de Glob Defenders desde Super Glob Maker (igual que el registro de GlD:
    // auth.signUp con el correo interno y player_name). Luego se vincula como en login().
    async signup(username, password) {
      const bad = Gld.checkUsername(username); if (bad) return { ok: false, error: bad };
      if (String(password || '').length < 6) return { ok: false, error: 'short-pass' };
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const name = String(username).trim();
      const { data, error } = await c.auth.signUp({ email: name.toLowerCase() + EMAIL_DOMAIN, password, options: { data: { player_name: name } } });
      if (error) return { ok: false, error: /already|registered|exists/i.test(error.message) ? 'exists' : /rate limit/i.test(error.message) ? 'rate' : error.message };
      if (!data || !data.session || !data.user) return { ok: false, error: 'confirm' }; // el proyecto pide confirmar correo
      await c.rpc('link_super_glob_maker_account', { p_username: name });
      S.Model.LevelStorage.setLinked(true);
      emit('login', { username: name, created: true }); return { ok: true, username: name, created: true };
    },
    async logout() {
      const c = await getClient(); if (c) await c.auth.signOut();
      S.Model.LevelStorage.setLinked(false); emit('logout', {});
    },
    // Guardar / publicar / listar niveles en la nube
    async cloudSave(levelJSON, isPublic) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const u = await Gld.user(); if (!u) return { ok: false, error: 'no-session' };
      const row = { user_id: u.id, name: levelJSON.name, data: levelJSON, is_public: !!isPublic, updated_at: new Date().toISOString() };
      const { data, error } = await c.from('sgm_levels').upsert(row).select('id').maybeSingle();
      return error ? { ok: false, error: error.message } : { ok: true, id: data && data.id };
    },
    async myCloudLevels() {
      const c = await getClient(); if (!c) return [];
      const { data } = await c.from('sgm_levels').select('*').order('updated_at', { ascending: false });
      return data || [];
    },
    async publicLevels(sort) {
      const c = await getClient(); if (!c) return [];
      const col = sort === 'plays' ? 'plays' : 'likes';
      const { data } = await c.from('sgm_levels').select('*').eq('is_public', true).order(col, { ascending: false }).limit(50);
      return data || [];
    },
    async play(id, cleared) { const c = await getClient(); if (c) await c.rpc('sgm_level_play', { p_level: id, p_cleared: !!cleared }); },
    async like(id) { const c = await getClient(); if (c) await c.rpc('sgm_level_like', { p_level: id }); },
    async unlike(id) { const c = await getClient(); if (c) await c.rpc('sgm_level_unlike', { p_level: id }); },

    // ======================= ONLINE (menú 🌐) =======================
    // Requiere kiro/supabase_online_v2.sql (dislikes, score, author, votos). Si aún no está
    // aplicado, las listas caen a las columnas antiguas y los votos negativos no se guardan.
    v2: null, // null = sin comprobar; true/false tras la primera consulta

    // id en la nube del nivel local (para volver a publicar sin duplicar)
    cloudIdOf(localId) { try { return (JSON.parse(localStorage.getItem(IDS) || '{}'))[localId] || null; } catch (e) { return null; } },
    setCloudId(localId, cloudId) { try { const m = JSON.parse(localStorage.getItem(IDS) || '{}'); if (cloudId) m[localId] = cloudId; else delete m[localId]; localStorage.setItem(IDS, JSON.stringify(m)); } catch (e) { /* nada */ } },

    // ¿Se puede publicar este nivel local? { ok } o { ok:false, error:'already'|'too-similar', ... }
    //  - Un nivel ya publicado NO se puede volver a publicar (queda marcado con el Glob Cometa).
    //  - Una copia solo se publica si cambia el tema/modo o es bastante distinta del original.
    // Admin (kirbytebi, comprobado por el servidor): sin reglas. Si el nivel ya estaba publicado,
    // se ACTUALIZA su versión online (update = id en la nube) en vez de bloquearlo.
    _admin: false,
    isAdminCached() { return Gld._admin === true; },
    canPublish(levelJSON) {
      if (Gld._admin) return { ok: true, admin: true, update: levelJSON.cloudId || Gld.cloudIdOf(levelJSON.id) || null };
      if (levelJSON.downloaded) return { ok: false, error: 'downloaded', author: levelJSON.downloaded.author };
      if (levelJSON.publishedAt || levelJSON.cloudId || Gld.cloudIdOf(levelJSON.id)) return { ok: false, error: 'already' };
      const chk = S.Model.Level.copyCheck(levelJSON);
      if (!chk.ok) return Object.assign({ error: 'too-similar' }, chk);
      return { ok: true };
    },
    // Publica un nivel local (una sola vez). Devuelve { ok, id, error }
    async publish(levelJSON) {
      const can = Gld.canPublish(levelJSON); if (!can.ok) return can;
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const u = await Gld.user(); if (!u) return { ok: false, error: 'no-session' };
      const Lv = S.Model.Level, data = Lv.content(levelJSON); // sin copyOf ni marcas
      const row = { user_id: u.id, name: String(levelJSON.name || 'Nivel sin nombre').slice(0, 40), data, is_public: true, updated_at: new Date().toISOString(), content_sig: Lv.signature(levelJSON) };
      // admin: actualizar la versión online de un nivel ya publicado (si sigue existiendo)
      if (can.update) {
        const { data: up, error: ue } = await c.from('sgm_levels').update(row).eq('id', can.update).select('id').maybeSingle();
        if (!ue && up && up.id) return { ok: true, id: up.id, updated: true };
        if (ue && !/0 rows|no rows/i.test(ue.message)) return { ok: false, error: /modificar|volver a publicar/i.test(ue.message) ? 'no-bypass' : ue.message };
      }
      let { data: out, error } = await c.from('sgm_levels').insert(row).select('id').maybeSingle();
      if (error && /content_sig/.test(error.message)) { delete row.content_sig; ({ data: out, error } = await c.from('sgm_levels').insert(row).select('id').maybeSingle()); } // sin SQL v2
      if (error && Gld._admin && /PUB_BLOCKED|120|258|duplicate|unique|sgm_levels_sig/i.test(error.message)) return { ok: false, error: 'no-bypass' }; // falta el SQL de admin
      if (error) return { ok: false, error: /PUB_BLOCKED/.test(error.message) ? 'pub-blocked' : /120/.test(error.message) ? 'pub-limit' : /258/.test(error.message) ? 'limit' : /duplicate|unique|sgm_levels_sig/i.test(error.message) ? 'duplicate' : error.message };
      if (out && out.id) Gld.setCloudId(levelJSON.id, out.id);
      return { ok: true, id: out && out.id };
    },
    async setPublic(cloudId, isPublic) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { error } = await c.from('sgm_levels').update({ is_public: !!isPublic, updated_at: new Date().toISOString() }).eq('id', cloudId);
      return error ? { ok: false, error: /120/.test(error.message) ? 'pub-limit' : error.message } : { ok: true };
    },
    async removeCloud(cloudId) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { error } = await c.from('sgm_levels').delete().eq('id', cloudId);
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    // Lista de niveles públicos. q = { sort: 'new'|'top'|'plays'|'hard'|'easy', search, author, limit, offset }
    async browse(q) {
      q = q || {};
      const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] };
      const run = async (v2) => {
        const cols = 'id,name,user_id,plays,clears,likes,created_at,updated_at,theme:data->>theme,mode:data->>mode' + (v2 ? ',author,dislikes,score,published_at' : '');
        let r = c.from('sgm_levels').select(cols).eq('is_public', true);
        if (q.search) r = r.ilike('name', '%' + String(q.search).replace(/[%_\\]/g, '') + '%');
        if (q.author && v2) r = r.eq('author', q.author);
        if (q.userId) r = r.eq('user_id', q.userId);
        if (q.idRange) { r = r.gte('id', q.idRange.lo); if (q.idRange.hi) r = r.lt('id', q.idRange.hi); }
        if (q.sort === 'hard' || q.sort === 'easy') r = r.gte('plays', 5);
        const order = { new: v2 ? 'published_at' : 'updated_at', top: v2 ? 'score' : 'likes', plays: 'plays', hard: 'clears', easy: 'clears' }[q.sort || 'new'];
        r = r.order(order, { ascending: q.sort === 'hard', nullsFirst: false });
        if (q.sort === 'top') r = r.order('plays', { ascending: false });
        const lim = q.limit || 30, off = q.offset || 0;
        return r.range(off, off + lim - 1);
      };
      let res = Gld.v2 === false ? null : await run(true);
      if (!res || res.error) { res = await run(false); Gld.v2 = !res.error ? false : Gld.v2; } else Gld.v2 = true;
      if (res.error) return { ok: false, error: res.error.message, rows: [] };
      let rows = (res.data || []).map(norm);
      // "más difíciles / fáciles" se ordenan por % de superados (no por superados absolutos)
      if (q.sort === 'hard') rows.sort((a, b) => a.rate - b.rate);
      if (q.sort === 'easy') rows.sort((a, b) => b.rate - a.rate);
      return { ok: true, rows, v2: Gld.v2 };
    },
    // Nivel publicado por su código corto (KX47-2B91-R3T8, ver LevelSeed.js). Sin SQL nuevo: el
    // código sale del id del nivel, así que se busca el rango de ids que le corresponde.
    async findBySeed(code) {
      const r = S.Model.LevelCode.idRange(code);
      if (!r) return { ok: false, error: 'seed', rows: [] };
      return Gld.browse({ sort: 'new', idRange: r, limit: 5 });
    },
    // Datos completos de un nivel público (para jugarlo)
    async getLevel(id) {
      const c = await getClient(); if (!c) return null;
      const { data } = await c.from('sgm_levels').select('data').eq('id', id).maybeSingle();
      return data && data.data || null;
    },
    // Mi voto en un nivel: 1, -1 o 0
    async myVote(id) {
      const c = await getClient(); if (!c) return 0;
      const u = await Gld.user(); if (!u) return 0;
      const r = await c.from('sgm_level_votes').select('vote').eq('level_id', id).maybeSingle();
      if (!r.error) return (r.data && r.data.vote) || 0;
      const l = await c.from('sgm_level_likes').select('level_id').eq('level_id', id).maybeSingle(); // sin v2
      return l.data ? 1 : 0;
    },
    // Votar: 1 me gusta, -1 no me gusta, 0 quitar voto
    async vote(id, v) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      if (!(await Gld.user())) return { ok: false, error: 'no-session' };
      let { error } = await c.rpc('sgm_level_vote', { p_level: id, p_vote: v });
      if (error && /function|schema cache/i.test(error.message)) {
        if (v === -1) return { ok: false, error: 'no-v2' };
        ({ error } = await c.rpc(v === 1 ? 'sgm_level_like' : 'sgm_level_unlike', { p_level: id }));
      }
      return error ? { ok: false, error: /propio/.test(error.message) ? 'own' : error.message } : { ok: true };
    },
    // ======================= ONLINE v3 (kiro/supabase_online_v3.sql) =======================
    // Si el SQL v3 no está aplicado, estas funciones devuelven { ok:false, error:'no-v3' } y la UI lo avisa.
    _v3err(e) { return e && /function|schema cache|column|does not exist/i.test(e.message || '') ? 'no-v3' : (e && e.message) || 'error'; },
    async isAdmin() {
      const c = await getClient(); if (!c || !(await Gld.user())) return false;
      const { data, error } = await c.rpc('sgm_is_admin');
      Gld._admin = !error && data === true; // caché para las reglas del cliente (el servidor decide de verdad)
      return Gld._admin;
    },
    async adminDelete(id) { const c = await getClient(); if (!c) return { ok: false, error: 'offline' }; const { error } = await c.rpc('sgm_admin_delete', { p_level: id }); return error ? { ok: false, error: Gld._v3err(error) } : { ok: true }; },
    async adminGod(id, on) { const c = await getClient(); if (!c) return { ok: false, error: 'offline' }; const { error } = await c.rpc('sgm_admin_god', { p_level: id, p_god: !!on }); return error ? { ok: false, error: Gld._v3err(error) } : { ok: true }; },
    // niveles GOD (destacados por el admin)
    async gods() {
      const c = await getClient(); if (!c) return [];
      const { data, error } = await c.from('sgm_levels').select('id,name,user_id,plays,clears,likes,dislikes,score,author,published_at,god,theme:data->>theme,mode:data->>mode').eq('is_public', true).eq('god', true).order('published_at', { ascending: false }).limit(12);
      return error ? [] : (data || []).map(norm);
    },
    // favoritos (máx. 7) de un autor, o los tuyos
    async favorites(author) {
      const c = await getClient(); if (!c) return [];
      let r = c.from('sgm_levels').select('id,name,user_id,plays,clears,likes,dislikes,score,author,published_at,favorite,god,theme:data->>theme,mode:data->>mode').eq('is_public', true).eq('favorite', true);
      if (author) r = r.eq('author', author);
      const { data, error } = await r.limit(7); return error ? [] : (data || []).map(norm);
    },
    async setFavorite(id, on) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { error } = await c.from('sgm_levels').update({ favorite: !!on }).eq('id', id);
      return error ? { ok: false, error: /7/.test(error.message) ? 'fav-limit' : Gld._v3err(error) } : { ok: true };
    },
    // amigos y "en línea"
    async touch() { const c = await getClient(); if (c && (await Gld.user())) await c.rpc('sgm_touch').then(() => {}, () => {}); },
    async friends() { const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] }; const { data, error } = await c.rpc('sgm_friends_list'); return error ? { ok: false, error: Gld._v3err(error), rows: [] } : { ok: true, rows: data || [] }; },
    async addFriend(name) { const c = await getClient(); if (!c) return { ok: false, error: 'offline' }; const { data, error } = await c.rpc('sgm_friend_add', { p_username: name }); return error ? { ok: false, error: Gld._v3err(error) } : data === 'ok' ? { ok: true } : { ok: false, error: data }; },
    async removeFriend(name) { const c = await getClient(); if (!c) return { ok: false, error: 'offline' }; const { error } = await c.rpc('sgm_friend_remove', { p_username: name }); return error ? { ok: false, error: Gld._v3err(error) } : { ok: true }; },
    // Mis niveles en la nube (publicados y no publicados) con sus números
    async mine() {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] };
      const u = await Gld.user(); if (!u) return { ok: false, error: 'no-session', rows: [] };
      let r = await c.from('sgm_levels').select('id,name,is_public,plays,clears,likes,dislikes,score,author,published_at,updated_at,favorite,god,theme:data->>theme,mode:data->>mode,local:data->>id').eq('user_id', u.id).order('updated_at', { ascending: false });
      if (r.error) r = await c.from('sgm_levels').select('id,name,is_public,plays,clears,likes,dislikes,score,author,published_at,updated_at,theme:data->>theme,mode:data->>mode,local:data->>id').eq('user_id', u.id).order('updated_at', { ascending: false });
      if (r.error) r = await c.from('sgm_levels').select('id,name,is_public,plays,clears,likes,updated_at,theme:data->>theme,mode:data->>mode,local:data->>id').eq('user_id', u.id).order('updated_at', { ascending: false });
      return r.error ? { ok: false, error: r.error.message, rows: [] } : { ok: true, rows: (r.data || []).map(norm), userId: u.id };
    },

    // ======================= MODERACIÓN y MENSAJES v4 (kiro/supabase_online_v4.sql) =======================
    // Si el SQL v4 no está aplicado, estas funciones devuelven error 'no-v4' y la UI lo avisa.
    _v4err(e) { return e && /function|schema cache|column|does not exist|relation/i.test(e.message || '') ? 'no-v4' : (e && e.message) || 'error'; },
    // nº de Void Globs (sanciones) de un usuario por nombre (público, para el perfil)
    async warnCount(username) {
      const c = await getClient(); if (!c) return 0;
      const { data, error } = await c.rpc('sgm_warn_count', { p_username: username });
      return error ? 0 : (data | 0);
    },
    // ¿estoy bloqueado para publicar?
    async amIBlocked() {
      const c = await getClient(); if (!c || !(await Gld.user())) return false;
      const { data, error } = await c.rpc('sgm_am_i_blocked'); return !error && data === true;
    },
    // ADMIN: sancionar a un usuario (aviso = 1 Void Glob). Devuelve { ok, blocked } o error.
    async adminWarn(username, reason) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const lang = (S.i18n && S.i18n.lang === 'en') ? 'en' : 'es';
      const { data, error } = await c.rpc('sgm_admin_warn', { p_username: username, p_reason: reason || '', p_lang: lang });
      if (error) return { ok: false, error: Gld._v4err(error) };
      if (data === 'not-found') return { ok: false, error: 'not-found' };
      return { ok: true, blocked: data === 'blocked' };
    },
    // ADMIN: quitar el bloqueo de publicación (desbaneo manual)
    async adminUnblock(username) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { data, error } = await c.rpc('sgm_admin_unblock', { p_username: username });
      if (error) return { ok: false, error: Gld._v4err(error) };
      return data === 'not-found' ? { ok: false, error: 'not-found' } : { ok: true };
    },
    // ADMIN: publicar una noticia global (✉ para todos)
    async adminNews(title, body, category) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const lang = (S.i18n && S.i18n.lang === 'en') ? 'en' : 'es';
      const cat = (category === 'warn' || category === 'event') ? category : 'update';
      const { error } = await c.rpc('sgm_admin_news', { p_title: title, p_body: body, p_lang: lang, p_category: cat });
      return error ? { ok: false, error: Gld._v4err(error) } : { ok: true };
    },
    // ADMIN: disculpas pendientes (apology con respuesta, sin resolver)
    async adminApologies() {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] };
      const { data, error } = await c.rpc('sgm_admin_apologies');
      return error ? { ok: false, error: Gld._v4err(error), rows: [] } : { ok: true, rows: data || [] };
    },
    // mi bandeja de ✉ (noticias globales + mis correos)
    async mailInbox() {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] };
      if (!(await Gld.user())) return { ok: false, error: 'no-session', rows: [] };
      const { data, error } = await c.rpc('sgm_mail_inbox');
      return error ? { ok: false, error: Gld._v4err(error), rows: [] } : { ok: true, rows: data || [] };
    },
    // USUARIO: responder a mi correo rojo de disculpa
    async apologize(mailId, text) {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline' };
      const { data, error } = await c.rpc('sgm_mail_apologize', { p_id: mailId, p_text: text });
      if (error) return { ok: false, error: Gld._v4err(error) };
      return data === 'not-found' ? { ok: false, error: 'not-found' } : { ok: true };
    },
    // avisos míos sin ver (para mostrarlos al conectarse); y marcarlos vistos
    async unseenWarnings() {
      const c = await getClient(); if (!c || !(await Gld.user())) return [];
      const { data, error } = await c.rpc('sgm_my_unseen_warnings');
      return error ? [] : (data || []);
    },
    async markWarningsSeen() { const c = await getClient(); if (c) await c.rpc('sgm_warnings_seen').then(() => {}, () => {}); }
  };
  // fila de la nube -> objeto uniforme para la vista
  function norm(r) {
    const dislikes = r.dislikes || 0, likes = r.likes || 0;
    return Object.assign({}, r, { likes, dislikes, score: r.score != null ? r.score : likes - dislikes, rate: r.plays ? r.clears / r.plays : 0, author: r.author || null, when: r.published_at || r.updated_at || r.created_at });
  }
  const IDS = 'sgm.cloudIds';
  S.Model.Gld = Gld;
})(window.SGM);
