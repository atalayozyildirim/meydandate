-- G5 — Admin-Controlled Live Space Security and Server Controls Tests.
-- Run: node supabase/tests/harness/run.mjs live_space_security

create or replace function tests.setup_space_users()
returns table(admin_id uuid, member_a uuid, member_b uuid) language plpgsql as $$
declare
  u_admin uuid := tests.create_auth_user('+905550000040');
  u_a uuid := tests.create_auth_user('+905550000041');
  u_b uuid := tests.create_auth_user('+905550000042');
begin
  perform tests.publish_legal();

  -- Admin user onboarding
  perform tests.login(u_admin);
  perform public.complete_community_onboarding(
    'Ana Yönetici', '1988-01-01', 'İstanbul', array['Kültür'], '2026-10-27', '2026-10-27'
  );

  -- Assign admin role in public.user_roles (server-verified UUID)
  insert into public.user_roles ("userId", role, "assignedBy")
  values (u_admin, 'admin', 'tests');

  -- Member A (regular adult user)
  perform tests.login(u_a);
  perform public.complete_community_onboarding(
    'Dinleyici Ali', '1995-05-15', 'İstanbul', array['Müzik'], '2026-10-27', '2026-10-27'
  );

  -- Member B (regular adult user)
  perform tests.login(u_b);
  perform public.complete_community_onboarding(
    'Dinleyici Berk', '1996-06-20', 'Ankara', array['Edebiyat'], '2026-10-27', '2026-10-27'
  );

  admin_id := u_admin;
  member_a := u_a;
  member_b := u_b;
  return next;
end;
$$;

-- @test regular member cannot start, stop, or rename live rooms
select set_config('t.admin', admin_id::text, true),
       set_config('t.ma', member_a::text, true)
from tests.setup_space_users();

set local role authenticated;
select tests.login(current_setting('t.ma')::uuid);

-- Regular member tries to start live room -> rejected
select tests.throws(
  'select public.admin_start_live_room(''test-room-1'', ''Hileli Yayın'', ''Açıklama'', null)',
  'moderator_required',
  'Regular member cannot start room'
);

-- Regular member tries to stop room -> rejected
select tests.throws(
  'select public.admin_stop_live_room(''test-room-1'')',
  'moderator_required',
  'Regular member cannot stop room'
);

-- Regular member tries to rename room -> rejected
select tests.throws(
  'select public.admin_update_live_room_title(''test-room-1'', ''Yeni Başlık'', ''Yeni Açıklama'')',
  'moderator_required',
  'Regular member cannot rename room'
);
reset role;

-- @test admin starts room, member joins as listener and cannot unmute
select set_config('t.admin', admin_id::text, true),
       set_config('t.ma', member_a::text, true)
from tests.setup_space_users();

set local role authenticated;

-- Admin starts room
select tests.login(current_setting('t.admin')::uuid);
select tests.ok(
  (public.admin_start_live_room('meydan-space-main', 'Meydan Akşam Buluşması', 'Söz meydanda', null)).status = 'live',
  'Admin successfully starts room'
);

-- Member A joins room -> becomes listener and is muted
select tests.login(current_setting('t.ma')::uuid);
select tests.ok(
  (public.join_live_room('meydan-space-main')).stage_status = 'listener',
  'Member joins as listener'
);

select tests.ok(
  (select is_muted from public.live_room_participants where room_id = 'meydan-space-main' and user_id = current_setting('t.ma')::uuid),
  'Listener is muted by default'
);

-- Listener tries to unmute themselves -> REJECTED!
select tests.throws(
  format(
    'select public.set_live_participant_muted(''meydan-space-main'', %L::uuid, false)',
    current_setting('t.ma')
  ),
  'only_speakers_can_unmute',
  'Listener cannot unmute microphone'
);
reset role;

-- @test hand raise, admin promotion to speaker, unmute, and demotion
select set_config('t.admin', admin_id::text, true),
       set_config('t.ma', member_a::text, true)
from tests.setup_space_users();

set local role authenticated;

-- Admin starts room
select tests.login(current_setting('t.admin')::uuid);
select public.admin_start_live_room('meydan-space-main', 'Meydan Buluşması', 'Açıklama', null);

-- Member joins
select tests.login(current_setting('t.ma')::uuid);
select public.join_live_room('meydan-space-main');

-- Member raises hand
select tests.ok(
  (public.set_live_participant_hand_raised('meydan-space-main', current_setting('t.ma')::uuid, true)).hand_raised_at is not null,
  'Member raises hand'
);

-- Member CANNOT self-promote to speaker!
select tests.throws(
  format(
    'select public.moderator_set_live_participant_stage(''meydan-space-main'', %L::uuid, ''speaker'')',
    current_setting('t.ma')
  ),
  'moderator_required',
  'Member cannot promote themselves'
);

-- Admin promotes member to speaker
select tests.login(current_setting('t.admin')::uuid);
select tests.ok(
  (public.moderator_set_live_participant_stage('meydan-space-main', current_setting('t.ma')::uuid, 'speaker')).stage_status = 'speaker',
  'Admin promotes member to speaker'
);

-- Now speaker CAN unmute microphone
select tests.login(current_setting('t.ma')::uuid);
select tests.ok(
  not (public.set_live_participant_muted('meydan-space-main', current_setting('t.ma')::uuid, false)).is_muted,
  'Speaker can unmute microphone'
);

-- Admin mutes speaker and demotes back to listener
select tests.login(current_setting('t.admin')::uuid);
select tests.ok(
  (public.set_live_participant_muted('meydan-space-main', current_setting('t.ma')::uuid, true)).is_muted,
  'Admin mutes speaker'
);

select tests.ok(
  (public.moderator_set_live_participant_stage('meydan-space-main', current_setting('t.ma')::uuid, 'listener')).stage_status = 'listener',
  'Admin demotes speaker to listener'
);
reset role;

-- @test kicked participant is banned and cannot rejoin; stopped room rejects connections
select set_config('t.admin', admin_id::text, true),
       set_config('t.ma', member_a::text, true)
from tests.setup_space_users();

set local role authenticated;

-- Admin starts room
select tests.login(current_setting('t.admin')::uuid);
select public.admin_start_live_room('meydan-space-main', 'Meydan Buluşması', 'Açıklama', null);

-- Member joins
select tests.login(current_setting('t.ma')::uuid);
select public.join_live_room('meydan-space-main');

-- Admin kicks member
select tests.login(current_setting('t.admin')::uuid);
select public.moderator_remove_live_participant('meydan-space-main', current_setting('t.ma')::uuid);

-- Member tries to rejoin -> REJECTED (user_banned_from_room)
select tests.login(current_setting('t.ma')::uuid);
select tests.throws(
  'select public.join_live_room(''meydan-space-main'')',
  'user_banned_from_room',
  'Kicked participant cannot rejoin'
);

-- Admin stops room
select tests.login(current_setting('t.admin')::uuid);
select tests.ok(
  (public.admin_stop_live_room('meydan-space-main')).status = 'offline',
  'Room is stopped and status is offline'
);

-- Anyone trying to join stopped room is rejected
select tests.throws(
  'select public.join_live_room(''meydan-space-main'')',
  'room_not_active',
  'Ended room rejects new connections'
);
reset role;
