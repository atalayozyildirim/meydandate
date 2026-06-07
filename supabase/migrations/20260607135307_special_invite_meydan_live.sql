-- Rızalı özel davet akışı ve Meydan canlı yayın/sohbet altyapısı.
create or replace function public.normalize_person_name(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      trim(
        regexp_replace(
          translate(lower(coalesce(value, '')), 'âîûçğıöşü', 'aiucgiosu'),
          '[^a-z0-9]+',
          ' ',
          'g'
        )
      ),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );
$$;

create or replace function public.is_zeynep_cisem_alias(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text;
  tokens text[];
  token_count integer;
  has_zeynep boolean;
  has_cisem boolean;
  has_dogan boolean;
begin
  normalized := public.normalize_person_name(value);

  if normalized is null then
    return false;
  end if;

  tokens := regexp_split_to_array(normalized, '[[:space:]]+');
  token_count := cardinality(tokens);
  has_zeynep := 'zeynep' = any(tokens);
  has_cisem := 'cisem' = any(tokens);
  has_dogan := 'dogan' = any(tokens);

  return normalized = any(array[
      'cisem',
      'zeynep cisem',
      'zeynep dogan',
      'cisem dogan',
      'zeynep cisem dogan'
    ])
    or (has_cisem and token_count <= 5 and (token_count = 1 or has_zeynep or has_dogan))
    or (has_zeynep and has_dogan and token_count <= 5);
end;
$$;

create or replace function public.find_atalay_admin_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select users.id
  from public.users
  join public.user_roles
    on public.user_roles."userId" = public.users.id
  where public.user_roles.role = 'admin'
    and public.normalize_person_name(public.users.name) = 'atalay ozyildirim'
  order by public.users."createdAt" asc
  limit 1;
$$;

create table if not exists public.special_match_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null,
  invitee_user_id uuid,
  target_name text not null default 'Zeynep Çisem Doğan',
  source text not null default 'zeynep_cisem_alias',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  constraint special_match_invites_inviter_id_fkey
    foreign key (inviter_id) references public.users(id) on delete cascade,
  constraint special_match_invites_invitee_user_id_fkey
    foreign key (invitee_user_id) references public.users(id) on delete cascade,
  constraint special_match_invites_status_check
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint special_match_invites_target_name_length_check
    check (char_length(target_name) between 1 and 120),
  constraint special_match_invites_target_name_safe_check
    check (public.is_safe_user_text(target_name)),
  constraint special_match_invites_source_check
    check (source in ('zeynep_cisem_alias', 'admin_manual'))
);

create unique index if not exists special_match_invites_unique_invitee_idx
on public.special_match_invites (inviter_id, invitee_user_id, source)
where invitee_user_id is not null;

create index if not exists special_match_invites_invitee_pending_idx
on public.special_match_invites (invitee_user_id, status, created_at desc);

create index if not exists special_match_invites_inviter_idx
on public.special_match_invites (inviter_id, created_at desc);

drop trigger if exists set_special_match_invites_updated_at on public.special_match_invites;
create trigger set_special_match_invites_updated_at
before update on public.special_match_invites
for each row execute function public.set_updated_at();

create or replace function public.claim_zeynep_cisem_invite()
returns public.special_match_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid;
  current_name text;
  admin_user uuid;
  invite_record public.special_match_invites;
begin
  requesting_user := (select auth.uid());

  if requesting_user is null then
    raise exception 'Authentication required';
  end if;

  select name
  into current_name
  from public.users
  where id = requesting_user;

  if not public.is_zeynep_cisem_alias(current_name) then
    return null;
  end if;

  admin_user := public.find_atalay_admin_user_id();

  if admin_user is null or admin_user = requesting_user then
    return null;
  end if;

  select *
  into invite_record
  from public.special_match_invites
  where inviter_id = admin_user
    and invitee_user_id = requesting_user
    and source = 'zeynep_cisem_alias'
  order by created_at desc
  limit 1;

  if invite_record.id is not null then
    if invite_record.status = 'pending' then
      return invite_record;
    end if;

    return null;
  end if;

  insert into public.special_match_invites (
    inviter_id,
    invitee_user_id,
    target_name,
    source,
    status
  )
  values (
    admin_user,
    requesting_user,
    current_name,
    'zeynep_cisem_alias',
    'pending'
  )
  returning * into invite_record;

  return invite_record;
end;
$$;

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
security definer
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

  insert into public.conversations ("participant1Id", "participant2Id", "matchId", "lastMessageAt")
  values (invite_record.inviter_id, requesting_user, match_id, now())
  on conflict ("matchId") do nothing;

  update public.special_match_invites
  set status = 'accepted',
      accepted_at = now()
  where id = invite_record.id;

  return match_id;
end;
$$;

create or replace function public.decline_special_match_invite(invite_id uuid)
returns void
language plpgsql
security definer
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

create table if not exists public.live_rooms (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'scheduled',
  stream_url text,
  created_by uuid references public.users(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_rooms_status_check check (status in ('offline', 'scheduled', 'live')),
  constraint live_rooms_title_length_check check (char_length(title) between 1 and 120),
  constraint live_rooms_title_safe_check check (public.is_safe_user_text(title)),
  constraint live_rooms_description_length_check check (char_length(description) <= 500),
  constraint live_rooms_description_safe_check check (public.is_safe_user_text(description)),
  constraint live_rooms_stream_url_check
    check (
      stream_url is null
      or (
        char_length(stream_url) between 8 and 2048
        and stream_url ~* '^https://'
      )
    )
);

create table if not exists public.live_room_participants (
  room_id text not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'Izleyici',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint live_room_participants_role_length_check check (char_length(role) between 1 and 40),
  constraint live_room_participants_role_safe_check check (public.is_safe_user_text(role))
);

create table if not exists public.live_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.live_rooms(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint live_room_messages_body_length_check check (char_length(body) between 1 and 800),
  constraint live_room_messages_body_safe_check check (public.is_safe_user_text(body))
);

create index if not exists live_room_participants_room_idx
on public.live_room_participants (room_id, joined_at desc);

create index if not exists live_room_messages_room_idx
on public.live_room_messages (room_id, created_at desc);

create index if not exists live_room_messages_sender_idx
on public.live_room_messages (sender_id, created_at desc);

drop trigger if exists set_live_rooms_updated_at on public.live_rooms;
create trigger set_live_rooms_updated_at
before update on public.live_rooms
for each row execute function public.set_updated_at();

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
security definer
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

alter table public.special_match_invites enable row level security;
alter table public.live_rooms enable row level security;
alter table public.live_room_participants enable row level security;
alter table public.live_room_messages enable row level security;

create policy "Invite participants can read special invites"
on public.special_match_invites for select to authenticated
using (
  inviter_id = (select auth.uid())
  or invitee_user_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Admins can create special invites"
on public.special_match_invites for insert to authenticated
with check (
  inviter_id = (select auth.uid())
  and (select public.is_admin())
);

create policy "Invite participants can update special invites"
on public.special_match_invites for update to authenticated
using (
  inviter_id = (select auth.uid())
  or invitee_user_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  inviter_id = (select auth.uid())
  or invitee_user_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Admins can delete special invites"
on public.special_match_invites for delete to authenticated
using ((select public.is_admin()));

create policy "Authenticated users can read live rooms"
on public.live_rooms for select to authenticated
using (true);

create policy "Admins can create live rooms"
on public.live_rooms for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update live rooms"
on public.live_rooms for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Authenticated users can read live participants"
on public.live_room_participants for select to authenticated
using (true);

create policy "Users can join live rooms"
on public.live_room_participants for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users and admins can leave live rooms"
on public.live_room_participants for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Authenticated users can read live chat"
on public.live_room_messages for select to authenticated
using (true);

create policy "Joined users can write live chat"
on public.live_room_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.live_room_participants as participants
    where participants.room_id = public.live_room_messages.room_id
      and participants.user_id = (select auth.uid())
  )
);

revoke all on function public.normalize_person_name(text) from public, anon;
revoke all on function public.is_zeynep_cisem_alias(text) from public, anon;
revoke all on function public.find_atalay_admin_user_id() from public, anon;
revoke all on function public.claim_zeynep_cisem_invite() from public, anon;
revoke all on function public.get_pending_special_match_invite() from public, anon;
revoke all on function public.accept_special_match_invite(uuid) from public, anon;
revoke all on function public.decline_special_match_invite(uuid) from public, anon;
revoke all on function public.admin_start_live_room(text, text, text, text) from public, anon;
revoke all on function public.admin_stop_live_room(text) from public, anon;

grant execute on function public.normalize_person_name(text) to authenticated;
grant execute on function public.is_zeynep_cisem_alias(text) to authenticated;
grant execute on function public.find_atalay_admin_user_id() to authenticated;
grant execute on function public.claim_zeynep_cisem_invite() to authenticated;
grant execute on function public.get_pending_special_match_invite() to authenticated;
grant execute on function public.accept_special_match_invite(uuid) to authenticated;
grant execute on function public.decline_special_match_invite(uuid) to authenticated;
grant execute on function public.admin_start_live_room(text, text, text, text) to authenticated;
grant execute on function public.admin_stop_live_room(text) to authenticated;

revoke all on public.special_match_invites from anon, authenticated;
revoke all on public.live_rooms from anon, authenticated;
revoke all on public.live_room_participants from anon, authenticated;
revoke all on public.live_room_messages from anon, authenticated;

grant select, insert, update, delete on public.special_match_invites to authenticated;
grant select, insert, update on public.live_rooms to authenticated;
grant select, insert, delete on public.live_room_participants to authenticated;
grant select, insert on public.live_room_messages to authenticated;

insert into public.live_rooms (id, title, description, status)
values (
  'meydan-erkani',
  'Meydan',
  'Admin yayını açtığında herkes aynı canlı akışı ve sohbeti burada görür.',
  'scheduled'
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description;
