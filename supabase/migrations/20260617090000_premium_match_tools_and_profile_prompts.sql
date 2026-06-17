-- Premium match araçları ve profil soru cevapları.

create or replace function public.is_safe_profile_prompts(prompts jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(prompts) = 'array'
    and jsonb_array_length(prompts) <= 4
    and not exists (
      select 1
      from jsonb_array_elements(prompts) as prompt(value)
      where jsonb_typeof(prompt.value) <> 'object'
        or coalesce(char_length(prompt.value ->> 'questionId'), 0) not between 1 and 64
        or coalesce(char_length(prompt.value ->> 'question'), 0) not between 1 and 160
        or coalesce(char_length(prompt.value ->> 'answer'), 0) > 220
        or not public.is_safe_user_text(coalesce(prompt.value ->> 'answer', ''))
    );
$$;

alter table public.users
  add column if not exists "profilePrompts" jsonb not null default '[]'::jsonb;

alter table public.users
  drop constraint if exists users_profile_prompts_check;

alter table public.users
  add constraint users_profile_prompts_check
  check (public.is_safe_profile_prompts("profilePrompts"));

grant select ("profilePrompts") on public.users to authenticated;
grant update ("profilePrompts") on public.users to authenticated;

create index if not exists swipes_user_created_at_idx
on public.swipes ("userId", "createdAt" desc);

create index if not exists swipes_target_positive_idx
on public.swipes ("targetUserId", "createdAt" desc)
where action in ('like', 'super_like');

create or replace function public.record_swipe(
  target_user_id uuid,
  next_action text
)
returns table (
  action text,
  match_id uuid,
  matched boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_can_swipe boolean;
  requester_blocked_users uuid[];
  requester_muted_users uuid[];
  target_profile_kind text;
  target_blocked_users uuid[];
  existing_match_id uuid;
  created_match_id uuid;
  has_reverse_positive boolean;
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id is null or target_user_id = requester_id then
    raise exception 'Invalid swipe target';
  end if;

  if next_action not in ('like', 'pass', 'super_like') then
    raise exception 'Invalid swipe action';
  end if;

  select "isActive" and "hasCompletedOnboarding", "blockedUsers", "mutedUsers"
  into requester_can_swipe, requester_blocked_users, requester_muted_users
  from public.users
  where id = requester_id;

  if not found or not coalesce(requester_can_swipe, false) then
    raise exception 'Requester profile is not eligible';
  end if;

  select "profileKind", "blockedUsers"
  into target_profile_kind, target_blocked_users
  from public.users
  where id = target_user_id
    and "isActive" = true
    and "hasCompletedOnboarding" = true;

  if target_profile_kind is null then
    raise exception 'Swipe target not found';
  end if;

  if target_user_id = any(coalesce(requester_blocked_users, '{}'::uuid[]))
    or target_user_id = any(coalesce(requester_muted_users, '{}'::uuid[]))
    or requester_id = any(coalesce(target_blocked_users, '{}'::uuid[])) then
    raise exception 'Swipe target unavailable';
  end if;

  insert into public.swipes ("userId", "targetUserId", action, "createdAt")
  values (requester_id, target_user_id, next_action, now())
  on conflict ("userId", "targetUserId")
  do update set
    action = excluded.action,
    "createdAt" = now();

  if next_action <> 'pass' then
    select exists (
      select 1
      from public.swipes
      where "userId" = target_user_id
        and "targetUserId" = requester_id
        and public.swipes.action in ('like', 'super_like')
    )
    into has_reverse_positive;

    if has_reverse_positive or target_profile_kind in ('starter', 'ai_starter') then
      select id
      into existing_match_id
      from public.matches
      where ("user1Id" = requester_id and "user2Id" = target_user_id)
         or ("user1Id" = target_user_id and "user2Id" = requester_id)
      limit 1;

      if existing_match_id is null then
        begin
          insert into public.matches ("user1Id", "user2Id", "matchedAt")
          values (requester_id, target_user_id, now())
          returning id into created_match_id;
        exception
          when unique_violation then
            select id
            into created_match_id
            from public.matches
            where ("user1Id" = requester_id and "user2Id" = target_user_id)
               or ("user1Id" = target_user_id and "user2Id" = requester_id)
            limit 1;
        end;
      else
        created_match_id := existing_match_id;
      end if;

      insert into public.conversations ("participant1Id", "participant2Id", "matchId", "lastMessageAt")
      values (requester_id, target_user_id, created_match_id, now())
      on conflict ("matchId") do nothing;
    end if;
  end if;

  return query
  select next_action, created_match_id, created_match_id is not null;
end;
$$;

create or replace function public.undo_last_swipe()
returns table (
  target_user_id uuid,
  action text,
  match_removed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_is_premium boolean;
  last_swipe record;
  target_match_id uuid;
  has_messages boolean;
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  select "isPremium"
  into requester_is_premium
  from public.users
  where id = requester_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if not coalesce(requester_is_premium, false) then
    raise exception 'Premium required';
  end if;

  select id, "targetUserId", action, "createdAt"
  into last_swipe
  from public.swipes
  where "userId" = requester_id
  order by "createdAt" desc
  limit 1;

  if not found then
    raise exception 'No swipe to undo';
  end if;

  if last_swipe."createdAt" < now() - interval '30 minutes' then
    raise exception 'Undo window expired';
  end if;

  select id
  into target_match_id
  from public.matches
  where ("user1Id" = requester_id and "user2Id" = last_swipe."targetUserId")
     or ("user1Id" = last_swipe."targetUserId" and "user2Id" = requester_id)
  limit 1;

  if target_match_id is not null then
    select exists (
      select 1
      from public.messages
      where "conversationId" in (
        select id
        from public.conversations
        where "matchId" = target_match_id
      )
    )
    into has_messages;

    if has_messages then
      raise exception 'Matched conversation already has messages';
    end if;
  end if;

  delete from public.swipes
  where id = last_swipe.id;

  if target_match_id is not null then
    delete from public.conversations
    where "matchId" = target_match_id;

    delete from public.matches
    where id = target_match_id;
  end if;

  return query
  select last_swipe."targetUserId"::uuid, last_swipe.action::text, target_match_id is not null;
end;
$$;

create or replace function public.list_liked_me_profiles(limit_count integer default 24)
returns table (
  id uuid,
  name text,
  age integer,
  city text,
  occupation text,
  bio text,
  hometown text,
  "favoriteSong" text,
  "favoritePoet" text,
  "culturalIdentity" text,
  "cultureImportance" text,
  interests text[],
  photos jsonb,
  badges text[],
  "profileKind" text,
  "isPremium" boolean,
  "isDiscoverable" boolean,
  "matchByLocation" boolean,
  "matchRadiusKm" integer,
  "locationLatitude" double precision,
  "locationLongitude" double precision,
  "locationUpdatedAt" timestamptz,
  "boostedUntil" timestamptz,
  "fireScore" integer,
  "profilePrompts" jsonb,
  "hasPassedEntryTest" boolean,
  "hasCompletedOnboarding" boolean,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "likeAction" text,
  "likedAt" timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  requester_profile record;
  safe_limit integer := least(greatest(coalesce(limit_count, 24), 1), 50);
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  select "isPremium", "blockedUsers", "mutedUsers"
  into requester_profile
  from public.users as requester
  where requester.id = requester_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if not coalesce(requester_profile."isPremium", false) then
    raise exception 'Premium required';
  end if;

  return query
  select
    liker.id,
    liker.name,
    liker.age,
    liker.city,
    liker.occupation,
    liker.bio,
    liker.hometown,
    liker."favoriteSong",
    liker."favoritePoet",
    liker."culturalIdentity",
    liker."cultureImportance",
    liker.interests,
    liker.photos,
    liker.badges,
    liker."profileKind",
    liker."isPremium",
    liker."isDiscoverable",
    liker."matchByLocation",
    liker."matchRadiusKm",
    liker."locationLatitude",
    liker."locationLongitude",
    liker."locationUpdatedAt",
    liker."boostedUntil",
    liker."fireScore",
    liker."profilePrompts",
    liker."hasPassedEntryTest",
    liker."hasCompletedOnboarding",
    liker."createdAt",
    liker."updatedAt",
    inbound.action as "likeAction",
    inbound."createdAt" as "likedAt"
  from public.swipes as inbound
  join public.users as liker
    on liker.id = inbound."userId"
  where inbound."targetUserId" = requester_id
    and inbound.action in ('like', 'super_like')
    and liker."isActive" = true
    and liker."hasCompletedOnboarding" = true
    and not (liker.id = any(coalesce(requester_profile."blockedUsers", '{}'::uuid[])))
    and not (liker.id = any(coalesce(requester_profile."mutedUsers", '{}'::uuid[])))
    and not (requester_id = any(coalesce(liker."blockedUsers", '{}'::uuid[])))
    and not exists (
      select 1
      from public.matches as existing_match
      where (existing_match."user1Id" = requester_id and existing_match."user2Id" = liker.id)
         or (existing_match."user1Id" = liker.id and existing_match."user2Id" = requester_id)
    )
    and not exists (
      select 1
      from public.swipes as own_swipe
      where own_swipe."userId" = requester_id
        and own_swipe."targetUserId" = liker.id
    )
  order by
    case when inbound.action = 'super_like' then 0 else 1 end,
    inbound."createdAt" desc
  limit safe_limit;
end;
$$;

revoke all on function public.is_safe_profile_prompts(jsonb) from public, anon, authenticated;
revoke all on function public.record_swipe(uuid, text) from public, anon;
revoke all on function public.undo_last_swipe() from public, anon;
revoke all on function public.list_liked_me_profiles(integer) from public, anon;

grant execute on function public.record_swipe(uuid, text) to authenticated;
grant execute on function public.undo_last_swipe() to authenticated;
grant execute on function public.list_liked_me_profiles(integer) to authenticated;

notify pgrst, 'reload schema';
