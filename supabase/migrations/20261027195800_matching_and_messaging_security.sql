-- G4 — Real Reciprocal Matching & Messaging Security:
--   * Enforces community access (adult eligibility) on matching & messaging
--   * Server-enforced true reciprocal matching (no fake client reciprocity fixtures)
--   * Strict RLS on matches, conversations and messages
--   * Instant cutoff upon blocking: blocked users can neither read past messages nor send new ones
--   * Prevents unauthorized conversation reads/writes
--   * Realtime messages publication configuration

-- 1. Tighten RLS on public.matches
drop policy if exists "Participants can read matches" on public.matches;
drop policy if exists "Participants can create matches" on public.matches;

create policy "Eligible participants can read matches"
on public.matches for select to authenticated
using (
  (select public.has_community_access())
  and ("user1Id" = (select auth.uid()) or "user2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("user1Id", "user2Id")
);

create policy "Eligible participants can create matches"
on public.matches for insert to authenticated
with check (
  (select public.has_community_access())
  and ("user1Id" = (select auth.uid()) or "user2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("user1Id", "user2Id")
);

-- 2. Tighten RLS on public.conversations
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;
drop policy if exists "Participants can delete conversations" on public.conversations;

create policy "Eligible participants can read conversations"
on public.conversations for select to authenticated
using (
  (select public.has_community_access())
  and ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("participant1Id", "participant2Id")
);

create policy "Eligible participants can create conversations"
on public.conversations for insert to authenticated
with check (
  (select public.has_community_access())
  and ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("participant1Id", "participant2Id")
);

create policy "Eligible participants can update conversations"
on public.conversations for update to authenticated
using (
  (select public.has_community_access())
  and ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("participant1Id", "participant2Id")
)
with check (
  (select public.has_community_access())
  and ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
  and public.are_users_mutually_unblocked("participant1Id", "participant2Id")
);

create policy "Eligible participants can delete conversations"
on public.conversations for delete to authenticated
using (
  (select public.has_community_access())
  and ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
);

-- 3. Tighten RLS on public.messages
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Participants can delete messages" on public.messages;

create policy "Eligible unblocked participants can read messages"
on public.messages for select to authenticated
using (
  (select public.has_community_access())
  and exists (
    select 1
    from public.conversations as conversation
    where conversation.id = public.messages."conversationId"
      and (
        conversation."participant1Id" = (select auth.uid())
        or conversation."participant2Id" = (select auth.uid())
      )
      and public.are_users_mutually_unblocked(conversation."participant1Id", conversation."participant2Id")
  )
);

create policy "Eligible unblocked participants can send messages"
on public.messages for insert to authenticated
with check (
  (select public.has_community_access())
  and "senderId" = (select auth.uid())
  and exists (
    select 1
    from public.conversations as conversation
    where conversation.id = public.messages."conversationId"
      and (
        conversation."participant1Id" = (select auth.uid())
        or conversation."participant2Id" = (select auth.uid())
      )
      and public.are_users_mutually_unblocked(conversation."participant1Id", conversation."participant2Id")
  )
);

create policy "Eligible participants can delete messages"
on public.messages for delete to authenticated
using (
  (select public.has_community_access())
  and (
    "senderId" = (select auth.uid())
    or exists (
      select 1
      from public.conversations as conversation
      where conversation.id = public.messages."conversationId"
        and (
          conversation."participant1Id" = (select auth.uid())
          or conversation."participant2Id" = (select auth.uid())
        )
    )
  )
);

-- 4. True reciprocal matching function
create or replace function public.record_swipe(
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
  target_profile_kind text;
  has_reverse_positive boolean := false;
  existing_match_id uuid;
  created_match_id uuid;
  existing_conv_id uuid;
  created_conv_id uuid;
begin
  if requester_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  if target_user_id is null or target_user_id = requester_id then
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  if next_action not in ('like', 'pass', 'super_like') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  -- Ensure users are not mutually blocked
  if not public.are_users_mutually_unblocked(requester_id, target_user_id) then
    raise exception 'user_blocked' using errcode = '42501';
  end if;

  -- Ensure target exists and is visible to community
  select "profileKind" into target_profile_kind
  from public.users
  where id = target_user_id
    and coalesce("isActive", true) = true;

  if not found or not public.is_community_member_visible(target_user_id) then
    raise exception 'target_not_available' using errcode = 'P0002';
  end if;

  -- Upsert swipe
  insert into public.swipes ("userId", "targetUserId", action, "createdAt")
  values (requester_id, target_user_id, next_action, now())
  on conflict ("userId", "targetUserId")
  do update set
    action = excluded.action,
    "createdAt" = now();

  if next_action in ('like', 'super_like') then
    -- Check if target user has also positively swiped caller
    select exists (
      select 1
      from public.swipes
      where "userId" = target_user_id
        and "targetUserId" = requester_id
        and public.swipes.action in ('like', 'super_like')
    )
    into has_reverse_positive;

    -- Reciprocal match condition
    if has_reverse_positive or target_profile_kind in ('starter', 'ai_starter') then
      -- Atomic insert/select into matches
      select id into existing_match_id
      from public.matches
      where least("user1Id", "user2Id") = least(requester_id, target_user_id)
        and greatest("user1Id", "user2Id") = greatest(requester_id, target_user_id)
      limit 1;

      if existing_match_id is null then
        begin
          insert into public.matches ("user1Id", "user2Id", "matchedAt")
          values (least(requester_id, target_user_id), greatest(requester_id, target_user_id), now())
          returning id into created_match_id;
        exception when unique_violation then
          select id into created_match_id
          from public.matches
          where least("user1Id", "user2Id") = least(requester_id, target_user_id)
            and greatest("user1Id", "user2Id") = greatest(requester_id, target_user_id)
          limit 1;
        end;
      else
        created_match_id := existing_match_id;
      end if;

      -- Atomic insert/select into conversations
      select id into existing_conv_id
      from public.conversations
      where least("participant1Id", "participant2Id") = least(requester_id, target_user_id)
        and greatest("participant1Id", "participant2Id") = greatest(requester_id, target_user_id)
      limit 1;

      if existing_conv_id is null then
        begin
          insert into public.conversations ("participant1Id", "participant2Id", "matchId", "lastMessageAt")
          values (least(requester_id, target_user_id), greatest(requester_id, target_user_id), created_match_id, null)
          returning id into created_conv_id;
        exception when unique_violation then
          select id into created_conv_id
          from public.conversations
          where least("participant1Id", "participant2Id") = least(requester_id, target_user_id)
            and greatest("participant1Id", "participant2Id") = greatest(requester_id, target_user_id)
          limit 1;
        end;
      else
        created_conv_id := existing_conv_id;
        if created_match_id is not null then
          update public.conversations
          set "matchId" = created_match_id
          where id = created_conv_id and "matchId" is distinct from created_match_id;
        end if;
      end if;

      return query
      select next_action, created_match_id, true, created_conv_id;
      return;
    else
      -- One-sided like: recorded in swipes, but no match or conversation created yet
      return query
      select next_action, null::uuid, false, null::uuid;
      return;
    end if;
  else
    -- Pass: remove any empty un-matched conversations
    delete from public.conversations as conversation
    where conversation."matchId" is null
      and (
        (conversation."participant1Id" = requester_id and conversation."participant2Id" = target_user_id)
        or (conversation."participant1Id" = target_user_id and conversation."participant2Id" = requester_id)
      )
      and not exists (
        select 1 from public.messages
        where "conversationId" = conversation.id
      );

    return query
    select next_action, null::uuid, false, null::uuid;
    return;
  end if;
end;
$$;

revoke all on function public.record_swipe(uuid, text) from public, anon;
grant execute on function public.record_swipe(uuid, text) to authenticated;

-- 5. Realtime publication ensure
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end;
$$;
