-- Bos Discover deneyiminde gosterilen starter profilleri daha dogal eslesme metinleriyle gunceller.
update public.users
set
  city = 'İstanbul',
  occupation = 'Kültür sanat editörü',
  bio = 'Deyiş geceleri, kitaplar ve sakin yürüyüşler etrafında güzel bir sohbet kurmayı severim.',
  hometown = 'Tunceli',
  "favoriteSong" = 'Dostum Dostum',
  "favoritePoet" = 'Pir Sultan Abdal',
  "culturalIdentity" = 'alevi',
  "cultureImportance" = 'important',
  interests = array['cem_culture', 'turkish_folk_music', 'solidarity', 'literature'],
  badges = array['verified_profile', 'community_member'],
  "isPremium" = false,
  "isDiscoverable" = true,
  "hasPassedEntryTest" = true,
  "hasCompletedOnboarding" = true,
  "isActive" = true,
  "updatedAt" = now()
where id = '11111111-1111-4111-8111-111111111111';

update public.users
set
  city = 'İzmir',
  occupation = 'Mimar',
  bio = 'Bağlama dinlemeyi, sergi gezmeyi ve hafta sonu sahil yürüyüşlerini seviyorum.',
  hometown = 'Sivas',
  "favoriteSong" = 'Gesi Bağları',
  "favoritePoet" = 'Aşık Veysel',
  "culturalIdentity" = 'close_to_alevi_culture',
  "cultureImportance" = 'important',
  interests = array['baglama', 'folk_poets', 'art', 'travel'],
  badges = array['verified_profile', 'community_member'],
  "isPremium" = false,
  "isDiscoverable" = true,
  "hasPassedEntryTest" = true,
  "hasCompletedOnboarding" = true,
  "isActive" = true,
  "updatedAt" = now()
where id = '22222222-2222-4222-8222-222222222222';

update public.users
set
  city = 'Ankara',
  occupation = 'Müzik öğretmeni',
  bio = 'Türk halk müziği, yol hikayeleri ve içten sohbetler benim tarafım. Kahveyi sade içerim.',
  hometown = 'Erzincan',
  "favoriteSong" = 'Uzun İnce Bir Yoldayım',
  "favoritePoet" = 'Aşık Veysel',
  "culturalIdentity" = 'alevi',
  "cultureImportance" = 'very_important',
  interests = array['turkish_folk_music', 'folk_poets', 'cem_culture', 'nature'],
  badges = array['verified_profile', 'community_member'],
  "isPremium" = false,
  "isDiscoverable" = true,
  "hasPassedEntryTest" = true,
  "hasCompletedOnboarding" = true,
  "isActive" = true,
  "updatedAt" = now()
where id = '33333333-3333-4333-8333-333333333333';

notify pgrst, 'reload schema';
