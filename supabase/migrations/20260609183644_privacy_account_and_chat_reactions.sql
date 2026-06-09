-- Kullanıcı gizlilik tercihlerini prod ortamında kalıcı hale getirir.
alter table public.users
  add column if not exists "isDiscoverable" boolean not null default true;

grant select ("isDiscoverable") on public.users to authenticated;

create or replace function public.set_profile_discoverability(next_is_discoverable boolean)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.users;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  update public.users
  set "isDiscoverable" = coalesce(next_is_discoverable, true)
  where id = (select auth.uid())
  returning *
  into current_profile;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return current_profile;
end;
$$;

revoke all on function public.set_profile_discoverability(boolean) from public, anon;
grant execute on function public.set_profile_discoverability(boolean) to authenticated;
