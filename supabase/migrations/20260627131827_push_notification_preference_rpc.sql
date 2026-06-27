create or replace function public.set_push_notifications_enabled(
  next_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  update public.push_tokens
  set
    is_active = coalesce(next_enabled, false),
    updated_at = now()
  where user_id = requester_id;
end;
$$;

revoke all on function public.set_push_notifications_enabled(boolean)
from public, anon;

grant execute on function public.set_push_notifications_enabled(boolean)
to authenticated;

notify pgrst, 'reload schema';
