# 📋 Başlangıç Kontrol Listesi

Supabase entegrasyon tamamlıdır. İOS simülatörde çalıştırmak için aşağıdaki adımları izleyin:

## ✅ Tamamlanan Entegrasyon

### Kod Değişiklikleri

- [x] Supabase client oluşturuldu (`src/infrastructure/supabase/client.ts`)
- [x] 4 adet Repository Supabase'e bağlandı:
  - ✓ SupabaseAuthRepository (Kimlik doğrulama)
  - ✓ SupabaseUserRepository (Kullanıcı yönetimi)
  - ✓ SupabaseChatRepository (Mesajlaşma)
  - ✓ SupabaseMatchRepository (Eşleşme)
- [x] Container.ts güncelleştirildi (Mock → Supabase geçişi)
- [x] package.json güncellendi (@supabase/supabase-js eklendi)

### Dokümantasyon

- [x] README_SUPABASE.md - Hızlı başlangıç rehberi
- [x] SUPABASE_SETUP.md - Detaylı kurulum rehberi
- [x] MOCK_DATA.sql - Test veri script'i
- [x] INTEGRATION_SUMMARY.md - Teknik özet
- [x] setup.sh - Otomasyonlu kurulum script'i
- [x] quick-start.sh - Hızlı başlangıç script'i

## 🚀 5 Dakikalık Başlangıç

### 1️⃣ Supabase Hesabı Oluştur

```
https://supabase.com
→ Sign Up
→ New Project
```

### 2️⃣ Environment Variables

```bash
# .env.local dosyasını oluştur
EXPO_PUBLIC_SUPABASE_URL=your-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

### 3️⃣ Veritabanı Schema

Supabase SQL Editor'de SUPABASE_SETUP.md'deki SQL'i çalıştır

### 4️⃣ Kurulum

```bash
chmod +x setup.sh
./setup.sh
```

### 5️⃣ iOS Simülatörde Çalıştır

```bash
npm run ios
```

## 📁 Oluşturulan Dosyalar

```
Yeni Dosyalar:
├── .env.local                                    # Environment variables
├── src/infrastructure/supabase/
│   ├── client.ts                                # Supabase client
│   ├── SupabaseAuthRepository.ts                # Auth servis
│   ├── SupabaseUserRepository.ts                # User servis
│   ├── SupabaseChatRepository.ts                # Chat servis
│   ├── SupabaseMatchRepository.ts               # Match servis
│   └── index.ts                                 # Exports
├── SUPABASE_SETUP.md                            # Detaylı rehber
├── README_SUPABASE.md                           # Hızlı rehber
├── MOCK_DATA.sql                                # Test verisi
├── INTEGRATION_SUMMARY.md                       # Teknik özet
├── setup.sh                                     # Kurulum script'i
├── quick-start.sh                               # Hızlı başlangıç
└── verify-integration.ts                        # Entegrasyon testi

Değiştirilmiş Dosyalar:
├── src/infrastructure/config/Container.ts      # Mock → Supabase
└── package.json                                 # @supabase/supabase-js

Eski Dosyalar (Kaldırabilir):
├── src/features/auth/services/MockAuthRepository.ts
├── src/features/profile/services/MockUserRepository.ts
├── src/features/chat/services/MockChatRepository.ts
├── src/features/match/services/MockMatchRepository.ts
└── src/infrastructure/mock/MockDatabase.ts
```

## 🔧 Sorun Giderme

| Problem                      | Çözüm                                  |
| ---------------------------- | -------------------------------------- |
| npm install çok yavaş        | `./setup.sh` komutunu kullan           |
| "credentials not configured" | .env.local oluştur ve değerleri doldur |
| Login başarısız              | Supabase Auth provider'ı etkinleştir   |
| Veri yükleme hatası          | SUPABASE_SETUP.md'deki SQL'i çalıştır  |

## 📚 Kullanılabilir Komutlar

```bash
# iOS simülatörde çalıştır
npm run ios

# Android simülatörde çalıştır
npm run android

# Web tarayıcısında çalıştır
npm run web

# Dev sunucusu (tüm platformlar)
npm start

# TypeScript kontrol
npm run typecheck

# Entegrasyon testi (TypeScript yüklü ise)
npx tsx verify-integration.ts
```

## ✨ Mock Verisi (İsteğe Bağlı)

Test için örnek veri eklemek:

1. Supabase SQL Editor açılır
2. MOCK_DATA.sql dosyasındaki SQL çalıştırılır
3. 4 test kullanıcısı ve sample conversations oluşturulur

## 🎯 Sonraki Adımlar

1. **Test Etmek**
   - Uygulamayı iOS simülatörde aç
   - Login/Register test et
   - Chat ve matching özelliklerini test et

2. **Özelleştirmek** (Opsiyonel)
   - Social authentication ekle
   - Push notifications ayarla
   - Database rules (RLS) kur

3. **Deployment** (İleri)
   - CI/CD pipeline kur
   - TestFlight/AppStore hazırla
   - Production Supabase projesi oluştur

## 📞 Destek

- 📚 [Supabase Docs](https://supabase.com/docs)
- 📚 [Expo Docs](https://docs.expo.dev)
- 📚 [React Native Docs](https://reactnative.dev)

## ✅ Kontrol Listesi

Başlamadan önce:

- [ ] Node.js ve npm yüklü mü?
- [ ] Supabase hesabı oluşturdum mu?
- [ ] .env.local dosyası hazırlandı mı?
- [ ] Veritabanı schema oluşturdum mu?
- [ ] npm install tamamlandı mı?
- [ ] iOS simulator başlatıldı mı?

Başlamaya hazırsın! 🎉

---

**Eğer takılırsan, README_SUPABASE.md dosyasına bak veya yukarıdaki "Sorun Giderme" bölümünü konsult et.**
