-- Fire boost economy and admin-created discovery bot profiles.

alter table public.users
  add column if not exists "fireScore" integer not null default 0;

do $$
begin
  alter table public.users
    add constraint users_fire_score_non_negative_check
    check ("fireScore" >= 0);
exception
  when duplicate_object then null;
end $$;

grant select ("fireScore") on public.users to authenticated;

create index if not exists users_discover_fire_score_idx
on public.users ("fireScore" desc, "boostedUntil" desc, "createdAt" desc)
where "isActive" = true
  and "isDiscoverable" = true
  and "hasPassedEntryTest" = true
  and "hasCompletedOnboarding" = true;

create table if not exists public.user_fire_wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_fire_wallets_balance_non_negative_check check (balance >= 0)
);

create table if not exists public.profile_fire_boosts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  created_at timestamptz not null default now(),
  constraint profile_fire_boosts_amount_check check (amount between 1 and 100),
  constraint profile_fire_boosts_not_self_check check (sender_id <> target_user_id)
);

create index if not exists profile_fire_boosts_target_idx
on public.profile_fire_boosts (target_user_id, created_at desc);

create index if not exists profile_fire_boosts_sender_idx
on public.profile_fire_boosts (sender_id, created_at desc);

alter table public.user_fire_wallets enable row level security;
alter table public.profile_fire_boosts enable row level security;

drop policy if exists "Users can read own fire wallet"
on public.user_fire_wallets;
create policy "Users can read own fire wallet"
on public.user_fire_wallets for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read own fire boosts"
on public.profile_fire_boosts;
create policy "Users can read own fire boosts"
on public.profile_fire_boosts for select to authenticated
using (
  sender_id = (select auth.uid())
  or target_user_id = (select auth.uid())
  or (select public.is_moderator())
);

revoke all on public.user_fire_wallets from anon, authenticated;
revoke all on public.profile_fire_boosts from anon, authenticated;
grant select on public.user_fire_wallets to authenticated;
grant select on public.profile_fire_boosts to authenticated;

create or replace function public.get_fire_balance()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  next_balance integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_fire_wallets (user_id, balance)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select balance
  into next_balance
  from public.user_fire_wallets
  where user_id = current_user_id;

  return coalesce(next_balance, 0);
end;
$$;

create or replace function public.purchase_fire_package(package_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  next_balance integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if package_amount not in (100, 500, 1500) then
    raise exception 'Invalid Fire package';
  end if;

  insert into public.user_fire_wallets (user_id, balance)
  values (current_user_id, package_amount)
  on conflict (user_id) do update
    set balance = public.user_fire_wallets.balance + excluded.balance,
        updated_at = now()
  returning balance into next_balance;

  return next_balance;
end;
$$;

create or replace function public.send_profile_fire(
  target_user_id uuid,
  fire_amount integer default 1
)
returns table(balance integer, target_fire_score integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_balance integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'Invalid target profile';
  end if;

  if fire_amount < 1 or fire_amount > 100 then
    raise exception 'Invalid Fire amount';
  end if;

  if not exists (
    select 1
    from public.users
    where id = target_user_id
      and "isActive" = true
      and "isDiscoverable" = true
      and "hasPassedEntryTest" = true
      and "hasCompletedOnboarding" = true
  ) then
    raise exception 'Target profile is not boostable';
  end if;

  insert into public.user_fire_wallets (user_id, balance)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select public.user_fire_wallets.balance
  into current_balance
  from public.user_fire_wallets
  where user_id = current_user_id
  for update;

  if coalesce(current_balance, 0) < fire_amount then
    raise exception 'Not enough Fire balance';
  end if;

  update public.user_fire_wallets
  set balance = public.user_fire_wallets.balance - fire_amount,
      updated_at = now()
  where user_id = current_user_id
  returning public.user_fire_wallets.balance into balance;

  insert into public.profile_fire_boosts (sender_id, target_user_id, amount)
  values (current_user_id, target_user_id, fire_amount);

  update public.users
  set "fireScore" = "fireScore" + fire_amount
  where id = target_user_id
  returning "fireScore" into target_fire_score;

  return next;
end;
$$;

create or replace function public.admin_create_bot_profile(
  bot_name text,
  bot_age integer,
  bot_city text,
  bot_bio text,
  bot_photo_uri text default null,
  bot_occupation text default null,
  bot_hometown text default null,
  bot_favorite_song text default null,
  bot_favorite_poet text default null,
  bot_cultural_identity text default 'alevi',
  bot_culture_importance text default 'important',
  bot_interests text[] default array['cem_culture', 'turkish_folk_music']::text[],
  bot_profile_kind text default 'ai_starter',
  bot_is_active boolean default true
)
returns setof public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  bot_id uuid := gen_random_uuid();
  bot_email text;
  safe_name text := trim(coalesce(bot_name, ''));
  safe_city text := trim(coalesce(bot_city, ''));
  safe_bio text := trim(coalesce(bot_bio, ''));
  photo_json jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  if char_length(safe_name) < 1 or char_length(safe_name) > 80 then
    raise exception 'Bot name length is invalid';
  end if;

  if bot_age is null or bot_age < 18 or bot_age > 120 then
    raise exception 'Bot age is invalid';
  end if;

  if safe_bio = '' or char_length(safe_bio) > 280 then
    raise exception 'Bot bio length is invalid';
  end if;

  if bot_profile_kind not in ('starter', 'ai_starter') then
    raise exception 'Bot profile kind is invalid';
  end if;

  if bot_cultural_identity not in ('alevi', 'close_to_alevi_culture', 'prefer_not_to_say') then
    raise exception 'Bot cultural identity is invalid';
  end if;

  if bot_culture_importance not in ('very_important', 'important', 'somewhat_important', 'not_important') then
    raise exception 'Bot culture importance is invalid';
  end if;

  if nullif(trim(coalesce(bot_photo_uri, '')), '') is not null then
    photo_json := jsonb_build_array(
      jsonb_build_object(
        'id',
        'photo-' || bot_id::text,
        'uri',
        trim(bot_photo_uri),
        'isPrimary',
        true
      )
    );
  end if;

  bot_email := 'bot-' || replace(bot_id::text, '-', '') || '@ehlibyte.app';

  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_anonymous
  )
  values (
    bot_id,
    'authenticated',
    'authenticated',
    bot_email,
    now(),
    jsonb_build_object(
      'provider',
      'email',
      'providers',
      jsonb_build_array('email'),
      'admin_created_bot',
      true
    ),
    jsonb_build_object('name', safe_name, 'full_name', safe_name),
    now(),
    now(),
    false
  );

  insert into public.users (
    id,
    email,
    name,
    age,
    city,
    occupation,
    bio,
    hometown,
    "favoriteSong",
    "favoritePoet",
    "culturalIdentity",
    "cultureImportance",
    interests,
    photos,
    badges,
    "isPremium",
    "hasPassedEntryTest",
    "hasCompletedOnboarding",
    "isActive",
    "isDiscoverable",
    "profileKind"
  )
  values (
    bot_id,
    bot_email,
    safe_name,
    bot_age,
    safe_city,
    nullif(trim(coalesce(bot_occupation, '')), ''),
    safe_bio,
    nullif(trim(coalesce(bot_hometown, '')), ''),
    nullif(trim(coalesce(bot_favorite_song, '')), ''),
    nullif(trim(coalesce(bot_favorite_poet, '')), ''),
    bot_cultural_identity,
    bot_culture_importance,
    coalesce(bot_interests, array[]::text[]),
    photo_json,
    array['verified_profile', 'community_member'],
    false,
    true,
    true,
    bot_is_active,
    true,
    bot_profile_kind
  );

  return query
  select *
  from public.users
  where id = bot_id;
end;
$$;

revoke all on function public.get_fire_balance() from public, anon;
revoke all on function public.purchase_fire_package(integer) from public, anon;
revoke all on function public.send_profile_fire(uuid, integer) from public, anon;
revoke all on function public.admin_create_bot_profile(
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text,
  boolean
) from public, anon;

grant execute on function public.get_fire_balance() to authenticated;
grant execute on function public.purchase_fire_package(integer) to authenticated;
grant execute on function public.send_profile_fire(uuid, integer) to authenticated;
grant execute on function public.admin_create_bot_profile(
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text,
  boolean
) to authenticated;

notify pgrst, 'reload schema';
