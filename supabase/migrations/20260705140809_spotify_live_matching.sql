-- Spotify canli dinleme sinyali, guvenli token saklama ve bildirim tekillestirme.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.spotify_connections (
  user_id uuid primary key references public.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  last_polled_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotify_connections_access_token_length_check
    check (char_length(access_token) between 20 and 4096),
  constraint spotify_connections_refresh_token_length_check
    check (refresh_token is null or char_length(refresh_token) between 20 and 4096),
  constraint spotify_connections_last_error_length_check
    check (last_error is null or char_length(last_error) <= 500)
);

create index if not exists spotify_connections_active_poll_idx
on public.spotify_connections (last_polled_at nulls first, user_id)
where is_active = true;

create table if not exists public.spotify_live_presence (
  user_id uuid primary key references public.users(id) on delete cascade,
  spotify_track_id text not null,
  track_name text not null,
  artist_names text[] not null default '{}'::text[],
  album_image_url text,
  progress_ms integer,
  duration_ms integer,
  is_playing boolean not null default true,
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint spotify_live_presence_track_id_length_check
    check (char_length(spotify_track_id) between 1 and 100),
  constraint spotify_live_presence_track_name_length_check
    check (char_length(track_name) between 1 and 120),
  constraint spotify_live_presence_album_url_length_check
    check (album_image_url is null or char_length(album_image_url) <= 1000),
  constraint spotify_live_presence_progress_check
    check (progress_ms is null or progress_ms >= 0),
  constraint spotify_live_presence_duration_check
    check (duration_ms is null or duration_ms > 0)
);

create index if not exists spotify_live_presence_track_active_idx
on public.spotify_live_presence (spotify_track_id, expires_at desc)
where is_playing = true;

create table if not exists public.spotify_live_match_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  spotify_track_id text not null,
  track_name text not null,
  user1_id uuid not null references public.users(id) on delete cascade,
  user2_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint spotify_live_match_events_not_self_check
    check (user1_id <> user2_id),
  constraint spotify_live_match_events_order_check
    check (user1_id::text < user2_id::text),
  constraint spotify_live_match_events_dedupe_length_check
    check (char_length(dedupe_key) between 16 and 400)
);

create index if not exists spotify_live_match_events_pair_created_idx
on public.spotify_live_match_events (user1_id, user2_id, created_at desc);

alter table public.spotify_connections enable row level security;
alter table public.spotify_live_presence enable row level security;
alter table public.spotify_live_match_events enable row level security;

-- Spotify access/refresh tokenlari mobil Data API'den hicbir zaman okunamaz.
revoke all on public.spotify_connections from public, anon, authenticated;
revoke all on public.spotify_live_presence from public, anon, authenticated;
revoke all on public.spotify_live_match_events from public, anon, authenticated;
grant all on public.spotify_connections to service_role;
grant all on public.spotify_live_presence to service_role;
grant all on public.spotify_live_match_events to service_role;

alter table public.user_activities
drop constraint if exists user_activities_type_check;

alter table public.user_activities
add constraint user_activities_type_check
check (
  activity_type in (
    'feed_like',
    'feed_comment',
    'message',
    'match',
    'profile_like',
    'super_like',
    'spotify_match'
  )
);

-- Vault'ta project_url, publishable_key ve spotify_poll_secret varsa poll otomatik kurulur.
-- Yoksa ayni isimlerle secret eklendikten sonra bu DO blogu tekrar calistirilabilir.
do $$
declare
  has_project_url boolean := false;
  has_publishable_key boolean := false;
  has_poll_secret boolean := false;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;

  execute 'select exists (select 1 from vault.decrypted_secrets where name = ''project_url'')'
    into has_project_url;
  execute 'select exists (select 1 from vault.decrypted_secrets where name = ''publishable_key'')'
    into has_publishable_key;
  execute 'select exists (select 1 from vault.decrypted_secrets where name = ''spotify_poll_secret'')'
    into has_poll_secret;

  if has_project_url and has_publishable_key and has_poll_secret
    and not exists (
      select 1 from cron.job where jobname = 'spotify-live-match-poll'
    ) then
    perform cron.schedule(
      'spotify-live-match-poll',
      '* * * * *',
      $job$
        select net.http_post(
          url := (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'project_url'
            limit 1
          ) || '/functions/v1/spotify-live-match',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'publishable_key'
              limit 1
            ),
            'x-spotify-poll-secret', (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'spotify_poll_secret'
              limit 1
            )
          ),
          body := '{"action":"poll"}'::jsonb
        );
      $job$
    );
  end if;
end
$$;

notify pgrst, 'reload schema';
