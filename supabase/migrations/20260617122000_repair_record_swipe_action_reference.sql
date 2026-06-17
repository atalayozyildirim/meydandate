-- record_swipe icinde action kolonunu netlestirerek PL/pgSQL isim cakismasini onler.

create or replace function public.record_swipe(
  target_user_id uuid,
  next_action text
)
returns table (
  action text,
  match_id uuid,
  matched boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_can_swipe boolean;
  requester_blocked_users uuid[];
  requester_muted_users uuid[];
  target_profile_kind text;
  target_blocked_users uuid[];
  existing_match_id uuid;
  created_match_id uuid;
  has_reverse_positive boolean;
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id is null or target_user_id = requester_id then
    raise exception 'Invalid swipe target';
  end if;

  if next_action not in ('like', 'pass', 'super_like') then
    raise exception 'Invalid swipe action';
  end if;

  select "isActive" and "hasCompletedOnboarding", "blockedUsers", "mutedUsers"
  into requester_can_swipe, requester_blocked_users, requester_muted_users
  from public.users
  where id = requester_id;

  if not found or not coalesce(requester_can_swipe, false) then
    raise exception 'Requester profile is not eligible';
  end if;

  select "profileKind", "blockedUsers"
  into target_profile_kind, target_blocked_users
  from public.users
  where id = target_user_id
    and "isActive" = true
    and "hasCompletedOnboarding" = true;

  if target_profile_kind is null then
    raise exception 'Swipe target not found';
  end if;

  if target_user_id = any(coalesce(requester_blocked_users, '{}'::uuid[]))
    or target_user_id = any(coalesce(requester_muted_users, '{}'::uuid[]))
    or requester_id = any(coalesce(target_blocked_users, '{}'::uuid[])) then
    raise exception 'Swipe target unavailable';
  end if;

  insert into public.swipes ("userId", "targetUserId", action, "createdAt")
  values (requester_id, target_user_id, next_action, now())
  on conflict ("userId", "targetUserId")
  do update set
    action = excluded.action,
    "createdAt" = now();

  if next_action <> 'pass' then
    select exists (
      select 1
      from public.swipes
      where "userId" = target_user_id
        and "targetUserId" = requester_id
        and public.swipes.action in ('like', 'super_like')
    )
    into has_reverse_positive;

    if has_reverse_positive or target_profile_kind in ('starter', 'ai_starter') then
      select id
      into existing_match_id
      from public.matches
      where ("user1Id" = requester_id and "user2Id" = target_user_id)
         or ("user1Id" = target_user_id and "user2Id" = requester_id)
      limit 1;

      if existing_match_id is null then
        begin
          insert into public.matches ("user1Id", "user2Id", "matchedAt")
          values (requester_id, target_user_id, now())
          returning id into created_match_id;
        exception
          when unique_violation then
            select id
            into created_match_id
            from public.matches
            where ("user1Id" = requester_id and "user2Id" = target_user_id)
               or ("user1Id" = target_user_id and "user2Id" = requester_id)
            limit 1;
        end;
      else
        created_match_id := existing_match_id;
      end if;

      insert into public.conversations ("participant1Id", "participant2Id", "matchId", "lastMessageAt")
      values (requester_id, target_user_id, created_match_id, now())
      on conflict ("matchId") do nothing;
    end if;
  end if;

  return query
  select next_action, created_match_id, created_match_id is not null;
end;
$$;

revoke all on function public.record_swipe(uuid, text) from public, anon;
grant execute on function public.record_swipe(uuid, text) to authenticated;

notify pgrst, 'reload schema';
