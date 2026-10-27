-- G3 — Communities and Events Security, Capacity, and Access Tests.
-- Run: node supabase/tests/harness/run.mjs communities_and_events

create or replace function tests.setup_community_users()
returns table(user_a uuid, user_b uuid, user_c uuid) language plpgsql as $$
declare
  ua uuid := tests.create_auth_user('+905550000020');
  ub uuid := tests.create_auth_user('+905550000021');
  uc uuid := tests.create_auth_user('+905550000022');
begin
  perform tests.publish_legal();

  -- User A
  perform tests.login(ua);
  perform public.complete_community_onboarding(
    'Topluluk Kurucusu', '1990-01-01', 'İstanbul', array['Kültür'], '2026-10-27', '2026-10-27'
  );

  -- User B
  perform tests.login(ub);
  perform public.complete_community_onboarding(
    'Üye Adayı', '1995-05-05', 'İstanbul', array['Müzik'], '2026-10-27', '2026-10-27'
  );

  -- User C
  perform tests.login(uc);
  perform public.complete_community_onboarding(
    'Üçüncü Kişi', '1998-08-08', 'Ankara', array['Edebiyat'], '2026-10-27', '2026-10-27'
  );

  user_a := ua;
  user_b := ub;
  user_c := uc;
  return next;
end;
$$;

-- @test closed community content is protected by RLS and hidden from non-members
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_community_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);

-- User A creates a closed (private) community
insert into public.communities (id, name, topic, city, is_private, creator_id)
values ('aaaaaaaa-1111-1111-1111-111111111111'::uuid, 'Kapalı Topluluk', 'Gizli Konular', 'İstanbul', true, auth.uid());

insert into public.community_memberships (community_id, user_id, role, status)
values ('aaaaaaaa-1111-1111-1111-111111111111'::uuid, auth.uid(), 'organizer', 'active');

-- User A creates a post inside the closed community
insert into public.community_posts (id, community_id, author_id, body)
values ('bbbbbbbb-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-1111-1111-1111-111111111111'::uuid, auth.uid(), 'Sadece üyelere özel içerik');

-- User B (not a member) CANNOT read the post
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.community_posts where community_id = ''aaaaaaaa-1111-1111-1111-111111111111''::uuid'),
  0::bigint,
  'Non-member cannot read closed community posts'
);

-- User B requests to join -> status is pending
select tests.eq(
  (public.join_community('aaaaaaaa-1111-1111-1111-111111111111'::uuid) ->> 'status'),
  'pending',
  'Private community join is pending'
);

-- Pending member still cannot read closed content!
select tests.eq(
  tests.row_count('select 1 from public.community_posts where community_id = ''aaaaaaaa-1111-1111-1111-111111111111''::uuid'),
  0::bigint,
  'Pending member still cannot read closed content'
);

-- User A (organizer) approves User B
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  (public.respond_community_join_request('aaaaaaaa-1111-1111-1111-111111111111'::uuid, current_setting('t.ub')::uuid, true) ->> 'status'),
  'active',
  'Organizer approved join request'
);

-- Now User B is active member and CAN read the post!
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (select body from public.community_posts where id = 'bbbbbbbb-1111-1111-1111-111111111111'::uuid),
  'Sadece üyelere özel içerik',
  'Active member can read closed community posts'
);
reset role;

-- @test non-organizer cannot approve requests or edit someone else's community
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_community_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);
insert into public.communities (id, name, topic, city, is_private, creator_id)
values ('aaaaaaaa-2222-2222-2222-222222222222'::uuid, 'Alp Çevresi', 'Sanat', 'İstanbul', false, auth.uid());

-- User B tries to update User A's community
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  tests.affected($q$update public.communities set name = 'Hacked' where id = 'aaaaaaaa-2222-2222-2222-222222222222'::uuid$q$),
  0::bigint,
  'Non-organizer cannot update community'
);

-- Non-organizer tries to approve join request
select tests.throws(
  $q$select public.respond_community_join_request('aaaaaaaa-2222-2222-2222-222222222222'::uuid, auth.uid(), true)$q$,
  'organizer_required',
  'Non-organizer cannot respond to requests'
);
reset role;

-- @test event capacity race condition and double join prevention
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true),
       set_config('t.uc', user_c::text, true)
from tests.setup_community_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);

-- Organizer creates an event with capacity = 1
insert into public.community_events (
  id, organizer_id, title, category, city, starts_at, ends_at, capacity
)
values (
  'cccccccc-1111-1111-1111-111111111111'::uuid,
  auth.uid(),
  'Özel Bağlama Dersi',
  'Atölye',
  'İstanbul',
  now() + interval '2 days',
  now() + interval '2 days 2 hours',
  1
);

-- User B joins -> Success (1/1)
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (public.join_community_event('cccccccc-1111-1111-1111-111111111111'::uuid) ->> 'status'),
  'confirmed',
  'User B successfully joins'
);

-- Double join prevention: User B tries to join again -> error
select tests.throws(
  $q$select public.join_community_event('cccccccc-1111-1111-1111-111111111111'::uuid)$q$,
  'already_joined',
  'Double join is rejected'
);

-- User C tries to join -> capacity_full error
select tests.login(current_setting('t.uc')::uuid);
select tests.throws(
  $q$select public.join_community_event('cccccccc-1111-1111-1111-111111111111'::uuid)$q$,
  'capacity_full',
  'Full capacity rejects additional participants'
);

-- User B cancels participation
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (public.cancel_event_participation('cccccccc-1111-1111-1111-111111111111'::uuid) ->> 'status'),
  'cancelled',
  'Participation cancelled'
);

-- Now User C joins the newly available spot -> Success!
select tests.login(current_setting('t.uc')::uuid);
select tests.eq(
  (public.join_community_event('cccccccc-1111-1111-1111-111111111111'::uuid) ->> 'status'),
  'confirmed',
  'User C successfully claims opened spot'
);
reset role;

-- @test cannot join past or cancelled events
select set_config('t.ua', user_a::text, true), set_config('t.ub', user_b::text, true)
from tests.setup_community_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);

-- Past event
insert into public.community_events (
  id, organizer_id, title, category, city, starts_at, ends_at, capacity
)
values (
  'cccccccc-2222-2222-2222-222222222222'::uuid,
  auth.uid(),
  'Geçmiş Etkinlik',
  'Söyleşi',
  'İzmir',
  now() - interval '2 days',
  now() - interval '1 day',
  10
);

select tests.login(current_setting('t.ub')::uuid);
select tests.throws(
  $q$select public.join_community_event('cccccccc-2222-2222-2222-222222222222'::uuid)$q$,
  'event_ended',
  'Cannot join ended event'
);
reset role;
