-- Super Glob Maker · niveles globales del Modo Historia.
-- Aplicar en el Supabase de Glob Defenders después de online_v3 (sgm_is_admin).
-- Los niveles pueden leerse sin cuenta; solo sgm_is_admin() puede guardar.

create table if not exists public.sgm_story_levels (
  world_id text not null check (world_id in ('w1', 'w2', 'w3', 'w4', 'w5')),
  node_id text not null check (node_id ~ '^(n[1-9][0-9]*|cas[1-9][0-9]*|pal|alt[1-9][0-9]*)$'),
  mode text not null check (mode in ('peace', 'corrupt')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  primary key (world_id, node_id, mode)
);

alter table public.sgm_story_levels enable row level security;
revoke all on public.sgm_story_levels from anon, authenticated;

create or replace function public.sgm_story_pack_get() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_object_agg(world_id || '/' || node_id || '/' || mode, data),
    '{}'::jsonb
  )
  from public.sgm_story_levels;
$$;
revoke all on function public.sgm_story_pack_get() from public;
grant execute on function public.sgm_story_pack_get() to anon, authenticated;

create or replace function public.sgm_story_pack_save(
  p_world text,
  p_node text,
  p_mode text,
  p_data jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Se necesita iniciar sesión'; end if;
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  if p_world not in ('w1', 'w2', 'w3', 'w4', 'w5') then raise exception 'Mundo no válido'; end if;
  if p_node !~ '^(n[1-9][0-9]*|cas[1-9][0-9]*|pal|alt[1-9][0-9]*)$' then raise exception 'Nodo no válido'; end if;
  if p_mode not in ('peace', 'corrupt') then raise exception 'Modo no válido'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Datos de nivel no válidos'; end if;
  if octet_length(p_data::text) > 1048576 then raise exception 'El nivel supera el tamaño permitido'; end if;

  insert into public.sgm_story_levels (world_id, node_id, mode, data, updated_by)
  values (p_world, p_node, p_mode, p_data, auth.uid())
  on conflict (world_id, node_id, mode) do update
    set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;
end;
$$;
revoke all on function public.sgm_story_pack_save(text, text, text, jsonb) from public;
grant execute on function public.sgm_story_pack_save(text, text, text, jsonb) to authenticated;
