-- Yorum bildirimlerini post bildirimlerinden ayrı tutar.

create table if not exists public.feed_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.feed_comments(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  resolution text,
  constraint feed_comment_reports_status_check
    check (status in ('pending', 'dismissed', 'actioned')),
  constraint feed_comment_reports_unique_reporter unique (comment_id, reporter_id)
);

create index if not exists feed_comment_reports_comment_id_idx
  on public.feed_comment_reports (comment_id);
create index if not exists feed_comment_reports_reporter_id_idx
  on public.feed_comment_reports (reporter_id);

alter table public.feed_comment_reports enable row level security;

drop policy if exists "Users can read their own feed comment reports"
on public.feed_comment_reports;
create policy "Users can read their own feed comment reports"
on public.feed_comment_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

drop policy if exists "Users can create their own feed comment reports"
on public.feed_comment_reports;
create policy "Users can create their own feed comment reports"
on public.feed_comment_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

revoke all on public.feed_comment_reports from anon, authenticated;
grant select on public.feed_comment_reports to authenticated;
grant insert (comment_id, reporter_id) on public.feed_comment_reports to authenticated;

notify pgrst, 'reload schema';
