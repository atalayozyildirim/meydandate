-- A positive swipe opens one shared conversation immediately. A reciprocal
-- positive swipe still creates the match and upgrades that same conversation.

create unique index if not exists conversations_unique_pair_idx
on public.conversations (
  least("participant1Id", "participant2Id"),
  greatest("participant1Id", "participant2Id")
);

drop function if exists public.record_swipe(uuid, text);

create function public.record_swipe(
  target_user_id uuid,
  next_action text
)
returns table (
  action text,
  match_id uuid,
  matched boolean,
  conversation_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_is_active boolean;
  requester_blocked_users uuid[];
  requester_muted_users uuid[];
  target_profile_kind text;
  target_blocked_users uuid[];
  existing_match_id uuid;
  created_match_id uuid;
  created_conversation_id uuid;
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

  select coalesce("isActive", true), "blockedUsers", "mutedUsers"
  into requester_is_active, requester_blocked_users, requester_muted_users
  from public.users
  where id = requester_id;

  if not found then
    raise exception 'Requester profile not found';
  end if;

  if not coalesce(requester_is_active, false) then
    raise exception 'Requester profile is inactive';
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
    end if;

    select id
    into created_conversation_id
    from public.conversations
    where ("participant1Id" = requester_id and "participant2Id" = target_user_id)
       or ("participant1Id" = target_user_id and "participant2Id" = requester_id)
    limit 1;

    if created_conversation_id is null then
      begin
        insert into public.conversations (
          "participant1Id",
          "participant2Id",
          "matchId",
          "lastMessageAt"
        )
        values (requester_id, target_user_id, created_match_id, null)
        returning id into created_conversation_id;
      exception
        when unique_violation then
          select id
          into created_conversation_id
          from public.conversations
          where ("participant1Id" = requester_id and "participant2Id" = target_user_id)
             or ("participant1Id" = target_user_id and "participant2Id" = requester_id)
          limit 1;
      end;
    elsif created_match_id is not null then
      update public.conversations
      set "matchId" = created_match_id
      where id = created_conversation_id
        and "matchId" is distinct from created_match_id;
    end if;
  else
    -- A repeated API call that changes an unsent like to pass should not leave
    -- an empty one-sided conversation behind.
    delete from public.conversations as conversation
    where conversation."matchId" is null
      and (
        (conversation."participant1Id" = requester_id and conversation."participant2Id" = target_user_id)
        or (conversation."participant1Id" = target_user_id and conversation."participant2Id" = requester_id)
      )
      and not exists (
        select 1
        from public.messages
        where "conversationId" = conversation.id
      );
  end if;

  return query
  select
    next_action,
    created_match_id,
    created_match_id is not null,
    created_conversation_id;
end;
$$;

revoke all on function public.record_swipe(uuid, text) from public, anon;
grant execute on function public.record_swipe(uuid, text) to authenticated;

create or replace function public.undo_last_swipe()
returns table (
  target_user_id uuid,
  action text,
  match_removed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_is_premium boolean;
  last_swipe record;
  target_match_id uuid;
  target_conversation_id uuid;
  has_messages boolean;
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  select "isPremium"
  into requester_is_premium
  from public.users
  where id = requester_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if not coalesce(requester_is_premium, false) then
    raise exception 'Premium required';
  end if;

  select id, "targetUserId", action, "createdAt"
  into last_swipe
  from public.swipes
  where "userId" = requester_id
  order by "createdAt" desc
  limit 1;

  if not found then
    raise exception 'No swipe to undo';
  end if;

  if last_swipe."createdAt" < now() - interval '30 minutes' then
    raise exception 'Undo window expired';
  end if;

  select id
  into target_match_id
  from public.matches
  where ("user1Id" = requester_id and "user2Id" = last_swipe."targetUserId")
     or ("user1Id" = last_swipe."targetUserId" and "user2Id" = requester_id)
  limit 1;

  select id
  into target_conversation_id
  from public.conversations
  where ("participant1Id" = requester_id and "participant2Id" = last_swipe."targetUserId")
     or ("participant1Id" = last_swipe."targetUserId" and "participant2Id" = requester_id)
  limit 1;

  if target_conversation_id is not null then
    select exists (
      select 1
      from public.messages
      where "conversationId" = target_conversation_id
    )
    into has_messages;

    if has_messages then
      raise exception 'Conversation already has messages';
    end if;
  end if;

  delete from public.swipes
  where id = last_swipe.id;

  if target_conversation_id is not null then
    delete from public.conversations
    where id = target_conversation_id;
  end if;

  if target_match_id is not null then
    delete from public.matches
    where id = target_match_id;
  end if;

  return query
  select last_swipe."targetUserId"::uuid, last_swipe.action::text, target_match_id is not null;
end;
$$;

revoke all on function public.undo_last_swipe() from public, anon;
grant execute on function public.undo_last_swipe() to authenticated;

-- Conversation creation is now an invariant of record_swipe. Prevent clients
-- from bypassing the positive-swipe check by inserting arbitrary participants.
drop policy if exists "Participants can create conversations"
on public.conversations;
revoke insert on public.conversations from authenticated;

notify pgrst, 'reload schema';
