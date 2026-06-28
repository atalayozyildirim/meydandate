-- A special invite may be accepted after either participant already opened a
-- like conversation. Upgrade that row instead of attempting a duplicate.

create or replace function public.accept_special_match_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid;
  invite_record public.special_match_invites;
  match_id uuid;
  conversation_id uuid;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  select *
  into invite_record
  from public.special_match_invites
  where id = invite_id
    and invitee_user_id = requesting_user
    and status = 'pending';

  if invite_record.id is null then
    raise exception 'Pending invite not found';
  end if;

  if invite_record.inviter_id = requesting_user then
    raise exception 'Self match is not allowed';
  end if;

  insert into public.swipes ("userId", "targetUserId", action)
  values (invite_record.inviter_id, requesting_user, 'like')
  on conflict ("userId", "targetUserId") do update
  set action = excluded.action,
      "createdAt" = now();

  insert into public.swipes ("userId", "targetUserId", action)
  values (requesting_user, invite_record.inviter_id, 'like')
  on conflict ("userId", "targetUserId") do update
  set action = excluded.action,
      "createdAt" = now();

  select id
  into match_id
  from public.matches
  where least("user1Id", "user2Id") = least(requesting_user, invite_record.inviter_id)
    and greatest("user1Id", "user2Id") = greatest(requesting_user, invite_record.inviter_id)
  limit 1;

  if match_id is null then
    begin
      insert into public.matches ("user1Id", "user2Id", "matchedAt")
      values (invite_record.inviter_id, requesting_user, now())
      returning id into match_id;
    exception
      when unique_violation then
        select id
        into match_id
        from public.matches
        where least("user1Id", "user2Id") = least(requesting_user, invite_record.inviter_id)
          and greatest("user1Id", "user2Id") = greatest(requesting_user, invite_record.inviter_id)
        limit 1;
    end;
  end if;

  select id
  into conversation_id
  from public.conversations
  where least("participant1Id", "participant2Id") = least(requesting_user, invite_record.inviter_id)
    and greatest("participant1Id", "participant2Id") = greatest(requesting_user, invite_record.inviter_id)
  limit 1;

  if conversation_id is null then
    begin
      insert into public.conversations (
        "participant1Id",
        "participant2Id",
        "matchId",
        "lastMessageAt"
      )
      values (invite_record.inviter_id, requesting_user, match_id, null)
      returning id into conversation_id;
    exception
      when unique_violation then
        select id
        into conversation_id
        from public.conversations
        where least("participant1Id", "participant2Id") = least(requesting_user, invite_record.inviter_id)
          and greatest("participant1Id", "participant2Id") = greatest(requesting_user, invite_record.inviter_id)
        limit 1;
    end;
  end if;

  update public.conversations
  set "matchId" = match_id
  where id = conversation_id
    and "matchId" is distinct from match_id;

  update public.special_match_invites
  set status = 'accepted',
      accepted_at = now()
  where id = invite_record.id;

  return match_id;
end;
$$;

revoke all on function public.accept_special_match_invite(uuid) from public, anon;
grant execute on function public.accept_special_match_invite(uuid) to authenticated;

notify pgrst, 'reload schema';
