-- Uygulamanin profil, eslesme, sohbet ve moderasyon tablolarini feed'den once kurar.
create or replace function public.is_safe_user_text(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    value is not null
    and value !~* '<[[:space:]]*/?[[:space:]]*[a-z][^>]*>'
    and value !~* '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|svg|math|style|link|meta|form|input|button|textarea|base)'
    and value !~* '(javascript|vbscript|data)[[:space:]]*:'
    and value !~* 'on[a-z]+[[:space:]]*=';
$$;

create or replace function public.set_core_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  "phoneNumber" text unique,
  name text not null,
  age integer not null default 18,
  city text not null default '',
  occupation text,
  bio text not null default '',
  hometown text,
  "favoriteSong" text,
  "favoritePoet" text,
  "culturalIdentity" text not null default 'prefer_not_to_say',
  "cultureImportance" text not null default 'somewhat_important',
  interests text[] not null default '{}'::text[],
  photos jsonb not null default '[]'::jsonb,
  badges text[] not null default array['community_member']::text[],
  "isPremium" boolean not null default false,
  "hasPassedEntryTest" boolean not null default false,
  "hasCompletedOnboarding" boolean not null default false,
  "isActive" boolean not null default true,
  "blockedUsers" uuid[] not null default '{}'::uuid[],
  "mutedUsers" uuid[] not null default '{}'::uuid[],
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint users_age_check check (age between 18 and 120),
  constraint users_name_length_check check (char_length(name) between 1 and 80),
  constraint users_name_safe_check check (public.is_safe_user_text(name)),
  constraint users_city_length_check check (char_length(city) <= 80),
  constraint users_city_safe_check check (public.is_safe_user_text(city)),
  constraint users_bio_length_check check (char_length(bio) <= 280),
  constraint users_bio_safe_check check (public.is_safe_user_text(bio)),
  constraint users_occupation_safe_check
    check (occupation is null or public.is_safe_user_text(occupation)),
  constraint users_hometown_safe_check
    check (hometown is null or public.is_safe_user_text(hometown)),
  constraint users_favorite_song_safe_check
    check ("favoriteSong" is null or public.is_safe_user_text("favoriteSong")),
  constraint users_favorite_poet_safe_check
    check ("favoritePoet" is null or public.is_safe_user_text("favoritePoet")),
  constraint users_photos_array_check check (jsonb_typeof(photos) = 'array')
);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_core_updated_at();

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  "targetUserId" uuid not null references public.users(id) on delete cascade,
  action text not null,
  "createdAt" timestamptz not null default now(),
  constraint swipes_unique_pair unique ("userId", "targetUserId"),
  constraint swipes_not_self_check check ("userId" <> "targetUserId"),
  constraint swipes_action_check check (action in ('like', 'pass', 'super_like'))
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  "user1Id" uuid not null references public.users(id) on delete cascade,
  "user2Id" uuid not null references public.users(id) on delete cascade,
  "matchedAt" timestamptz not null default now(),
  constraint matches_not_self_check check ("user1Id" <> "user2Id")
);

create unique index if not exists matches_unique_pair_idx
on public.matches (
  least("user1Id", "user2Id"),
  greatest("user1Id", "user2Id")
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  "participant1Id" uuid not null references public.users(id) on delete cascade,
  "participant2Id" uuid not null references public.users(id) on delete cascade,
  "matchId" uuid unique references public.matches(id) on delete set null,
  "lastMessageAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint conversations_not_self_check check ("participant1Id" <> "participant2Id")
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  "conversationId" uuid not null references public.conversations(id) on delete cascade,
  "senderId" uuid not null references public.users(id) on delete cascade,
  body text not null,
  status text not null default 'sent',
  "createdAt" timestamptz not null default now(),
  constraint messages_body_length_check check (char_length(body) between 1 and 4000),
  constraint messages_body_safe_check check (public.is_safe_user_text(body)),
  constraint messages_status_check check (status in ('sending', 'sent', 'delivered', 'read'))
);

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  "reporterId" uuid not null references public.users(id) on delete cascade,
  "reportedUserId" uuid not null references public.users(id) on delete cascade,
  category text not null,
  description text not null default '',
  evidence text[] not null default '{}'::text[],
  status text not null default 'pending',
  "assignedTo" uuid references public.users(id) on delete set null,
  resolution text,
  "resolvedAt" timestamptz,
  "resolvedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  constraint reports_not_self_check check ("reporterId" <> "reportedUserId"),
  constraint reports_description_length_check check (char_length(description) <= 2000),
  constraint reports_description_safe_check check (public.is_safe_user_text(description)),
  constraint reports_category_check check (
    category in (
      'fake_profile', 'spam', 'harassment', 'inappropriate_content', 'other',
      'profanity', 'sexual_content', 'fraud'
    )
  ),
  constraint reports_status_check check (status in ('pending', 'in_review', 'resolved', 'dismissed'))
);

create table if not exists public.warnings (
  id text primary key default gen_random_uuid()::text,
  "userId" uuid not null references public.users(id) on delete cascade,
  "issuedBy" text not null default '',
  reason text not null,
  type text not null default 'warning',
  severity text not null,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint warnings_reason_length_check check (char_length(reason) between 1 and 1000),
  constraint warnings_reason_safe_check check (public.is_safe_user_text(reason)),
  constraint warnings_type_check check (type in ('warning', 'temporary_ban', 'permanent_ban')),
  constraint warnings_severity_check check (severity in ('low', 'medium', 'high'))
);

create table if not exists public.banned_users (
  id text primary key default gen_random_uuid()::text,
  "userId" uuid not null references public.users(id) on delete cascade,
  "banType" text not null,
  reason text not null,
  "bannedBy" text not null default '',
  "expiresAt" timestamptz,
  "appealedAt" timestamptz,
  "appealStatus" text,
  "createdAt" timestamptz not null default now(),
  constraint banned_users_type_check check ("banType" in ('temporary', 'permanent')),
  constraint banned_users_reason_safe_check check (public.is_safe_user_text(reason)),
  constraint banned_users_appeal_status_check
    check ("appealStatus" is null or "appealStatus" in ('pending', 'approved', 'rejected'))
);

create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null default '',
  action text not null,
  "targetType" text not null,
  "targetId" text,
  details jsonb not null default '{}'::jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.user_roles (
  id text primary key default gen_random_uuid()::text,
  "userId" uuid not null unique references public.users(id) on delete cascade,
  role text not null,
  "assignedAt" timestamptz not null default now(),
  "assignedBy" text not null default '',
  constraint user_roles_role_check check (role in ('user', 'moderator', 'admin'))
);

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where "userId" = (select auth.uid())
      and role in ('moderator', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where "userId" = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.get_my_profile()
returns setof public.users
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from public.users
  where id = (select auth.uid());
$$;

create or replace function public.set_user_active(target_user_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;

  update public.users
  set "isActive" = active
  where id = target_user_id;
end;
$$;

revoke all on function public.is_moderator() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.set_user_active(uuid, boolean) from public, anon;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

create index if not exists swipes_target_user_idx on public.swipes ("targetUserId", action);
create index if not exists matches_user1_idx on public.matches ("user1Id", "matchedAt" desc);
create index if not exists matches_user2_idx on public.matches ("user2Id", "matchedAt" desc);
create index if not exists conversations_participant1_idx on public.conversations ("participant1Id");
create index if not exists conversations_participant2_idx on public.conversations ("participant2Id");
create index if not exists messages_conversation_idx on public.messages ("conversationId", "createdAt");
create index if not exists messages_sender_id_idx on public.messages ("senderId");
create index if not exists reports_reported_user_idx on public.reports ("reportedUserId", "createdAt" desc);
create index if not exists reports_reporter_id_idx on public.reports ("reporterId");
create index if not exists reports_assigned_to_idx on public.reports ("assignedTo");
create index if not exists reports_resolved_by_idx on public.reports ("resolvedBy");
create index if not exists warnings_user_idx on public.warnings ("userId", "createdAt" desc);
create index if not exists banned_users_user_idx on public.banned_users ("userId", "createdAt" desc);
create index if not exists audit_logs_user_idx on public.audit_logs ("userId", "createdAt" desc);

alter table public.users enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.warnings enable row level security;
alter table public.banned_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_roles enable row level security;

create policy "Users can read community profiles"
on public.users for select to authenticated
using (id = (select auth.uid()) or ("hasCompletedOnboarding" and "isActive"));
create policy "Users can create their own profile"
on public.users for insert to authenticated
with check (id = (select auth.uid()));
create policy "Users and moderators can update allowed user fields"
on public.users for update to authenticated
using (id = (select auth.uid()) or (select public.is_moderator()))
with check (id = (select auth.uid()) or (select public.is_moderator()));

create policy "Users can read relevant swipes"
on public.swipes for select to authenticated
using ("userId" = (select auth.uid()) or "targetUserId" = (select auth.uid()));
create policy "Users can create their own swipes"
on public.swipes for insert to authenticated
with check ("userId" = (select auth.uid()));

create policy "Participants can read matches"
on public.matches for select to authenticated
using ("user1Id" = (select auth.uid()) or "user2Id" = (select auth.uid()));
create policy "Participants can create matches"
on public.matches for insert to authenticated
with check ("user1Id" = (select auth.uid()) or "user2Id" = (select auth.uid()));

create policy "Participants can read conversations"
on public.conversations for select to authenticated
using ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()));
create policy "Participants can create conversations"
on public.conversations for insert to authenticated
with check ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()));
create policy "Participants can update conversations"
on public.conversations for update to authenticated
using ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()))
with check ("participant1Id" = (select auth.uid()) or "participant2Id" = (select auth.uid()));

create policy "Participants can read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1
    from public.conversations as conversation
    where conversation.id = public.messages."conversationId"
      and (
        conversation."participant1Id" = (select auth.uid())
        or conversation."participant2Id" = (select auth.uid())
      )
  )
);
create policy "Participants can send messages"
on public.messages for insert to authenticated
with check (
  "senderId" = (select auth.uid())
  and exists (
    select 1
    from public.conversations as conversation
    where conversation.id = public.messages."conversationId"
      and (
        conversation."participant1Id" = (select auth.uid())
        or conversation."participant2Id" = (select auth.uid())
      )
  )
);

create policy "Users can read their own reports"
on public.reports for select to authenticated
using ("reporterId" = (select auth.uid()) or (select public.is_moderator()));
create policy "Users can create their own reports"
on public.reports for insert to authenticated
with check ("reporterId" = (select auth.uid()));
create policy "Moderators can update reports"
on public.reports for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

create policy "Users can read their warnings"
on public.warnings for select to authenticated
using ("userId" = (select auth.uid()) or (select public.is_moderator()));
create policy "Moderators can create warnings"
on public.warnings for insert to authenticated
with check ((select public.is_moderator()));

create policy "Users can read their bans"
on public.banned_users for select to authenticated
using ("userId" = (select auth.uid()) or (select public.is_moderator()));
create policy "Moderators can create bans"
on public.banned_users for insert to authenticated
with check ((select public.is_moderator()));
create policy "Moderators can delete bans"
on public.banned_users for delete to authenticated
using ((select public.is_moderator()));

create policy "Users can create their own audit events"
on public.audit_logs for insert to authenticated
with check ("userId" = (select auth.uid())::text or (select public.is_moderator()));
create policy "Moderators can read audit events"
on public.audit_logs for select to authenticated
using ((select public.is_moderator()));

create policy "Users can read their role"
on public.user_roles for select to authenticated
using ("userId" = (select auth.uid()) or (select public.is_moderator()));
create policy "Admins can create roles"
on public.user_roles for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins can update roles"
on public.user_roles for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete roles"
on public.user_roles for delete to authenticated
using ((select public.is_admin()));

revoke all on public.users from anon, authenticated;
revoke all on public.swipes from anon, authenticated;
revoke all on public.matches from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.warnings from anon, authenticated;
revoke all on public.banned_users from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;

grant select (
  id, name, age, city, occupation, bio, hometown, "favoriteSong", "favoritePoet",
  "culturalIdentity", "cultureImportance", interests, photos, badges, "isPremium",
  "hasPassedEntryTest", "hasCompletedOnboarding", "createdAt", "updatedAt"
) on public.users to authenticated;
grant insert (
  id, email, "phoneNumber", name, age, city, occupation, bio, hometown, "favoriteSong",
  "favoritePoet", "culturalIdentity", "cultureImportance", interests, photos
) on public.users to authenticated;
grant update (
  name, age, city, occupation, bio, hometown, "favoriteSong", "favoritePoet",
  "culturalIdentity", "cultureImportance", interests, photos, "hasPassedEntryTest",
  "hasCompletedOnboarding", "blockedUsers", "mutedUsers"
) on public.users to authenticated;

grant select, insert on public.swipes to authenticated;
grant select, insert on public.matches to authenticated;
grant select, insert on public.conversations to authenticated;
grant update ("lastMessageAt") on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.warnings to authenticated;
grant select, insert, delete on public.banned_users to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, delete on public.user_roles to authenticated;
