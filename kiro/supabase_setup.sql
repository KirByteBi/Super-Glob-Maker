-- =============================================================
--  Super Glob Maker x Glob Defenders  — SQL para el SQL Editor
--  Pegar y ejecutar en el Supabase de Glob Defenders (PRODUCCION).
--  Haz backup antes. Todo usa el prefijo sgm_ para no chocar.
-- =============================================================

-- 1) Tabla de vinculo ------------------------------------------
create table if not exists public.sgm_links (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  username  text not null,
  linked_at timestamptz not null default now()
);

alter table public.sgm_links enable row level security;

create policy "sgm_links_select_own" on public.sgm_links
  for select using (auth.uid() = user_id);
create policy "sgm_links_insert_own" on public.sgm_links
  for insert with check (auth.uid() = user_id);
create policy "sgm_links_update_own" on public.sgm_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sgm_links_delete_own" on public.sgm_links
  for delete using (auth.uid() = user_id);

-- 2) Tabla de niveles ------------------------------------------
create table if not exists public.sgm_levels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'Nivel sin nombre',
  data       jsonb not null,
  is_public  boolean not null default false,
  plays      integer not null default 0,
  clears     integer not null default 0,
  likes      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sgm_levels_user_idx   on public.sgm_levels (user_id);
create index if not exists sgm_levels_public_idx on public.sgm_levels (is_public) where is_public;

alter table public.sgm_levels enable row level security;

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

-- Limite de 258 niveles por usuario
create or replace function public.sgm_levels_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.sgm_levels where user_id = new.user_id) >= 258 then
    raise exception 'Limite de 258 niveles alcanzado';
  end if;
  return new;
end; $$;

drop trigger if exists sgm_levels_limit_trg on public.sgm_levels;
create trigger sgm_levels_limit_trg
  before insert on public.sgm_levels
  for each row execute function public.sgm_levels_limit();

-- 3) RPC de vinculo --------------------------------------------
create or replace function public.link_super_glob_maker_account(p_username text)
returns void
language plpgsql security definer set search_path = public
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

-- Contador de partidas / superados en niveles publicos
create or replace function public.sgm_level_play(p_level uuid, p_cleared boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.sgm_levels
    set plays = plays + 1,
        clears = clears + (case when p_cleared then 1 else 0 end)
    where id = p_level and is_public;
end; $$;
grant execute on function public.sgm_level_play(uuid, boolean) to anon, authenticated;

-- 4) "Me gusta" (un like por usuario) --------------------------
create table if not exists public.sgm_level_likes (
  level_id uuid not null references public.sgm_levels (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  primary key (level_id, user_id)
);

alter table public.sgm_level_likes enable row level security;

create policy "sgm_likes_select_own" on public.sgm_level_likes
  for select using (auth.uid() = user_id);
create policy "sgm_likes_insert_own" on public.sgm_level_likes
  for insert with check (auth.uid() = user_id);
create policy "sgm_likes_delete_own" on public.sgm_level_likes
  for delete using (auth.uid() = user_id);

create or replace function public.sgm_level_like(p_level uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  insert into public.sgm_level_likes (level_id, user_id) values (p_level, auth.uid())
    on conflict do nothing;
  update public.sgm_levels set likes = (select count(*) from public.sgm_level_likes where level_id = p_level)
    where id = p_level;
end; $$;
grant execute on function public.sgm_level_like(uuid) to authenticated;

create or replace function public.sgm_level_unlike(p_level uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  delete from public.sgm_level_likes where level_id = p_level and user_id = auth.uid();
  update public.sgm_levels set likes = (select count(*) from public.sgm_level_likes where level_id = p_level)
    where id = p_level;
end; $$;
grant execute on function public.sgm_level_unlike(uuid) to authenticated;
