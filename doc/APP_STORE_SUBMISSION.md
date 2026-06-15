# App Store Submission Pack

Son guncelleme: 15 Haziran 2026

## 1. Mevcut durum

- iOS bundle id: `com.ehlibyte.app`
- App adi: `Ehlibyte`
- Apple ile giris capability acik
- Uygulama ici hesap silme ekrani mevcut
- In-app purchase altyapisi RevenueCat ile bagli

## 2. Yayin oncesi kalan blocker'lar

- `EAS` oturumu bu makinede kapali. `npx eas-cli@latest whoami` sonucu: `Not logged in`
- Production AdMob ID'leri hala placeholder
- Production build icin `EXPO_PUBLIC_USE_REVENUECAT=true` zorunlu hale getirildi
- App Store icin `Privacy Policy URL` ve tercihen `Support URL` host edilmis olmali

## 3. App Store metadata

### App Name

`Ehlibyte`

### Subtitle

`Saygili eslesme ve topluluk alani`

### Promotional Text

`Ehlibyte ile topluluguna yakin kisilerle tanis, Meydan akisinda paylasim yap, canli odalara katil ve daha guvenli bir sohbet deneyimi yasat.`

### Description

`Ehlibyte, tanisma, topluluk ve paylasim deneyimini ayni yerde bulusturan bir mobil uygulamadir.

Profilini olustur, ilgi alanlarini ve kendini ifade eden detaylari ekle, sana uygun kisilerle esles ve sohbet etmeye basla.

Akis ekraninda fotografli paylasimlar, yorumlar, anketler ve topluluk gundemleri yer alir. Meydan bolumunde canli odalara katilabilir, toplulukla es zamanli etkilesime gecebilirsin.

Ehlibyte; kullanici guvenligini, moderasyonu ve gizliligi ciddiye alir. Engelleme, sikayet, hesap silme ve veri talepleri uygulama icinden yonetilebilir.

Premium ozelliklerle daha fazla gorunurluk, ek etkilesim araclari ve gelismis deneyimler acilabilir. Satin alimlar Apple App Store uzerinden yonetilir.`

### Keywords

`alevi,tanisma,topluluk,eslesme,sohbet,meydan,arkadaslik,akis,canli oda,kultur`

### Category

`Social Networking`

### Content Rights

`Uygulamadaki kullanici uretimli icerik kullanicilar tarafindan saglanir; uygulama moderasyon, raporlama ve kaldirma araclari sunar.`

## 4. App Review Notes

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

## 5. Privacy Policy URL icin hazir metin

Bu metni yayinlayacagin bir web sayfasina koyup App Store Connect'te `Privacy Policy URL` alanina baglamalisin.

`Ehlibyte; hesap olusturma, telefon OTP dogrulamasi, profil ve eslesme deneyimi, mesajlasma, akis paylasimlari, yorumlar, canli oda katilimi, guvenlik, moderasyon, abonelik ve destek sureclerini yurutmek icin kisisel veri isler.

Toplanan veri kategorileri sunlari icerebilir: telefon numarasi, e-posta veya sosyal giris bilgileri, profil adi, yas, sehir, fotograf, biyografi, ilgi alanlari, kulturel beyanlar, yaklasik konum, mesaj ve yorum icerikleri, eslesme kayitlari, sikayet ve moderasyon kayitlari, bildirim tokenlari, abonelik ve satin alma bilgileri.

Bu veriler hizmetin sunulmasi, guvenligin saglanmasi, kotuye kullanim ve dolandiriciligin onlenmesi, topluluk kurallarinin uygulanmasi, teknik hatalarin giderilmesi ve yasal yukumluluklerin yerine getirilmesi amaclariyla islenir.

Veriler sinirli olarak Supabase, Apple, Google, RevenueCat, push bildirim saglayicilari ve reklam/analitik servisleri gibi teknik hizmet saglayicilarla paylasilabilir.

Kullanicilar uygulama icinden erisim, duzeltme, hesap silme, veri disa aktarma ve riza yonetimi taleplerini baslatabilir. Yasal saklama, odeme uyusmazligi, guvenlik ve kotuye kullanim onleme gibi durumlarda bazi kayitlar sinirli sure tutulabilir.` 

## 6. Terms of Service URL icin hazir metin

Bu metni de ayri bir web sayfasina koyup destek icinde kullanman iyi olur.

`Ehlibyte'i kullanarak uygulamanin kullanim kosullarini, gizlilik politikasini ve topluluk kurallarini kabul edersin. Uygulama 18 yas ve uzeri kullanicilar icindir.

Kullanicilar dogru bilgi vermek, baskasinin kimligine burunmemek, rizaya dayali iletisim kurmak ve hukuka uygun davranmak zorundadir. Taciz, tehdit, nefret soylemi, ayrimcilik, spam, sahte profil, dolandiricilik ve cinsel taciz yasaktir.

Ehlibyte, kullanici uretimli icerigi filtreleyebilir, kaldirabilir, gorunurlugunu azaltabilir, hesaplari askiya alabilir veya kalici olarak kapatabilir.

Premium, boost, rozet ve benzeri ucretli ozellikler Apple App Store odeme kurallarina tabidir. Satin alma, yenileme ve iptal islemleri ilgili Apple hesabi uzerinden yonetilir.

Topluluk guvenligi, teknik zorunluluklar veya yasal nedenlerle bazi ozellikler degistirilebilir, kisitlanabilir veya kaldirilabilir.` 

## 7. App Privacy anketi icin taslak

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

## 8. EAS build komutlari

`eas` oturumu acildiktan sonra:

```bash
npx eas-cli@latest login
EXPO_PUBLIC_USE_REVENUECAT=true npm run validate:prod
npx eas-cli@latest build --platform ios --profile production
```

Android da yayinlanacaksa Android RevenueCat ve AdMob production key/id de tamamlanmali.
