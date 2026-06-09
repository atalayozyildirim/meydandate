-- İlk kullanıcılar boş bir uygulama görmesin diye açık karşılama rehberi profilleri ekler.
-- Bu profiller otomatik yanıt verir; gerçek kullanıcı gibi gizlenmezler.

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
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'ece.rehber@ehlibyte.app',
    now(),
    '{"provider":"email","providers":["email"],"starter_guide":true}'::jsonb,
    '{"name":"Ece Yalın","full_name":"Ece Yalın"}'::jsonb,
    now(),
    now(),
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'selin.rehber@ehlibyte.app',
    now(),
    '{"provider":"email","providers":["email"],"starter_guide":true}'::jsonb,
    '{"name":"Selin Karaca","full_name":"Selin Karaca"}'::jsonb,
    now(),
    now(),
    false
  ),
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
  "isActive"
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'ece.rehber@ehlibyte.app',
    'Ece Yalın',
    29,
    'İstanbul',
    'Topluluk rehberi',
    'Ehlibyte karşılama rehberiyim; yeni gelenlere ilk sohbetlerde yardımcı olurum.',
    'Tunceli',
    'Dostum Dostum',
    'Pir Sultan Abdal',
    'alevi',
    'important',
    array['cem_culture', 'turkish_folk_music', 'solidarity', 'literature'],
    '[{"id":"photo-guide-ece","uri":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80","isPrimary":true}]'::jsonb,
    array['verified_profile', 'community_member'],
    false,
    true,
    true,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'selin.rehber@ehlibyte.app',
    'Selin Karaca',
    31,
    'İzmir',
    'Topluluk rehberi',
    'Yeni üyelerin profili ve ilk sohbeti daha rahat başlatması için buradayım.',
    'Sivas',
    'Gesi Bağları',
    'Aşık Veysel',
    'close_to_alevi_culture',
    'important',
    array['baglama', 'folk_poets', 'art', 'travel'],
    '[{"id":"photo-guide-selin","uri":"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80","isPrimary":true}]'::jsonb,
    array['verified_profile', 'community_member'],
    false,
    true,
    true,
    true
  ),
  (
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
    true
  )
on conflict (id) do update
set name = excluded.name,
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
    "hasPassedEntryTest" = true,
    "hasCompletedOnboarding" = true,
    "isActive" = true,
    "updatedAt" = now();

create or replace function public.is_starter_guide_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = any(array[
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid
  ]);
$$;

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

  foreach guide_id in array array[
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid
  ]
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

create or replace function public.ensure_starter_guide_conversations_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_starter_guide_conversations_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists ensure_starter_guide_conversations_after_user_insert on public.users;
create trigger ensure_starter_guide_conversations_after_user_insert
after insert on public.users
for each row execute function public.ensure_starter_guide_conversations_trigger();

do $$
declare
  target_user_id uuid;
begin
  for target_user_id in
    select id
    from public.users
    where not public.is_starter_guide_user(id)
  loop
    perform public.ensure_starter_guide_conversations_for_user(target_user_id);
  end loop;
end;
$$;

create or replace function public.send_starter_guide_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  guide_id uuid;
  guide_message_count integer;
  reply_body text;
begin
  if public.is_starter_guide_user(new."senderId") then
    return new;
  end if;

  select case
    when public.is_starter_guide_user(conversations."participant1Id") then conversations."participant1Id"
    when public.is_starter_guide_user(conversations."participant2Id") then conversations."participant2Id"
    else null
  end
  into guide_id
  from public.conversations as conversations
  where conversations.id = new."conversationId";

  if guide_id is null then
    return new;
  end if;

  select count(*)
  into guide_message_count
  from public.messages
  where "conversationId" = new."conversationId"
    and "senderId" = guide_id;

  reply_body := case guide_id
    when '11111111-1111-4111-8111-111111111111'::uuid then
      case
        when guide_message_count <= 1 then 'Hoş geldin. İlk sohbetlerde kısa ve içten başlamak iyi oluyor; profilindeki türkü güzel bir başlangıç olabilir.'
        when guide_message_count = 2 then 'Bunu sevdim. Discover''da ortak ilgi alanlarına bakıp sohbeti oradan açabilirsin.'
        else 'Ben buradayım; takıldığın yerde yaz, birlikte daha rahat bir ilk adım buluruz.'
      end
    when '22222222-2222-4222-8222-222222222222'::uuid then
      case
        when guide_message_count <= 1 then 'Ne güzel. Yeni gelenler için en iyi başlangıç genelde şehir, müzik ya da kitaplardan biri oluyor.'
        when guide_message_count = 2 then 'Anladım. Profilindeki bio kısa ama sıcak olursa eşleşmeler daha doğal ilerler.'
        else 'İstersen birkaç cümle daha yaz; ben de sohbeti nasıl yumuşatabileceğini söyleyeyim.'
      end
    else
      case
        when guide_message_count <= 1 then 'Selam. Burada sakin ve saygılı sohbet iyi çalışıyor; acele etmeden ilerlemek en doğrusu.'
        when guide_message_count = 2 then 'Güzel bir başlangıç. Ortak müzik ya da memleket detayı varsa sohbet hemen akıyor.'
        else 'Yazmaya devam et; ilk günlerde ritmi bulmana yardımcı olurum.'
      end
  end;

  insert into public.messages (
    "conversationId",
    "senderId",
    body,
    status,
    "createdAt"
  )
  values (
    new."conversationId",
    guide_id,
    reply_body,
    'sent',
    now() + interval '300 milliseconds'
  );

  update public.conversations
  set "lastMessageAt" = now()
  where id = new."conversationId";

  return new;
end;
$$;

drop trigger if exists send_starter_guide_reply_after_message_insert on public.messages;
create trigger send_starter_guide_reply_after_message_insert
after insert on public.messages
for each row execute function public.send_starter_guide_reply();

revoke all on function public.is_starter_guide_user(uuid) from public, anon, authenticated;
revoke all on function public.ensure_starter_guide_conversations_for_user(uuid) from public, anon, authenticated;
revoke all on function public.ensure_starter_guide_conversations_trigger() from public, anon, authenticated;
revoke all on function public.send_starter_guide_reply() from public, anon, authenticated;
