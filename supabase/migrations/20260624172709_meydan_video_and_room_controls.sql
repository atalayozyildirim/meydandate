alter table public.live_rooms
add column if not exists video_playback_status text not null default 'idle',
add column if not exists video_position_millis integer not null default 0,
add column if not exists video_updated_at timestamptz,
add column if not exists video_controlled_by uuid references public.users(id) on delete set null;

alter table public.live_room_participants
add column if not exists hand_raised_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'live_rooms_video_playback_status_check'
  ) then
    alter table public.live_rooms
    add constraint live_rooms_video_playback_status_check
    check (video_playback_status in ('idle', 'playing', 'paused'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_rooms_video_position_millis_check'
  ) then
    alter table public.live_rooms
    add constraint live_rooms_video_position_millis_check
    check (video_position_millis >= 0);
  end if;
end
$$;

update public.live_rooms
set video_playback_status = case
      when stream_url is null then 'idle'
      when status = 'live' then 'playing'
      else 'paused'
    end,
    video_position_millis = greatest(video_position_millis, 0),
    video_updated_at = coalesce(video_updated_at, started_at, now()),
    voice_provider = 'livekit',
    livekit_room_name = coalesce(livekit_room_name, 'ehlibyte-' || id)
where video_updated_at is null
   or livekit_room_name is null
   or voice_provider is distinct from 'livekit';

drop policy if exists "Admins can create live rooms" on public.live_rooms;
drop policy if exists "Moderators can create live rooms" on public.live_rooms;
create policy "Moderators can create live rooms"
on public.live_rooms for insert to authenticated
with check ((select public.is_moderator()));

drop policy if exists "Admins can update live rooms" on public.live_rooms;
drop policy if exists "Moderators can update live rooms" on public.live_rooms;
create policy "Moderators can update live rooms"
on public.live_rooms for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

drop policy if exists "Users and admins can leave live rooms" on public.live_room_participants;
drop policy if exists "Users and moderators can leave live rooms" on public.live_room_participants;
create policy "Users and moderators can leave live rooms"
on public.live_room_participants for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists "Users can join live rooms" on public.live_room_participants;
drop policy if exists "Moderators can insert live room participants" on public.live_room_participants;
create policy "Moderators can insert live room participants"
on public.live_room_participants for insert to authenticated
with check ((select public.is_moderator()));

drop policy if exists "Users can update their own participation" on public.live_room_participants;
drop policy if exists "Moderators can update live room participants" on public.live_room_participants;
create policy "Moderators can update live room participants"
on public.live_room_participants for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

create or replace function public.admin_start_live_room(
  target_room_id text,
  target_title text,
  target_description text,
  target_stream_url text
)
returns public.live_rooms
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requesting_user uuid;
  safe_stream_url text;
  room_record public.live_rooms;
begin
  requesting_user := (select auth.uid());
  safe_stream_url := nullif(trim(coalesce(target_stream_url, '')), '');

  if requesting_user is null or not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  if safe_stream_url is not null and safe_stream_url !~* '^https://' then
    raise exception 'A secure HTTPS stream URL is required';
  end if;

  insert into public.live_rooms (
    id,
    title,
    description,
    status,
    voice_provider,
    livekit_room_name,
    stream_url,
    video_playback_status,
    video_position_millis,
    video_updated_at,
    video_controlled_by,
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
    case when safe_stream_url is null then 'idle' else 'playing' end,
    0,
    now(),
    requesting_user,
    requesting_user,
    now(),
    null
  )
  on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      status = 'live',
      voice_provider = 'livekit',
      livekit_room_name = excluded.livekit_room_name,
      stream_url = excluded.stream_url,
      video_playback_status = excluded.video_playback_status,
      video_position_millis = 0,
      video_updated_at = now(),
      video_controlled_by = requesting_user,
      created_by = requesting_user,
      started_at = now(),
      ended_at = null
  returning * into room_record;

  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    hand_raised_at,
    joined_at,
    promoted_at
  )
  values (
    target_room_id,
    requesting_user,
    'Yonetici',
    'speaker',
    false,
    null,
    now(),
    now()
  )
  on conflict (room_id, user_id) do update
  set role = 'Yonetici',
      stage_status = 'speaker',
      is_muted = false,
      hand_raised_at = null,
      promoted_at = now();

  return room_record;
end;
$$;

create or replace function public.admin_stop_live_room(target_room_id text)
returns public.live_rooms
language plpgsql
security invoker
set search_path = ''
as $$
declare
  room_record public.live_rooms;
begin
  if (select auth.uid()) is null or not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  update public.live_rooms
  set status = 'offline',
      video_playback_status = 'idle',
      video_position_millis = 0,
      video_updated_at = now(),
      video_controlled_by = (select auth.uid()),
      ended_at = now()
  where id = target_room_id
  returning * into room_record;

  update public.live_room_participants
  set stage_status = 'listener',
      is_muted = true,
      hand_raised_at = null
  where room_id = target_room_id;

  return room_record;
end;
$$;

create or replace function public.moderator_set_live_participant_stage(
  target_room_id text,
  target_user_id uuid,
  target_stage_status text
)
returns public.live_room_participants
language plpgsql
security invoker
set search_path = ''
as $$
declare
  participant_record public.live_room_participants;
begin
  if (select auth.uid()) is null or not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  if target_stage_status not in ('listener', 'invited', 'speaker') then
    raise exception 'Invalid stage status';
  end if;

  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    hand_raised_at,
    joined_at,
    invited_to_stage_at,
    promoted_at
  )
  values (
    target_room_id,
    target_user_id,
    case when target_stage_status = 'speaker' then 'Konusmaci' else 'Dinleyici' end,
    target_stage_status,
    target_stage_status <> 'speaker',
    null,
    now(),
    case when target_stage_status = 'invited' then now() else null end,
    case when target_stage_status = 'speaker' then now() else null end
  )
  on conflict (room_id, user_id) do update
  set role = case when target_stage_status = 'speaker' then 'Konusmaci' else 'Dinleyici' end,
      stage_status = target_stage_status,
      is_muted = target_stage_status <> 'speaker',
      hand_raised_at = null,
      invited_to_stage_at = case when target_stage_status = 'invited' then now() else public.live_room_participants.invited_to_stage_at end,
      promoted_at = case when target_stage_status = 'speaker' then now() else public.live_room_participants.promoted_at end
  returning * into participant_record;

  return participant_record;
end;
$$;

create or replace function public.moderator_control_live_room_video(
  target_room_id text,
  target_stream_url text,
  target_status text,
  target_position_millis integer
)
returns public.live_rooms
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requesting_user uuid;
  safe_stream_url text;
  safe_status text;
  room_record public.live_rooms;
begin
  requesting_user := (select auth.uid());
  safe_stream_url := nullif(trim(coalesce(target_stream_url, '')), '');
  safe_status := coalesce(nullif(trim(target_status), ''), 'paused');

  if requesting_user is null or not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  if safe_status not in ('idle', 'playing', 'paused') then
    raise exception 'Invalid video status';
  end if;

  if safe_stream_url is not null and safe_stream_url !~* '^https://' then
    raise exception 'A secure HTTPS stream URL is required';
  end if;

  update public.live_rooms
  set stream_url = safe_stream_url,
      voice_provider = 'livekit',
      livekit_room_name = coalesce(livekit_room_name, 'ehlibyte-' || id),
      status = case when status = 'offline' and safe_stream_url is not null then 'live' else status end,
      started_at = case when status = 'offline' and safe_stream_url is not null then now() else started_at end,
      video_playback_status = case when safe_stream_url is null then 'idle' else safe_status end,
      video_position_millis = case when safe_stream_url is null then 0 else greatest(coalesce(target_position_millis, 0), 0) end,
      video_updated_at = now(),
      video_controlled_by = requesting_user
  where id = target_room_id
  returning * into room_record;

  if room_record.id is null then
    raise exception 'Live room not found';
  end if;

  return room_record;
end;
$$;

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
  requesting_user uuid;
  participant_record public.live_room_participants;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id <> requesting_user and not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  update public.live_room_participants
  set is_muted = target_is_muted
  where room_id = target_room_id
    and user_id = target_user_id
  returning * into participant_record;

  if participant_record.user_id is null then
    raise exception 'Participant not found';
  end if;

  if target_is_muted = false and participant_record.stage_status <> 'speaker' then
    raise exception 'Only speakers can unmute';
  end if;

  return participant_record;
end;
$$;

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
  requesting_user uuid;
  participant_record public.live_room_participants;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id <> requesting_user and not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    hand_raised_at,
    joined_at
  )
  values (
    target_room_id,
    target_user_id,
    'Dinleyici',
    'listener',
    true,
    case when target_is_raised then now() else null end,
    now()
  )
  on conflict (room_id, user_id) do update
  set hand_raised_at = case when target_is_raised then now() else null end
  returning * into participant_record;

  return participant_record;
end;
$$;

create or replace function public.moderator_remove_live_participant(
  target_room_id text,
  target_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  delete from public.live_room_participants
  where room_id = target_room_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.admin_start_live_room(text, text, text, text) from public, anon;
revoke all on function public.admin_stop_live_room(text) from public, anon;
revoke all on function public.moderator_set_live_participant_stage(text, uuid, text) from public, anon;
revoke all on function public.moderator_control_live_room_video(text, text, text, integer) from public, anon;
revoke all on function public.set_live_participant_muted(text, uuid, boolean) from public, anon;
revoke all on function public.set_live_participant_hand_raised(text, uuid, boolean) from public, anon;
revoke all on function public.moderator_remove_live_participant(text, uuid) from public, anon;

grant execute on function public.admin_start_live_room(text, text, text, text) to authenticated;
grant execute on function public.admin_stop_live_room(text) to authenticated;
grant execute on function public.moderator_set_live_participant_stage(text, uuid, text) to authenticated;
grant execute on function public.moderator_control_live_room_video(text, text, text, integer) to authenticated;
grant execute on function public.set_live_participant_muted(text, uuid, boolean) to authenticated;
grant execute on function public.set_live_participant_hand_raised(text, uuid, boolean) to authenticated;
grant execute on function public.moderator_remove_live_participant(text, uuid) to authenticated;

notify pgrst, 'reload schema';
