# Supabase Integration Guide

Bu proje Supabase ile entegre edilmiştir. Başlamak için aşağıdaki adımları izleyin.

## 1. Supabase Projesi Oluştur

1. [Supabase](https://supabase.com) adresine git ve giriş yap
2. Yeni bir proje oluştur
3. Proje ayarlarından kopyala:
   - **Proje URL** (EXPO_PUBLIC_SUPABASE_URL)
   - **Anon Key** (EXPO_PUBLIC_SUPABASE_ANON_KEY)

## 2. Environment Variables Ayarla

`.env.local` dosyasını düzenle:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Veritabanı Schema Oluştur

Supabase SQL Editor'de aşağıdaki SQL'i çalıştır:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  bio TEXT,
  culturalIdentity TEXT DEFAULT 'prefer_not_to_say',
  cultureImportance TEXT DEFAULT 'somewhat_important',
  interests TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  badges TEXT[] DEFAULT '{}',
  isPremium BOOLEAN DEFAULT FALSE,
  hasCompletedOnboarding BOOLEAN DEFAULT FALSE,
  blockedUsers UUID[] DEFAULT '{}',
  mutedUsers UUID[] DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1Id UUID REFERENCES users(id) ON DELETE CASCADE,
  participant2Id UUID REFERENCES users(id) ON DELETE CASCADE,
  matchId UUID,
  lastMessageAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversationId UUID REFERENCES conversations(id) ON DELETE CASCADE,
  senderId UUID REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1Id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2Id UUID REFERENCES users(id) ON DELETE CASCADE,
  matchedAt TIMESTAMP DEFAULT NOW()
);

-- Swipes table
CREATE TABLE IF NOT EXISTS swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  targetUserId UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporterId UUID REFERENCES users(id) ON DELETE CASCADE,
  reportedUserId UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## 4. Authentication Ayarla

Supabase Dashboard → Authentication → Providers

- Email/Password yöntemi etkin olduğundan emin ol
- SMTP konfigürasyonunu isteğe bağlı olarak ayarla

## 5. RLS Policies Ayarla (Opsiyonel)

Üretim için Row Level Security policies eklemelisin, ancak geliştirme sırasında disable edebilirsin.

## 6. Dependencies Yükle

```bash
npm install
```

## 7. iOS Simülatörde Çalıştır

```bash
npm run ios
```

## Dosya Yapısı

```
src/infrastructure/supabase/
├── client.ts                          # Supabase client başlatması
├── SupabaseAuthRepository.ts          # Auth servisi
├── SupabaseUserRepository.ts          # User servisi
├── SupabaseChatRepository.ts          # Chat servisi
├── SupabaseMatchRepository.ts         # Match servisi
└── index.ts                           # Export'lar
```

## Mock Repositories Kaldırıldı

Aşağıdaki dosyalar artık kullanılmıyor:

- `src/features/auth/services/MockAuthRepository.ts`
- `src/features/profile/services/MockUserRepository.ts`
- `src/features/chat/services/MockChatRepository.ts`
- `src/features/match/services/MockMatchRepository.ts`
- `src/infrastructure/mock/MockDatabase.ts`

## Troubleshooting

### "Supabase credentials not configured" uyarısı

- `.env.local` dosyasını kontrol et
- `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini doğru yaz

### Login başarısız oluyorsa

- Supabase projesinde users tablosu var mı?
- Authentication provider aktif mi?
- Database policies doğru ayarlanmış mı?

### Realtime updates çalışmıyorsa

- Supabase Dashboard → Realtime ayarlarını kontrol et
- Relevant tables için subscriptions aktif mi?
