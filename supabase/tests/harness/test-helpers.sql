-- Assertion helpers for SQL tests. Functions are SECURITY INVOKER so that
-- assertions run with the role that is currently active (anon/authenticated).
create schema if not exists tests;
grant usage on schema tests to public;

create or replace function tests.publish_legal(version_label text default '2026-10-27')
returns void language sql as $$
  select private.publish_legal_document(kind, version_label)
  from unnest(array['terms', 'privacy', 'kvkk', 'community_rules']) as kind;
$$;

create or replace function tests.login(user_id uuid, extra jsonb default '{}'::jsonb)
returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    (jsonb_build_object('sub', user_id::text, 'role', 'authenticated', 'aud', 'authenticated') || extra)::text,
    true
  );
$$;

create or replace function tests.logout()
returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

create or replace function tests.ok(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'ASSERTION FAILED: %', message using errcode = 'P0099';
  end if;
end;
$$;

create or replace function tests.eq(actual anyelement, expected anyelement, message text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', message, expected, actual
      using errcode = 'P0099';
  end if;
end;
$$;

-- Runs a statement and asserts it fails with an error whose message matches pattern.
create or replace function tests.throws(statement text, pattern text, message text default null)
returns void language plpgsql as $$
declare
  failed boolean := false;
  err text;
begin
  begin
    execute statement;
  exception when others then
    failed := true;
    err := sqlerrm;
  end;
  if not failed then
    raise exception 'ASSERTION FAILED: % — statement succeeded: %', coalesce(message, 'expected error'), statement
      using errcode = 'P0099';
  end if;
  if pattern is not null and err !~* pattern then
    raise exception 'ASSERTION FAILED: % — error "%" did not match /%/', coalesce(message, 'unexpected error'), err, pattern
      using errcode = 'P0099';
  end if;
end;
$$;

-- Returns affected/visible row count of a statement under the current role.
create or replace function tests.row_count(statement text)
returns bigint language plpgsql as $$
declare
  n bigint;
begin
  execute 'select count(*) from (' || statement || ') as q' into n;
  return n;
end;
$$;

create or replace function tests.affected(statement text)
returns bigint language plpgsql as $$
declare
  n bigint;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Creates an auth user (as postgres) and returns its id.
create or replace function tests.create_auth_user(
  phone text default null,
  meta jsonb default '{}'::jsonb,
  app_meta jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, phone, email, raw_user_meta_data, raw_app_meta_data)
  values (new_id, phone, null, meta, app_meta);
  return new_id;
end;
$$;

grant execute on all functions in schema tests to public;
