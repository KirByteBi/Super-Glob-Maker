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
    async unlike(id) { const c = await getClient(); if (c) await c.rpc('sgm_level_unlike', { p_level: id }); }
  };
  S.Model.Gld = Gld;
})(window.SGM);
