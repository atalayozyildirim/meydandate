-- Security advisor yuzeyini azaltmak icin RLS ile calisabilen RPC'leri invoker yapar.
create or replace function public.get_pending_special_match_invite()
returns table (
  id uuid,
  inviter_id uuid,
  inviter_name text,
  inviter_city text,
  inviter_photo_uri text,
  target_name text,
  status text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requesting_user uuid;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    invites.id,
    invites.inviter_id,
    inviter.name as inviter_name,
    inviter.city as inviter_city,
    inviter.photos->0->>'uri' as inviter_photo_uri,
    invites.target_name,
    invites.status,
    invites.created_at
  from public.special_match_invites as invites
  join public.users as inviter
    on inviter.id = invites.inviter_id
  where invites.invitee_user_id = requesting_user
    and invites.status = 'pending'
  order by invites.created_at desc
  limit 1;
end;
$$;

create or replace function public.decline_special_match_invite(invite_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requesting_user uuid;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  update public.special_match_invites
  set status = 'declined',
      declined_at = now()
  where id = invite_id
    and invitee_user_id = requesting_user
    and status = 'pending';
end;
$$;

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
  room_record public.live_rooms;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null or not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  if target_stream_url is null or target_stream_url !~* '^https://' then
    raise exception 'A secure HTTPS stream URL is required';
  end if;

  insert into public.live_rooms (
    id,
    title,
    description,
    status,
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
    target_stream_url,
    requesting_user,
    now(),
    null
  )
  on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      status = 'live',
      stream_url = excluded.stream_url,
      created_by = excluded.created_by,
      started_at = now(),
      ended_at = null
  returning * into room_record;

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
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  update public.live_rooms
  set status = 'offline',
      ended_at = now()
  where id = target_room_id
  returning * into room_record;

  return room_record;
end;
$$;

revoke all on function public.find_atalay_admin_user_id() from authenticated;

revoke all on function public.get_pending_special_match_invite() from public, anon;
revoke all on function public.decline_special_match_invite(uuid) from public, anon;
revoke all on function public.admin_start_live_room(text, text, text, text) from public, anon;
revoke all on function public.admin_stop_live_room(text) from public, anon;

grant execute on function public.get_pending_special_match_invite() to authenticated;
grant execute on function public.decline_special_match_invite(uuid) to authenticated;
grant execute on function public.admin_start_live_room(text, text, text, text) to authenticated;
grant execute on function public.admin_stop_live_room(text) to authenticated;
