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

Schema tek seferlik doküman SQL'i yerine sıralı migration dosyalarında tutulur:

```text
supabase/migrations/20260606110000_create_core.sql
supabase/migrations/20260606120000_create_feed.sql
```

`create_core.sql`; profil, eşleşme, sohbet ve moderasyon tablolarını, indexleri,
XSS düz metin kontrollerini ve RLS politikalarını oluşturur. `create_feed.sql`;
feed postu, yorum, yanıt, beğeni ve bildirim tablolarını oluşturur.

Bağlı Supabase projesine ikisini sırasıyla uygula:

```bash
supabase db push
```

Supabase CLI yoksa dosyaları ad sırasıyla SQL Editor'de çalıştır. Mevcut bir projede
eski dokümandan oluşturulmuş tırnaksız camelCase kolonlar varsa önce yedek alıp kolon
isimlerini migration sözleşmesiyle hizala; PostgreSQL tırnaksız camelCase isimleri
küçük harfe dönüştürür.

## 4. Authentication Ayarla

Supabase Dashboard → Authentication → Providers

- Phone provider'ı etkinleştir
- Twilio, MessageBird, Vonage veya desteklenen başka bir SMS sağlayıcısını bağla
- OTP süresi ve SMS rate limitlerini production ihtiyacına göre ayarla
- Uygulama `signInWithOtp()` sonrasında 6 haneli kodu `verifyOtp({ type: "sms" })` ile doğrular;
  doğrulama tamamlanmadan session oluşturmaz

Mock servislerde doğrulama kodu `123456` olarak sabittir. Bu yalnızca yerel geliştirme içindir.

## 5. RLS Policies Ayarla

RLS üretimde opsiyonel değildir. Migration'lar istemciden erişilen tüm tablolarda RLS'yi
etkinleştirir ve yazma politikalarında `auth.uid()` ile satır sahibini veya konuşma
katılımcısını doğrular.

Topluluk sorguları yalnızca herkese açık profil kolonlarına erişebilir. E-posta, telefon,
engellenen ve sessize alınan kullanıcı listeleri tablo SELECT yetkisinde değildir;
yalnızca oturum sahibine `get_my_profile()` RPC'si üzerinden döner. İlk admin rolünü
Dashboard SQL Editor'den güvenilir bir kullanıcıya manuel olarak ata.

```sql
insert into public.user_roles (id, "userId", role, "assignedBy")
values (gen_random_uuid()::text, 'AUTH_USER_UUID', 'admin', 'dashboard-bootstrap');
```

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

## Mock Servisler

Mock repository'ler yerel geliştirme için korunur. `EXPO_PUBLIC_USE_SUPABASE=true`
ayarlandığında container Supabase repository'lerini kullanır; aksi durumda mock servisler
ve geliştirme OTP kodu `123456` kullanılır.

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
