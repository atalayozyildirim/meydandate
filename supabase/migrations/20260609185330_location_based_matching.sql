-- Konuma gore eslesme tercihini ve yakin aday listesini guvenli RPC'lerle yonetir.
alter table public.users
  add column if not exists "matchByLocation" boolean not null default false,
  add column if not exists "matchRadiusKm" integer not null default 50,
  add column if not exists "locationLatitude" double precision,
  add column if not exists "locationLongitude" double precision,
  add column if not exists "locationUpdatedAt" timestamptz;

do $$
begin
  alter table public.users
    add constraint users_match_radius_check
    check ("matchRadiusKm" between 5 and 250);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.users
    add constraint users_location_latitude_check
    check ("locationLatitude" is null or "locationLatitude" between -90 and 90);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.users
    add constraint users_location_longitude_check
    check ("locationLongitude" is null or "locationLongitude" between -180 and 180);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.users
    add constraint users_location_pair_check
    check (
      ("locationLatitude" is null and "locationLongitude" is null)
      or ("locationLatitude" is not null and "locationLongitude" is not null)
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists users_location_matching_idx
on public.users ("matchByLocation", "isActive", "isDiscoverable")
where "locationLatitude" is not null
  and "locationLongitude" is not null;

create or replace function public.distance_between_km(
  from_latitude double precision,
  from_longitude double precision,
  to_latitude double precision,
  to_longitude double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371.0 * 2.0 * asin(
    least(
      1.0,
      sqrt(
        power(sin(radians((to_latitude - from_latitude) / 2.0)), 2.0)
        + cos(radians(from_latitude))
          * cos(radians(to_latitude))
          * power(sin(radians((to_longitude - from_longitude) / 2.0)), 2.0)
      )
    )
  );
$$;

create or replace function public.set_location_matching(
  next_match_by_location boolean,
  next_radius_km integer,
  next_latitude double precision default null,
  next_longitude double precision default null
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.users;
  sanitized_radius integer;
  should_enable boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  should_enable := coalesce(next_match_by_location, false);
  sanitized_radius := least(greatest(coalesce(next_radius_km, 50), 5), 250);

  if (next_latitude is null) <> (next_longitude is null) then
    raise exception 'Latitude and longitude must be sent together';
  end if;

  if next_latitude is not null and (next_latitude < -90 or next_latitude > 90) then
    raise exception 'Latitude is out of range';
  end if;

  if next_longitude is not null and (next_longitude < -180 or next_longitude > 180) then
    raise exception 'Longitude is out of range';
  end if;

  if should_enable and (next_latitude is null or next_longitude is null) then
    select *
    into current_profile
    from public.users
    where id = (select auth.uid());

    if current_profile.id is null
      or current_profile."locationLatitude" is null
      or current_profile."locationLongitude" is null then
      raise exception 'Location is required';
    end if;
  end if;

  update public.users
  set
    "matchByLocation" = should_enable,
    "matchRadiusKm" = sanitized_radius,
    "locationLatitude" = coalesce(next_latitude, "locationLatitude"),
    "locationLongitude" = coalesce(next_longitude, "locationLongitude"),
    "locationUpdatedAt" = case
      when next_latitude is not null and next_longitude is not null then now()
      else "locationUpdatedAt"
    end
  where id = (select auth.uid())
  returning *
  into current_profile;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return current_profile;
end;
$$;

create or replace function public.list_location_discover_candidates()
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
  "isPremium" boolean,
  "isDiscoverable" boolean,
  "boostedUntil" timestamptz,
  "hasPassedEntryTest" boolean,
  "hasCompletedOnboarding" boolean,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  distance_km double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_profile public.users;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select *
  into current_profile
  from public.users
  where public.users.id = (select auth.uid());

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if not coalesce(current_profile."matchByLocation", false)
    or current_profile."locationLatitude" is null
    or current_profile."locationLongitude" is null then
    return;
  end if;

  return query
  with ranked as (
    select
      candidate.id,
      candidate.name,
      candidate.age,
      candidate.city,
      candidate.occupation,
      candidate.bio,
      candidate.hometown,
      candidate."favoriteSong",
      candidate."favoritePoet",
      candidate."culturalIdentity",
      candidate."cultureImportance",
      candidate.interests,
      candidate.photos,
      candidate.badges,
      candidate."isPremium",
      candidate."isDiscoverable",
      candidate."boostedUntil",
      candidate."hasPassedEntryTest",
      candidate."hasCompletedOnboarding",
      candidate."createdAt",
      candidate."updatedAt",
      public.distance_between_km(
        current_profile."locationLatitude",
        current_profile."locationLongitude",
        candidate."locationLatitude",
        candidate."locationLongitude"
      ) as distance_km
    from public.users as candidate
    where candidate.id <> current_profile.id
      and candidate."hasPassedEntryTest" = true
      and candidate."hasCompletedOnboarding" = true
      and candidate."isActive" = true
      and candidate."isDiscoverable" = true
      and candidate."locationLatitude" is not null
      and candidate."locationLongitude" is not null
      and not (candidate.id = any(current_profile."blockedUsers"))
      and not (candidate.id = any(current_profile."mutedUsers"))
      and not (current_profile.id = any(candidate."blockedUsers"))
      and not exists (
        select 1
        from public.swipes as swipe
        where swipe."userId" = current_profile.id
          and swipe."targetUserId" = candidate.id
      )
  )
  select
    ranked.id,
    ranked.name,
    ranked.age,
    ranked.city,
    ranked.occupation,
    ranked.bio,
    ranked.hometown,
    ranked."favoriteSong",
    ranked."favoritePoet",
    ranked."culturalIdentity",
    ranked."cultureImportance",
    ranked.interests,
    ranked.photos,
    ranked.badges,
    ranked."isPremium",
    ranked."isDiscoverable",
    ranked."boostedUntil",
    ranked."hasPassedEntryTest",
    ranked."hasCompletedOnboarding",
    ranked."createdAt",
    ranked."updatedAt",
    ranked.distance_km
  from ranked
  where ranked.distance_km <= current_profile."matchRadiusKm"
  order by
    case
      when ranked."boostedUntil" is not null and ranked."boostedUntil" > now() then 0
      else 1
    end,
    ranked.distance_km asc,
    ranked."isPremium" desc,
    ranked."createdAt" desc;
end;
$$;

revoke all on function public.distance_between_km(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon, authenticated;
revoke all on function public.set_location_matching(
  boolean,
  integer,
  double precision,
  double precision
) from public, anon;
revoke all on function public.list_location_discover_candidates() from public, anon;

grant execute on function public.set_location_matching(
  boolean,
  integer,
  double precision,
  double precision
) to authenticated;
grant execute on function public.list_location_discover_candidates() to authenticated;
