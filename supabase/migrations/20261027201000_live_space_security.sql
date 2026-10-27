-- G5 — Admin-Controlled Live Space Security & Server Controls:
--   * Enforces verified UUID admin/moderator checks on the server
--   * Rejects non-admin attempts to start, stop, rename, promote, or kick
--   * Enforces that listeners cannot publish or unmute audio
--   * Hand raise -> Admin approval -> Speaker promotion
--   * Banned / kicked participants are prevented from rejoining or generating tokens
--   * Ended rooms reject any new connections or tokens

-- 1. Add ban tracking to live_room_participants
alter table public.live_room_participants
add column if not exists is_banned boolean not null default false,
add column if not exists banned_at timestamptz;

-- 2. Tighten live_rooms RLS
drop policy if exists "Anyone can read active live rooms" on public.live_rooms;
drop policy if exists "Members can read live rooms" on public.live_rooms;

create policy "Eligible members can read live rooms"
on public.live_rooms for select to authenticated
using ((select public.has_community_access()));

-- 3. Join live room RPC (with adult access, active room and ban checks)
create or replace function public.join_live_room(target_room_id text)
returns public.live_room_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  room_row public.live_rooms%rowtype;
  participant_record public.live_room_participants;
  is_admin_user boolean;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into room_row from public.live_rooms where id = target_room_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  if room_row.status <> 'live' then
    raise exception 'room_not_active' using errcode = '42501';
  end if;

  -- Check if user is banned from this room
  select * into participant_record
  from public.live_room_participants
  where room_id = target_room_id and user_id = requesting_user;

  if found and participant_record.is_banned then
    raise exception 'user_banned_from_room' using errcode = '42501';
  end if;

  is_admin_user := public.is_moderator();

  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    hand_raised_at,
    joined_at,
    is_banned
  )
  values (
    target_room_id,
    requesting_user,
    case when is_admin_user then 'Yonetici' else 'Dinleyici' end,
    case when is_admin_user then 'speaker' else 'listener' end,
    not is_admin_user,
    null,
    now(),
    false
  )
  on conflict (room_id, user_id) do update
  set stage_status = case
        when public.live_room_participants.is_banned then 'listener'
        when is_admin_user then 'speaker'
        else public.live_room_participants.stage_status
      end,
      is_muted = case
        when is_admin_user then false
        else public.live_room_participants.is_muted
      end,
      joined_at = now()
  returning * into participant_record;

  return participant_record;
end;
$$;

revoke all on function public.join_live_room(text) from public, anon;
grant execute on function public.join_live_room(text) to authenticated;

-- 4. Start live room (Admin / Moderator only)
create or replace function public.admin_start_live_room(
  target_room_id text,
  target_title text,
  target_description text,
  target_stream_url text
)
returns public.live_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  safe_stream_url text;
  room_record public.live_rooms;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() or not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  safe_stream_url := nullif(trim(coalesce(target_stream_url, '')), '');
  if safe_stream_url is not null and safe_stream_url !~* '^https://' then
    raise exception 'secure_https_stream_required' using errcode = '22023';
  end if;

  insert into public.live_rooms (
    id,
    title,
    description,
    status,
    voice_provider,
    livekit_room_name,
    stream_url,
    created_by,
    started_at,
    ended_at
  )
  values (
    target_room_id,
    target_title,
    target_description,
    'live',
    'livekit',
    'ehlibyte-' || target_room_id,
    safe_stream_url,
    requesting_user,
    now(),
    null
  )
  on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      status = 'live',
      ended_at = null,
      started_at = now(),
      voice_provider = 'livekit',
      livekit_room_name = 'ehlibyte-' || target_room_id,
      stream_url = safe_stream_url
  returning * into room_record;

  -- Add admin as speaker
  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    hand_raised_at,
    joined_at,
    promoted_at,
    is_banned
  )
  values (
    target_room_id,
    requesting_user,
    'Yonetici',
    'speaker',
    false,
    null,
    now(),
    now(),
    false
  )
  on conflict (room_id, user_id) do update
  set role = 'Yonetici',
      stage_status = 'speaker',
      is_muted = false,
      hand_raised_at = null,
      promoted_at = now(),
      is_banned = false;

  return room_record;
end;
$$;

revoke all on function public.admin_start_live_room(text, text, text, text) from public, anon;
grant execute on function public.admin_start_live_room(text, text, text, text) to authenticated;

-- 5. Stop live room (Admin / Moderator only)
create or replace function public.admin_stop_live_room(target_room_id text)
returns public.live_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  room_record public.live_rooms;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() or not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  update public.live_rooms
  set status = 'offline',
      video_playback_status = 'idle',
      video_position_millis = 0,
      video_updated_at = now(),
      video_controlled_by = requesting_user,
      ended_at = now()
  where id = target_room_id
  returning * into room_record;

  -- Demote all participants and mute
  update public.live_room_participants
  set stage_status = 'listener',
      is_muted = true,
      hand_raised_at = null
  where room_id = target_room_id;

  return room_record;
end;
$$;

revoke all on function public.admin_stop_live_room(text) from public, anon;
grant execute on function public.admin_stop_live_room(text) to authenticated;

-- 6. Update room title and description (Admin / Moderator only)
create or replace function public.admin_update_live_room_title(
  target_room_id text,
  target_title text,
  target_description text
)
returns public.live_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  room_record public.live_rooms;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() or not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  update public.live_rooms
  set title = target_title,
      description = target_description
  where id = target_room_id
  returning * into room_record;

  return room_record;
end;
$$;

revoke all on function public.admin_update_live_room_title(text, text, text) from public, anon;
grant execute on function public.admin_update_live_room_title(text, text, text) to authenticated;

-- 7. Promote or demote participant (Admin / Moderator only)
create or replace function public.moderator_set_live_participant_stage(
  target_room_id text,
  target_user_id uuid,
  target_stage_status text
)
returns public.live_room_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  participant_record public.live_room_participants;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() or not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  if target_stage_status not in ('listener', 'invited', 'speaker') then
    raise exception 'invalid_stage_status' using errcode = '22023';
  end if;

  update public.live_room_participants
  set stage_status = target_stage_status,
      role = case when target_stage_status = 'speaker' then 'Konusmaci' else 'Dinleyici' end,
      is_muted = target_stage_status <> 'speaker',
      hand_raised_at = null,
      promoted_at = case when target_stage_status = 'speaker' then now() else public.live_room_participants.promoted_at end
  where room_id = target_room_id and user_id = target_user_id
  returning * into participant_record;

  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;

  return participant_record;
end;
$$;

revoke all on function public.moderator_set_live_participant_stage(text, uuid, text) from public, anon;
grant execute on function public.moderator_set_live_participant_stage(text, uuid, text) to authenticated;

-- 8. Mute participant: Admin can mute anyone; participant can mute self, but only speaker can unmute self
create or replace function public.set_live_participant_muted(
  target_room_id text,
  target_user_id uuid,
  target_is_muted boolean
)
returns public.live_room_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  participant_record public.live_room_participants;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  if target_user_id <> requesting_user and not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  select * into participant_record
  from public.live_room_participants
  where room_id = target_room_id and user_id = target_user_id;

  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;

  -- Only speakers can unmute
  if target_is_muted = false and participant_record.stage_status <> 'speaker' then
    raise exception 'only_speakers_can_unmute' using errcode = '42501';
  end if;

  update public.live_room_participants
  set is_muted = target_is_muted
  where room_id = target_room_id and user_id = target_user_id
  returning * into participant_record;

  return participant_record;
end;
$$;

revoke all on function public.set_live_participant_muted(text, uuid, boolean) from public, anon;
grant execute on function public.set_live_participant_muted(text, uuid, boolean) to authenticated;

-- 9. Hand raise: Listener can raise or lower their own hand
create or replace function public.set_live_participant_hand_raised(
  target_room_id text,
  target_user_id uuid,
  target_is_raised boolean
)
returns public.live_room_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  participant_record public.live_room_participants;
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  if target_user_id <> requesting_user and not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  update public.live_room_participants
  set hand_raised_at = case when target_is_raised then now() else null end
  where room_id = target_room_id and user_id = target_user_id
  returning * into participant_record;

  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;

  return participant_record;
end;
$$;

revoke all on function public.set_live_participant_hand_raised(text, uuid, boolean) from public, anon;
grant execute on function public.set_live_participant_hand_raised(text, uuid, boolean) to authenticated;

-- 10. Kick participant (Admin / Moderator only): bans user from room
create or replace function public.moderator_remove_live_participant(
  target_room_id text,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
begin
  if requesting_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.has_community_access() or not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  -- Admin cannot be removed
  if exists (
    select 1 from public.user_roles
    where "userId" = target_user_id and role = 'admin'
  ) then
    raise exception 'cannot_remove_admin' using errcode = '42501';
  end if;

  -- Mark participant as banned and reset stage
  update public.live_room_participants
  set is_banned = true,
      banned_at = now(),
      stage_status = 'listener',
      is_muted = true,
      hand_raised_at = null
  where room_id = target_room_id and user_id = target_user_id;

  if not found then
    insert into public.live_room_participants (
      room_id, user_id, role, stage_status, is_muted, is_banned, banned_at, joined_at
    )
    values (
      target_room_id, target_user_id, 'Dinleyici', 'listener', true, true, now(), now()
    );
  end if;
end;
$$;

revoke all on function public.moderator_remove_live_participant(text, uuid) from public, anon;
grant execute on function public.moderator_remove_live_participant(text, uuid) to authenticated;
