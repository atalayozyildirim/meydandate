-- G3 — Real Communities and Events Schema & Server Contracts:
--   * Communities CRUD, open/closed membership, request/approve/reject, leave
--   * Closed community content protected at RLS level (non-members cannot read)
--   * Events CRUD, city/category/date filtering, capacity & concurrency control
--   * Organizer/admin authorization enforced on the server
--   * Atomic join/cancel event RPCs with row-level locks preventing capacity race conditions

-- 1. Communities Table
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  topic text not null default '',
  city text not null default 'Tüm şehirler',
  description text not null default '',
  cover_image_url text,
  icon text not null default 'people-outline',
  is_private boolean not null default false,
  creator_id uuid not null references public.users(id) on delete cascade,
  member_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_name_length check (char_length(btrim(name)) between 2 and 100),
  constraint communities_name_safe check (public.is_safe_user_text(name)),
  constraint communities_topic_safe check (public.is_safe_user_text(topic)),
  constraint communities_city_safe check (public.is_safe_user_text(city)),
  constraint communities_description_safe check (public.is_safe_user_text(description))
);

create index if not exists communities_city_idx on public.communities (city);
create index if not exists communities_is_private_idx on public.communities (is_private);
create index if not exists communities_creator_idx on public.communities (creator_id);

-- 2. Community Memberships
create table if not exists public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'moderator', 'member')),
  status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_memberships_unique unique (community_id, user_id)
);

create index if not exists community_memberships_community_idx
  on public.community_memberships (community_id, status);
create index if not exists community_memberships_user_idx
  on public.community_memberships (user_id, status);

-- 3. Community Posts (Content inside a community)
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  image_urls text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint community_posts_body_safe check (public.is_safe_user_text(body))
);

create index if not exists community_posts_community_idx
  on public.community_posts (community_id, created_at desc);

-- 4. Community Events
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete set null,
  organizer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('Atölye', 'Söyleşi', 'Buluşma', 'Konser', 'Diğer')),
  city text not null,
  district text not null default '',
  place text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 20 check (capacity between 1 and 5000),
  current_participants integer not null default 0 check (current_participants >= 0),
  image_url text,
  description text not null default '',
  accessibility text not null default '',
  bring text not null default '',
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_events_title_length check (char_length(btrim(title)) between 2 and 140),
  constraint community_events_title_safe check (public.is_safe_user_text(title)),
  constraint community_events_city_safe check (public.is_safe_user_text(city)),
  constraint community_events_place_safe check (public.is_safe_user_text(place)),
  constraint community_events_time_window check (ends_at >= starts_at)
);

create index if not exists community_events_city_idx
  on public.community_events (city, starts_at);
create index if not exists community_events_category_idx
  on public.community_events (category, starts_at);
create index if not exists community_events_community_idx
  on public.community_events (community_id);

-- 5. Event Participants
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint event_participants_unique unique (event_id, user_id)
);

create index if not exists event_participants_event_idx
  on public.event_participants (event_id, status);
create index if not exists event_participants_user_idx
  on public.event_participants (user_id, status);

-- 6. Helper authorization functions
create or replace function public.is_community_organizer(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.communities
    where id = target_community_id and creator_id = target_user_id
  )
  or exists (
    select 1 from public.community_memberships
    where community_id = target_community_id
      and user_id = target_user_id
      and role in ('organizer', 'moderator')
      and status = 'active'
  )
  or exists (
    select 1 from public.user_roles
    where "userId" = target_user_id and role = 'admin'
  );
$$;

revoke all on function public.is_community_organizer(uuid, uuid) from public;
grant execute on function public.is_community_organizer(uuid, uuid) to anon, authenticated;

create or replace function public.can_view_community_content(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.has_community_access())
    and (
      -- Open community content is visible to any eligible member
      exists (
        select 1 from public.communities
        where id = target_community_id and not is_private
      )
      -- Closed community content is strictly visible ONLY to active members or site admins
      or exists (
        select 1 from public.community_memberships
        where community_id = target_community_id
          and user_id = (select auth.uid())
          and status = 'active'
      )
      or exists (
        select 1 from public.user_roles
        where "userId" = (select auth.uid()) and role = 'admin'
      )
    );
$$;

revoke all on function public.can_view_community_content(uuid) from public;
grant execute on function public.can_view_community_content(uuid) to anon, authenticated;

-- 7. RLS Policies
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_events enable row level security;
alter table public.event_participants enable row level security;

-- Communities policies
create policy "Eligible members can read communities"
on public.communities for select to authenticated
using ((select public.has_community_access()));

create policy "Eligible members can create communities"
on public.communities for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = creator_id
);

create policy "Organizers and admins can update communities"
on public.communities for update to authenticated
using (public.is_community_organizer(id, (select auth.uid())))
with check (public.is_community_organizer(id, (select auth.uid())));

create policy "Creators and admins can delete communities"
on public.communities for delete to authenticated
using (
  creator_id = (select auth.uid())
  or (select public.is_admin())
);

-- Community Memberships policies
create policy "Users can read relevant memberships"
on public.community_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or public.can_view_community_content(community_id)
);

create policy "Users can request to join"
on public.community_memberships for insert to authenticated
with check (
  (select public.has_community_access())
  and user_id = (select auth.uid())
);

create policy "Organizers can update memberships"
on public.community_memberships for update to authenticated
using (public.is_community_organizer(community_id, (select auth.uid())))
with check (public.is_community_organizer(community_id, (select auth.uid())));

create policy "Users and organizers can remove memberships"
on public.community_memberships for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.is_community_organizer(community_id, (select auth.uid()))
);

-- Community Posts policies (Protected closed content)
create policy "Members can view community posts"
on public.community_posts for select to authenticated
using (public.can_view_community_content(community_id));

create policy "Active members can create community posts"
on public.community_posts for insert to authenticated
with check (
  (select public.has_community_access())
  and author_id = (select auth.uid())
  and exists (
    select 1 from public.community_memberships
    where community_id = public.community_posts.community_id
      and user_id = (select auth.uid())
      and status = 'active'
  )
);

create policy "Authors and organizers can delete community posts"
on public.community_posts for delete to authenticated
using (
  author_id = (select auth.uid())
  or public.is_community_organizer(community_id, (select auth.uid()))
);

-- Community Events policies
create policy "Eligible members can read events"
on public.community_events for select to authenticated
using (
  (select public.has_community_access())
  and (
    community_id is null
    or public.can_view_community_content(community_id)
  )
);

create policy "Eligible members can create events"
on public.community_events for insert to authenticated
with check (
  (select public.has_community_access())
  and organizer_id = (select auth.uid())
  and (
    community_id is null
    or public.is_community_organizer(community_id, (select auth.uid()))
  )
);

create policy "Organizers and admins can update events"
on public.community_events for update to authenticated
using (
  organizer_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  organizer_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Organizers and admins can delete events"
on public.community_events for delete to authenticated
using (
  organizer_id = (select auth.uid())
  or (select public.is_admin())
);

-- Event Participants policies
create policy "Eligible members can read participants"
on public.event_participants for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.community_events
    where id = public.event_participants.event_id
      and (organizer_id = (select auth.uid()) or (select public.is_admin()))
  )
);

-- Grants
grant select, insert, update, delete on public.communities to authenticated;
grant select, insert, update, delete on public.community_memberships to authenticated;
grant select, insert, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_events to authenticated;
grant select on public.event_participants to authenticated;

-- 8. Atomic RPCs

-- Join Community RPC
create or replace function public.join_community(target_community_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  comm_row public.communities%rowtype;
  existing_membership public.community_memberships%rowtype;
  new_status text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into comm_row from public.communities where id = target_community_id;
  if not found then
    raise exception 'community_not_found' using errcode = 'P0002';
  end if;

  select * into existing_membership from public.community_memberships
  where community_id = target_community_id and user_id = current_user_id;

  if found and existing_membership.status = 'active' then
    raise exception 'already_member' using errcode = '23505';
  end if;
  if found and existing_membership.status = 'pending' then
    raise exception 'already_requested' using errcode = '23505';
  end if;

  new_status := case when comm_row.is_private then 'pending' else 'active' end;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (target_community_id, current_user_id, 'member', new_status)
  on conflict (community_id, user_id) do update
    set status = new_status, updated_at = now();

  if new_status = 'active' then
    update public.communities
    set member_count = (
      select count(*) from public.community_memberships
      where community_id = target_community_id and status = 'active'
    )
    where id = target_community_id;
  end if;

  return jsonb_build_object(
    'communityId', target_community_id,
    'userId', current_user_id,
    'status', new_status,
    'isPrivate', comm_row.is_private
  );
end;
$$;

-- Leave Community RPC
create or replace function public.leave_community(target_community_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  comm_row public.communities%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into comm_row from public.communities where id = target_community_id;
  if not found then
    raise exception 'community_not_found' using errcode = 'P0002';
  end if;
  if comm_row.creator_id = current_user_id then
    raise exception 'creator_cannot_leave' using errcode = '42501';
  end if;

  delete from public.community_memberships
  where community_id = target_community_id and user_id = current_user_id;

  update public.communities
  set member_count = (
    select count(*) from public.community_memberships
    where community_id = target_community_id and status = 'active'
  )
  where id = target_community_id;

  return jsonb_build_object(
    'communityId', target_community_id,
    'userId', current_user_id,
    'status', 'left'
  );
end;
$$;

-- Respond to join request RPC (Approve / Reject)
create or replace function public.respond_community_join_request(
  target_community_id uuid,
  target_user_id uuid,
  accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_status text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_community_organizer(target_community_id, current_user_id) then
    raise exception 'organizer_required' using errcode = '42501';
  end if;

  new_status := case when accept then 'active' else 'rejected' end;

  update public.community_memberships
  set status = new_status, updated_at = now()
  where community_id = target_community_id and user_id = target_user_id;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  update public.communities
  set member_count = (
    select count(*) from public.community_memberships
    where community_id = target_community_id and status = 'active'
  )
  where id = target_community_id;

  return jsonb_build_object(
    'communityId', target_community_id,
    'userId', target_user_id,
    'status', new_status
  );
end;
$$;

-- Join Community Event RPC (Race condition proof with FOR UPDATE lock)
create or replace function public.join_community_event(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  event_row public.community_events%rowtype;
  active_count integer;
  existing_record public.event_participants%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.has_community_access() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  -- Atomic row lock on event prevents concurrent over-registration
  select * into event_row from public.community_events
  where id = target_event_id
  for update;

  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if event_row.is_cancelled then
    raise exception 'event_cancelled' using errcode = '42501';
  end if;
  if event_row.ends_at < now() then
    raise exception 'event_ended' using errcode = '42501';
  end if;

  -- If event is scoped to a private community, check membership
  if event_row.community_id is not null and not public.can_view_community_content(event_row.community_id) then
    raise exception 'private_community_member_required' using errcode = '42501';
  end if;

  select * into existing_record from public.event_participants
  where event_id = target_event_id and user_id = current_user_id
  for update;

  if existing_record.id is not null and existing_record.status = 'confirmed' then
    raise exception 'already_joined' using errcode = '23505';
  end if;

  select count(*) into active_count from public.event_participants
  where event_id = target_event_id and status = 'confirmed';

  if active_count >= event_row.capacity then
    raise exception 'capacity_full' using errcode = '42501';
  end if;

  if existing_record.id is not null then
    update public.event_participants
    set status = 'confirmed', registered_at = now(), cancelled_at = null
    where id = existing_record.id;
  else
    insert into public.event_participants (event_id, user_id, status)
    values (target_event_id, current_user_id, 'confirmed');
  end if;

  update public.community_events
  set current_participants = active_count + 1
  where id = target_event_id;

  return jsonb_build_object(
    'eventId', target_event_id,
    'userId', current_user_id,
    'status', 'confirmed',
    'participantsCount', active_count + 1,
    'capacity', event_row.capacity
  );
end;
$$;

-- Cancel Event Participation RPC
create or replace function public.cancel_event_participation(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  event_row public.community_events%rowtype;
  existing_record public.event_participants%rowtype;
  active_count integer;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into event_row from public.community_events
  where id = target_event_id
  for update;

  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  select * into existing_record from public.event_participants
  where event_id = target_event_id and user_id = current_user_id
  for update;

  if not found or existing_record.status <> 'confirmed' then
    raise exception 'not_registered' using errcode = 'P0002';
  end if;

  update public.event_participants
  set status = 'cancelled', cancelled_at = now()
  where id = existing_record.id;

  select count(*) into active_count from public.event_participants
  where event_id = target_event_id and status = 'confirmed';

  update public.community_events
  set current_participants = active_count
  where id = target_event_id;

  return jsonb_build_object(
    'eventId', target_event_id,
    'userId', current_user_id,
    'status', 'cancelled',
    'participantsCount', active_count
  );
end;
$$;

revoke all on function public.join_community(uuid) from public;
revoke all on function public.leave_community(uuid) from public;
revoke all on function public.respond_community_join_request(uuid, uuid, boolean) from public;
revoke all on function public.join_community_event(uuid) from public;
revoke all on function public.cancel_event_participation(uuid) from public;

grant execute on function public.join_community(uuid) to authenticated;
grant execute on function public.leave_community(uuid) to authenticated;
grant execute on function public.respond_community_join_request(uuid, uuid, boolean) to authenticated;
grant execute on function public.join_community_event(uuid) to authenticated;
grant execute on function public.cancel_event_participation(uuid) to authenticated;

notify pgrst, 'reload schema';
