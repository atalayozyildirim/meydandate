# 🚀 Meydan v2 - Supabase Entegrasyon Talimatları

## Hızlı Başlangıç

### Adım 1: Supabase Projesi Oluştur

1. https://supabase.com adresine git
2. "New Project" tıkla
3. Proje adını "Meydan" yap
4. Kurma tamamlanmayını bekle

### Adım 2: Environment Variables

Proje kök dizininde `.env.local` dosyası oluştur ve Supabase'den kopyala:

```bash
# .env.local
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Adım 3: Veritabanı Schema

Supabase Dashboard → SQL Editor → New Query

Aşağıdaki SQL'i kopyala ve çalıştır (SUPABASE_SETUP.md dosyasından):

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

### Adım 4: Test Verisi Ekle (İsteğe Bağlı)

MOCK_DATA.sql dosyasındaki SQL'i çalıştır

### Adım 5: Dependencies Yükle

```bash
npm install
```

### Adım 6: iOS Simülatörde Çalıştır

```bash
npm run ios
```

## Yapı ve Dosyalar

### Supabase Integration Files

```
src/infrastructure/supabase/
├── client.ts                          # Supabase client
├── SupabaseAuthRepository.ts          # Auth servis
├── SupabaseUserRepository.ts          # User servis
├── SupabaseChatRepository.ts          # Chat servis
├── SupabaseMatchRepository.ts         # Match servis
└── index.ts                           # Exports
```

### Kaldırılan Mock Files

Aşağıdaki dosyalar artık kullanılmıyor (silebilirsin):

- `src/features/auth/services/MockAuthRepository.ts`
- `src/features/profile/services/MockUserRepository.ts`
- `src/features/chat/services/MockChatRepository.ts`
- `src/features/match/services/MockMatchRepository.ts`
- `src/infrastructure/mock/MockDatabase.ts`

## NPM Install Sorunları

npm install çok uzun sürüyor veya takılıyorsa:

```bash
# Option 1: Önbelleği temizle
npm cache clean --force
npm install

# Option 2: npm ci kullan
npm ci

# Option 3: yarn kullan
yarn install
```

## Authentication Ayarları

Supabase Dashboard → Authentication → Providers

Aşağıdakileri etkin yap:

- [x] Email/Password

(Opsiyonel - Social auth eklemek için):

- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Apple Sign In

## Realtime Subscriptions

Chat ve typing status için Realtime aktif olmalı:

1. Supabase Dashboard → Realtime
2. Tables seç ve "Enable" tıkla:
   - `conversations`
   - `messages`

## Commands

```bash
# Dev server başlat
npm start

# iOS simülatöre yükle
npm run ios

# Android simülatöre yükle
npm run android

# Web tarayıcısında aç
npm run web

# TypeScript kontrol
npm run typecheck
```

## Troubleshooting

### 1. "Supabase credentials not configured" hatası

```
❌ Problem: .env.local dosyası eksik veya boş
✅ Çözüm: .env.local oluştur ve değerleri doldur
```

### 2. Login başarısız

```
❌ Problem: Auth provider devre dışı
✅ Çözüm: Supabase → Authentication → Providers → Email/Password etkin yap
```

### 3. Veri yükleme hatası

```
❌ Problem: Database schema eksik
✅ Çözüm: SUPABASE_SETUP.md'deki SQL'i çalıştır
```

### 4. npm install çok yavaş

```
❌ Problem: Ağ bağlantısı veya npm cache sorunları
✅ Çözüm: npm cache clean --force && npm install
```

## Sonraki Adımlar

- [ ] Authentication yöntemlerini ekle (Google, Apple, etc.)
- [ ] Push notifications kur
- [ ] Analytics entegre et
- [ ] CI/CD pipeline kur
- [ ] Production deployment hazırla

## Kaynaklar

- 📚 [Supabase Dokumentasyon](https://supabase.com/docs)
- 📚 [Expo Dokumentasyon](https://docs.expo.dev)
- 📚 [React Query](https://tanstack.com/query/latest)

---

**Sorularınız mı var? SUPABASE_SETUP.md dosyasında daha detaylı bilgi bulabilirsiniz.**

Başarılar! 🎉
