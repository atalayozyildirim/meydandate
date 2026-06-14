alter table public.feed_post_reports
  add column if not exists status text not null default 'pending',
  add column if not exists resolution text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feed_post_reports_status_check'
      and conrelid = 'public.feed_post_reports'::regclass
  ) then
    alter table public.feed_post_reports
      add constraint feed_post_reports_status_check
      check (status in ('pending', 'resolved', 'dismissed'));
  end if;
end $$;

create index if not exists feed_post_reports_status_created_at_idx
  on public.feed_post_reports (status, created_at desc);

drop policy if exists "Users can read their own feed reports" on public.feed_post_reports;
drop policy if exists "Users and moderators can read feed reports" on public.feed_post_reports;
create policy "Users and moderators can read feed reports"
on public.feed_post_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or (select public.is_moderator())
);

drop policy if exists "Moderators can update feed reports" on public.feed_post_reports;
create policy "Moderators can update feed reports"
on public.feed_post_reports for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

grant update (status, resolution, resolved_at, resolved_by)
on public.feed_post_reports to authenticated;
