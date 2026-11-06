-- =============================================================
-- Super Glob Maker · ONLINE v5: edición de noticias globales
-- Aplicar DESPUÉS de supabase_online_v4.sql en Supabase de GlD.
-- No modifica ni elimina noticias existentes.
-- =============================================================

create or replace function public.sgm_admin_edit_news(
  p_id bigint,
  p_title text,
  p_body text,
  p_lang text default 'es',
  p_category text default 'update'
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not public.sgm_is_admin() then raise exception 'Solo admin'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'El título no puede estar vacío'; end if;
  if length(trim(coalesce(p_title, ''))) > 60 then raise exception 'El título no puede superar 60 caracteres'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'El texto no puede estar vacío'; end if;

  update public.sgm_mail
     set title = trim(p_title),
         body = trim(p_body),
         lang = case when p_lang = 'en' then 'en' else 'es' end,
         category = case when p_category in ('warn', 'event') then p_category else 'update' end
   where id = p_id and kind = 'news' and to_user is null;

  if not found then return 'not-found'; end if;
  return 'ok';
end;
$$;

revoke all on function public.sgm_admin_edit_news(bigint, text, text, text, text) from public;
grant execute on function public.sgm_admin_edit_news(bigint, text, text, text, text) to authenticated;
