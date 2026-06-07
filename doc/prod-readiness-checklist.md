# Prod Readiness Checklist

Son kontrol: 2026-06-07

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
- Current Offering içinde aylık ve yıllık paketler var.
- Product identifiers App Store Connect ve RevenueCat'te birebir aynı.

App şu planları bekliyor:

```text
monthly
yearly
```

Eski logda `lifetime` da görünüyordu. App şu anda lifetime satın alma UI'ı sunmuyor; RevenueCat current offering içinde App Store'da olmayan `lifetime` ürünü kalırsa offerings empty hatası devam edebilir. Ya App Store Connect'te ürünü oluştur ya da RevenueCat current offering'den çıkar.

## 4. App Store Connect

iOS in-app purchase ürünleri:

- Product ID: `monthly`
- Product ID: `yearly`
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
