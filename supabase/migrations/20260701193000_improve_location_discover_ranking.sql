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
      candidate."fireScore",
      candidate."hasPassedEntryTest",
      candidate."hasCompletedOnboarding",
      candidate."createdAt",
      candidate."updatedAt",
      public.distance_between_km(
        current_profile."locationLatitude",
        current_profile."locationLongitude",
        candidate."locationLatitude",
        candidate."locationLongitude"
      ) as distance_km,
      exists (
        select 1
        from public.swipes as inbound_swipe
        where inbound_swipe."userId" = candidate.id
          and inbound_swipe."targetUserId" = current_profile.id
          and inbound_swipe.action <> 'pass'
      ) as liked_current_user,
      cardinality(
        array(
          select unnest(coalesce(candidate.interests, array[]::text[]))
          intersect
          select unnest(coalesce(current_profile.interests, array[]::text[]))
        )
      ) as shared_interest_count
    from public.users as candidate
    where candidate.id <> current_profile.id
      and candidate."hasPassedEntryTest" = true
      and candidate."hasCompletedOnboarding" = true
      and candidate."isActive" = true
      and candidate."isDiscoverable" = true
      and candidate."profileKind" = 'member'
      and candidate."locationLatitude" is not null
      and candidate."locationLongitude" is not null
      and not (candidate.id = any(coalesce(current_profile."blockedUsers", array[]::uuid[])))
      and not (candidate.id = any(coalesce(current_profile."mutedUsers", array[]::uuid[])))
      and not (current_profile.id = any(coalesce(candidate."blockedUsers", array[]::uuid[])))
      and not exists (
        select 1
        from public.swipes as swipe
        where swipe."userId" = current_profile.id
          and swipe."targetUserId" = candidate.id
      )
  ),
  scored as (
    select
      ranked.*,
      (
        case when ranked.liked_current_user then 48.0 else 0.0 end
        + power(
            greatest(0.0, 1.0 - (ranked.distance_km / greatest(current_profile."matchRadiusKm", 1))),
            1.35
          ) * 34.0
        + case
            when ranked.distance_km <= 10 then 8.0
            when ranked.distance_km <= 25 then 5.0
            else 0.0
          end
        + case
            when lower(trim(coalesce(ranked.city, ''))) <> ''
              and lower(trim(coalesce(ranked.city, ''))) = lower(trim(coalesce(current_profile.city, '')))
              then 7.0
            else 0.0
          end
        + case
            when lower(trim(coalesce(ranked.hometown, ''))) <> ''
              and lower(trim(coalesce(ranked.hometown, ''))) = lower(trim(coalesce(current_profile.hometown, '')))
              then 4.0
            else 0.0
          end
        + least(18.0, ranked.shared_interest_count * 5.0)
        + case
            when ranked."cultureImportance" = current_profile."cultureImportance" then 10.0
            else 0.0
          end
        + case
            when ranked."boostedUntil" is not null and ranked."boostedUntil" > now() then 30.0
            else 0.0
          end
        + least(24.0, ln(1 + greatest(coalesce(ranked."fireScore", 0), 0)) * 4.8)
        + case when ranked."isPremium" then 6.0 else 0.0 end
        + greatest(0.0, 14.0 - extract(epoch from (now() - ranked."updatedAt")) / 86400.0 * 1.2)
        + greatest(0.0, 8.0 - extract(epoch from (now() - ranked."createdAt")) / 86400.0 / 2.0)
      ) as match_score
    from ranked
  )
  select
    scored.id,
    scored.name,
    scored.age,
    scored.city,
    scored.occupation,
    scored.bio,
    scored.hometown,
    scored."favoriteSong",
    scored."favoritePoet",
    scored."culturalIdentity",
    scored."cultureImportance",
    scored.interests,
    scored.photos,
    scored.badges,
    scored."isPremium",
    scored."isDiscoverable",
    scored."boostedUntil",
    scored."hasPassedEntryTest",
    scored."hasCompletedOnboarding",
    scored."createdAt",
    scored."updatedAt",
    scored.distance_km
  from scored
  where scored.distance_km <= current_profile."matchRadiusKm"
  order by
    scored.match_score desc,
    scored.distance_km asc,
    scored."updatedAt" desc;
end;
$$;

revoke all on function public.list_location_discover_candidates() from public, anon;
grant execute on function public.list_location_discover_candidates() to authenticated;

notify pgrst, 'reload schema';
