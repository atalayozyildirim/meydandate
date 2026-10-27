-- G2 — Real Community Social Feed enhancements:
--   * Community-access gating and mutual-block filtering on posts, comments, replies
--   * Soft-removal / moderation support (is_removed)
--   * Post bookmarks / saved posts (feed_post_bookmarks)
--   * User follow relationships (user_follows)
--   * Moderation audit logging & report queue integration (reports & audit_logs)
--   * Safe RPCs: report_feed_post, report_feed_comment, block_user, unblock_user,
--     toggle_feed_post_bookmark, toggle_user_follow, moderate_feed_post

-- 1. Ensure columns exist on feed tables
alter table public.feed_posts
  add column if not exists is_removed boolean not null default false;

alter table public.feed_comments
  add column if not exists is_removed boolean not null default false;

alter table public.feed_replies
  add column if not exists is_removed boolean not null default false;

alter table public.feed_post_reports
  add column if not exists category text not null default 'other',
  add column if not exists reason text not null default '';

alter table public.feed_comment_reports
  add column if not exists reason text not null default '';

-- 2. Bookmarks / Saved posts
create table if not exists public.feed_post_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_post_bookmarks_user_idx
  on public.feed_post_bookmarks (user_id, created_at desc);

-- 3. Follows
create table if not exists public.user_follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_not_self check (follower_id <> following_id)
);

create index if not exists user_follows_follower_idx
  on public.user_follows (follower_id, created_at desc);
create index if not exists user_follows_following_idx
  on public.user_follows (following_id, created_at desc);

-- 4. Mutual block helper
create or replace function public.are_users_mutually_unblocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select user_a is not null
    and user_b is not null
    and (
      user_a = user_b
      or (
        not exists (
          select 1 from public.users
          where id = user_a and user_b = any(coalesce("blockedUsers", '{}'::uuid[]))
        )
        and not exists (
          select 1 from public.users
          where id = user_b and user_a = any(coalesce("blockedUsers", '{}'::uuid[]))
        )
      )
    );
$$;

revoke all on function public.are_users_mutually_unblocked(uuid, uuid) from public;
grant execute on function public.are_users_mutually_unblocked(uuid, uuid) to anon, authenticated;

-- Helper to check if a feed post is visible to the caller
create or replace function public.can_view_feed_post(target_author_id uuid, post_is_removed boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.has_community_access())
    and (not post_is_removed or (select auth.uid()) = target_author_id or (select public.is_moderator()))
    and (
      (select auth.uid()) = target_author_id
      or (
        public.is_community_member_visible(target_author_id)
        and public.are_users_mutually_unblocked((select auth.uid()), target_author_id)
      )
    );
$$;

revoke all on function public.can_view_feed_post(uuid, boolean) from public;
grant execute on function public.can_view_feed_post(uuid, boolean) to anon, authenticated;

-- 5. Updated RLS policies for feed_posts
drop policy if exists "Authenticated users can read feed posts" on public.feed_posts;
create policy "Eligible members can read visible feed posts"
on public.feed_posts for select to authenticated
using (public.can_view_feed_post(author_id, is_removed));

drop policy if exists "Users can create their own feed posts" on public.feed_posts;
create policy "Eligible members can create feed posts"
on public.feed_posts for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = author_id
);

drop policy if exists "Users can update their own feed posts" on public.feed_posts;
create policy "Authors and moderators can update feed posts"
on public.feed_posts for update to authenticated
using (
  (select auth.uid()) = author_id
  or (select public.is_moderator())
)
with check (
  (select auth.uid()) = author_id
  or (select public.is_moderator())
);

-- 6. Updated RLS policies for feed_comments and feed_replies
drop policy if exists "Authenticated users can read feed comments" on public.feed_comments;
create policy "Eligible members can read visible feed comments"
on public.feed_comments for select to authenticated
using (
  (select public.has_community_access())
  and (not is_removed or (select auth.uid()) = author_id or (select public.is_moderator()))
  and (
    (select auth.uid()) = author_id
    or (
      public.is_community_member_visible(author_id)
      and public.are_users_mutually_unblocked((select auth.uid()), author_id)
    )
  )
  and exists (
    select 1 from public.feed_posts
    where id = public.feed_comments.post_id
      and public.can_view_feed_post(author_id, is_removed)
  )
);

drop policy if exists "Users can create their own feed comments" on public.feed_comments;
create policy "Eligible members can create feed comments"
on public.feed_comments for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = author_id
  and exists (
    select 1 from public.feed_posts
    where id = public.feed_comments.post_id
      and public.can_view_feed_post(author_id, is_removed)
  )
);

drop policy if exists "Authenticated users can read feed replies" on public.feed_replies;
create policy "Eligible members can read visible feed replies"
on public.feed_replies for select to authenticated
using (
  (select public.has_community_access())
  and (not is_removed or (select auth.uid()) = author_id or (select public.is_moderator()))
  and (
    (select auth.uid()) = author_id
    or (
      public.is_community_member_visible(author_id)
      and public.are_users_mutually_unblocked((select auth.uid()), author_id)
    )
  )
);

drop policy if exists "Users can create their own feed replies" on public.feed_replies;
create policy "Eligible members can create feed replies"
on public.feed_replies for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = author_id
);

-- 7. Updated RLS policies for feed_post_likes
drop policy if exists "Authenticated users can read feed post likes" on public.feed_post_likes;
create policy "Eligible members can read feed post likes"
on public.feed_post_likes for select to authenticated
using (
  (select public.has_community_access())
  and exists (
    select 1 from public.feed_posts
    where id = public.feed_post_likes.post_id
      and public.can_view_feed_post(author_id, is_removed)
  )
);

drop policy if exists "Users can create their own feed post likes" on public.feed_post_likes;
create policy "Eligible members can create feed post likes"
on public.feed_post_likes for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = user_id
  and exists (
    select 1 from public.feed_posts
    where id = public.feed_post_likes.post_id
      and public.can_view_feed_post(author_id, is_removed)
  )
);

-- 8. RLS for bookmarks and follows
alter table public.feed_post_bookmarks enable row level security;
alter table public.user_follows enable row level security;

create policy "Users can read own bookmarks"
on public.feed_post_bookmarks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add bookmarks"
on public.feed_post_bookmarks for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = user_id
  and exists (
    select 1 from public.feed_posts
    where id = public.feed_post_bookmarks.post_id
      and public.can_view_feed_post(author_id, is_removed)
  )
);

create policy "Users can remove own bookmarks"
on public.feed_post_bookmarks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view follows"
on public.user_follows for select to authenticated
using (
  public.are_users_mutually_unblocked((select auth.uid()), follower_id)
  and public.are_users_mutually_unblocked((select auth.uid()), following_id)
);

create policy "Users can follow others"
on public.user_follows for insert to authenticated
with check (
  (select public.has_community_access())
  and (select auth.uid()) = follower_id
  and public.is_community_member_visible(following_id)
  and public.are_users_mutually_unblocked(follower_id, following_id)
);

create policy "Users can unfollow others"
on public.user_follows for delete to authenticated
using ((select auth.uid()) = follower_id);

-- Grants
grant select, insert, delete on public.feed_post_bookmarks to authenticated;
grant select, insert, delete on public.user_follows to authenticated;
grant insert (id, author_id, body, tags, image_url, image_path, image_urls, image_paths, quoted_post_id, quote_snapshot, link_preview)
on public.feed_posts to authenticated;
grant select (is_removed) on public.feed_posts to authenticated;
grant select (is_removed) on public.feed_comments to authenticated;
grant select (is_removed) on public.feed_replies to authenticated;
grant update (is_removed) on public.feed_posts to authenticated;

-- 9. RPC: block_user and unblock_user
create or replace function public.block_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'invalid_target_user' using errcode = '22023';
  end if;

  update public.users
  set "blockedUsers" = array(
    select distinct item from unnest(coalesce("blockedUsers", '{}'::uuid[]) || target_user_id) as item
  )
  where id = current_user_id;

  -- Remove mutual followings immediately
  delete from public.user_follows
  where (follower_id = current_user_id and following_id = target_user_id)
     or (follower_id = target_user_id and following_id = current_user_id);

  insert into public.audit_logs (id, "userId", action, "targetType", "targetId", details)
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'block_user',
    'user',
    target_user_id::text,
    jsonb_build_object('blocked_user_id', target_user_id)
  );
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  update public.users
  set "blockedUsers" = array_remove(coalesce("blockedUsers", '{}'::uuid[]), target_user_id)
  where id = current_user_id;

  insert into public.audit_logs (id, "userId", action, "targetType", "targetId", details)
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'unblock_user',
    'user',
    target_user_id::text,
    jsonb_build_object('unblocked_user_id', target_user_id)
  );
end;
$$;

revoke all on function public.block_user(uuid) from public;
revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- 10. RPC: report_feed_post
create or replace function public.report_feed_post(
  target_post_id uuid,
  report_category text default 'other',
  report_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  post_row public.feed_posts%rowtype;
  safe_category text := coalesce(nullif(btrim(report_category), ''), 'other');
  safe_reason text := left(coalesce(btrim(report_reason), ''), 1000);
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into post_row from public.feed_posts where id = target_post_id;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if post_row.author_id = current_user_id then
    raise exception 'cannot_report_own_post' using errcode = '42501';
  end if;

  insert into public.feed_post_reports (post_id, reporter_id, status, category, reason)
  values (target_post_id, current_user_id, 'pending', safe_category, safe_reason)
  on conflict (post_id, reporter_id) do update
    set status = 'pending',
        category = excluded.category,
        reason = excluded.reason;

  -- Also write into core reports queue for moderator dashboard
  insert into public.reports (
    id, "reporterId", "reportedUserId", category, description, evidence, status
  )
  values (
    gen_random_uuid()::text,
    current_user_id,
    post_row.author_id,
    case
      when safe_category in (
        'fake_profile', 'spam', 'harassment', 'inappropriate_content',
        'other', 'profanity', 'sexual_content', 'fraud'
      ) then safe_category
      else 'inappropriate_content'
    end,
    'Gönderi şikayeti: ' || coalesce(nullif(safe_reason, ''), safe_category),
    array['feed_post:' || target_post_id::text]::text[],
    'pending'
  );

  insert into public.audit_logs (id, "userId", action, "targetType", "targetId", details)
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'report_feed_post',
    'feed_post',
    target_post_id::text,
    jsonb_build_object(
      'post_id', target_post_id,
      'author_id', post_row.author_id,
      'category', safe_category,
      'reason', safe_reason
    )
  );
end;
$$;

revoke all on function public.report_feed_post(uuid, text, text) from public;
grant execute on function public.report_feed_post(uuid, text, text) to authenticated;

-- 11. RPC: report_feed_comment
create or replace function public.report_feed_comment(
  target_comment_id uuid,
  report_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  comment_row public.feed_comments%rowtype;
  safe_reason text := left(coalesce(btrim(report_reason), ''), 1000);
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into comment_row from public.feed_comments where id = target_comment_id;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
  if comment_row.author_id = current_user_id then
    raise exception 'cannot_report_own_comment' using errcode = '42501';
  end if;

  insert into public.feed_comment_reports (comment_id, reporter_id, status, reason)
  values (target_comment_id, current_user_id, 'pending', safe_reason)
  on conflict (comment_id, reporter_id) do update
    set status = 'pending',
        reason = excluded.reason;

  insert into public.audit_logs (id, "userId", action, "targetType", "targetId", details)
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'report_feed_comment',
    'feed_comment',
    target_comment_id::text,
    jsonb_build_object(
      'comment_id', target_comment_id,
      'post_id', comment_row.post_id,
      'author_id', comment_row.author_id,
      'reason', safe_reason
    )
  );
end;
$$;

revoke all on function public.report_feed_comment(uuid, text) from public;
grant execute on function public.report_feed_comment(uuid, text) to authenticated;

-- 12. RPC: toggle_feed_post_bookmark
create or replace function public.toggle_feed_post_bookmark(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  is_bookmarked boolean;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.feed_post_bookmarks
    where post_id = target_post_id and user_id = current_user_id
  ) then
    delete from public.feed_post_bookmarks
    where post_id = target_post_id and user_id = current_user_id;
    return false;
  else
    insert into public.feed_post_bookmarks (post_id, user_id)
    values (target_post_id, current_user_id);
    return true;
  end if;
end;
$$;

revoke all on function public.toggle_feed_post_bookmark(uuid) from public;
grant execute on function public.toggle_feed_post_bookmark(uuid) to authenticated;

-- 13. RPC: toggle_user_follow
create or replace function public.toggle_user_follow(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'invalid_target_user' using errcode = '22023';
  end if;
  if not public.are_users_mutually_unblocked(current_user_id, target_user_id) then
    raise exception 'user_is_blocked' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.user_follows
    where follower_id = current_user_id and following_id = target_user_id
  ) then
    delete from public.user_follows
    where follower_id = current_user_id and following_id = target_user_id;
    return false;
  else
    insert into public.user_follows (follower_id, following_id)
    values (current_user_id, target_user_id);
    return true;
  end if;
end;
$$;

revoke all on function public.toggle_user_follow(uuid) from public;
grant execute on function public.toggle_user_follow(uuid) to authenticated;

-- 14. RPC: moderate_feed_post
create or replace function public.moderate_feed_post(
  target_post_id uuid,
  action text,
  moderation_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if not public.is_moderator() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  if action = 'remove' then
    update public.feed_posts set is_removed = true where id = target_post_id;
    update public.feed_post_reports
      set status = 'resolved', resolution = 'removed: ' || moderation_notes, resolved_at = now(), resolved_by = current_user_id
      where post_id = target_post_id and status = 'pending';
  elsif action = 'restore' then
    update public.feed_posts set is_removed = false where id = target_post_id;
  elsif action = 'dismiss' then
    update public.feed_post_reports
      set status = 'dismissed', resolution = moderation_notes, resolved_at = now(), resolved_by = current_user_id
      where post_id = target_post_id and status = 'pending';
  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  insert into public.audit_logs (id, "userId", action, "targetType", "targetId", details)
  values (
    gen_random_uuid()::text,
    current_user_id::text,
    'moderate_feed_post',
    'feed_post',
    target_post_id::text,
    jsonb_build_object('action', action, 'notes', moderation_notes)
  );
end;
$$;

revoke all on function public.moderate_feed_post(uuid, text, text) from public;
grant execute on function public.moderate_feed_post(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
