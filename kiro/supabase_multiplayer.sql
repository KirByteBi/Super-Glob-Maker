-- Super Glob Maker · MULTIJUGADOR: coronas de Torneo en el perfil (ejecutar en Supabase > SQL Editor).
-- Las salas NO necesitan SQL (van por Supabase Realtime, como las seeds de Glob Defenders).
-- Esto solo guarda las 👑 coronas que gana cada jugador en los Torneos.
-- Se puede ejecutar varias veces sin problema.

alter table public.sgm_links add column if not exists crowns integer not null default 0;
alter table public.sgm_links add column if not exists last_crown_at timestamptz;
alter table public.sgm_links add column if not exists last_crown_room text;

-- El ganador pide su corona al acabar el Torneo. Límites contra trampas:
--  · como mucho una corona por sala (seed) y una cada 5 minutos por cuenta.
-- (El resultado del Torneo lo calcula el anfitrión en su navegador: no hay árbitro en el servidor.)
create or replace function public.sgm_award_crown(p_room text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_room is null or p_room !~ '^[A-Z][A-Z0-9]{6}$' then raise exception 'Sala no valida'; end if;
  update public.sgm_links
     set crowns = crowns + 1, last_crown_at = now(), last_crown_room = p_room
   where user_id = auth.uid()
     and (last_crown_room is distinct from p_room)
     and (last_crown_at is null or last_crown_at < now() - interval '5 minutes')
  returning crowns into n;
  if n is null then select crowns into n from public.sgm_links where user_id = auth.uid(); end if;
  return coalesce(n, 0);
end; $$;
revoke all on function public.sgm_award_crown(text) from public;
grant execute on function public.sgm_award_crown(text) to authenticated;

-- Coronas de un jugador (para su perfil; las ve cualquiera)
create or replace function public.sgm_crowns(p_username text) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select crowns from public.sgm_links where lower(username) = lower(p_username) limit 1), 0);
$$;
grant execute on function public.sgm_crowns(text) to anon, authenticated;
