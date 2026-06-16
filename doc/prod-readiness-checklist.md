# Prod Readiness Checklist

Son kontrol: 2026-06-09

## 1. Environment

`.env.local` veya EAS production env içinde:

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_USE_SUPABASE=true
EXPO_PUBLIC_SUPABASE_URL=https://ymrzddxgxdswibtypuwr.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Kontrol:

```bash
npm run validate:prod
npx expo config --type public
```

## 2. Social Login

Google/Apple için `doc/social-login-setup.md` adımlarını tamamla.

Minimum kontrol:

- Supabase Additional Redirect URLs içinde `ehlibyte://auth/callback` var.
- Google provider enabled.
- Apple provider enabled.
- iOS TestFlight'ta Apple ve Google login test edildi.
- Android internal testing'de Google login test edildi.
- Google metadata `avatar_url`/`picture` döndürüyorsa ilk profil fotoğrafı otomatik doluyor.
- Apple çoğu hesapta profil fotoğrafı döndürmez; bu durumda avatar fallback tasarımı beklenen davranış.

## 3. RevenueCat

Env:

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

RevenueCat dashboard:

- Entitlement lookup key: `premium`
- Current Offering aktif.
- Current Offering içinde aylık, yıllık ve varsa ömür boyu Premium paketi var.
- Product identifiers App Store Connect ve RevenueCat'te birebir aynı.
- Webhook URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- Webhook Authorization Header Value, Supabase `REVENUECAT_WEBHOOK_AUTH_TOKEN` secret'ı ile aynı.
- Sandbox satın alma sonrası Supabase `users.isPremium` ve `users.badges` güncelleniyor.

App şu planları bekliyor:

```text
monthly
yearly
lifetime
```

App şu anda `lifetime` satın alma UI'ı da sunuyor. Ömür boyu Premium'u satmayacaksan RevenueCat current offering'den çıkar; satacaksan App Store Connect'te non-consumable ürün olarak oluştur ve RevenueCat'te `premium` entitlement'ına lifetime duration ile bağla.

## 4. App Store Connect

iOS in-app purchase ürünleri:

- Product ID: `ehlibyte.premium.monthly`
- Product ID: `ehlibyte.premium.yearly`
- Product ID: `ehlibyte.premium.lifetime`
- Product ID: `ehlibyte.fire.100`
- Product ID: `ehlibyte.fire.500`
- Product ID: `ehlibyte.fire.1500`
- Ücretli rozet product id listesi için `doc/APP_STORE_IAP_PRODUCTS.md` dosyasını baz al.
- Status: Ready to Submit veya Approved olmalı.
- Ürünler doğru app bundle'a bağlı olmalı: `com.ehlibyte.app`
- Paid Apps Agreement, tax ve banking tamam olmalı.

## 5. AdMob

Production env:

```text
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-...
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-...
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID=ca-app-pub-...
EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID=ca-app-pub-...
```

Google test IDs prod build'de kalmamalı.

## 6. Supabase

Kontrol SQL:

```sql
select id, title, status
from public.live_rooms
where id = 'meydan-erkani';
```

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'matches',
    'conversations',
    'special_match_invites',
    'live_rooms',
    'live_room_messages'
  );
```

Security advisors:

```text
Supabase Dashboard > Database > Advisors
```

Kalan `SECURITY DEFINER` uyarıları `is_admin`, `is_moderator`, `get_my_profile`, `claim_zeynep_cisem_invite`, `accept_special_match_invite` gibi kontrollü RPC'ler için beklenebilir. Yeni tablo RLS'leri açık olmalı.

Starter rehber kontrolü:

```sql
select name, occupation, bio
from public.users
where email in (
  'ece.rehber@ehlibyte.app',

);
```

Bu profiller karşılama rehberidir ve otomatik yanıt verir; gerçek kullanıcı gibi gizlenmemelidir.

Premium/boost kontrolü:

```sql
select proname
from pg_proc
where proname = 'activate_premium_boost';
```

```sql
select "isPremium", badges, "boostedUntil"
from public.users
where id = '<test-user-id>';
```

## 7. Admin

`doc/admin-bootstrap.md` içindeki SQL'i çalıştır.

Kontrol:

- Meydan ekranında admin paneli görünüyor.
- HTTPS stream URL ile yayın başlatılabiliyor.
- Yayını bitir çalışıyor.

## 8. Final Build

Önerilen sıra:

```bash
npm run typecheck
npm run validate:prod
npx expo config --type public
```

Sonra EAS build:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## 9. Smoke Test

- Telefon OTP login.
- Google login.
- Apple login iOS.
- Onboarding.
- Discover swipe.
- Özel davet kabul/ret.
- Match listesi.
- Chat.
- Meydan yayın başlat/izle/sohbet.
- Premium ekran plan fiyatları.
- RevenueCat purchase sandbox.
- Restore purchases.
