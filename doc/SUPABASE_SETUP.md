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

- Phone provider'ı etkinleştir
- Twilio, MessageBird, Vonage veya desteklenen başka bir SMS sağlayıcısını bağla
- OTP süresi ve SMS rate limitlerini production ihtiyacına göre ayarla
- Uygulama `signInWithOtp()` sonrasında 6 haneli kodu `verifyOtp({ type: "sms" })` ile doğrular;
  doğrulama tamamlanmadan session oluşturmaz

Mock servislerde doğrulama kodu `123456` olarak sabittir. Bu yalnızca yerel geliştirme içindir.

### Feed migration

Feed postları, yorumlar, yanıtlar, beğeniler, raporlar, indexler, trigger'lar ve RLS
politikaları şu migration içinde tutulur:

```text
supabase/migrations/20260606120000_create_feed.sql
```

Supabase CLI kullanıyorsan bağlı projeye migration'ı uygula:

```bash
supabase db push
```

CLI kullanmıyorsan migration dosyasının tamamını Supabase SQL Editor'de bir kez çalıştır.

## 5. RLS Policies Ayarla

RLS üretimde opsiyonel değildir. `public` şemasında istemciden erişilen tüm tablolarda RLS
etkin olmalı ve yazma politikaları `auth.uid()` ile satır sahibini doğrulamalıdır. Feed
migration'ı bunu feed tabloları için hazırlar.

Feed sorgularındaki profil ilişkilerinin çalışması için `users` tablosunda oturum açmış
kullanıcıların topluluk profillerini okuyabildiği bir SELECT politikası da bulunmalıdır.
E-posta ve telefon gibi özel alanları topluluk profili sorgularına dahil etme.

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

### Feed içinde kullanıcı bilgileri boş geliyorsa

- `users` tablosundaki SELECT RLS politikasını kontrol et
- Feed migration'ının uygulandığını doğrula
- Foreign key ilişkilerinin silinmediğini kontrol et

## Resmi Supabase Kaynakları

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Securing your data](https://supabase.com/docs/guides/database/secure-data/)
- [Querying joins and nested tables](https://supabase.com/docs/guides/database/joins-and-nesting)
- [Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- [JavaScript verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)

### Login başarısız oluyorsa

- Supabase projesinde users tablosu var mı?
- Authentication provider aktif mi?
- Database policies doğru ayarlanmış mı?

### Realtime updates çalışmıyorsa

- Supabase Dashboard → Realtime ayarlarını kontrol et
- Relevant tables için subscriptions aktif mi?
