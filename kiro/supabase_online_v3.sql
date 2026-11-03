-- =============================================================
--  Super Glob Maker · ONLINE v3: FAVORITOS, AMIGOS / EN LÍNEA y ADMIN (niveles GOD)
--  Pegar y ejecutar en el SQL Editor del Supabase de Glob Defenders (PRODUCCIÓN),
--  DESPUÉS de supabase_setup.sql y supabase_online_v2.sql. Haz backup antes.
--  Es reaplicable. No borra datos.
--  Admin: la cuenta "kirbytebi" (puede borrar niveles publicados y marcar niveles GOD).
-- =============================================================

-- 1) FAVORITOS (máx. 7 por usuario, los que destacas en tu perfil) ---------------
alter table public.sgm_levels add column if not exists favorite boolean not null default false;
create or replace function public.sgm_levels_fav_limit() returns trigger
language plpgsql as $$
begin
  if new.favorite and (tg_op = 'INSERT' or not old.favorite) then
    if (select count(*) from public.sgm_levels where user_id = new.user_id and favorite and id <> new.id) >= 7 then
      raise exception 'Limite de 7 favoritos alcanzado';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists sgm_levels_fav_limit_trg on public.sgm_levels;
create trigger sgm_levels_fav_limit_trg before insert or update on public.sgm_levels
  for each row execute function public.sgm_levels_fav_limit();

-- 2) ADMIN y niveles GOD ---------------------------------------------------------
alter table public.sgm_levels add column if not exists god boolean not null default false;
create index if not exists sgm_levels_god_idx on public.sgm_levels (god) where god and is_public;

create table if not exists public.sgm_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.sgm_admins enable row level security;
drop policy if exists "sgm_admins_select_own" on public.sgm_admins;
create policy "sgm_admins_select_own" on public.sgm_admins for select using (auth.uid() = user_id);

insert into public.sgm_admins (user_id)
  select id from auth.users where lower(email) = 'kirbytebi@accounts.glob-defenders.invalid'
  on conflict do nothing;

create or replace function public.sgm_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sgm_admins where user_id = auth.uid());
$$;
grant execute on function public.sgm_is_admin() to authenticated;

-- borrar un nivel publicado de cualquiera (moderación)
create or replace function public.sgm_admin_delete(p_level uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  delete from public.sgm_levels where id = p_level;
end; $$;
revoke all on function public.sgm_admin_delete(uuid) from public;
grant execute on function public.sgm_admin_delete(uuid) to authenticated;

-- marcar / desmarcar un nivel como GOD (sale destacado arriba del todo)
create or replace function public.sgm_admin_god(p_level uuid, p_god boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  perform set_config('sgm.counters', 'on', true);
  update public.sgm_levels set god = p_god where id = p_level;
  perform set_config('sgm.counters', 'off', true);
end; $$;
revoke all on function public.sgm_admin_god(uuid, boolean) from public;
grant execute on function public.sgm_admin_god(uuid, boolean) to authenticated;

-- el dueño no puede ponerse GOD a sí mismo (lo conserva el trigger)
create or replace function public.sgm_levels_god_guard() returns trigger
language plpgsql as $$
begin
  if current_setting('sgm.counters', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.god := false; else new.god := old.god; end if;
  end if;
  return new;
end; $$;
drop trigger if exists sgm_levels_god_guard_trg on public.sgm_levels;
create trigger sgm_levels_god_guard_trg before insert or update on public.sgm_levels
  for each row execute function public.sgm_levels_god_guard();

-- 3) AMIGOS y EN LÍNEA --------------------------------------------------------------
alter table public.sgm_links add column if not exists last_seen timestamptz;

create table if not exists public.sgm_friends (
  user_id   uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.sgm_friends enable row level security;
drop policy if exists "sgm_friends_own" on public.sgm_friends;
create policy "sgm_friends_own" on public.sgm_friends for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- "estoy jugando": se llama al abrir el juego y cada pocos minutos
create or replace function public.sgm_touch() returns void
language sql security definer set search_path = public as $$
  update public.sgm_links set last_seen = now() where user_id = auth.uid();
$$;
grant execute on function public.sgm_touch() to authenticated;

-- añadir / quitar amigo por nombre de usuario
create or replace function public.sgm_friend_add(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select user_id into fid from public.sgm_links where lower(username) = lower(trim(p_username));
  if fid is null then return 'not-found'; end if;
  if fid = auth.uid() then return 'self'; end if;
  insert into public.sgm_friends (user_id, friend_id) values (auth.uid(), fid) on conflict do nothing;
  return 'ok';
end; $$;
grant execute on function public.sgm_friend_add(text) to authenticated;

create or replace function public.sgm_friend_remove(p_username text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.sgm_friends f using public.sgm_links l
   where f.user_id = auth.uid() and f.friend_id = l.user_id and lower(l.username) = lower(trim(p_username));
end; $$;
grant execute on function public.sgm_friend_remove(text) to authenticated;

-- mis amigos: nombre, última vez visto y nº de niveles publicados
create or replace function public.sgm_friends_list()
returns table (username text, last_seen timestamptz, levels bigint, follows_me boolean)
language sql stable security definer set search_path = public as $$
  select l.username, l.last_seen,
         (select count(*) from public.sgm_levels v where v.user_id = f.friend_id and v.is_public),
         exists (select 1 from public.sgm_friends b where b.user_id = f.friend_id and b.friend_id = auth.uid())
    from public.sgm_friends f join public.sgm_links l on l.user_id = f.friend_id
   where f.user_id = auth.uid()
   order by l.last_seen desc nulls last;
$$;
grant execute on function public.sgm_friends_list() to authenticated;
