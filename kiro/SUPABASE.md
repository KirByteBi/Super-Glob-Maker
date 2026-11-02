# Super Glob Maker × Glob Defenders — Cuenta vinculada (Supabase)

Este documento tiene TODO lo que hay que aplicar en el Supabase de **Glob Defenders (producción)**
para que Super Glob Maker (SGM) use la misma cuenta que Glob Defenders (GlD), guarde niveles en la
nube y permita publicarlos. **Nada de esto se aplica solo: lo revisas y lo ejecutas tú en el panel
de Supabase de GlD.** El código del juego (lado cliente) lo preparo yo aparte; aquí va el backend.

> ⚠️ PRODUCCIÓN. Cada bloque SQL está pensado para pegarse en el **SQL Editor** de Supabase.
> Repasa los nombres (prefijo `sgm_`) para no chocar con tablas existentes de GlD.
> Haz una copia de seguridad antes de ejecutar.

---

## 0. Cómo lo hace Star Jump (referencia)

- Servidor: el Supabase de GlD — `https://ptrbixfozzumtzraxtsm.supabase.co` con la clave pública
  "publishable" (los datos van protegidos por RLS). Librería `supabase-js` por CDN.
- Login: `signInWithPassword` con email `<usuario>@accounts.glob-defenders.invalid` + contraseña.
  La contraseña **nunca** se guarda, solo el token de sesión.
- Vínculo: RPC `link_star_jump_account`. Progreso en la nube: tabla `star_jump_progress`.

SGM replica ese patrón con sus propias tablas `sgm_links` y `sgm_levels` y su RPC
`link_super_glob_maker_account`. Se usa EXACTAMENTE la misma cuenta de GlD (no hay cuentas propias).

---

## 1. Tabla de vínculo: `sgm_links`

Marca qué usuarios de GlD han vinculado SGM (y guarda su nombre de usuario visible).

```sql
create table if not exists public.sgm_links (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  linked_at   timestamptz not null default now()
);

alter table public.sgm_links enable row level security;

-- Cada usuario solo ve / gestiona su propio vínculo
create policy "sgm_links_select_own" on public.sgm_links
  for select using (auth.uid() = user_id);
create policy "sgm_links_insert_own" on public.sgm_links
  for insert with check (auth.uid() = user_id);
create policy "sgm_links_update_own" on public.sgm_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sgm_links_delete_own" on public.sgm_links
  for delete using (auth.uid() = user_id);
```

---

## 2. Tabla de niveles: `sgm_levels`

Un nivel guardado por un usuario. `data` es el JSON del nivel (lo mismo que `Level.toJSON()`).
`is_public` indica si está publicado para que otros lo jueguen y para mostrarlo en el perfil de GlD.

```sql
create table if not exists public.sgm_levels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Nivel sin nombre',
  data        jsonb not null,
  is_public   boolean not null default false,
  plays       integer not null default 0,
  clears      integer not null default 0,
  likes       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sgm_levels_user_idx   on public.sgm_levels (user_id);
create index if not exists sgm_levels_public_idx on public.sgm_levels (is_public) where is_public;

alter table public.sgm_levels enable row level security;

-- El dueño ve/gestiona TODOS sus niveles; cualquiera (incl. anónimos) ve los PÚBLICOS
create policy "sgm_levels_select_own"    on public.sgm_levels
  for select using (auth.uid() = user_id);
create policy "sgm_levels_select_public" on public.sgm_levels
  for select using (is_public = true);
create policy "sgm_levels_insert_own"    on public.sgm_levels
  for insert with check (auth.uid() = user_id);
create policy "sgm_levels_update_own"    on public.sgm_levels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sgm_levels_delete_own"    on public.sgm_levels
  for delete using (auth.uid() = user_id);
```

Límite de 258 niveles por usuario (207 base + 1/4 por vincular). Se puede reforzar en servidor:

```sql
create or replace function public.sgm_levels_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.sgm_levels where user_id = new.user_id) >= 258 then
    raise exception 'Límite de 258 niveles alcanzado';
  end if;
  return new;
end; $$;

create trigger sgm_levels_limit_trg
  before insert on public.sgm_levels
  for each row execute function public.sgm_levels_limit();
```

---

## 3. RPC de vínculo: `link_super_glob_maker_account`

Crea/actualiza el vínculo del usuario autenticado (igual idea que `link_star_jump_account`).

```sql
create or replace function public.link_super_glob_maker_account(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  insert into public.sgm_links (user_id, username)
  values (auth.uid(), p_username)
  on conflict (user_id) do update set username = excluded.username;
end; $$;

revoke all on function public.link_super_glob_maker_account(text) from public;
grant execute on function public.link_super_glob_maker_account(text) to authenticated;
```

### Contadores de partidas/superados/me gusta (seguros, sin tocar RLS)

```sql
-- Sumar una partida / un superado a un nivel público (cualquiera puede llamarla)
create or replace function public.sgm_level_play(p_level uuid, p_cleared boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.sgm_levels
    set plays = plays + 1,
        clears = clears + (case when p_cleared then 1 else 0 end)
    where id = p_level and is_public;
end; $$;
grant execute on function public.sgm_level_play(uuid, boolean) to anon, authenticated;
```

(El "me gusta" conviene hacerlo con una tabla `sgm_level_likes (level_id, user_id)` con PK
compuesta para que cada usuario solo pueda dar un like; lo detallo cuando lleguemos a esa parte.)

---

## 4. Lado del juego (lo preparo yo en el código de SGM)

- Cargar `supabase-js` por CDN y crear el cliente con la URL y la clave publishable de GlD.
- Botón con el iconito de internet (globo) en el menú = iniciar sesión.
- Login: `supabase.auth.signInWithPassword({ email: usuario + '@accounts.glob-defenders.invalid', password })`.
- Tras el login: `supabase.rpc('link_super_glob_maker_account', { p_username: usuario })`.
- Guardar nivel: `insert`/`update` en `sgm_levels` con `data = level.toJSON()`.
- Publicar: `update ... set is_public = true`.
- Listar públicos: `select ... from sgm_levels where is_public` (ordenar por plays/likes).
- Cerrar sesión = desvincular (los niveles locales se quedan en el dispositivo).
- Límite: 207 sin cuenta, 258 con cuenta vinculada (ya está el contador en el cliente).

---

## 5. Lado de la web de Glob Defenders (cambio en el código de GlD, no en SGM)

- El perfil de GlD debe leer `sgm_levels` (del usuario y/o públicos) para mostrar los niveles
  creados en Super Glob Maker. Eso es un cambio en el repo de Glob Defenders, no aquí.

---

## 6. Orden de aplicación (resumen)

1. Backup del proyecto Supabase de GlD.
2. Ejecutar bloque 1 (`sgm_links` + RLS).
3. Ejecutar bloque 2 (`sgm_levels` + RLS + índices + trigger de límite).
4. Ejecutar bloque 3 (RPC `link_super_glob_maker_account` + `sgm_level_play`).
5. Avisarme: entonces conecto el cliente de SGM a estas tablas.
6. (Más adelante) tabla de likes y cambios en la web de GlD.
