# App Store Submission Pack

> Güncel App Store Connect kopyası için `doc/APP_STORE_CONNECT_METADATA_2026-06-25.md` dosyasını baz al. Bu dosya 25 Haziran 2026 sürümü için yenilenen konumlandırma, screenshot sırası, What’s New ve IAP metadata metinlerini içerir.

Son guncelleme: 16 Haziran 2026

## 1. Mevcut durum

- iOS bundle id: `com.ehlibyte.app`
- App adi: `Ehlibyte`
- Apple ile giris capability acik
- Uygulama ici hesap silme ekrani mevcut
- In-app purchase altyapisi RevenueCat ile bagli
- Build 11 App Store Connect'e ulasti; Apple `ITMS-90725` nedeniyle yeni build'in iOS 26 SDK / Xcode 26 ile alinmasini istiyor.

## 2. Yayin oncesi kalan blocker'lar

- Yeni iOS build Xcode 26 veya daha yeni SDK ile alinmali.
- Production AdMob ID'leri placeholder kalmadiysa son kez `npm run validate:prod` ile kontrol edilmeli.
- Production build icin `EXPO_PUBLIC_USE_REVENUECAT=true` kullanilmali.
- App Store icin `Privacy Policy URL` ve tercihen `Support URL` host edilmis olmali.

## 3. App Store metadata

### App Name

`Ehlibyte`

### Subtitle

`Ortak değerler ve güvenli sohbet`

### Promotional Text

`Ehlibyte ile ortak kültür ve değerler etrafında profilleri keşfet, güvenli sohbet et, Meydan yayınlarına katıl ve gündemi tek yerden takip et.`

### Description

`Ehlibyte; ortak kültür, değerler, saygılı tanışma ve güvenli sohbet deneyimini tek yerde buluşturan bir mobil uygulamadır.

Profilini oluştur, ilgi alanlarını ve kendini anlatan detayları ekle, sana uygun profilleri keşfet ve karşılıklı eşleştiğinde sohbete başla.

Akış ekranında fotoğraflı paylaşımlar, yorumlar, anketler, deyiş, Muharrem ve topluluk gündemleri yer alır. Meydan bölümünde YouTube veya Kick yayınlarına ve paylaşılan video buluşmalarına katılabilir, toplulukla aynı anda sohbet edebilirsin.

Ehlibyte; kullanıcı güvenliğini, moderasyonu ve gizliliği ciddiye alır. Engelleme, şikayet, hesap silme ve veri talepleri uygulama içinden yönetilebilir.

Premium özelliklerle daha fazla görünürlük, rozetler ve gelişmiş deneyimler açılabilir. Satın alımlar Apple App Store üzerinden yönetilir.`

### Keywords

`alevi,bektaşi,ehlibeyt,topluluk,sohbet,eşleşme,meydan,akış,rozet,oruç`

### Category

`Social Networking`

### Content Rights

`Uygulamadaki kullanıcı üretimli içerik kullanıcılar tarafından sağlanır; uygulama moderasyon, raporlama ve kaldırma araçları sunar.`

## 4. App Store ekran görüntüsü planı

App Store Connect icin iPhone 6.9" ekran goruntulerini bu sirayla yuklemek en net satis akisini verir:

1. Kesfet: Buyuk profil karti, Fire bakiyesi, konuma gore eslesme ayari ve sadece ikonlu liquid tab bar gorunsun. Baslik: `Ortak değerlerle keşfet`
2. Eslesme aksiyonu: Kart uzerinde Fire, begeni ve geri alma aksiyonlari gorunsun. Baslik: `Kültür, niyet ve yakınlık`
3. Akis: Foto, anket, yorum ve alintilama gorunsun. Baslik: `Meydan ve gündem bir arada`
4. Meydan: Sadece video oynatici, CANLI rozeti, ses butonu ve sohbet gorunsun. Baslik: `Yayınları aynı anda izle`
5. Mesajlar: Sifreli/gizlilik vurgulu sohbet, kalp animasyonu veya mesaj karti gorunsun. Baslik: `Saygılı sohbet başlat`
6. Magaza/Rozetler: Premium, Fire paketleri ve rozetler gorunsun. Baslik: `Rozetlerle desteğini göster`

## 5. App Review Notes

`Ehlibyte kullanici uretimli icerik, mesajlasma, yorum, canli oda ve eslesme ozellikleri icerir.

Moderasyon ozellikleri:
- Kullanici sikayet etme
- Kullanici engelleme
- Icerik kaldirma ve ban akisi
- Uygulama ici hesap silme

Giris yontemleri:
- Telefon OTP
- Sign in with Apple
- Google Sign-In

Uygulama ici satin alimlar RevenueCat uzerinden App Store urunlerine baglanir.

Hesap silme yolu:
Ayarlar > Hukuki > Hesap Silme

Bu uygulama 18+ yetiskin kullanicilar icindir.` 

## 6. Privacy Policy URL icin hazir metin

Bu metni yayinlayacagin bir web sayfasina koyup App Store Connect'te `Privacy Policy URL` alanina baglamalisin.

`Ehlibyte; hesap olusturma, telefon OTP dogrulamasi, profil ve eslesme deneyimi, mesajlasma, akis paylasimlari, yorumlar, canli oda katilimi, guvenlik, moderasyon, abonelik ve destek sureclerini yurutmek icin kisisel veri isler.

Toplanan veri kategorileri sunlari icerebilir: telefon numarasi, e-posta veya sosyal giris bilgileri, profil adi, yas, sehir, fotograf, biyografi, ilgi alanlari, kulturel beyanlar, yaklasik konum, mesaj ve yorum icerikleri, eslesme kayitlari, sikayet ve moderasyon kayitlari, bildirim tokenlari, abonelik ve satin alma bilgileri.

Bu veriler hizmetin sunulmasi, guvenligin saglanmasi, kotuye kullanim ve dolandiriciligin onlenmesi, topluluk kurallarinin uygulanmasi, teknik hatalarin giderilmesi ve yasal yukumluluklerin yerine getirilmesi amaclariyla islenir.

Veriler sinirli olarak Supabase, Apple, Google, RevenueCat, push bildirim saglayicilari ve reklam/analitik servisleri gibi teknik hizmet saglayicilarla paylasilabilir.

Kullanicilar uygulama icinden erisim, duzeltme, hesap silme, veri disa aktarma ve riza yonetimi taleplerini baslatabilir. Yasal saklama, odeme uyusmazligi, guvenlik ve kotuye kullanim onleme gibi durumlarda bazi kayitlar sinirli sure tutulabilir.` 

## 7. Terms of Service URL icin hazir metin

Bu metni de ayri bir web sayfasina koyup destek icinde kullanman iyi olur.

`Ehlibyte'i kullanarak uygulamanin kullanim kosullarini, gizlilik politikasini ve topluluk kurallarini kabul edersin. Uygulama 18 yas ve uzeri kullanicilar icindir.

Kullanicilar dogru bilgi vermek, baskasinin kimligine burunmemek, rizaya dayali iletisim kurmak ve hukuka uygun davranmak zorundadir. Taciz, tehdit, nefret soylemi, ayrimcilik, spam, sahte profil, dolandiricilik ve cinsel taciz yasaktir.

Ehlibyte, kullanici uretimli icerigi filtreleyebilir, kaldirabilir, gorunurlugunu azaltabilir, hesaplari askiya alabilir veya kalici olarak kapatabilir.

Premium, boost, rozet ve benzeri ucretli ozellikler Apple App Store odeme kurallarina tabidir. Satin alma, yenileme ve iptal islemleri ilgili Apple hesabi uzerinden yonetilir.

Topluluk guvenligi, teknik zorunluluklar veya yasal nedenlerle bazi ozellikler degistirilebilir, kisitlanabilir veya kaldirilabilir.` 

## 8. App Privacy anketi icin taslak

Asagidaki alanlar buyuk ihtimalle `Collected` ve `Linked to the user` olarak isaretlenecek:

- Contact Info: telefon numarasi, e-posta
- User Content: profil fotograflari, biyografi, mesajlar, yorumlar, akis postlari
- Identifiers: kullanici ID, oturum ve bildirim tokenlari
- Purchases: abonelik ve satin alma durumu
- Usage Data: etkilesim ve ozellik kullanimi
- Diagnostics: hata ve teknik loglar
- Location: yaklasik konum veya mesafe bilgisi
- Sensitive Info: kullanicinin profile ekledigi kulturel/dini beyanlar varsa dikkatle degerlendirilmeli

Amac tarafinda tipik secimler:

- App Functionality
- Safety and Fraud Prevention
- Customer Support
- Analytics
- Advertising

## 9. EAS build komutlari

`eas` oturumu acildiktan sonra:

```bash
npx eas-cli@latest login
EXPO_PUBLIC_USE_REVENUECAT=true npm run validate:prod
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

Android da yayinlanacaksa Android RevenueCat ve AdMob production key/id de tamamlanmali.
