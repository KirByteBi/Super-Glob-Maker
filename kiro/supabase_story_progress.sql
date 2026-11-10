-- Super Glob Maker: sincronizacion del progreso del Modo Historia por cuenta de Glob Defenders.
-- Aplicar en el Supabase de Glob Defenders. Los avances se fusionan en servidor para
-- que una sesion abierta en otro dispositivo no sobrescriba progreso mas reciente.

create table if not exists public.sgm_story_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.sgm_story_progress enable row level security;
revoke all on public.sgm_story_progress from anon, authenticated;

create or replace function public.sgm_story_progress_get() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_progress jsonb;
begin
  if auth.uid() is null then raise exception 'Se necesita iniciar sesion'; end if;
  select progress into v_progress
    from public.sgm_story_progress
    where user_id = auth.uid();
  return coalesce(v_progress, '{}'::jsonb);
end;
$$;
revoke all on function public.sgm_story_progress_get() from public;
grant execute on function public.sgm_story_progress_get() to authenticated;

create or replace function public.sgm_story_progress_save(p_progress jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_merged jsonb;
  v_old jsonb;
  v_entry record;
  v_kind text;
  v_in_ex jsonb;
  v_old_ex jsonb;
  v_flags jsonb;
  v_in_seen jsonb;
  v_old_seen jsonb;
  v_seen jsonb;
  v_index integer;
begin
  if auth.uid() is null then raise exception 'Se necesita iniciar sesion'; end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then raise exception 'Progreso no valido'; end if;
  if octet_length(p_progress::text) > 65536 then raise exception 'Progreso demasiado grande'; end if;
  if p_progress ? 'worlds' and jsonb_typeof(p_progress -> 'worlds') <> 'object' then raise exception 'Mundos no validos'; end if;
  if p_progress ? 'ex' and jsonb_typeof(p_progress -> 'ex') <> 'object' then raise exception 'Interruptores no validos'; end if;
  if p_progress ? 'seen' and jsonb_typeof(p_progress -> 'seen') <> 'object' then raise exception 'Cinematica no valida'; end if;

  insert into public.sgm_story_progress (user_id, progress)
    values (auth.uid(), '{}'::jsonb)
    on conflict (user_id) do nothing;
  select progress into v_merged
    from public.sgm_story_progress
    where user_id = auth.uid()
    for update;

  for v_entry in select key, value from jsonb_each(p_progress) loop
    if v_entry.key ~ '^(w[1-5])/(n[1-9][0-9]*|cas[1-9][0-9]*|pal|alt[1-9][0-9]*)$'
       and jsonb_typeof(v_entry.value) = 'object' then
      v_old := coalesce(v_merged -> v_entry.key, '{}'::jsonb);
      v_flags := jsonb_build_object(
        'cleared', (v_old ->> 'cleared' = 'true') or (v_entry.value ->> 'cleared' = 'true')
          or (v_old ->> 'normal' = 'true') or (v_entry.value ->> 'normal' = 'true')
          or (v_old ->> 'secret' = 'true') or (v_entry.value ->> 'secret' = 'true'),
        'normal', (v_old ->> 'normal' = 'true') or ((v_old ->> 'normal' is null) and (v_old ->> 'cleared' = 'true'))
          or (v_entry.value ->> 'normal' = 'true') or ((v_entry.value ->> 'normal' is null) and (v_entry.value ->> 'cleared' = 'true')),
        'secret', (v_old ->> 'secret' = 'true') or (v_entry.value ->> 'secret' = 'true')
      );
      if v_flags ->> 'cleared' = 'true' then
        v_merged := jsonb_set(v_merged, array[v_entry.key], v_flags, true);
      end if;
    end if;
  end loop;

  v_merged := jsonb_set(v_merged, '{worlds}', coalesce(v_merged -> 'worlds', '{}'::jsonb), true);
  for v_entry in select key, value from jsonb_each(coalesce(p_progress -> 'worlds', '{}'::jsonb)) loop
    if v_entry.key ~ '^w[1-5]$' and v_entry.value = 'true'::jsonb then
      v_merged := jsonb_set(v_merged, array['worlds', v_entry.key], 'true'::jsonb, true);
    end if;
  end loop;

  v_merged := jsonb_set(v_merged, '{ex}', coalesce(v_merged -> 'ex', '{}'::jsonb), true);
  for v_entry in select key, value from jsonb_each(coalesce(p_progress -> 'ex', '{}'::jsonb)) loop
    if v_entry.key ~ '^w[1-5]$' and jsonb_typeof(v_entry.value) = 'array' then
      v_in_ex := v_entry.value;
      v_old_ex := coalesce(v_merged -> 'ex' -> v_entry.key, '[false,false,false]'::jsonb);
      v_flags := '[]'::jsonb;
      for v_index in 0..2 loop
        v_flags := v_flags || jsonb_build_array(
          (v_in_ex -> v_index = 'true'::jsonb) or (v_in_ex -> v_index = '1'::jsonb)
          or (v_old_ex -> v_index = 'true'::jsonb) or (v_old_ex -> v_index = '1'::jsonb)
        );
      end loop;
      v_merged := jsonb_set(v_merged, array['ex', v_entry.key], v_flags, true);
    end if;
  end loop;

  v_merged := jsonb_set(v_merged, '{seen}', coalesce(v_merged -> 'seen', '{}'::jsonb), true);
  for v_entry in select key, value from jsonb_each(coalesce(p_progress -> 'seen', '{}'::jsonb)) loop
    if v_entry.key ~ '^w[1-5]$' and jsonb_typeof(v_entry.value) = 'object' then
      v_in_seen := v_entry.value;
      v_old_seen := coalesce(v_merged -> 'seen' -> v_entry.key, '{}'::jsonb);
      v_seen := v_old_seen;
      for v_kind in select unnest(array['intro', 'castle', 'boss']) loop
        if v_in_seen -> v_kind = 'true'::jsonb or v_old_seen -> v_kind = 'true'::jsonb then
          v_seen := jsonb_set(v_seen, array[v_kind], 'true'::jsonb, true);
        end if;
      end loop;
      v_merged := jsonb_set(v_merged, array['seen', v_entry.key], v_seen, true);
    end if;
  end loop;

  update public.sgm_story_progress
    set progress = v_merged, updated_at = now()
    where user_id = auth.uid();
  return v_merged;
end;
$$;
revoke all on function public.sgm_story_progress_save(jsonb) from public;
grant execute on function public.sgm_story_progress_save(jsonb) to authenticated;
