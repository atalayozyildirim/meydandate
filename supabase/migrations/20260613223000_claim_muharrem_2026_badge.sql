-- Muharrem takvimini tamamlayan kullaniciya tek seferlik 2026 rozetini verir.

create or replace function public.claim_muharrem_2026_badge()
returns setof public.users
language sql
security definer
set search_path = ''
as $$
  update public.users
  set badges = case
    when 'muharrem_orucu_2026' = any(badges) then badges
    else array_append(badges, 'muharrem_orucu_2026')
  end
  where id = (select auth.uid())
  returning *;
$$;

revoke all on function public.claim_muharrem_2026_badge()
from public, anon;
grant execute on function public.claim_muharrem_2026_badge()
to authenticated;

notify pgrst, 'reload schema';
