-- Feed push delivery deduplication. Only Edge Functions can access this table.

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  recipient_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint push_notification_events_key_length_check
    check (char_length(event_key) between 8 and 300),
  constraint push_notification_events_type_check
    check (event_type in ('feed_like', 'feed_comment'))
);

create index if not exists push_notification_events_recipient_created_idx
on public.push_notification_events (recipient_id, created_at desc);

alter table public.push_notification_events enable row level security;

revoke all on public.push_notification_events from public, anon, authenticated;

notify pgrst, 'reload schema';
