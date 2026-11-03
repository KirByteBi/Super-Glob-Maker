-- =============================================================
--  Super Glob Maker · ONLINE v2 (likes + dislikes, puntuación, autor, límites)
--  Pegar y ejecutar en el SQL Editor del Supabase de Glob Defenders (PRODUCCIÓN)
--  DESPUÉS de supabase_setup.sql. Haz backup antes.
--  Es reaplicable (if not exists / or replace). No borra datos: los "me gusta"
--  que ya existían se copian como votos positivos.
-- =============================================================

-- 1) Columnas nuevas en sgm_levels --------------------------------
alter table public.sgm_levels add column if not exists author       text;
alter table public.sgm_levels add column if not exists dislikes     integer not null default 0;
alter table public.sgm_levels add column if not exists published_at timestamptz;
-- primera vez que se publicó (NO se borra nunca): un nivel publicado no se puede volver a publicar
alter table public.sgm_levels add column if not exists first_published_at timestamptz;
-- firma del contenido (la calcula el juego): no se admiten dos niveles publicados idénticos
alter table public.sgm_levels add column if not exists content_sig text;
-- Puntuación = me gusta - no me gusta (la calcula la base de datos, no el cliente)
alter table public.sgm_levels add column if not exists score integer generated always as (likes - dislikes) stored;

create index if not exists sgm_levels_score_idx  on public.sgm_levels (score desc)        where is_public;
create index if not exists sgm_levels_pub_idx    on public.sgm_levels (published_at desc) where is_public;
create index if not exists sgm_levels_author_idx on public.sgm_levels (author)            where is_public;
-- mismo contenido exacto = mismo nivel, aunque lo suba otra cuenta
create unique index if not exists sgm_levels_sig_uq on public.sgm_levels (content_sig) where first_published_at is not null and content_sig is not null;

-- 2) El AUTOR lo pone el servidor (sale de sgm_links), así nadie publica con el nombre de otro.
--    También fija published_at la primera vez que el nivel se hace público.
create or replace function public.sgm_levels_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author := (select username from public.sgm_links where user_id = new.user_id);
  if tg_op = 'UPDATE' then
    new.first_published_at := old.first_published_at; -- no se puede borrar la marca
    if old.first_published_at is not null then
      -- publicado una vez: ni se vuelve a publicar ni se cambia su contenido
      if new.is_public and not old.is_public then raise exception 'Nivel ya publicado: no se puede volver a publicar'; end if;
      if new.data is distinct from old.data or new.name is distinct from old.name or new.content_sig is distinct from old.content_sig then
        raise exception 'Nivel publicado: no se puede modificar (haz una copia)';
      end if;
    end if;
  end if;
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then new.published_at := now(); end if;
  if new.is_public and new.first_published_at is null then new.first_published_at := now(); end if;
  if not new.is_public then new.published_at := null; end if;
  -- los contadores solo los tocan las RPC (security definer), nunca el dueño desde el cliente
  if tg_op = 'UPDATE' and current_setting('sgm.counters', true) is distinct from 'on' then
    new.plays := old.plays; new.clears := old.clears; new.likes := old.likes; new.dislikes := old.dislikes;
  end if;
  if tg_op = 'INSERT' then new.plays := 0; new.clears := 0; new.likes := 0; new.dislikes := 0; end if;
  return new;
end; $$;
drop trigger if exists sgm_levels_stamp_trg on public.sgm_levels;
create trigger sgm_levels_stamp_trg before insert or update on public.sgm_levels
  for each row execute function public.sgm_levels_stamp();

-- 3) Límite de 120 niveles PUBLICADOS por usuario
create or replace function public.sgm_levels_pub_limit() returns trigger
language plpgsql as $$
begin
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    if (select count(*) from public.sgm_levels where user_id = new.user_id and is_public and id <> new.id) >= 120 then
      raise exception 'Limite de 120 niveles publicados alcanzado';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists sgm_levels_pub_limit_trg on public.sgm_levels;
create trigger sgm_levels_pub_limit_trg before insert or update on public.sgm_levels
  for each row execute function public.sgm_levels_pub_limit();

-- 4) Votos (+1 me gusta / -1 no me gusta), uno por usuario y nivel ------------
create table if not exists public.sgm_level_votes (
  level_id uuid not null references public.sgm_levels (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  vote     smallint not null check (vote in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (level_id, user_id)
);
alter table public.sgm_level_votes enable row level security;
drop policy if exists "sgm_votes_select_own" on public.sgm_level_votes;
create policy "sgm_votes_select_own" on public.sgm_level_votes for select using (auth.uid() = user_id);
-- (insert/update/delete solo a través de la RPC sgm_level_vote)

-- copiar los "me gusta" antiguos como votos positivos
insert into public.sgm_level_votes (level_id, user_id, vote)
  select level_id, user_id, 1 from public.sgm_level_likes
  on conflict do nothing;

-- Recuenta likes/dislikes de un nivel
create or replace function public.sgm_level_recount(p_level uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('sgm.counters', 'on', true);
  update public.sgm_levels set
    likes    = (select count(*) from public.sgm_level_votes where level_id = p_level and vote = 1),
    dislikes = (select count(*) from public.sgm_level_votes where level_id = p_level and vote = -1)
  where id = p_level;
  perform set_config('sgm.counters', 'off', true);
end; $$;
revoke all on function public.sgm_level_recount(uuid) from public;

-- Votar: 1 = me gusta, -1 = no me gusta, 0 = quitar el voto. No puedes votar tus niveles.
create or replace function public.sgm_level_vote(p_level uuid, p_vote integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (select 1 from public.sgm_levels where id = p_level and is_public) then raise exception 'Nivel no publicado'; end if;
  if exists (select 1 from public.sgm_levels where id = p_level and user_id = auth.uid()) then raise exception 'No puedes votar tu propio nivel'; end if;
  if p_vote = 0 then
    delete from public.sgm_level_votes where level_id = p_level and user_id = auth.uid();
  elsif p_vote in (-1, 1) then
    insert into public.sgm_level_votes (level_id, user_id, vote) values (p_level, auth.uid(), p_vote)
      on conflict (level_id, user_id) do update set vote = excluded.vote, voted_at = now();
  else raise exception 'Voto no valido'; end if;
  perform public.sgm_level_recount(p_level);
end; $$;
revoke all on function public.sgm_level_vote(uuid, integer) from public;
grant execute on function public.sgm_level_vote(uuid, integer) to authenticated;

-- Las RPC antiguas de "me gusta" pasan a usar los votos (compatibilidad)
create or replace function public.sgm_level_like(p_level uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.sgm_level_vote(p_level, 1); end; $$;
create or replace function public.sgm_level_unlike(p_level uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.sgm_level_vote(p_level, 0); end; $$;

-- Contador de partidas: también debe poder tocar los contadores
create or replace function public.sgm_level_play(p_level uuid, p_cleared boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('sgm.counters', 'on', true);
  update public.sgm_levels
    set plays = plays + 1, clears = clears + (case when p_cleared then 1 else 0 end)
    where id = p_level and is_public;
  perform set_config('sgm.counters', 'off', true);
end; $$;
grant execute on function public.sgm_level_play(uuid, boolean) to anon, authenticated;

-- 5) Rellenar autor y fecha de publicación de los niveles que ya existían
update public.sgm_levels l set author = k.username from public.sgm_links k where k.user_id = l.user_id and l.author is null;
update public.sgm_levels set published_at = coalesce(published_at, updated_at) where is_public;
update public.sgm_levels set first_published_at = coalesce(first_published_at, published_at, updated_at) where is_public;
