# Ehlibyte App Store Privacy Cevaplari

Son guncelleme: 16 Haziran 2026

Bu dosya App Store Connect > App Privacy ekranini doldurmak icin pratik
cevap listesidir. Apple, uygulamanin kendisinin ve uygulamaya eklenen ucuncu
taraf SDK/servislerin topladigi verilerin beyan edilmesini ister. Ehlibyte
icin bu kapsamda Supabase, RevenueCat, Expo Push Notifications ve Google
Mobile Ads/AdMob dikkate alinmistir.

Kaynaklar:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect App Privacy yardimi: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- RevenueCat Apple App Privacy: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- Google Mobile Ads SDK iOS data disclosure: https://developers.google.com/admob/ios/privacy/data-disclosure

> Not: Bu hukuki danismanlik degildir. Production'da yeni SDK, analitik, reklam
> arabuluculugu, crash reporting veya pazarlama araci eklersen bu dosyayi ve
> App Store Connect cevaplarini tekrar guncelle.

## Kisa Cevap

App Store Connect ilk soruda sunu sec:

**Yes, we collect data from this app.**

Ehlibyte hesap, profil, eslesme, mesajlasma, akis paylasimi, rozet/satin alma,
push bildirim, reklam ve moderasyon ozellikleri icerdigi icin "Data Not
Collected" secilmemeli.

## Data Types Secilecekler

Asagidaki data type'lari sec.

| Apple Data Type | Sec | Neden |
| --- | --- | --- |
| Contact Info > Name | Yes | Profil adi ve Apple/social login adi kullaniliyor. |
| Contact Info > Email Address | Yes | Supabase Auth ve Apple/social login e-postasi kullaniliyor. |
| Contact Info > Phone Number | Yes | OTP/telefon akisinda telefon numarasi modeli var. |
| Location > Precise Location | Yes | Konum eslesmesi icin latitude/longitude saklanabiliyor. |
| Sensitive Info | Yes | Kultur/kimlik beyanlari Alevi kulturel kimligi ve benzeri hassas beyanlar icerebilir. |
| User Content > Photos or Videos | Yes | Profil ve akis fotografi yuklenebiliyor. |
| User Content > Other User Content | Yes | Bio, mesaj, yorum, post, anket, rapor aciklamasi ve canli oda mesajlari var. |
| Identifiers > User ID | Yes | Supabase user id, RevenueCat app user id, push token kullaniliyor. |
| Identifiers > Device ID | Yes | AdMob SDK cihaz/reklam identifier'i toplayabilir. |
| Purchases > Purchase History | Yes | RevenueCat premium, Fire ve rozet satin alma durumunu isler. |
| Usage Data > Product Interaction | Yes | Swipe, eslesme, begeni, yorum, oy, Fire, premium/boost kullanimi tutuluyor. |
| Usage Data > Advertising Data | Yes | AdMob reklam goruntuleme/verileri toplayabilir. |
| Diagnostics > Crash Data | Yes | Google Mobile Ads SDK crash log toplayabilir. |
| Diagnostics > Performance Data | Yes | Google Mobile Ads SDK performans verisi toplayabilir. |

## Data Types Secilmeyecekler

Su an kodda bu veri tipleri icin ana ozellik yok:

| Apple Data Type | Secme | Not |
| --- | --- | --- |
| Health & Fitness | No | Saglik/fitness verisi yok. |
| Financial Info > Payment Info | No | Kart/odeme bilgisi Apple tarafinda islenir; uygulama kart bilgisi toplamaz. |
| Contacts | No | Adres defteri/rehber okunmuyor. |
| Browsing History | No | Tarayici gecmisi toplanmiyor. |
| Search History | No | App Store anlaminda arama gecmisi toplanmiyor. |
| Other Financial Info | No | Banka/gelir/kredi bilgisi yok. |
| Audio Data | No | Mikrofon/audio kaydi ozelligi yok. |
| Emails or Text Messages | No | Cihaz SMS/e-posta icerigi okunmuyor; uygulama ici mesajlar "Other User Content" altinda. |
| Gameplay Content | No | Oyun icerigi yok. |
| Other Data | No | Yukaridaki secimler mevcut kapsami karsiliyor. |

## Her Veri Tipi Icin Cevaplar

App Store Connect her secilen veri icin genelde 3 sey sorar:

1. Hangi amaclarla kullaniliyor?
2. Kullanici kimligiyle iliskili mi?
3. Tracking icin kullaniliyor mu?

Asagidaki cevaplari gir.

### Contact Info: Name

- Purposes: App Functionality, Developer's Advertising or Marketing, Other Purposes
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Profil adi, sosyal giris adi, bildirim basligi ve topluluk gorunumu
  icin kullanilir. Pazarlama mesaji yapilmiyorsa "Developer's Advertising or
  Marketing" secimini kaldirabilirsin.

### Contact Info: Email Address

- Purposes: App Functionality, Account Management
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Supabase Auth, hesap kurtarma, hesap yonetimi ve destek icin.

### Contact Info: Phone Number

- Purposes: App Functionality, Account Management, Fraud Prevention/Security
- Linked to user: Yes
- Used for tracking: No
- Aciklama: OTP/dogrulama ve hesap guvenligi icin.

### Location: Precise Location

- Purposes: App Functionality
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Yakindaki eslesmeler ve mesafe hesaplama icin. Kullanici konum
  eslesmesini kapatabiliyorsa yine de bu veri tipi beyan edilmeli.

### Sensitive Info

- Purposes: App Functionality
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Kultur/kimlik beyanlari profil ve eslesme deneyiminin parcasidir.
  Reklam hedefleme veya ucuncu taraf reklam icin kullanilmamali.

### User Content: Photos or Videos

- Purposes: App Functionality
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Profil fotografi ve akis fotografi.

### User Content: Other User Content

- Purposes: App Functionality, Fraud Prevention/Security
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Bio, profil metinleri, mesajlar, postlar, yorumlar, anketler, rapor
  aciklamalari ve moderasyon incelemeleri.

### Identifiers: User ID

- Purposes: App Functionality, Analytics, Fraud Prevention/Security
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Supabase user id, RevenueCat app user id ve push token gibi
  kullaniciya bagli teknik identifier'lar.

### Identifiers: Device ID

- Purposes: Third-Party Advertising, Analytics
- Linked to user: Yes
- Used for tracking: Yes
- Aciklama: Google Mobile Ads SDK, cihaz/reklam identifier'i gibi bilgileri
  reklam ve analitik amaclarla toplayabilir. Uygulama banner isteginde
  `requestNonPersonalizedAdsOnly: true` kullansa bile AdMob SDK beyanini
  muhafazakar yapmak daha guvenli.

### Purchases: Purchase History

- Purposes: App Functionality, Analytics, Fraud Prevention/Security
- Linked to user: Yes
- Used for tracking: No
- Aciklama: RevenueCat dokumani en az "App Functionality" ve "Analytics"
  secilmesini onerir. Ehlibyte kendi user id'si ile RevenueCat kullandigi icin
  "Linked to user" cevabi Yes olmali.

### Usage Data: Product Interaction

- Purposes: App Functionality, Analytics, Fraud Prevention/Security
- Linked to user: Yes
- Used for tracking: No
- Aciklama: Eslesme/swipe, begeni, yorum, oy, Fire, rozet ve premium kullanim
  sinyalleri uygulama icindeki deneyim ve guvenlik icin tutulur.

### Usage Data: Advertising Data

- Purposes: Third-Party Advertising, Analytics
- Linked to user: Yes
- Used for tracking: Yes
- Aciklama: AdMob reklam gosterim ve etkilesim verileri toplayabilir.

### Diagnostics: Crash Data

- Purposes: App Functionality, Analytics
- Linked to user: No
- Used for tracking: No
- Aciklama: Ehlibyte'te ayrica crash SDK'si yok; ancak Google Mobile Ads SDK
  non-user related crash log toplayabilecegini beyan ediyor.

### Diagnostics: Performance Data

- Purposes: App Functionality, Analytics, Third-Party Advertising
- Linked to user: Yes
- Used for tracking: Yes
- Aciklama: Google Mobile Ads SDK performans verisini reklam/analitik amaclarla
  kullanabilecegini belirtiyor.

## Tracking Sorusu

AdMob production'da aktif kalacaksa App Store Privacy preview'da su bolum
olusabilir:

**Data Used to Track You**

Burada muhafazakar cevap:

- Device ID
- Advertising Data
- Performance Data

Eger AdMob'u production'dan tamamen kaldirirsan veya reklam SDK'sini hic
initialize etmezsen bu bolumu yeniden degerlendir. Su an kodda AdMob SDK var ve
premium olmayan kullanicilara banner reklam gosteriliyor.

## Privacy Policy URL

App Store Connect > App Privacy > Privacy Policy URL alanina production'da
erisilebilir bir URL girilmeli. Uygulama icinde gizlilik metni var ama Apple
genelde web URL ister.

Oneri:

```text
https://ehlibyte.com/privacy
```

Bu URL yoksa yayindan once ayni metni barindiran basit bir web sayfasi ac.
Uygulama icindeki metin kaynagi:

```text
src/shared/constants/legal.ts
```

## App Store Connect Pratik Akis

1. App Store Connect > My Apps > Ehlibyte > App Privacy ekranini ac.
2. "Data Types" yaninda Edit'e bas.
3. Yukaridaki "Data Types Secilecekler" tablosundaki kutucuklari sec.
4. Her data type icin "Her Veri Tipi Icin Cevaplar" bolumundeki amaclari isaretle.
5. Linked to user sorularinda bu dosyadaki Yes/No degerlerini kullan.
6. Tracking sorularinda AdMob icin Device ID, Advertising Data ve Performance
   Data tarafinda Yes kullan.
7. Preview ekraninda "Data Linked to You" ve "Data Used to Track You"
   bolumlerini kontrol et.
8. "Publish" ile privacy cevaplarini yayinla.

## App Review Notu

App Review notlarina gerekirse sunu yazabilirsin:

```text
Ehlibyte uses Supabase for authentication, profile, messaging and community
data storage; RevenueCat for in-app purchase validation and entitlement sync;
Expo push services for notifications; and Google Mobile Ads for ads shown to
non-premium users. Location is used only for optional nearby matching. Cultural
identity fields are user-provided profile fields used for matching and are not
used for third-party advertising.
```

## Koddan Dayanak

- Kullanici veri modeli: `src/domain/entities/User.ts`
- Gizlilik metni: `src/shared/constants/legal.ts`
- Konum izni: `app.json`
- Fotograf/kamera izni: `app.json`
- AdMob entegrasyonu: `src/features/ads/services/adMob.ts`
- RevenueCat entegrasyonu: `src/features/premium/services/RevenueCatPaymentService.ts`
- Push token tablosu: `supabase/migrations/20260613231000_push_notifications.sql`
- Mesajlasma: `src/infrastructure/supabase/SupabaseChatRepository.ts`
- Akis/post/comment verisi: `src/infrastructure/supabase/SupabaseFeedRepository.ts`
