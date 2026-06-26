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

revoke all on function public.moderator_set_live_participant_stage(text, uuid, text)
from public, anon;
grant execute on function public.moderator_set_live_participant_stage(text, uuid, text)
to authenticated;

notify pgrst, 'reload schema';
