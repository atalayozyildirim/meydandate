-- Starter guide conversations should only target guide profiles that exist in public.users.
-- A missing hardcoded guide id was causing FK errors while AI starter profiles were inserted.

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'murat.rehber@ehlibyte.app',
    now(),
    '{"provider":"email","providers":["email"],"starter_guide":true}'::jsonb,
    '{"name":"Murat Aydın","full_name":"Murat Aydın"}'::jsonb,
    now(),
    now(),
    false
  )
on conflict (id) do update
set email = excluded.email,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

insert into public.users (
  id,
  email,
  name,
  age,
  city,
  occupation,
  bio,
  hometown,
  "favoriteSong",
  "favoritePoet",
  "culturalIdentity",
  "cultureImportance",
  interests,
  photos,
  badges,
  "isPremium",
  "hasPassedEntryTest",
  "hasCompletedOnboarding",
  "isActive",
  "isDiscoverable",
  "profileKind"
)
values (
  '33333333-3333-4333-8333-333333333333',
  'murat.rehber@ehlibyte.app',
  'Murat Aydın',
  34,
  'Ankara',
  'Topluluk rehberi',
  'Ehlibyte''da saygılı tanışma ve sohbet akışına destek veren karşılama rehberiyim.',
  'Erzincan',
  'Uzun İnce Bir Yoldayım',
  'Aşık Veysel',
  'alevi',
  'very_important',
  array['turkish_folk_music', 'folk_poets', 'cem_culture', 'nature'],
  '[{"id":"photo-guide-murat","uri":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80","isPrimary":true}]'::jsonb,
  array['verified_profile', 'community_member'],
  false,
  true,
  true,
  true,
  true,
  'starter'
)
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    age = excluded.age,
    city = excluded.city,
    occupation = excluded.occupation,
    bio = excluded.bio,
    hometown = excluded.hometown,
    "favoriteSong" = excluded."favoriteSong",
    "favoritePoet" = excluded."favoritePoet",
    "culturalIdentity" = excluded."culturalIdentity",
    "cultureImportance" = excluded."cultureImportance",
    interests = excluded.interests,
    photos = excluded.photos,
    badges = excluded.badges,
    "isPremium" = excluded."isPremium",
    "hasPassedEntryTest" = excluded."hasPassedEntryTest",
    "hasCompletedOnboarding" = excluded."hasCompletedOnboarding",
    "isDiscoverable" = excluded."isDiscoverable",
    "profileKind" = excluded."profileKind",
    "updatedAt" = now();

create or replace function public.ensure_starter_guide_conversations_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  guide_id uuid;
  conversation_id uuid;
  opening_body text;
begin
  if target_user_id is null or public.is_starter_guide_user(target_user_id) then
    return;
  end if;

  if not exists (
    select 1 from public.users where id = target_user_id
  ) then
    return;
  end if;

  for guide_id in
    select users.id
    from public.users
    where users.id = any(array[
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid
    ])
      and coalesce(users."isActive", true)
      and coalesce(users."hasCompletedOnboarding", true)
  loop
    select conversations.id
    into conversation_id
    from public.conversations
    where (
      "participant1Id" = guide_id and "participant2Id" = target_user_id
    ) or (
      "participant1Id" = target_user_id and "participant2Id" = guide_id
    )
    limit 1;

    if conversation_id is null then
      insert into public.conversations (
        "participant1Id",
        "participant2Id",
        "lastMessageAt"
      )
      values (guide_id, target_user_id, now())
      returning id into conversation_id;
    end if;

    opening_body := case guide_id
      when '11111111-1111-4111-8111-111111111111'::uuid then
        'Merhaba, ben Ece. Ehlibyte karşılama rehberlerindenim; ilk sohbeti birlikte yumuşakça açabiliriz.'
      when '22222222-2222-4222-8222-222222222222'::uuid then
        'Hoş geldin, ben Selin. Profil ve ilk sohbet başlangıcında eşlik ediyorum; bugün nasılsın?'
      else
        'Selam, ben Murat. İlk günlerde yol göstermek için buradayım; müzik mi sohbet mi daha çok ilgini çeker?'
    end;

    insert into public.messages (
      "conversationId",
      "senderId",
      body,
      status,
      "createdAt"
    )
    select conversation_id, guide_id, opening_body, 'read', now()
    where not exists (
      select 1
      from public.messages
      where "conversationId" = conversation_id
        and "senderId" = guide_id
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
