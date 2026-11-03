-- Super Glob Maker · arreglo de ADMIN (ejecutar en Supabase > SQL Editor, después de v3).
-- Hace admin a kirbytebi aunque su fila en sgm_admins no se creara al aplicar v3:
-- sgm_is_admin() mira también el email de la cuenta (lo pone Supabase Auth, nadie lo puede falsear).
-- Se puede ejecutar varias veces sin problema.

insert into public.sgm_admins (user_id)
  select id from auth.users where lower(email) = 'kirbytebi@accounts.glob-defenders.invalid'
  on conflict do nothing;

create or replace function public.sgm_is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.sgm_admins where user_id = auth.uid())
      or exists (select 1 from auth.users where id = auth.uid()
                 and lower(email) = 'kirbytebi@accounts.glob-defenders.invalid');
$$;
grant execute on function public.sgm_is_admin() to authenticated;

-- comprobación: debe salir 1 fila con el email de kirbytebi
select u.email from public.sgm_admins a join auth.users u on u.id = a.user_id;
