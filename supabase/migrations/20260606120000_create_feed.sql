-- Feed tablolari, XSS icin duz metin kontrolleri ve istemci erisim politikalari.
create or replace function public.is_safe_user_text(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    value is not null
    and value !~* '<[[:space:]]*/?[[:space:]]*[a-z][^>]*>'
    and value !~* '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|svg|math|style|link|meta|form|input|button|textarea|base)'
    and value !~* '(javascript|vbscript|data)[[:space:]]*:'
    and value !~* 'on[a-z]+[[:space:]]*=';
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  body text not null,
  tags text[] not null default array['gundem']::text[],
  report_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_posts_author_id_fkey
    foreign key (author_id) references public.users(id) on delete cascade,
  constraint feed_posts_body_length_check
    check (char_length(body) between 1 and 2000),
  constraint feed_posts_body_safe_check
    check (public.is_safe_user_text(body)),
  constraint feed_posts_tags_check
    check (
      cardinality(tags) between 1 and 6
      and tags <@ array['cem', 'muharrem', 'deyis', 'soru', 'lokma', 'gundem']::text[]
    ),
  constraint feed_posts_report_count_check check (report_count >= 0)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_comments_post_id_fkey
    foreign key (post_id) references public.feed_posts(id) on delete cascade,
  constraint feed_comments_author_id_fkey
    foreign key (author_id) references public.users(id) on delete cascade,
  constraint feed_comments_body_length_check
    check (char_length(body) between 1 and 1000),
  constraint feed_comments_body_safe_check
    check (public.is_safe_user_text(body))
);

create table if not exists public.feed_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_replies_comment_id_fkey
    foreign key (comment_id) references public.feed_comments(id) on delete cascade,
  constraint feed_replies_author_id_fkey
    foreign key (author_id) references public.users(id) on delete cascade,
  constraint feed_replies_body_length_check
    check (char_length(body) between 1 and 1000),
  constraint feed_replies_body_safe_check
    check (public.is_safe_user_text(body))
);

create table if not exists public.feed_post_likes (
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint feed_post_likes_post_id_fkey
    foreign key (post_id) references public.feed_posts(id) on delete cascade,
  constraint feed_post_likes_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.feed_comment_likes (
  comment_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id),
  constraint feed_comment_likes_comment_id_fkey
    foreign key (comment_id) references public.feed_comments(id) on delete cascade,
  constraint feed_comment_likes_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.feed_reply_likes (
  reply_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id),
  constraint feed_reply_likes_reply_id_fkey
    foreign key (reply_id) references public.feed_replies(id) on delete cascade,
  constraint feed_reply_likes_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.feed_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  reporter_id uuid not null,
  created_at timestamptz not null default now(),
  constraint feed_post_reports_post_id_fkey
    foreign key (post_id) references public.feed_posts(id) on delete cascade,
  constraint feed_post_reports_reporter_id_fkey
    foreign key (reporter_id) references public.users(id) on delete cascade,
  constraint feed_post_reports_unique_reporter unique (post_id, reporter_id)
);

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (is_pinned desc, updated_at desc);
create index if not exists feed_posts_author_id_idx on public.feed_posts (author_id);
create index if not exists feed_posts_tags_idx on public.feed_posts using gin (tags);
create index if not exists feed_comments_post_id_idx
  on public.feed_comments (post_id, created_at);
create index if not exists feed_comments_author_id_idx
  on public.feed_comments (author_id);
create index if not exists feed_replies_comment_id_idx
  on public.feed_replies (comment_id, created_at);
create index if not exists feed_replies_author_id_idx
  on public.feed_replies (author_id);
create index if not exists feed_post_reports_post_id_idx
  on public.feed_post_reports (post_id);
create index if not exists feed_post_reports_reporter_id_idx
  on public.feed_post_reports (reporter_id);
create index if not exists feed_post_likes_user_id_idx
  on public.feed_post_likes (user_id);
create index if not exists feed_comment_likes_user_id_idx
  on public.feed_comment_likes (user_id);
create index if not exists feed_reply_likes_user_id_idx
  on public.feed_reply_likes (user_id);

drop trigger if exists set_feed_posts_updated_at on public.feed_posts;
create trigger set_feed_posts_updated_at
before update on public.feed_posts
for each row execute function public.set_updated_at();

drop trigger if exists set_feed_comments_updated_at on public.feed_comments;
create trigger set_feed_comments_updated_at
before update on public.feed_comments
for each row execute function public.set_updated_at();

drop trigger if exists set_feed_replies_updated_at on public.feed_replies;
create trigger set_feed_replies_updated_at
before update on public.feed_replies
for each row execute function public.set_updated_at();

create or replace function public.touch_feed_post_from_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
begin
  if tg_op = 'DELETE' then
    target_post_id := old.post_id;
  else
    target_post_id := new.post_id;
  end if;

  update public.feed_posts
  set updated_at = now()
  where id = target_post_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.touch_feed_post_from_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_comment_id uuid;
begin
  if tg_op = 'DELETE' then
    target_comment_id := old.comment_id;
  else
    target_comment_id := new.comment_id;
  end if;

  update public.feed_posts
  set updated_at = now()
  where id = (
    select post_id
    from public.feed_comments
    where id = target_comment_id
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists touch_feed_post_after_comment on public.feed_comments;
create trigger touch_feed_post_after_comment
after insert or update or delete on public.feed_comments
for each row execute function public.touch_feed_post_from_comment();

drop trigger if exists touch_feed_post_after_reply on public.feed_replies;
create trigger touch_feed_post_after_reply
after insert or update or delete on public.feed_replies
for each row execute function public.touch_feed_post_from_reply();

create or replace function public.increment_feed_post_report_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.feed_posts
  set report_count = report_count + 1
  where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists increment_feed_post_report_count on public.feed_post_reports;
create trigger increment_feed_post_report_count
after insert on public.feed_post_reports
for each row execute function public.increment_feed_post_report_count();

revoke all on function public.touch_feed_post_from_comment() from public, anon, authenticated;
revoke all on function public.touch_feed_post_from_reply() from public, anon, authenticated;
revoke all on function public.increment_feed_post_report_count() from public, anon, authenticated;

alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_replies enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.feed_comment_likes enable row level security;
alter table public.feed_reply_likes enable row level security;
alter table public.feed_post_reports enable row level security;

drop policy if exists "Authenticated users can read feed posts" on public.feed_posts;
create policy "Authenticated users can read feed posts"
on public.feed_posts for select to authenticated using (true);

drop policy if exists "Users can create their own feed posts" on public.feed_posts;
create policy "Users can create their own feed posts"
on public.feed_posts for insert to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can update their own feed posts" on public.feed_posts;
create policy "Users can update their own feed posts"
on public.feed_posts for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can delete their own feed posts" on public.feed_posts;
create policy "Users can delete their own feed posts"
on public.feed_posts for delete to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "Authenticated users can read feed comments" on public.feed_comments;
create policy "Authenticated users can read feed comments"
on public.feed_comments for select to authenticated using (true);

drop policy if exists "Users can create their own feed comments" on public.feed_comments;
create policy "Users can create their own feed comments"
on public.feed_comments for insert to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can update their own feed comments" on public.feed_comments;
create policy "Users can update their own feed comments"
on public.feed_comments for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can delete their own feed comments" on public.feed_comments;
create policy "Users can delete their own feed comments"
on public.feed_comments for delete to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "Authenticated users can read feed replies" on public.feed_replies;
create policy "Authenticated users can read feed replies"
on public.feed_replies for select to authenticated using (true);

drop policy if exists "Users can create their own feed replies" on public.feed_replies;
create policy "Users can create their own feed replies"
on public.feed_replies for insert to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can update their own feed replies" on public.feed_replies;
create policy "Users can update their own feed replies"
on public.feed_replies for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can delete their own feed replies" on public.feed_replies;
create policy "Users can delete their own feed replies"
on public.feed_replies for delete to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "Authenticated users can read feed post likes" on public.feed_post_likes;
create policy "Authenticated users can read feed post likes"
on public.feed_post_likes for select to authenticated using (true);

drop policy if exists "Users can create their own feed post likes" on public.feed_post_likes;
create policy "Users can create their own feed post likes"
on public.feed_post_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own feed post likes" on public.feed_post_likes;
create policy "Users can delete their own feed post likes"
on public.feed_post_likes for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read feed comment likes" on public.feed_comment_likes;
create policy "Authenticated users can read feed comment likes"
on public.feed_comment_likes for select to authenticated using (true);

drop policy if exists "Users can create their own feed comment likes" on public.feed_comment_likes;
create policy "Users can create their own feed comment likes"
on public.feed_comment_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own feed comment likes" on public.feed_comment_likes;
create policy "Users can delete their own feed comment likes"
on public.feed_comment_likes for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read feed reply likes" on public.feed_reply_likes;
create policy "Authenticated users can read feed reply likes"
on public.feed_reply_likes for select to authenticated using (true);

drop policy if exists "Users can create their own feed reply likes" on public.feed_reply_likes;
create policy "Users can create their own feed reply likes"
on public.feed_reply_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own feed reply likes" on public.feed_reply_likes;
create policy "Users can delete their own feed reply likes"
on public.feed_reply_likes for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own feed reports" on public.feed_post_reports;
create policy "Users can read their own feed reports"
on public.feed_post_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

drop policy if exists "Users can create their own feed reports" on public.feed_post_reports;
create policy "Users can create their own feed reports"
on public.feed_post_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

revoke all on public.feed_posts from anon, authenticated;
revoke all on public.feed_comments from anon, authenticated;
revoke all on public.feed_replies from anon, authenticated;
revoke all on public.feed_post_likes from anon, authenticated;
revoke all on public.feed_comment_likes from anon, authenticated;
revoke all on public.feed_reply_likes from anon, authenticated;
revoke all on public.feed_post_reports from anon, authenticated;

grant select, delete on public.feed_posts to authenticated;
grant insert (author_id, body, tags) on public.feed_posts to authenticated;
grant update (body, tags) on public.feed_posts to authenticated;

grant select, delete on public.feed_comments to authenticated;
grant insert (post_id, author_id, body) on public.feed_comments to authenticated;
grant update (body) on public.feed_comments to authenticated;

grant select, delete on public.feed_replies to authenticated;
grant insert (comment_id, author_id, body) on public.feed_replies to authenticated;
grant update (body) on public.feed_replies to authenticated;

grant select, insert, delete on public.feed_post_likes to authenticated;
grant select, insert, delete on public.feed_comment_likes to authenticated;
grant select, insert, delete on public.feed_reply_likes to authenticated;
grant select on public.feed_post_reports to authenticated;
grant insert (post_id, reporter_id) on public.feed_post_reports to authenticated;
