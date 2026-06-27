create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  recipient_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  activity_type text not null,
  title text not null,
  body text not null,
  post_id uuid references public.feed_posts(id) on delete set null,
  comment_id uuid references public.feed_comments(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_activities_source_key_length_check
    check (char_length(source_key) between 8 and 300),
  constraint user_activities_type_check
    check (
      activity_type in (
        'feed_like',
        'feed_comment',
        'message',
        'match',
        'profile_like',
        'super_like'
      )
    ),
  constraint user_activities_title_length_check
    check (char_length(title) between 1 and 100),
  constraint user_activities_body_length_check
    check (char_length(body) between 1 and 240)
);

create index if not exists user_activities_recipient_created_idx
on public.user_activities (recipient_id, created_at desc);

create index if not exists user_activities_recipient_unread_idx
on public.user_activities (recipient_id, created_at desc)
where read_at is null;

alter table public.user_activities enable row level security;

drop policy if exists "Users can read own activities"
on public.user_activities;
create policy "Users can read own activities"
on public.user_activities for select
to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists "Users can mark own activities read"
on public.user_activities;
create policy "Users can mark own activities read"
on public.user_activities for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

revoke all on public.user_activities from public, anon, authenticated;
grant select on public.user_activities to authenticated;
grant update (read_at) on public.user_activities to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_activities'
  ) then
    alter publication supabase_realtime add table public.user_activities;
  end if;
end
$$;

notify pgrst, 'reload schema';
