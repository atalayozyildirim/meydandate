alter table public.live_rooms
add column if not exists voice_provider text not null default 'livekit',
add column if not exists livekit_room_name text;

alter table public.live_room_participants
add column if not exists stage_status text not null default 'listener',
add column if not exists is_muted boolean not null default true,
add column if not exists invited_to_stage_at timestamptz,
add column if not exists promoted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'live_rooms_voice_provider_check'
  ) then
    alter table public.live_rooms
    add constraint live_rooms_voice_provider_check
    check (voice_provider in ('livekit', 'stream'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_room_participants_stage_status_check'
  ) then
    alter table public.live_room_participants
    add constraint live_room_participants_stage_status_check
    check (stage_status in ('listener', 'invited', 'speaker'));
  end if;
end
$$;

update public.live_rooms
set voice_provider = case
  when stream_url is null then 'livekit'
  else 'stream'
end,
livekit_room_name = coalesce(livekit_room_name, 'ehlibyte-' || id)
where livekit_room_name is null
   or voice_provider is null;

update public.live_room_participants
set stage_status = coalesce(stage_status, 'listener'),
is_muted = coalesce(is_muted, true)
where stage_status is null
   or is_muted is null;

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
    created_by,
    started_at,
    ended_at
  )
  values (
    target_room_id,
    target_title,
    target_description,
    'live',
    case when safe_stream_url is null then 'livekit' else 'stream' end,
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
      voice_provider = excluded.voice_provider,
      livekit_room_name = excluded.livekit_room_name,
      stream_url = excluded.stream_url,
      created_by = excluded.created_by,
      started_at = now(),
      ended_at = null
  returning * into room_record;

  insert into public.live_room_participants (
    room_id,
    user_id,
    role,
    stage_status,
    is_muted,
    joined_at,
    promoted_at
  )
  values (
    target_room_id,
    requesting_user,
    'Yonetici',
    'speaker',
    false,
    now(),
    now()
  )
  on conflict (room_id, user_id) do update
  set role = 'Yonetici',
      stage_status = 'speaker',
      is_muted = false,
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
      ended_at = now()
  where id = target_room_id
  returning * into room_record;

  update public.live_room_participants
  set stage_status = 'listener',
      is_muted = true
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
    now(),
    case when target_stage_status = 'invited' then now() else null end,
    case when target_stage_status = 'speaker' then now() else null end
  )
  on conflict (room_id, user_id) do update
  set role = case when target_stage_status = 'speaker' then 'Konusmaci' else 'Dinleyici' end,
      stage_status = target_stage_status,
      is_muted = target_stage_status <> 'speaker',
      invited_to_stage_at = case when target_stage_status = 'invited' then now() else public.live_room_participants.invited_to_stage_at end,
      promoted_at = case when target_stage_status = 'speaker' then now() else public.live_room_participants.promoted_at end
  returning * into participant_record;

  return participant_record;
end;
$$;

drop policy if exists "Moderators can update live participants" on public.live_room_participants;
create policy "Moderators can update live participants"
on public.live_room_participants for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

revoke all on function public.moderator_set_live_participant_stage(text, uuid, text) from public, anon;
grant execute on function public.moderator_set_live_participant_stage(text, uuid, text) to authenticated;

grant update on public.live_room_participants to authenticated;
