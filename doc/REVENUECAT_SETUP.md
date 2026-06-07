# RevenueCat Setup

Mobil uygulamada yalnızca RevenueCat public SDK anahtarları kullanılmalıdır. `sk_`
ile başlayan secret anahtarları `EXPO_PUBLIC_*` değişkenlerine koyma.

## Dashboard

1. RevenueCat'te Ehlibyte için ayrı bir proje oluştur.
2. Geliştirme için Test Store ekle.
3. `premium` lookup key'i ile entitlement oluştur.
4. App Store Connect'te `com.ehlibyte.app` için aylık ve yıllık abonelik ürünleri oluştur.
5. RevenueCat'e Apple App Store uygulamasını ekle, ürünleri içe aktar ve `premium`
   entitlement'ına bağla.
6. Current offering içinde aylık ve annual paketlerini bu içe aktarılan ürünlere bağla.
7. Android yayınlanacaksa aynı işlemi Google Play uygulaması için yap.

## Environment

```bash
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=test_your_public_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

Test Store anahtarını yalnızca geliştirmede kullan. App Store/TestFlight build'lerinde
platforma özel public anahtarı kullan.

## Empty Offerings Hatası

Loglarda `None of the products registered in the RevenueCat dashboard could be fetched`
görünüyorsa SDK RevenueCat'ten ürün id'lerini almış, ancak cihazdaki StoreKit/App Store
sorgusu bu id'leri bulamamıştır. Bu kodla çözülen bir durum değildir; dashboard ve mağaza
konfigürasyonu hizalanmalıdır.

- RevenueCat ürün identifier'ı App Store Connect Product ID ile birebir aynı olmalı.
  `monthly`, `yearly`, `lifetime` görüyorsan App Store Connect'te de tam olarak bu id'ler
  olmalı veya RevenueCat'teki ürünleri App Store'daki gerçek id'lerle değiştir.
- Current offering içinde app'in desteklemediği `lifetime` gibi ürünler varsa mağazada
  gerçekten oluşturulana kadar offering'den çıkar.
- App Store Connect'te Paid Applications Agreement, Tax ve Banking durumları tamamlanmalı.
- iOS 18.4-18.5 simulator sandbox ürün sorgusu boş döndürebilir; fiziksel cihaz, iOS 26+
  simulator veya StoreKit Configuration ile test et.

## Kontrol Listesi

- App Store Connect Paid Apps Agreement aktif
- Vergi ve banka bilgileri tamamlanmış
- iOS In-App Purchase capability açık
- RevenueCat offering current durumda
- Aylık ve yıllık paketler `premium` entitlement'ına bağlı
- Offering'deki product id listesi App Store Connect ve Google Play ile birebir aynı
- Sandbox satın alma ve restore akışı test edilmiş
