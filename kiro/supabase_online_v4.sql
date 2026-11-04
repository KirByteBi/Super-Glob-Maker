-- =============================================================
--  Super Glob Maker · ONLINE v4: MODERACIÓN (sanciones / Void Globs),
--  BLOQUEO DE PUBLICACIÓN y MENSAJES (✉ noticias + correo de disculpa)
--  Pegar y ejecutar en el SQL Editor del Supabase de Glob Defenders (PRODUCCIÓN),
--  DESPUÉS de supabase_setup.sql, _online_v2.sql y _online_v3.sql. Backup antes.
--  Es reaplicable (idempotente). No borra datos.
--  Admin: la cuenta "kirbytebi" (ya sembrada en v3 en sgm_admins).
-- =============================================================

-- =============================================================
-- 1) SANCIONES / VOID GLOBS + BLOQUEO DE PUBLICACIÓN
-- =============================================================
-- 0) TABLA sgm_mail (se crea PRIMERO para que las funciones de abajo la usen)
-- =============================================================
create table if not exists public.sgm_mail (
  id         bigint generated always as identity primary key,
  to_user    uuid references auth.users (id) on delete cascade,  -- NULL = noticia global
  kind       text not null default 'news' check (kind in ('news', 'apology')),
  title      text not null,
  body       text not null,
  reply      text,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sgm_mail_to_idx on public.sgm_mail (to_user, created_at desc);
alter table public.sgm_mail add column if not exists lang text not null default 'es';
alter table public.sgm_mail add column if not exists category text not null default 'update';
alter table public.sgm_mail enable row level security;

-- =============================================================
-- 1) SANCIONES / VOID GLOBS + BLOQUEO DE PUBLICACIÓN
-- =============================================================
-- Cada aviso del admin a un usuario = una fila. El total de filas = nº de Void
-- Globs del usuario. A las 15 sanciones, el usuario NO puede publicar niveles.
create table if not exists public.sgm_warnings (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  by_admin   uuid references auth.users (id) on delete set null,
  reason     text not null,
  created_at timestamptz not null default now(),
  seen       boolean not null default false  -- el usuario ya lo vio al conectarse
);
create index if not exists sgm_warnings_user_idx on public.sgm_warnings (user_id);
alter table public.sgm_warnings enable row level security;
-- cada usuario lee SOLO sus avisos; nadie escribe por tabla (solo vía RPC admin)
drop policy if exists "sgm_warnings_select_own" on public.sgm_warnings;
create policy "sgm_warnings_select_own" on public.sgm_warnings for select using (auth.uid() = user_id);

-- Estado de bloqueo de publicación por usuario (lo pone/quita el admin).
-- blocked = true -> el usuario no puede publicar hasta pedir perdón / desbaneo.
alter table public.sgm_links add column if not exists pub_blocked boolean not null default false;
alter table public.sgm_links add column if not exists warn_count  int not null default 0;

-- nº de Void Globs (sanciones) de un usuario por su nombre. Público (para el perfil).
create or replace function public.sgm_warn_count(p_username text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select warn_count from public.sgm_links where lower(username) = lower(trim(p_username))), 0);
$$;
grant execute on function public.sgm_warn_count(text) to authenticated, anon;

-- ¿estoy bloqueado para publicar? (para mi propio estado)
create or replace function public.sgm_am_i_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select pub_blocked from public.sgm_links where user_id = auth.uid()), false);
$$;
grant execute on function public.sgm_am_i_blocked() to authenticated;

-- ADMIN: sancionar a un usuario (manda un aviso = 1 Void Glob). Si llega a 15,
-- queda bloqueado para publicar automáticamente. Crea también un correo rojo de
-- "disculpa" para que el usuario pueda responder (ver sección 2).
create or replace function public.sgm_admin_warn(p_username text, p_reason text, p_lang text default 'es') returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; n int;
begin
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  select user_id into uid from public.sgm_links where lower(username) = lower(trim(p_username));
  if uid is null then return 'not-found'; end if;
  insert into public.sgm_warnings (user_id, by_admin, reason) values (uid, auth.uid(), coalesce(nullif(trim(p_reason), ''), 'Nivel inapropiado.'));
  update public.sgm_links set warn_count = warn_count + 1 where user_id = uid
    returning warn_count into n;
  if n >= 15 then update public.sgm_links set pub_blocked = true where user_id = uid; end if;
  -- correo rojo de disculpa (solo uno activo a la vez)
  insert into public.sgm_mail (to_user, kind, title, body, lang)
    select uid, 'apology', 'Aviso de moderación', coalesce(nullif(trim(p_reason), ''), 'Tu nivel incumplía las normas.'), case when p_lang = 'en' then 'en' else 'es' end
    where not exists (select 1 from public.sgm_mail m where m.to_user = uid and m.kind = 'apology' and m.resolved = false);
  return case when n >= 15 then 'blocked' else 'ok' end;
end; $$;
-- revocar firmas antiguas si existen (ignora el error si no están, p. ej. primera instalación)
do $$ begin
  begin revoke all on function public.sgm_admin_warn(text, text) from public; exception when undefined_function then null; end;
end $$;
revoke all on function public.sgm_admin_warn(text, text, text) from public;
grant execute on function public.sgm_admin_warn(text, text, text) to authenticated;

-- ADMIN: quitar el bloqueo de publicación de un usuario (desbaneo manual).
-- No borra las sanciones (el historial de Void Globs se mantiene), solo desbloquea.
create or replace function public.sgm_admin_unblock(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  select user_id into uid from public.sgm_links where lower(username) = lower(trim(p_username));
  if uid is null then return 'not-found'; end if;
  update public.sgm_links set pub_blocked = false where user_id = uid;
  update public.sgm_mail set resolved = true where to_user = uid and kind = 'apology' and resolved = false;
  return 'ok';
end; $$;
revoke all on function public.sgm_admin_unblock(text) from public;
grant execute on function public.sgm_admin_unblock(text) to authenticated;

-- =============================================================
-- 2) MENSAJES (✉): políticas RLS de sgm_mail (la tabla y columnas ya se crearon arriba)
-- =============================================================
-- kind = 'news'    -> noticia global (to_user NULL = para todos); solo admin escribe.
-- kind = 'apology' -> correo rojo con Void Glob dirigido a un usuario sancionado;
--                     ese usuario PUEDE responder (envía su disculpa al admin).
-- lectura: noticias globales (to_user null) para todos los autenticados, y los
-- correos dirigidos a mí. (El admin usa RPC security definer para ver todo.)
drop policy if exists "sgm_mail_read" on public.sgm_mail;
create policy "sgm_mail_read" on public.sgm_mail for select
  using (to_user is null or to_user = auth.uid());
-- el usuario puede ACTUALIZAR el campo reply de SU correo de disculpa (nada más).
drop policy if exists "sgm_mail_reply_own" on public.sgm_mail;
create policy "sgm_mail_reply_own" on public.sgm_mail for update
  using (to_user = auth.uid() and kind = 'apology')
  with check (to_user = auth.uid() and kind = 'apology');

-- mi bandeja: noticias globales + mis correos, lo más nuevo primero
create or replace function public.sgm_mail_inbox()
returns setof public.sgm_mail
language sql stable security definer set search_path = public as $$
  select * from public.sgm_mail
   where to_user is null or to_user = auth.uid()
   order by created_at desc limit 50;
$$;
grant execute on function public.sgm_mail_inbox() to authenticated;

-- ADMIN: publicar una noticia global (✉ para todos). p_lang = idioma de origen ('es'/'en').
-- p_category = 'update' (estándar), 'warn' (rojo) o 'event' (verde).
create or replace function public.sgm_admin_news(p_title text, p_body text, p_lang text default 'es', p_category text default 'update') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  insert into public.sgm_mail (to_user, kind, title, body, lang, category)
    values (null, 'news', trim(p_title), trim(p_body),
            case when p_lang = 'en' then 'en' else 'es' end,
            case when p_category in ('warn', 'event') then p_category else 'update' end);
end; $$;
-- revocar firmas antiguas si existen (ignora el error si no están, p. ej. primera instalación)
do $$ begin
  begin revoke all on function public.sgm_admin_news(text, text) from public; exception when undefined_function then null; end;
  begin revoke all on function public.sgm_admin_news(text, text, text) from public; exception when undefined_function then null; end;
end $$;
revoke all on function public.sgm_admin_news(text, text, text, text) from public;
grant execute on function public.sgm_admin_news(text, text, text, text) to authenticated;

-- USUARIO: responder a SU correo de disculpa (enviar la disculpa).
create or replace function public.sgm_mail_apologize(p_id bigint, p_text text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  update public.sgm_mail set reply = left(coalesce(trim(p_text), ''), 1000)
   where id = p_id and to_user = auth.uid() and kind = 'apology';
  if not found then return 'not-found'; end if;
  return 'ok';
end; $$;
grant execute on function public.sgm_mail_apologize(bigint, text) to authenticated;

-- ADMIN: ver las disculpas pendientes (correos apology con reply y sin resolver).
create or replace function public.sgm_admin_apologies()
returns table (id bigint, username text, reason text, reply text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, l.username, m.body, m.reply, m.created_at
    from public.sgm_mail m join public.sgm_links l on l.user_id = m.to_user
   where m.kind = 'apology' and m.reply is not null and m.resolved = false
   order by m.created_at desc;
$$;
grant execute on function public.sgm_admin_apologies() to authenticated;

-- marcar mis avisos como vistos (tras mostrárselos al conectarse)
create or replace function public.sgm_warnings_seen() returns void
language sql security definer set search_path = public as $$
  update public.sgm_warnings set seen = true where user_id = auth.uid() and not seen;
$$;
grant execute on function public.sgm_warnings_seen() to authenticated;

-- mis avisos sin ver (para mostrarlos al conectarse por primera vez tras la sanción)
create or replace function public.sgm_my_unseen_warnings()
returns setof public.sgm_warnings
language sql stable security definer set search_path = public as $$
  select * from public.sgm_warnings where user_id = auth.uid() and not seen order by created_at;
$$;
grant execute on function public.sgm_my_unseen_warnings() to authenticated;

-- =============================================================
-- 3) BLOQUEO REAL DE PUBLICACIÓN (a nivel de base de datos)
-- =============================================================
-- Un usuario bloqueado no puede INSERTAR niveles públicos ni volver públicos los
-- privados. Se comprueba en un trigger para que no dependa solo del cliente.
create or replace function public.sgm_levels_block_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_public and coalesce((select pub_blocked from public.sgm_links where user_id = new.user_id), false) then
    raise exception 'PUB_BLOCKED: tu cuenta no puede publicar niveles (sanciones). Pide perdon desde Mensajes.';
  end if;
  return new;
end; $$;
drop trigger if exists sgm_levels_block_guard_trg on public.sgm_levels;
create trigger sgm_levels_block_guard_trg before insert or update of is_public on public.sgm_levels
  for each row execute function public.sgm_levels_block_guard();

-- =============================================================
-- LISTO. Resumen de lo que añade v4:
--  · Tabla sgm_warnings + columnas pub_blocked / warn_count en sgm_links.
--  · RPC: sgm_admin_warn, sgm_admin_unblock, sgm_warn_count, sgm_am_i_blocked,
--         sgm_my_unseen_warnings, sgm_warnings_seen.
--  · Tabla sgm_mail (noticias globales + correo de disculpa) con RLS.
--  · RPC: sgm_mail_inbox, sgm_admin_news, sgm_mail_apologize,
--         sgm_admin_apologies.
--  · Trigger que impide publicar a cuentas bloqueadas (defensa en el servidor).
-- =============================================================
