# RevenueCat Setup

Mobil uygulamada yalnızca RevenueCat public SDK anahtarları kullanılmalıdır. `sk_`
ile başlayan secret anahtarları `EXPO_PUBLIC_*` değişkenlerine koyma.

## Dashboard

1. RevenueCat'te Ehlibyte için ayrı bir proje oluştur.
2. Geliştirme için Test Store ekle.
3. `premium` lookup key'i ile entitlement oluştur.
4. App Store Connect'te `com.ehlibyte.app` için aylık ve yıllık abonelik ürünleri oluştur.
   Ömür boyu Premium'u da satacaksan bunu abonelik değil, non-consumable ürün olarak aç.
5. RevenueCat'e Apple App Store uygulamasını ekle, ürünleri içe aktar ve `premium`
   entitlement'ına bağla.
6. Current offering içinde monthly, annual ve varsa lifetime paketlerini bu içe aktarılan ürünlere bağla.
7. Android yayınlanacaksa aynı işlemi Google Play uygulaması için yap.
8. Rozet ürünlerini App Store Connect/Google Play tarafında consumable veya
   non-consumable olarak oluşturup current offering içine ekle.
9. RevenueCat Webhooks entegrasyonunda Supabase Edge Function URL'ini ekle:
   `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`.
10. Webhook Authorization Header Value alanına güçlü bir secret koy. Aynı değeri
    Supabase secret olarak `REVENUECAT_WEBHOOK_AUTH_TOKEN` adıyla tanımla.

Premium product id listesi:

- `ehlibyte.premium.monthly` - ₺79,99 / ay
- `ehlibyte.premium.year` - ₺599,99 / yıl
- `ehlibyte.premium.lifetime` - ₺899,99

Fire product id listesi:

- `ehlibyte.fire.100` - 100 Fire - ₺24,99
- `ehlibyte.fire.500` - 500 Fire - ₺89,99
- `ehlibyte.fire.1500` - 1500 Fire - ₺199,99

Rozet product id listesi:

- `ehlibyte.badge.muharrem_follower` - ₺29,99
- `ehlibyte.badge.meydan` - ₺39,99
- `ehlibyte.badge.culture_guardian` - ₺49,99
- `ehlibyte.badge.la_fetta_illa` - ₺99,99
- `ehlibyte.badge.nightlove` - ₺119,99
- `ehlibyte.badge.hacibektas` - ₺129,99
- `ehlibyte.badges.zulfikar` - ₺149,99

Detaylı App Store Connect ürün listesi için [APP_STORE_IAP_PRODUCTS.md](./APP_STORE_IAP_PRODUCTS.md)
dosyasını kullan.

## Environment

```bash
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=test_your_public_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
EXPO_PUBLIC_USE_REVENUECAT=false
EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=false
```

Development ortamında `EXPO_PUBLIC_USE_REVENUECAT` boş veya `false` ise uygulama mock
ödeme servisini kullanır. StoreKit/App Store ürünleri hazır olduğunda yerel test için
`EXPO_PUBLIC_USE_REVENUECAT=true` yap; iOS sandbox/StoreKit testinde `appl_` key
kullanılır. RevenueCat Test Store ürünlerini test edeceksen ayrıca
`EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true` yap. App Store/TestFlight build'lerinde
platforma özel public anahtarı kullanılmalı, Test Store key ile build gönderilmemeli.

## Supabase Webhook

Satın alma sonrası app anında local Premium durumunu günceller, fakat Supabase'teki
kalıcı `users.isPremium` ve ücretli rozetler RevenueCat webhook'u ile senkronize edilir.
Bu webhook deploy edilmeden boost, profil rozeti ve Discover önceliği prod'da kalıcı
olarak güvenilir kabul edilmemelidir.

Supabase secrets:

```bash
supabase secrets set REVENUECAT_WEBHOOK_AUTH_TOKEN='Bearer e90fc88d4a7cf000457a16d7a38a59bbe2f40200aa49bcc46bf72f74662f228c'
supabase secrets set REVENUECAT_ENTITLEMENT_ID=premium
```

Deploy:

```bash
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

RevenueCat dashboard'da Authorization Header Value olarak `REVENUECAT_WEBHOOK_AUTH_TOKEN`
ile aynı değeri gir. Sandbox purchase ve restore testinden sonra Supabase `users`
tablosunda ilgili kullanıcının `isPremium` ve `badges` alanlarını kontrol et.

## Empty Offerings Hatası

Loglarda `None of the products registered in the RevenueCat dashboard could be fetched`
görünüyorsa SDK RevenueCat'ten ürün id'lerini almış, ancak cihazdaki StoreKit/App Store
sorgusu bu id'leri bulamamıştır. Bu kodla çözülen bir durum değildir; dashboard ve mağaza
konfigürasyonu hizalanmalıdır.

- RevenueCat ürün identifier'ı App Store Connect Product ID ile birebir aynı olmalı.
  App şu anda `monthly`, `yearly` ve `lifetime` planlarını satın alma UI'ında sunar.
- Current offering içinde App Store Connect'te oluşturulmamış ürün varsa mağazada
  gerçekten oluşturulana kadar offering'den çıkar.
- `test_` ile başlayan RevenueCat Test Store key, StoreKit/App Store Connect ürünlerini
  sorgulamaz; yalnızca RevenueCat Test Store ürünleriyle kullanılmalı.
- App Store Connect'te Paid Applications Agreement, Tax ve Banking durumları tamamlanmalı.
- iOS 18.4-18.5 simulator sandbox ürün sorgusu boş döndürebilir; fiziksel cihaz, iOS 26+
  simulator veya StoreKit Configuration ile test et.

## Kontrol Listesi

- App Store Connect Paid Apps Agreement aktif
- Vergi ve banka bilgileri tamamlanmış
- iOS In-App Purchase capability açık
- RevenueCat offering current durumda
- Aylık, yıllık ve varsa ömür boyu paketler `premium` entitlement'ına bağlı
- Rozet product id'leri current offering içinde ve mağaza ürünleriyle birebir aynı
- Offering'deki product id listesi App Store Connect ve Google Play ile birebir aynı
- RevenueCat webhook Supabase Edge Function'a bağlı ve Authorization header doğrulanıyor
- Sandbox satın alma ve restore akışı test edilmiş
