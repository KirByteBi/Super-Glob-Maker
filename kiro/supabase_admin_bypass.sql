-- Super Glob Maker · ADMIN sin límites al publicar (ejecutar en Supabase > SQL Editor, después de v2, v3 y v4).
-- Las cuentas de public.sgm_admins (kirbytebi) se saltan TODAS las reglas de publicación:
--   · límite de 258 niveles en la nube y de 120 publicados
--   · "publicado una vez": pueden volver a publicar y CAMBIAR la versión online de sus niveles
--   · copia idéntica / content_sig repetido
--   · límite de 7 favoritos
--   · bloqueo por sanciones (pub_blocked)
-- Para el resto de jugadores todo sigue igual. Se mira al DUEÑO de la fila (new.user_id),
-- así que solo vale para los niveles de la propia cuenta admin. Se puede ejecutar varias veces.

create or replace function public.sgm_user_is_admin(p_user uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.sgm_admins where user_id = p_user)
      or exists (select 1 from auth.users where id = p_user and lower(email) = 'kirbytebi@accounts.glob-defenders.invalid');
$$;
revoke all on function public.sgm_user_is_admin(uuid) from public;

-- 258 niveles en la nube
create or replace function public.sgm_levels_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.sgm_user_is_admin(new.user_id) then return new; end if;
  if (select count(*) from public.sgm_levels where user_id = new.user_id) >= 258 then
    raise exception 'Limite de 258 niveles alcanzado';
  end if;
  return new;
end; $$;

-- autor, fechas, "publicado una vez" y contadores (igual que v2, con excepción de admin)
create or replace function public.sgm_levels_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare adm boolean := public.sgm_user_is_admin(new.user_id);
begin
  new.author := (select username from public.sgm_links where user_id = new.user_id);
  -- admin: su firma de contenido nunca choca con el índice único (copias idénticas permitidas)
  if adm and new.content_sig is not null and position('#adm-' in new.content_sig) = 0 then
    new.content_sig := new.content_sig || '#adm-' || new.id::text;
  end if;
  if tg_op = 'UPDATE' then
    new.first_published_at := old.first_published_at; -- no se puede borrar la marca
    if old.first_published_at is not null and not adm then
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

-- 120 publicados
create or replace function public.sgm_levels_pub_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.sgm_user_is_admin(new.user_id) then return new; end if;
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    if (select count(*) from public.sgm_levels where user_id = new.user_id and is_public and id <> new.id) >= 120 then
      raise exception 'Limite de 120 niveles publicados alcanzado';
    end if;
  end if;
  return new;
end; $$;

-- 7 favoritos
create or replace function public.sgm_levels_fav_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.sgm_user_is_admin(new.user_id) then return new; end if;
  if new.favorite and (tg_op = 'INSERT' or not old.favorite) then
    if (select count(*) from public.sgm_levels where user_id = new.user_id and favorite and id <> new.id) >= 7 then
      raise exception 'Limite de 7 favoritos alcanzado';
    end if;
  end if;
  return new;
end; $$;

-- bloqueo por sanciones (v4)
create or replace function public.sgm_levels_block_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.sgm_user_is_admin(new.user_id) then return new; end if;
  if new.is_public and coalesce((select pub_blocked from public.sgm_links where user_id = new.user_id), false) then
    raise exception 'PUB_BLOCKED: tu cuenta no puede publicar niveles (sanciones). Pide perdon desde Mensajes.';
  end if;
  return new;
end; $$;

-- comprobación: debe salir true para kirbytebi
select u.email, public.sgm_user_is_admin(u.id) as admin
from auth.users u where lower(u.email) = 'kirbytebi@accounts.glob-defenders.invalid';
