-- Premium boost yetkisini client update yerine sunucu tarafı RPC'ye taşır.
revoke update ("boostedUntil") on public.users from authenticated;

create or replace function public.activate_premium_boost()
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

  select *
  into current_profile
  from public.users
  where id = (select auth.uid());

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if not current_profile."isPremium" then
    raise exception 'Premium subscription required';
  end if;

  if current_profile."boostedUntil" is not null and current_profile."boostedUntil" > now() then
    raise exception 'Boost already active';
  end if;

  update public.users
  set "boostedUntil" = now() + interval '24 hours'
  where id = (select auth.uid())
  returning *
  into current_profile;

  return current_profile;
end;
$$;

revoke all on function public.activate_premium_boost() from public, anon;
grant execute on function public.activate_premium_boost() to authenticated;
