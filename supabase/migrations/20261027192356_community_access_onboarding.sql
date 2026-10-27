-- G1 — Community access / onboarding server contract.
--
-- Why a private schema:
--   * Birth dates, legal acceptances and community membership must never be
--     readable or writable through the Data API. `private` is not listed in
--     config.toml [api].schemas and anon/authenticated get no USAGE on it.
--   * public.users columns such as age / "hasCompletedOnboarding" /
--     "hasPassedEntryTest" were client-writable and default to an adult age, so
--     they are NOT proof of eligibility. They are kept only for legacy readers.
--
-- Why SECURITY DEFINER on the public RPCs:
--   * They read/write private tables the caller cannot touch directly.
--   * Every function derives the user exclusively from auth.uid(), pins
--     search_path = '' and fully qualifies all objects, and EXECUTE is granted
--     only to the roles listed next to each function.
--
-- Data preservation: no existing rows are deleted or rewritten. Existing
-- accounts simply have no private.community_members row and therefore must
-- complete the new onboarding before they regain access.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists private.legal_documents (
  kind text not null,
  version text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  -- NULL until the owner confirms the open legal questions and publishes.
  published_at timestamptz,
  is_current boolean not null default false,
  primary key (kind, version),
  constraint legal_documents_kind_check
    check (kind in ('terms', 'privacy', 'kvkk', 'community_rules')),
  constraint legal_documents_version_check
    check (version ~ '^[0-9A-Za-z._-]{1,100}$'),
  constraint legal_documents_title_check check (char_length(btrim(title)) between 1 and 200),
  -- Guard against publishing empty/placeholder bodies.
  constraint legal_documents_body_check check (char_length(btrim(body)) >= 500),
  constraint legal_documents_current_is_published
    check (not is_current or published_at is not null)
);

create unique index if not exists legal_documents_one_current_per_kind
  on private.legal_documents (kind) where is_current;

create table if not exists private.community_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null,
  -- Self-declared at onboarding; this is NOT an identity verification.
  birth_date_source text not null default 'self_declared',
  display_name text not null,
  city text not null,
  interests text[] not null default '{}'::text[],
  onboarded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_members_birth_source_check
    check (birth_date_source in ('self_declared')),
  constraint community_members_display_name_check
    check (char_length(display_name) between 2 and 80 and public.is_safe_user_text(display_name)),
  constraint community_members_city_check
    check (char_length(city) between 1 and 80 and public.is_safe_user_text(city)),
  constraint community_members_interests_check
    check (cardinality(interests) <= 10)
);

create table if not exists private.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  version text not null,
  -- Server clock only; client timestamps are never accepted as evidence.
  accepted_at timestamptz not null default now(),
  source text not null default 'onboarding',
  constraint legal_acceptances_kind_check check (kind in ('terms', 'community_rules')),
  constraint legal_acceptances_document_fk
    foreign key (kind, version) references private.legal_documents (kind, version),
  constraint legal_acceptances_unique unique (user_id, kind, version)
);

create index if not exists legal_acceptances_document_idx
  on private.legal_acceptances (kind, version);

-- Optional, separate preferences. Default is "not granted" (no row = false).
create table if not exists private.optional_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  granted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint optional_consents_kind_check check (kind in ('marketing', 'tracking'))
);

alter table private.legal_documents enable row level security;
alter table private.community_members enable row level security;
alter table private.legal_acceptances enable row level security;
alter table private.optional_consents enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers (not callable through the Data API)
-- ---------------------------------------------------------------------------

create or replace function private.istanbul_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Istanbul')::date;
$$;

create or replace function private.age_on(birth date, on_date date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select extract(year from pg_catalog.age(on_date, birth))::integer;
$$;

-- 18+ on the Europe/Istanbul calendar day. Someone born on 29 Feb becomes 18
-- on 1 Mar in non-leap years (matches src/features/community/ageGate.ts).
create or replace function private.is_adult_birth_date(birth date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select birth is not null
    and birth <= private.istanbul_today()
    and private.age_on(birth, private.istanbul_today()) between 18 and 120;
$$;

create or replace function private.current_legal_version(document_kind text)
returns text
language sql
stable
set search_path = ''
as $$
  select version
  from private.legal_documents
  where kind = document_kind and is_current
  limit 1;
$$;

create or replace function private.has_accepted_current_terms(target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.current_legal_version('terms') is not null
    and private.current_legal_version('community_rules') is not null
    and exists (
      select 1 from private.legal_acceptances
      where user_id = target_user_id
        and kind = 'terms'
        and version = private.current_legal_version('terms')
    )
    and exists (
      select 1 from private.legal_acceptances
      where user_id = target_user_id
        and kind = 'community_rules'
        and version = private.current_legal_version('community_rules')
    );
$$;

create or replace function private.is_user_banned(target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.banned_users
    where "userId" = target_user_id
      and ("expiresAt" is null or "expiresAt" > now())
  )
  or exists (
    select 1
    from auth.users
    where id = target_user_id
      and (banned_until > now() or deleted_at is not null)
  );
$$;

-- Single source of truth for server-side gating of feed, discover, chat,
-- matching and LiveKit token issuance.
create or replace function private.has_community_access(target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select target_user_id is not null
    and exists (
      select 1
      from private.community_members as member
      join auth.users as account on account.id = member.user_id
      where member.user_id = target_user_id
        and coalesce(account.is_anonymous, false) = false
        and private.is_adult_birth_date(member.birth_date)
    )
    and private.has_accepted_current_terms(target_user_id)
    and not private.is_user_banned(target_user_id)
    and coalesce(
      (select "isActive" from public.users where id = target_user_id),
      false
    );
$$;

create or replace function private.community_access_payload(target_user_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'userId', target_user_id,
    'eligible', coalesce(private.is_adult_birth_date(member.birth_date), false),
    'profileCompleted', member.user_id is not null,
    'termsAccepted', private.has_accepted_current_terms(target_user_id),
    'displayName', coalesce(member.display_name, ''),
    'city', coalesce(member.city, '')
  )
  from (select target_user_id as id) as requested
  left join private.community_members as member on member.user_id = requested.id;
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Anonymous + authenticated. Returns only published, current documents and
-- fails loudly if any of the four kinds is missing (no partial "ready" state).
create or replace function public.get_community_legal_documents()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  current_count integer;
begin
  select count(*), jsonb_agg(
      jsonb_build_object('kind', kind, 'version', version, 'title', title, 'body', body)
      order by array_position(array['terms', 'privacy', 'kvkk', 'community_rules'], kind)
    )
  into current_count, result
  from private.legal_documents
  where is_current and published_at is not null;

  if current_count <> 4 then
    raise exception 'legal_documents_unpublished'
      using errcode = 'P0002',
            hint = 'Publish all four community legal documents before opening registration.';
  end if;

  return jsonb_build_object('documents', result);
end;
$$;

revoke all on function public.get_community_legal_documents() from public;
grant execute on function public.get_community_legal_documents() to anon, authenticated;

-- Authenticated only. Always returns an object; never grants access by itself.
create or replace function public.get_my_community_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  return private.community_access_payload(current_user_id);
end;
$$;

revoke all on function public.get_my_community_access() from public, anon;
grant execute on function public.get_my_community_access() to authenticated;

-- Boolean gate usable from RLS policies and other RPCs.
create or replace function public.has_community_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_community_access((select auth.uid()));
$$;

revoke all on function public.has_community_access() from public, anon;
grant execute on function public.has_community_access() to authenticated;

-- Whether another user is currently an eligible community member. Used by
-- RLS to hide ineligible/banned users from every surface.
create or replace function public.is_community_member_visible(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_community_access(target_user_id);
$$;

revoke all on function public.is_community_member_visible(uuid) from public, anon;
grant execute on function public.is_community_member_visible(uuid) to authenticated;

create or replace function public.complete_community_onboarding(
  display_name text,
  birth_date text,
  city text,
  interests text[],
  terms_version text,
  community_rules_version text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  account auth.users%rowtype;
  safe_name text := btrim(coalesce(complete_community_onboarding.display_name, ''));
  safe_city text := btrim(coalesce(complete_community_onboarding.city, ''));
  raw_birth text := btrim(coalesce(complete_community_onboarding.birth_date, ''));
  parsed_birth date;
  safe_interests text[];
  existing_member private.community_members%rowtype;
  fallback_email text;
  safe_phone text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  -- Serialise concurrent onboarding calls for the same user.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('community_onboarding'),
    pg_catalog.hashtext(current_user_id::text)
  );

  select * into account from auth.users where id = current_user_id;
  if not found or account.deleted_at is not null then
    raise exception 'account_not_found' using errcode = '28000';
  end if;
  if coalesce(account.is_anonymous, false) then
    raise exception 'anonymous_account_not_allowed' using errcode = '42501';
  end if;

  -- Display name / city
  if char_length(safe_name) not between 2 and 80 or not public.is_safe_user_text(safe_name) then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if char_length(safe_city) not between 1 and 80 or not public.is_safe_user_text(safe_city) then
    raise exception 'invalid_city' using errcode = '22023';
  end if;

  -- Birth date: strict YYYY-MM-DD, real calendar date, not in the future, 18+.
  if raw_birth !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_birth_date' using errcode = '22007';
  end if;
  begin
    parsed_birth := raw_birth::date;
  exception when others then
    raise exception 'invalid_birth_date' using errcode = '22007';
  end;
  if pg_catalog.to_char(parsed_birth, 'YYYY-MM-DD') <> raw_birth then
    raise exception 'invalid_birth_date' using errcode = '22007';
  end if;
  if parsed_birth > private.istanbul_today() then
    raise exception 'birth_date_in_future' using errcode = '22007';
  end if;
  if not private.is_adult_birth_date(parsed_birth) then
    raise exception 'not_eligible_age' using errcode = '42501';
  end if;

  -- Interests: trimmed, de-duplicated, max 10 x 80 chars, safe text.
  select coalesce(array_agg(item order by first_seen), '{}'::text[])
  into safe_interests
  from (
    select btrim(value) as item, min(ordinality) as first_seen
    from unnest(coalesce(complete_community_onboarding.interests, '{}'::text[]))
      with ordinality as t(value, ordinality)
    where btrim(coalesce(value, '')) <> ''
    group by btrim(value)
  ) as cleaned;
  if cardinality(safe_interests) > 10
    or exists (
      select 1 from unnest(safe_interests) as item
      where char_length(item) > 80 or not public.is_safe_user_text(item)
    ) then
    raise exception 'invalid_interests' using errcode = '22023';
  end if;

  -- Legal versions must be the currently published ones.
  if private.current_legal_version('terms') is null
    or private.current_legal_version('community_rules') is null then
    raise exception 'legal_documents_unpublished' using errcode = 'P0002';
  end if;
  if complete_community_onboarding.terms_version is distinct from private.current_legal_version('terms')
    or complete_community_onboarding.community_rules_version
      is distinct from private.current_legal_version('community_rules') then
    raise exception 'outdated_legal_version' using errcode = '40001';
  end if;

  -- A stored birth date cannot be swapped later through this RPC.
  select * into existing_member
  from private.community_members
  where user_id = current_user_id
  for update;
  if found and existing_member.birth_date <> parsed_birth then
    raise exception 'birth_date_immutable' using errcode = '42501';
  end if;

  insert into private.community_members (user_id, birth_date, display_name, city, interests)
  values (current_user_id, parsed_birth, safe_name, safe_city, safe_interests)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        city = excluded.city,
        interests = excluded.interests,
        updated_at = now();

  insert into private.legal_acceptances (user_id, kind, version)
  values
    (current_user_id, 'terms', private.current_legal_version('terms')),
    (current_user_id, 'community_rules', private.current_legal_version('community_rules'))
  on conflict (user_id, kind, version) do nothing;

  -- Mirror non-sensitive profile fields to public.users (used by feed/chat
  -- foreign keys). Birth date is NOT copied; age is derived for legacy reads.
  fallback_email := current_user_id::text || '@phone.ehlibyte.local';
  safe_phone := nullif(btrim(coalesce(account.phone, '')), '');
  if safe_phone is not null and exists (
    select 1 from public.users where "phoneNumber" = safe_phone and id <> current_user_id
  ) then
    safe_phone := null;
  end if;

  insert into public.users (
    id, email, "phoneNumber", name, age, city, interests, "hasCompletedOnboarding"
  )
  values (
    current_user_id,
    case
      when nullif(btrim(coalesce(account.email, '')), '') is not null
        and not exists (
          select 1 from public.users where email = account.email and id <> current_user_id
        )
        then account.email
      else fallback_email
    end,
    safe_phone,
    safe_name,
    private.age_on(parsed_birth, private.istanbul_today()),
    safe_city,
    safe_interests,
    true
  )
  on conflict (id) do update
    set name = excluded.name,
        city = excluded.city,
        interests = excluded.interests,
        age = excluded.age,
        "hasCompletedOnboarding" = true;

  return private.community_access_payload(current_user_id);
end;
$$;

revoke all on function public.complete_community_onboarding(text, text, text, text[], text, text)
  from public, anon;
grant execute on function public.complete_community_onboarding(text, text, text, text[], text, text)
  to authenticated;

-- Optional consents (marketing / tracking) stay separate from onboarding.
create or replace function public.get_my_optional_consents()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'marketing', coalesce((select granted from private.optional_consents
                           where user_id = current_user_id and kind = 'marketing'), false),
    'tracking', coalesce((select granted from private.optional_consents
                          where user_id = current_user_id and kind = 'tracking'), false)
  );
end;
$$;

create or replace function public.set_my_optional_consent(consent_kind text, consent_granted boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if consent_kind not in ('marketing', 'tracking') or consent_granted is null then
    raise exception 'invalid_consent' using errcode = '22023';
  end if;
  insert into private.optional_consents (user_id, kind, granted)
  values (current_user_id, consent_kind, consent_granted)
  on conflict (user_id, kind) do update
    set granted = excluded.granted, updated_at = now();
  return public.get_my_optional_consents();
end;
$$;

revoke all on function public.get_my_optional_consents() from public, anon;
revoke all on function public.set_my_optional_consent(text, boolean) from public, anon;
grant execute on function public.get_my_optional_consents() to authenticated;
grant execute on function public.set_my_optional_consent(text, boolean) to authenticated;

-- Service-role only: publish a document version after legal review.
create or replace function private.publish_legal_document(document_kind text, document_version text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.legal_documents
    where kind = document_kind and version = document_version
  ) then
    raise exception 'legal_document_not_found' using errcode = 'P0002';
  end if;
  update private.legal_documents
    set is_current = false
    where kind = document_kind and is_current and version <> document_version;
  update private.legal_documents
    set published_at = coalesce(published_at, now()), is_current = true
    where kind = document_kind and version = document_version;
end;
$$;

revoke all on function private.publish_legal_document(text, text) from public, anon, authenticated;
grant execute on function private.publish_legal_document(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Harden legacy public.users so it cannot be used to fake eligibility.
-- ---------------------------------------------------------------------------

-- New rows must not default to an adult age. NULL passes users_age_check.
alter table public.users alter column age drop default;
alter table public.users alter column age drop not null;

revoke update (age, "hasPassedEntryTest", "hasCompletedOnboarding", "isPremium", badges, "isActive")
  on public.users from authenticated;
revoke insert (age) on public.users from authenticated;

-- Legacy OAuth helper: keep behaviour, but stop asserting age = 18.
create or replace function public.ensure_my_profile(
  profile_email text default null,
  profile_phone_number text default null,
  profile_name text default null,
  profile_photos jsonb default '[]'::jsonb
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  safe_email text;
  safe_phone text;
  safe_name text;
  safe_photos jsonb;
  profile_record public.users;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  safe_email := nullif(trim(coalesce(profile_email, '')), '');
  safe_phone := nullif(trim(coalesce(profile_phone_number, '')), '');
  safe_name := left(nullif(trim(coalesce(profile_name, '')), ''), 80);
  safe_photos := case
    when jsonb_typeof(coalesce(profile_photos, '[]'::jsonb)) = 'array'
      then coalesce(profile_photos, '[]'::jsonb)
    else '[]'::jsonb
  end;

  if safe_name is null then
    safe_name := 'Yeni Uye';
  end if;

  if safe_email is null then
    safe_email := current_user_id::text || '@oauth.ehlibyte.local';
  end if;

  if exists (
    select 1
    from public.users
    where email = safe_email
      and id <> current_user_id
  ) then
    safe_email := current_user_id::text || '@oauth.ehlibyte.local';
  end if;

  if safe_phone is not null and exists (
    select 1
    from public.users
    where "phoneNumber" = safe_phone
      and id <> current_user_id
  ) then
    safe_phone := null;
  end if;

  insert into public.users (
    id,
    email,
    "phoneNumber",
    name,
    age,
    city,
    bio,
    "culturalIdentity",
    "cultureImportance",
    interests,
    photos
  )
  values (
    current_user_id,
    safe_email,
    safe_phone,
    safe_name,
    null, -- unknown until server-side onboarding stores a birth date
    '',
    '',
    'prefer_not_to_say',
    'somewhat_important',
    '{}'::text[],
    safe_photos
  )
  on conflict (id) do update
    set email = case
          when public.users.email is null or public.users.email = ''
            then excluded.email
          else public.users.email
        end,
        "phoneNumber" = case
          when public.users."phoneNumber" is null
            then excluded."phoneNumber"
          else public.users."phoneNumber"
        end,
        name = case
          when public.users.name is null
            or public.users.name = ''
            or public.users.name = 'Yeni Uye'
            then excluded.name
          else public.users.name
        end,
        photos = case
          when jsonb_array_length(coalesce(public.users.photos, '[]'::jsonb)) = 0
            then excluded.photos
          else public.users.photos
        end
  returning * into profile_record;

  return profile_record;
end;
$$;

revoke all on function public.ensure_my_profile(text, text, text, jsonb) from public, anon;
grant execute on function public.ensure_my_profile(text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
