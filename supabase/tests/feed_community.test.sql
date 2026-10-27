-- G2 — Community Feed Security, Moderation, and Filtering Tests.
-- Run: node supabase/tests/harness/run.mjs feed_community

create or replace function tests.setup_two_users()
returns table(user_a uuid, user_b uuid) language plpgsql as $$
declare
  ua uuid := tests.create_auth_user('+905550000010');
  ub uuid := tests.create_auth_user('+905550000011');
begin
  perform tests.publish_legal();

  -- Onboard user A
  perform tests.login(ua);
  perform public.complete_community_onboarding(
    'Alp Arslan', '1996-01-01', 'İstanbul', array['Müzik'], '2026-10-27', '2026-10-27'
  );

  -- Onboard user B
  perform tests.login(ub);
  perform public.complete_community_onboarding(
    'Buse Çetin', '1998-05-15', 'İzmir', array['Edebiyat'], '2026-10-27', '2026-10-27'
  );

  user_a := ua;
  user_b := ub;
  return next;
end;
$$;

-- @test non-eligible user cannot read or insert feed posts
select tests.publish_legal();
select set_config('t.non_eligible', tests.create_auth_user('+905550000099')::text, true);
set local role authenticated;
select tests.login(current_setting('t.non_eligible')::uuid);
select tests.throws(
  $q$insert into public.feed_posts (author_id, body) values (auth.uid(), 'Merhaba dünya')$q$,
  'row-level security',
  'non-eligible user cannot post'
);
select tests.eq(tests.row_count('select 1 from public.feed_posts'), 0::bigint, 'non-eligible user sees no posts');
reset role;

-- @test two eligible users can post, view, and interact with posts
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

-- User A creates a post
set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body, tags)
values ('11111111-1111-1111-1111-111111111111'::uuid, auth.uid(), 'Alp paylaşımı', array['gundem']);

-- User B reads it and likes it
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (select body from public.feed_posts where id = '11111111-1111-1111-1111-111111111111'::uuid),
  'Alp paylaşımı',
  'User B can view User A post'
);
insert into public.feed_post_likes (post_id, user_id)
values ('11111111-1111-1111-1111-111111111111'::uuid, auth.uid());
select tests.eq(
  (select count(*) from public.feed_post_likes where post_id = '11111111-1111-1111-1111-111111111111'::uuid),
  1::bigint,
  'Like registered'
);

-- Duplicate like is rejected by unique constraint
select tests.throws(
  $q$insert into public.feed_post_likes (post_id, user_id)
     values ('11111111-1111-1111-1111-111111111111'::uuid, auth.uid())$q$,
  'duplicate key',
  'duplicate like fails'
);
reset role;

-- @test foreign user cannot update or delete someone else's post
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body)
values ('22222222-2222-2222-2222-222222222222'::uuid, auth.uid(), 'Orjinal Gönderi');

-- User B tries to update User A's post -> affected rows must be 0 or throw
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  tests.affected($q$update public.feed_posts set body = 'Hacked' where id = '22222222-2222-2222-2222-222222222222'::uuid$q$),
  0::bigint,
  'Foreign user cannot modify post'
);
-- User B tries to delete User A's post -> affected rows must be 0
select tests.eq(
  tests.affected($q$delete from public.feed_posts where id = '22222222-2222-2222-2222-222222222222'::uuid$q$),
  0::bigint,
  'Foreign user cannot delete post'
);

-- User A can update own post
select tests.login(current_setting('t.ua')::uuid);
update public.feed_posts set body = 'Düzenlenmiş Gönderi' where id = '22222222-2222-2222-2222-222222222222'::uuid;
select tests.eq(
  (select body from public.feed_posts where id = '22222222-2222-2222-2222-222222222222'::uuid),
  'Düzenlenmiş Gönderi',
  'Author can update post'
);
reset role;

-- @test reporting a post logs to reports and audit_logs
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body)
values ('33333333-3333-3333-3333-333333333333'::uuid, auth.uid(), 'Raporlanacak Gönderi');

-- Cannot report own post
select tests.throws(
  $q$select public.report_feed_post('33333333-3333-3333-3333-333333333333'::uuid, 'spam', 'Kendi postum')$q$,
  'cannot_report_own_post'
);

-- User B reports User A's post
select tests.login(current_setting('t.ub')::uuid);
select public.report_feed_post('33333333-3333-3333-3333-333333333333'::uuid, 'spam', 'Spam içerik');
reset role;

select tests.eq(
  (select count(*) from public.feed_post_reports where post_id = '33333333-3333-3333-3333-333333333333'::uuid),
  1::bigint,
  'feed_post_reports row created'
);
select tests.eq(
  (select count(*) from public.reports where "reporterId" = current_setting('t.ub')::uuid and "reportedUserId" = current_setting('t.ua')::uuid),
  1::bigint,
  'central reports queue row created'
);
select tests.eq(
  (select count(*) from public.audit_logs where "userId" = current_setting('t.ub') and action = 'report_feed_post'),
  1::bigint,
  'audit_log created'
);

-- @test moderation can remove a post and hide it from regular members
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body)
values ('44444444-4444-4444-4444-444444444444'::uuid, auth.uid(), 'Uygunsuz Gönderi');

-- User B sees it initially
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.feed_posts where id = ''44444444-4444-4444-4444-444444444444''::uuid'),
  1::bigint,
  'User B initially sees post'
);

-- Make User B a moderator
reset role;
insert into public.user_roles ("userId", role) values (current_setting('t.ub')::uuid, 'moderator');

-- Moderator removes post
set local role authenticated;
select tests.login(current_setting('t.ub')::uuid);
select public.moderate_feed_post('44444444-4444-4444-4444-444444444444'::uuid, 'remove', 'Topluluk kuralı ihlali');

-- Create a third regular user C
reset role;
select set_config('t.uc', tests.create_auth_user('+905550000012')::text, true);
set local role authenticated;
select tests.login(current_setting('t.uc')::uuid);
select public.complete_community_onboarding('Caner Demir', '1995-02-02', 'Bursa', '{}', '2026-10-27', '2026-10-27');

-- Regular user C cannot see the removed post!
select tests.eq(
  tests.row_count('select 1 from public.feed_posts where id = ''44444444-4444-4444-4444-444444444444''::uuid'),
  0::bigint,
  'Removed post is hidden from regular members'
);
reset role;

-- @test blocking hides posts mutually and cleans up followings
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body)
values ('55555555-5555-5555-5555-555555555555'::uuid, auth.uid(), 'Alp Gönderisi 5');

-- User B follows User A
select tests.login(current_setting('t.ub')::uuid);
select public.toggle_user_follow(current_setting('t.ua')::uuid);
select tests.eq(
  (select count(*) from public.user_follows where follower_id = auth.uid() and following_id = current_setting('t.ua')::uuid),
  1::bigint,
  'Follow established'
);

-- User B blocks User A
select public.block_user(current_setting('t.ua')::uuid);
-- Follow was automatically removed
select tests.eq(
  (select count(*) from public.user_follows where follower_id = auth.uid() and following_id = current_setting('t.ua')::uuid),
  0::bigint,
  'Follow removed after block'
);

-- User B no longer sees User A's post!
select tests.eq(
  tests.row_count('select 1 from public.feed_posts where id = ''55555555-5555-5555-5555-555555555555''::uuid'),
  0::bigint,
  'Post hidden from blocker'
);

-- User B creates a post
insert into public.feed_posts (id, author_id, body)
values ('66666666-6666-6666-6666-666666666666'::uuid, auth.uid(), 'Buse Gönderisi 6');

-- User A cannot see User B's post either (mutual block)!
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.feed_posts where id = ''66666666-6666-6666-6666-666666666666''::uuid'),
  0::bigint,
  'Post hidden mutually from blocked user'
);

-- User B unblocks User A
select tests.login(current_setting('t.ub')::uuid);
select public.unblock_user(current_setting('t.ua')::uuid);
-- Now User B sees User A's post again
select tests.eq(
  tests.row_count('select 1 from public.feed_posts where id = ''55555555-5555-5555-5555-555555555555''::uuid'),
  1::bigint,
  'Post visible after unblock'
);
reset role;

-- @test bookmarks can be toggled and are private to the user
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body)
values ('77777777-7777-7777-7777-777777777777'::uuid, auth.uid(), 'Alp Bookmark Test');

-- User B bookmarks post
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(public.toggle_feed_post_bookmark('77777777-7777-7777-7777-777777777777'::uuid), true, 'Bookmarked');
select tests.eq(
  (select count(*) from public.feed_post_bookmarks where post_id = '77777777-7777-7777-7777-777777777777'::uuid and user_id = auth.uid()),
  1::bigint,
  'Bookmark recorded'
);

-- User A cannot see User B's bookmark (private)
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.feed_post_bookmarks'),
  0::bigint,
  'User A cannot see User B bookmark'
);

-- User B un-bookmarks post
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(public.toggle_feed_post_bookmark('77777777-7777-7777-7777-777777777777'::uuid), false, 'Unbookmarked');
select tests.eq(
  (select count(*) from public.feed_post_bookmarks where post_id = '77777777-7777-7777-7777-777777777777'::uuid),
  0::bigint,
  'Bookmark removed'
);
reset role;

-- @test pagination orders posts chronologically
select set_config('t.ua', user_a::text, true)
from tests.setup_two_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.feed_posts (id, author_id, body) values
  ('88888888-8888-8888-8888-888888888881'::uuid, auth.uid(), 'Post 1'),
  ('88888888-8888-8888-8888-888888888882'::uuid, auth.uid(), 'Post 2'),
  ('88888888-8888-8888-8888-888888888883'::uuid, auth.uid(), 'Post 3');

select tests.eq(
  (select count(*) from (select id from public.feed_posts where id::text like '88888888%' limit 2) as p),
  2::bigint,
  'Page 1: limit 2 posts'
);
reset role;
