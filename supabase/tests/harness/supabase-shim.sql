-- Minimal Supabase platform shim for running repository migrations in an
-- in-process Postgres (PGlite) when Docker/`supabase start` is unavailable.
-- This is NOT a replacement for a real Supabase stack: GoTrue, PostgREST,
-- Storage API, Realtime and pg_net/pg_cron behaviour are only stubbed so that
-- schema, RLS, grants and RPC logic can be exercised.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_realtime_admin') then
    create role supabase_realtime_admin nologin noinherit;
  end if;
end
$$;

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;
create schema if not exists cron;
create schema if not exists net;
create schema if not exists vault;

grant usage on schema public, extensions to anon, authenticated, service_role;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant all on schema public to service_role;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text default 'authenticated',
  role text default 'authenticated',
  email text,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  is_anonymous boolean not null default false,
  is_sso_user boolean not null default false,
  banned_until timestamptz,
  deleted_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  not_after timestamptz
);

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_id text,
  identity_data jsonb not null default '{}'::jsonb
);

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select nullif(auth.jwt() ->> 'role', '')
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(auth.jwt() ->> 'email', '')
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email()
  to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now()
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
create or replace function storage.filename(name text) returns text
language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;
create or replace function storage.extension(name text) returns text
language sql immutable as $$
  select reverse(split_part(reverse(storage.filename(name)), '.', 1))
$$;
grant execute on function storage.foldername(text), storage.filename(text), storage.extension(text)
  to anon, authenticated, service_role;

-- pg_net / pg_cron stubs: record calls instead of performing network/scheduling.
create table if not exists net._stub_requests (
  id bigserial primary key,
  url text,
  body jsonb,
  headers jsonb,
  created_at timestamptz default now()
);
create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint
language sql as $$
  insert into net._stub_requests (url, body, headers) values (url, body, headers) returning id
$$;

create table if not exists cron.job (
  jobid bigserial primary key,
  jobname text unique,
  schedule text,
  command text
);
create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid
$$;
create or replace function cron.unschedule(job_name text)
returns boolean language sql as $$
  with d as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from d)
$$;

create table if not exists vault.decrypted_secrets (
  id uuid primary key default gen_random_uuid(),
  name text unique,
  decrypted_secret text
);

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- Supabase grants on public defaults (mirrors platform default privileges for
-- objects created by postgres; config.toml leaves auto-expose unset).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
