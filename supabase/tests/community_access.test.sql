-- G1 community access / onboarding contract tests.
-- Run: node supabase/tests/harness/run.mjs community_access

create or replace function tests.publish_legal(version_label text default '2026-10-27')
returns void language sql as $$
  select private.publish_legal_document(kind, version_label)
  from unnest(array['terms', 'privacy', 'kvkk', 'community_rules']) as kind;
$$;

create or replace function tests.birth_for_age(years integer, day_offset integer default 0)
returns text language sql stable as $$
  select to_char(
    ((now() at time zone 'Europe/Istanbul')::date - make_interval(years => years))::date + day_offset,
    'YYYY-MM-DD'
  );
$$;

-- Onboards a user as that user (role switching handled by caller).
create or replace function tests.onboard_args(birth text, terms text default '2026-10-27', rules text default '2026-10-27')
returns text language sql immutable as $$
  select format(
    $f$select public.complete_community_onboarding(
      display_name => 'Deniz Yılmaz', birth_date => %L, city => 'İstanbul',
      interests => array['Müzik', 'müzik ', 'Müzik', 'Kitap'],
      terms_version => %L, community_rules_version => %L)$f$,
    birth, terms, rules);
$$;

-- @test legal documents are hidden until all four are published
set local role anon;
select tests.throws('select public.get_community_legal_documents()', 'legal_documents_unpublished');
reset role;
select private.publish_legal_document('terms', '2026-10-27');
set local role anon;
select tests.throws('select public.get_community_legal_documents()', 'legal_documents_unpublished',
  'partial publication must not look ready');
reset role;
select tests.publish_legal();
set local role anon;
select tests.eq(jsonb_array_length(public.get_community_legal_documents() -> 'documents'), 4, 'four documents');
select tests.eq(
  (select string_agg(d ->> 'kind', ',') from jsonb_array_elements(public.get_community_legal_documents() -> 'documents') d),
  'terms,privacy,kvkk,community_rules', 'stable order');
select tests.ok(
  (select bool_and(char_length(d ->> 'body') > 1500 and d ->> 'body' !~ '<[a-z]')
   from jsonb_array_elements(public.get_community_legal_documents() -> 'documents') d),
  'complete plain-text bodies');
select tests.throws('select * from private.legal_documents', 'permission denied', 'anon cannot read private schema');
reset role;

-- @test documents body constraint rejects placeholders
select tests.throws($q$insert into private.legal_documents (kind, version, title, body)
  values ('terms', 'x1', 'T', 'yer tutucu')$q$, 'legal_documents_body_check');

-- @test access object for a brand-new account without onboarding
select set_config('t.u', tests.create_auth_user('+905550000001')::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.eq(public.get_my_community_access(), jsonb_build_object(
  'userId', current_setting('t.u'), 'eligible', false, 'profileCompleted', false,
  'termsAccepted', false, 'displayName', '', 'city', ''), 'not eligible, onboarding required');
select tests.eq(public.has_community_access(), false, 'no access');
reset role;

-- @test anon cannot read access or onboard
set local role anon;
select tests.logout();
select tests.throws('select public.get_my_community_access()', 'permission denied');
select tests.throws(tests.onboard_args(tests.birth_for_age(30)), 'permission denied');
reset role;

-- @test exact 18th birthday (Europe/Istanbul) is accepted and access is granted
select set_config('t.u', tests.create_auth_user('+905550000002')::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select set_config('t.r', (public.complete_community_onboarding(
  display_name => '  Deniz Yılmaz ', birth_date => tests.birth_for_age(18), city => 'İzmir',
  interests => array['Müzik', ' Müzik', '', 'Kitap'],
  terms_version => '2026-10-27', community_rules_version => '2026-10-27'))::text, true);
select tests.eq(current_setting('t.r')::jsonb, jsonb_build_object(
  'userId', current_setting('t.u'), 'eligible', true, 'profileCompleted', true,
  'termsAccepted', true, 'displayName', 'Deniz Yılmaz', 'city', 'İzmir'), 'access payload');
select tests.eq(public.has_community_access(), true, 'access granted');
reset role;
select tests.eq((select interests from private.community_members where user_id = current_setting('t.u')::uuid),
  array['Müzik', 'Kitap'], 'interests trimmed and de-duplicated');
select tests.eq((select count(*) from private.legal_acceptances where user_id = current_setting('t.u')::uuid), 2::bigint,
  'terms + community_rules acceptance recorded (privacy/kvkk are not consents)');
select tests.ok((select bool_and(accepted_at = now()) from private.legal_acceptances
  where user_id = current_setting('t.u')::uuid), 'server timestamp');
select tests.eq((select age from public.users where id = current_setting('t.u')::uuid), 18, 'legacy age mirrored');

-- @test 17 years 364 days is rejected and nothing is stored
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws(tests.onboard_args(tests.birth_for_age(18, 1)), 'not_eligible_age');
select tests.throws(tests.onboard_args(tests.birth_for_age(17)), 'not_eligible_age');
select tests.eq((public.get_my_community_access() ->> 'eligible')::boolean, false, 'still not eligible');
reset role;
select tests.eq((select count(*) from private.community_members where user_id = current_setting('t.u')::uuid), 0::bigint, 'no member row');
select tests.eq((select count(*) from public.users where id = current_setting('t.u')::uuid), 0::bigint, 'no profile row');

-- @test invalid, missing and future birth dates are rejected
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws(tests.onboard_args('2000-02-30'), 'invalid_birth_date', 'impossible day');
select tests.throws(tests.onboard_args('2001-02-29'), 'invalid_birth_date', 'non-leap 29 Feb');
select tests.throws(tests.onboard_args('01/01/1990'), 'invalid_birth_date', 'wrong format');
select tests.throws(tests.onboard_args('1990-1-1'), 'invalid_birth_date', 'unpadded');
select tests.throws(tests.onboard_args(''), 'invalid_birth_date', 'empty');
select tests.throws(tests.onboard_args(null), 'invalid_birth_date', 'null');
select tests.throws(tests.onboard_args(tests.birth_for_age(0, 1)), 'birth_date_in_future', 'future');
select tests.throws(tests.onboard_args('1900-01-01'), 'not_eligible_age', 'older than 120');
reset role;

-- @test invalid profile fields are rejected
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws($q$select public.complete_community_onboarding('A', '1990-01-01', 'İstanbul', '{}', '2026-10-27', '2026-10-27')$q$, 'invalid_display_name');
select tests.throws($q$select public.complete_community_onboarding('<script>x</script>', '1990-01-01', 'İstanbul', '{}', '2026-10-27', '2026-10-27')$q$, 'invalid_display_name');
select tests.throws($q$select public.complete_community_onboarding('Ada', '1990-01-01', '  ', '{}', '2026-10-27', '2026-10-27')$q$, 'invalid_city');
select tests.throws($q$select public.complete_community_onboarding('Ada', '1990-01-01', 'İzmir', array['1','2','3','4','5','6','7','8','9','10','11'], '2026-10-27', '2026-10-27')$q$, 'invalid_interests');
reset role;

-- @test outdated or missing legal versions are rejected; new version revokes termsAccepted
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws(tests.onboard_args(tests.birth_for_age(25), '2025-01-01', '2026-10-27'), 'outdated_legal_version');
select tests.throws(tests.onboard_args(tests.birth_for_age(25), '2026-10-27', null), 'outdated_legal_version');
select public.complete_community_onboarding('Ada Kaya', tests.birth_for_age(25), 'Ankara', '{}', '2026-10-27', '2026-10-27');
reset role;
insert into private.legal_documents (kind, version, title, body)
select 'terms', '2026-11-01', title, body || ' Güncelleme.' from private.legal_documents
where kind = 'terms' and version = '2026-10-27';
select private.publish_legal_document('terms', '2026-11-01');
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.eq((public.get_my_community_access() ->> 'termsAccepted')::boolean, false, 'must re-accept');
select tests.eq(public.has_community_access(), false, 'access paused until re-acceptance');
select tests.throws(tests.onboard_args(tests.birth_for_age(25)), 'outdated_legal_version', 'old version rejected');
select public.complete_community_onboarding('Ada Kaya', tests.birth_for_age(25), 'Ankara', '{}', '2026-11-01', '2026-10-27');
select tests.eq(public.has_community_access(), true, 're-accepted');
reset role;

-- @test second onboarding updates profile but cannot change birth date
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select public.complete_community_onboarding('Ada Kaya', '1995-05-05', 'Ankara', array['Tiyatro'], '2026-10-27', '2026-10-27');
select tests.eq(public.complete_community_onboarding('Ada K.', '1995-05-05', 'Eskişehir', array['Sinema'], '2026-10-27', '2026-10-27') ->> 'city',
  'Eskişehir', 'profile updated idempotently');
select tests.throws($q$select public.complete_community_onboarding('Ada', '1980-01-01', 'Ankara', '{}', '2026-10-27', '2026-10-27')$q$, 'birth_date_immutable');
reset role;
select tests.eq((select count(*) from private.legal_acceptances where user_id = current_setting('t.u')::uuid), 2::bigint,
  'acceptance not duplicated');
select tests.eq((select count(*) from private.community_members where user_id = current_setting('t.u')::uuid), 1::bigint, 'single member row');

-- @test transaction is atomic when a later write fails
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
create function tests.fail_acceptance() returns trigger language plpgsql as $$
begin raise exception 'simulated failure'; end; $$;
create trigger fail_acceptance before insert on private.legal_acceptances
  for each row execute function tests.fail_acceptance();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws(tests.onboard_args(tests.birth_for_age(30)), 'simulated failure');
reset role;
select tests.eq((select count(*) from private.community_members where user_id = current_setting('t.u')::uuid), 0::bigint,
  'member row rolled back');
select tests.eq((select count(*) from public.users where id = current_setting('t.u')::uuid), 0::bigint, 'profile rolled back');

-- @test foreign or stale JWT subject cannot onboard or gain access
select tests.publish_legal();
set local role authenticated;
select tests.login(gen_random_uuid());
select tests.throws(tests.onboard_args(tests.birth_for_age(30)), 'account_not_found');
select tests.eq((public.get_my_community_access() ->> 'eligible')::boolean, false, 'unknown subject not eligible');
select tests.eq(public.has_community_access(), false, 'unknown subject no access');
reset role;
-- Deleted account with an old token
select set_config('t.u', tests.create_auth_user()::text, true);
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select public.complete_community_onboarding('Eski Oturum', '1990-01-01', 'Bursa', '{}', '2026-10-27', '2026-10-27');
reset role;
update auth.users set deleted_at = now() where id = current_setting('t.u')::uuid;
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.eq(public.has_community_access(), false, 'soft-deleted account loses access');
reset role;

-- @test the RPC takes no user id parameter
set local role authenticated;
select tests.login(gen_random_uuid());
select tests.throws($q$select public.complete_community_onboarding(user_id => gen_random_uuid(), display_name => 'X', birth_date => '1990-01-01', city => 'X', interests => '{}', terms_version => '2026-10-27', community_rules_version => '2026-10-27')$q$,
  'does not exist');
reset role;

-- @test legacy account with adult age and onboarding flags is not eligible
select set_config('t.u', tests.create_auth_user('+905550000009', '{"age": 30, "eligible": true, "role": "admin"}'::jsonb)::text, true);
select tests.publish_legal();
insert into public.users (id, email, name, age, "hasCompletedOnboarding", "hasPassedEntryTest")
values (current_setting('t.u')::uuid, 'legacy@example.com', 'Eski Üye', 34, true, true);
set local role authenticated;
select tests.login(current_setting('t.u')::uuid, '{"user_metadata": {"role": "admin", "eligible": true, "age": 40}, "app_metadata": {"role": "admin"}}');
select tests.eq(public.get_my_community_access() ->> 'eligible', 'false', 'legacy age/flags/metadata are not proof');
select tests.eq(public.get_my_community_access() ->> 'profileCompleted', 'false', 'legacy onboarding flag ignored');
select tests.eq(public.has_community_access(), false, 'no access before new onboarding');
select public.complete_community_onboarding('Eski Üye', '1992-03-03', 'İstanbul', '{}', '2026-10-27', '2026-10-27');
select tests.eq(public.has_community_access(), true, 'legacy account passes after new onboarding');
reset role;
select tests.eq((select email from public.users where id = current_setting('t.u')::uuid), 'legacy@example.com', 'existing user data preserved');

-- @test client cannot forge eligibility, roles or acceptance records
select set_config('t.u', tests.create_auth_user()::text, true);
insert into public.users (id, email, name) values (current_setting('t.u')::uuid, 'forge@example.com', 'Forge');
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.throws($q$update public.users set "hasCompletedOnboarding" = true where id = auth.uid()$q$, 'permission denied');
select tests.throws($q$update public.users set age = 30 where id = auth.uid()$q$, 'permission denied');
select tests.throws($q$update public.users set "hasPassedEntryTest" = true where id = auth.uid()$q$, 'permission denied');
select tests.throws($q$insert into private.community_members (user_id, birth_date, display_name, city) values (auth.uid(), '1990-01-01', 'Forge', 'X')$q$, 'permission denied');
select tests.throws($q$insert into private.legal_acceptances (user_id, kind, version) values (auth.uid(), 'terms', '2026-10-27')$q$, 'permission denied');
select tests.throws($q$select private.publish_legal_document('terms', '2026-10-27')$q$, 'permission denied');
select tests.throws($q$insert into public.user_roles ("userId", role) values (auth.uid(), 'admin')$q$, 'row-level security');
select tests.eq(public.has_community_access(), false, 'still no access');
reset role;

-- @test birth date never leaks through public profile selects
select tests.ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and column_name ilike '%birth%'
), 'no birth column in public schema');
select tests.ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated has no usage on private');
select tests.ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon has no usage on private');

-- @test new public.users rows are not adult by default
select tests.ok((select column_default is null and is_nullable = 'YES' from information_schema.columns
  where table_schema = 'public' and table_name = 'users' and column_name = 'age'), 'age has no adult default');
select set_config('t.u', tests.create_auth_user()::text, true);
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select public.ensure_my_profile(null, null, 'OAuth Kişi', '[]'::jsonb);
reset role;
select tests.eq((select age from public.users where id = current_setting('t.u')::uuid), null::integer, 'ensure_my_profile no longer asserts 18');

-- @test banned users lose access
select set_config('t.u', tests.create_auth_user()::text, true);
select tests.publish_legal();
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select public.complete_community_onboarding('Ban Test', '1990-01-01', 'Bursa', '{}', '2026-10-27', '2026-10-27');
reset role;
insert into public.banned_users ("userId", "banType", reason) values (current_setting('t.u')::uuid, 'permanent', 'spam');
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.eq(public.has_community_access(), false, 'banned');
reset role;

-- @test optional consents default to off and are separate
select set_config('t.u', tests.create_auth_user()::text, true);
set local role authenticated;
select tests.login(current_setting('t.u')::uuid);
select tests.eq(public.get_my_optional_consents(), '{"marketing": false, "tracking": false}'::jsonb, 'default off');
select tests.eq(public.set_my_optional_consent('marketing', true) ->> 'marketing', 'true', 'marketing opt-in');
select tests.throws($q$select public.set_my_optional_consent('privacy', true)$q$, 'invalid_consent');
reset role;
