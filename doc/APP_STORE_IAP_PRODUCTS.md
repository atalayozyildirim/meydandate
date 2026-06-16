# Ehlibyte App Store IAP Urunleri

Son guncelleme: 16 Haziran 2026

Bu dosya App Store Connect ve RevenueCat tarafinda acilacak magaza ici alimlari
icin ana listedir. Fiyatlar bilerek orta/erisilebilir tutuldu; Apple fiyat
noktasinda en yakin TL degerini sec.

## Genel Kurulum

- Bundle ID: `com.ehlibyte.app`
- RevenueCat entitlement: `premium`
- RevenueCat current offering: `default` veya `current`
- App Store Connect'te Paid Apps Agreement, Tax ve Banking tamamlanmis olmali.
- App Store Connect product ID ile RevenueCat product identifier birebir ayni
  olmali.
- Fire paketleri `Consumable`, rozetler `Non-Consumable`, Premium aylik/yillik
  `Auto-Renewable Subscription` olmali.

## 1. Premium Abonelik

Premium uygulamanin ana gelir urunu. Kullaniciya reklamsiz deneyim, Super Like,
24 saat profil boost, oncelikli gorunurluk ve Premium uye rozeti verir.

RevenueCat tarafinda bu urunleri `premium` entitlement'ina bagla.

| App Store Product ID        | Tur                         | RevenueCat Package | Gorunen Ad                 | Onerilen Fiyat  | Aciklama                                                       |
| --------------------------- | --------------------------- | ------------------ | -------------------------- | --------------- | -------------------------------------------------------------- |
| `ehlibyte.premium.monthly`  | Auto-Renewable Subscription | Monthly            | Ehlibyte Premium Aylik     | `₺79,99 / ay`   | Esnek baslangic, dusuk bariyer.                                |
| `ehlibyte.premium.yearly`   | Auto-Renewable Subscription | Annual             | Ehlibyte Premium Yillik    | `₺599,99 / yil` | En avantajli paket; aylik yaklasik `₺49,99`.                   |
| `ehlibyte.premium.lifetime` | Non-Consumable              | Lifetime           | Ehlibyte Premium Omur Boyu | `₺899,99`       | Tek seferlik destek. Istersen ilk surumde kapali tutabilirsin. |

App Store Connect abonelik grubu adi:

`Ehlibyte Premium`

App Store aciklama metni:

`Reklamsiz deneyim, Super Like, 24 saat profil boost, oncelikli gorunurluk ve Premium uye rozeti.`

Not: Omur boyu Premium auto-renewable subscription degil, non-consumable olarak
acilmali. RevenueCat'te bu urunu `premium` entitlement'ina lifetime duration ile
bagla.

## 2. Fire Paketleri

Fire, kullanicinin Kesfet kartlarina destek/boost gondermek icin kullandigi
harcanabilir bakiyedir. Kullanici Fire gonderdikce hedef profil siralamalarda
daha guclu sinyal alir.

Bu urunler App Store Connect'te `Consumable` olmali.

| App Store Product ID | Tur        | Gorunen Ad | Onerilen Fiyat | Kullaniciya Verilecek |
| -------------------- | ---------- | ---------- | -------------- | --------------------- |
| `ehlibyte.fire.100`  | Consumable | 100 Fire   | `₺24,99`       | 100 Fire bakiyesi     |
| `ehlibyte.fire.500`  | Consumable | 500 Fire   | `₺89,99`       | 500 Fire bakiyesi     |
| `ehlibyte.fire.1500` | Consumable | 1500 Fire  | `₺199,99`      | 1500 Fire bakiyesi    |

RevenueCat current offering icine bu uc urunu ekle. Uygulama kodu bu identifier
degerlerini dogrudan ariyor:

- `ehlibyte.fire.100`
- `ehlibyte.fire.500`
- `ehlibyte.fire.1500`

App Store aciklama metni:

`Kesfet kartlarina Fire gondermek ve profil gorunurlugunu desteklemek icin kullanilan harcanabilir bakiye.`

## 3. Ucretli Rozetler

Rozetler profil vitrininde kalici olarak gorunur. Bu urunler `Non-Consumable`
olmali. Kullanicinin tekrar satin almasina gerek yoktur.

| App Store Product ID                | Tur            | Gorunen Ad              | Onerilen Fiyat | Not                                  |
| ----------------------------------- | -------------- | ----------------------- | -------------- | ------------------------------------ |
| `ehlibyte.badge.muharrem_follower`  | Non-Consumable | Muharrem Takipcisi      | `₺29,99`       | Dusuk fiyatli destek rozeti.         |
| `ehlibyte.badge.cem_room_supporter` | Non-Consumable | Cem Odasi Destekcisi    | `₺39,99`       | Meydan/Cem odasi destegi.            |
| `ehlibyte.badge.culture_guardian`   | Non-Consumable | Yol Erkani Destekcisi   | `₺49,99`       | Topluluk guvenligi ve saygi vurgusu. |
| `ehlibyte.badge.la_fetta_illa`      | Non-Consumable | La Fetta Illa Rozeti    | `₺99,99`       | Ozel destek rozeti.                  |
| `ehlibyte.badge.night_badge`        | Non-Consumable | Night Rozeti            | `₺119,99`      | Gece temali ozel destek rozeti.      |
| `ehlibyte.badge.haci_bektas_veli`   | Non-Consumable | Haci Bektas Veli Rozeti | `₺129,99`      | Ozel destek rozeti.                  |
| `ehlibyte.badge.zulfiqar_sword`     | Non-Consumable | Zulfikar Kilici Rozeti  | `₺149,99`      | En prestijli ozel rozet.             |

Uygulamada kesin para ile satilacak rozetler:

- `ehlibyte.badge.zulfikar_sword`
- `ehlibyte.badge.haci_bektas_veli`
- `ehlibyte.badge.la_fetta_illa`
- `ehlibyte.badge.night_badge`

App Store aciklama metni:

`Profil vitrininde kalici olarak gorunen ozel destek rozeti.`

## 4. Gorevle Kazanilacak Rozetler

Bu rozetler App Store Connect'te urun olarak acilmayacak. Kullanici gorevi
tamamlayinca uygulama icinden kazanacak.

| Rozet               | Kazanma Sarti                                                |
| ------------------- | ------------------------------------------------------------ |
| Asure Lokmasi       | Muharrem Orucu 2026 rozetini kazandiktan sonra acilir.       |
| Ilk Eslesme         | Ilk karsilikli eslesme yapilinca verilir.                    |
| Populer Profil      | Kesfette 50 Fire skoruna ulasinca verilir.                   |
| Muharrem Orucu 2026 | Oruç takvimindeki tum gunleri tamamlayinca bir kere verilir. |

## 5. Satilmayan Ama Premium Icine Dahil Olan Ozellikler

Bu ozellikleri ayri App Store urunu olarak acma:

- Profil boost: Premium icinde 24 saatlik boost olarak calisir.
- Super Like: Premium faydasi olarak kalsin.
- Reklam kaldirma: Premium faydasi olarak kalsin.
- Oncelikli gorunurluk: Premium faydasi olarak kalsin.

Bu sayede magazada cok fazla urun karmasasi olmaz.

## 6. RevenueCat Offering Duzeni

RevenueCat current offering icinde sunlar bulunmali:

Premium packages:

- Monthly -> `ehlibyte.premium.monthly`
- Annual -> `ehlibyte.premium.year`
- Lifetime -> `ehlibyte.premium.lifetime`

Custom/extra products:

- `ehlibyte.fire.100`
- `ehlibyte.fire.500`
- `ehlibyte.fire.1500`
- `ehlibyte.badge.muharrem_follower`
- `ehlibyte.badge.cem_room_supporter`
- `ehlibyte.badge.culture_guardian`
- `ehlibyte.badge.la_fetta_illa`
- `ehlibyte.badge.night_badge`
- `ehlibyte.badge.haci_bektas_veli`
- `ehlibyte.badge.zulfiqar_sword`

## 7. Ilk Surum Icin Onerilen Minimal Liste

App Review ve kurulum hizli olsun istiyorsan ilk surumde sunlari acman yeterli:

1. `ehlibyte.premium.monthly`
2. `ehlibyte.premium.yearly`
3. `ehlibyte.fire.100`
4. `ehlibyte.fire.500`
5. `ehlibyte.fire.1500`
6. `ehlibyte.badge.zulfiqar_sword`
7. `ehlibyte.badge.haci_bektas_veli`
8. `ehlibyte.badge.la_fetta_illa`
9. `ehlibyte.badge.night_badge`

Daha sonra dusuk fiyatli destek rozetlerini ekleyebilirsin.

## 8. Test Kontrol Listesi

- App Store Connect'te tum urunler `Ready to Submit` veya onay surecine hazir.
- RevenueCat'te urunler current offering icinde gorunuyor.
- RevenueCat entitlement lookup key: `premium`.
- Sandbox kullanici ile Premium aylik satin alma test edildi.
- Sandbox kullanici ile Fire paketi satin alma test edildi.
- Sandbox kullanici ile ucretli rozet satin alma test edildi.
- Restore purchases Premium icin calisiyor.
- Supabase `users.isPremium`, `users.badges` ve Fire bakiyesi webhook/RPC ile
  dogru guncelleniyor.
