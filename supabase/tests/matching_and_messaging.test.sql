-- G4 — Real Reciprocal Matching and Messaging Security Tests.
-- Run: node supabase/tests/harness/run.mjs matching_and_messaging

create or replace function tests.setup_matching_users()
returns table(user_a uuid, user_b uuid, user_c uuid) language plpgsql as $$
declare
  ua uuid := tests.create_auth_user('+905550000030');
  ub uuid := tests.create_auth_user('+905550000031');
  uc uuid := tests.create_auth_user('+905550000032');
begin
  perform tests.publish_legal();

  -- User A (adult)
  perform tests.login(ua);
  perform public.complete_community_onboarding(
    'Alp', '1992-03-15', 'İstanbul', array['Müzik', 'Edebiyat'], '2026-10-27', '2026-10-27'
  );

  -- User B (adult)
  perform tests.login(ub);
  perform public.complete_community_onboarding(
    'Buse', '1994-07-20', 'İstanbul', array['Müzik', 'Sanat'], '2026-10-27', '2026-10-27'
  );

  -- User C (adult)
  perform tests.login(uc);
  perform public.complete_community_onboarding(
    'Can', '1991-11-10', 'Ankara', array['Kültür'], '2026-10-27', '2026-10-27'
  );

  user_a := ua;
  user_b := ub;
  user_c := uc;
  return next;
end;
$$;

-- @test non-eligible user cannot swipe
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true)
from tests.setup_matching_users();

-- Unonboarded user tries to swipe
select tests.login(tests.create_auth_user('+905550000039'));
set local role authenticated;
select tests.throws(
  format('select * from public.record_swipe(%L::uuid, ''like'')', current_setting('t.ua')),
  'access_denied',
  'Unonboarded user cannot swipe'
);
reset role;

-- @test one-sided like does not create match or conversation
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true)
from tests.setup_matching_users();

set local role authenticated;
select tests.login(current_setting('t.ua')::uuid);

-- User A likes User B
select tests.eq(
  (select matched from public.record_swipe(current_setting('t.ub')::uuid, 'like')),
  false,
  'One-sided like returns matched = false'
);

-- Matches table is still empty for them
select tests.eq(
  tests.row_count('select 1 from public.matches'),
  0::bigint,
  'No match row created on one-sided like'
);

-- Conversations table has no conversation between User A and User B
select tests.eq(
  tests.row_count(format(
    'select 1 from public.conversations where least("participant1Id", "participant2Id") = least(%L::uuid, %L::uuid) and greatest("participant1Id", "participant2Id") = greatest(%L::uuid, %L::uuid)',
    current_setting('t.ua'), current_setting('t.ub'),
    current_setting('t.ua'), current_setting('t.ub')
  )),
  0::bigint,
  'No conversation row created between them on one-sided like'
);
reset role;

-- @test mutual likes create exactly one match and one shared conversation
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true)
from tests.setup_matching_users();

set local role authenticated;

-- User A likes User B
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  (select matched from public.record_swipe(current_setting('t.ub')::uuid, 'like')),
  false,
  'User A likes User B'
);

-- User B likes User A back -> Mutual Match!
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (select matched from public.record_swipe(current_setting('t.ua')::uuid, 'like')),
  true,
  'User B likes back -> matched = true'
);

-- Exactly 1 match in matches table
select tests.eq(
  tests.row_count(format(
    'select 1 from public.matches where least("user1Id", "user2Id") = least(%L::uuid, %L::uuid) and greatest("user1Id", "user2Id") = greatest(%L::uuid, %L::uuid)',
    current_setting('t.ua'), current_setting('t.ub'),
    current_setting('t.ua'), current_setting('t.ub')
  )),
  1::bigint,
  'Exactly 1 match created between them'
);

-- Exactly 1 conversation created
select tests.eq(
  tests.row_count(format(
    'select 1 from public.conversations where least("participant1Id", "participant2Id") = least(%L::uuid, %L::uuid) and greatest("participant1Id", "participant2Id") = greatest(%L::uuid, %L::uuid)',
    current_setting('t.ua'), current_setting('t.ub'),
    current_setting('t.ua'), current_setting('t.ub')
  )),
  1::bigint,
  'Exactly 1 conversation created between them'
);

-- User A swipes again -> returns existing match (idempotent, no duplicates)
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  (select matched from public.record_swipe(current_setting('t.ub')::uuid, 'like')),
  true,
  'Repeated like returns existing match'
);

select tests.eq(
  tests.row_count('select 1 from public.matches'),
  1::bigint,
  'Still exactly 1 match (no duplicates)'
);
reset role;

-- @test unauthorized conversation read is blocked by RLS
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true),
       set_config('t.uc', user_c::text, true)
from tests.setup_matching_users();

set local role authenticated;

-- A & B match
select tests.login(current_setting('t.ua')::uuid);
select public.record_swipe(current_setting('t.ub')::uuid, 'like');
select tests.login(current_setting('t.ub')::uuid);
select set_config('t.conv_id', conversation_id::text, true)
from public.record_swipe(current_setting('t.ua')::uuid, 'like');

-- User A sends a message in the conversation
select tests.login(current_setting('t.ua')::uuid);
insert into public.messages (id, "conversationId", "senderId", body)
values (
  '11111111-2222-3333-4444-555555555555'::uuid,
  current_setting('t.conv_id')::uuid,
  current_setting('t.ua')::uuid,
  'Merhaba Buse!'
);

-- User B can read the message
select tests.login(current_setting('t.ub')::uuid);
select tests.eq(
  (select body from public.messages where id = '11111111-2222-3333-4444-555555555555'::uuid),
  'Merhaba Buse!',
  'Recipient can read message'
);

-- User C (third party) CANNOT read the conversation or message
select tests.login(current_setting('t.uc')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.conversations where id = current_setting(''t.conv_id'')::uuid'),
  0::bigint,
  'Third party cannot see conversation'
);

select tests.eq(
  tests.row_count('select 1 from public.messages where "conversationId" = current_setting(''t.conv_id'')::uuid'),
  0::bigint,
  'Third party cannot see messages'
);

-- User C CANNOT send a message into User A & B conversation
select tests.throws(
  format(
    'insert into public.messages ("conversationId", "senderId", body) values (%L::uuid, %L::uuid, ''Sızma girişimi'')',
    current_setting('t.conv_id'),
    current_setting('t.uc')
  ),
  'violates row-level security policy',
  'Third party cannot send message to foreign conversation'
);
reset role;

-- @test blocking immediately stops messaging and hides conversation
select set_config('t.ua', user_a::text, true),
       set_config('t.ub', user_b::text, true)
from tests.setup_matching_users();

set local role authenticated;

-- A & B match and establish conversation
select tests.login(current_setting('t.ua')::uuid);
select public.record_swipe(current_setting('t.ub')::uuid, 'like');
select tests.login(current_setting('t.ub')::uuid);
select set_config('t.conv_id', conversation_id::text, true)
from public.record_swipe(current_setting('t.ua')::uuid, 'like');

-- User A sends message 1
select tests.login(current_setting('t.ua')::uuid);
insert into public.messages ("conversationId", "senderId", body)
values (current_setting('t.conv_id')::uuid, current_setting('t.ua')::uuid, 'İlk mesaj');

-- User B blocks User A
select tests.login(current_setting('t.ub')::uuid);
select public.block_user(current_setting('t.ua')::uuid);

-- Now User A cannot see conversation
select tests.login(current_setting('t.ua')::uuid);
select tests.eq(
  tests.row_count('select 1 from public.conversations where id = current_setting(''t.conv_id'')::uuid'),
  0::bigint,
  'Blocked user cannot see conversation'
);

-- User A cannot send new message after being blocked
select tests.throws(
  format(
    'insert into public.messages ("conversationId", "senderId", body) values (%L::uuid, %L::uuid, ''Engel sonrası mesaj'')',
    current_setting('t.conv_id'),
    current_setting('t.ua')
  ),
  'violates row-level security policy',
  'Cannot send message to conversation when blocked'
);

-- User B also cannot send message to blocked user
select tests.login(current_setting('t.ub')::uuid);
select tests.throws(
  format(
    'insert into public.messages ("conversationId", "senderId", body) values (%L::uuid, %L::uuid, ''Bloklayan da atamaz'')',
    current_setting('t.conv_id'),
    current_setting('t.ub')
  ),
  'violates row-level security policy',
  'Blocker cannot send message until unblocked'
);
reset role;
