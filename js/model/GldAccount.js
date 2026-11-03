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
      const email = String(username).trim().toLowerCase() + EMAIL_DOMAIN;
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await c.rpc('link_super_glob_maker_account', { p_username: username });
      S.Model.LevelStorage.setLinked(true);
      emit('login', { username }); return { ok: true, username };
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
    canPublish(levelJSON) {
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
      let { data: out, error } = await c.from('sgm_levels').insert(row).select('id').maybeSingle();
      if (error && /content_sig/.test(error.message)) { delete row.content_sig; ({ data: out, error } = await c.from('sgm_levels').insert(row).select('id').maybeSingle()); } // sin SQL v2
      if (error) return { ok: false, error: /120/.test(error.message) ? 'pub-limit' : /258/.test(error.message) ? 'limit' : /duplicate|unique|sgm_levels_sig/i.test(error.message) ? 'duplicate' : error.message };
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
    // Mis niveles en la nube (publicados y no publicados) con sus números
    async mine() {
      const c = await getClient(); if (!c) return { ok: false, error: 'offline', rows: [] };
      const u = await Gld.user(); if (!u) return { ok: false, error: 'no-session', rows: [] };
      let r = await c.from('sgm_levels').select('id,name,is_public,plays,clears,likes,dislikes,score,author,published_at,updated_at,theme:data->>theme,mode:data->>mode,local:data->>id').eq('user_id', u.id).order('updated_at', { ascending: false });
      if (r.error) r = await c.from('sgm_levels').select('id,name,is_public,plays,clears,likes,updated_at,theme:data->>theme,mode:data->>mode,local:data->>id').eq('user_id', u.id).order('updated_at', { ascending: false });
      return r.error ? { ok: false, error: r.error.message, rows: [] } : { ok: true, rows: (r.data || []).map(norm), userId: u.id };
    }
  };
  // fila de la nube -> objeto uniforme para la vista
  function norm(r) {
    const dislikes = r.dislikes || 0, likes = r.likes || 0;
    return Object.assign({}, r, { likes, dislikes, score: r.score != null ? r.score : likes - dislikes, rate: r.plays ? r.clears / r.plays : 0, author: r.author || null, when: r.published_at || r.updated_at || r.created_at });
  }
  const IDS = 'sgm.cloudIds';
  S.Model.Gld = Gld;
})(window.SGM);
