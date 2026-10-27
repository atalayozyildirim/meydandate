# Ehlibyte — devam ve App Store teslim planı

Son güncelleme: **27 Ekim 2026, Europe/Istanbul**. Bu dosya sonraki oturumun başlangıç noktasıdır. Kullanıcı özellikle token/oturum bittiğinde işin buradan sürdürülmesini istedi.

## Kullanıcının son ve geçerli hedefi

**Demo değil, gerçek backend’e bağlı, eksiksiz sosyal platform ve App Store gönderimi.** Mevcut önizlemenin üstündeki demo etiketlerini silmek, üretim işlevlerini tamamlamak anlamına gelmez. Gerçek akışlar bağlanıp doğrulanmadan uygulamayı yayına hazır diye sunma.

Kullanıcının kabul ettiği/istediği kapsam:

- Uygulamayı GitHub’dan Atalay klasörüne al; mevcut Expo/React Native altyapısını kullan.
- Baştan tasarla; Product Design kullan. Seçilen görsel yön **1 — Yakınındaki Meydan**: krem zemin, bordo vurgu, serif başlık, sıcak fotoğraflar.
- **Tüm sayfalar:** onboarding, login, register, OTP, feed/akış, profil, ayarlar, topluluklar, etkinlikler, kültür içerikleri, mesajlar ve ödeme ekranları.
- **Feed sosyal platform gibi çalışacak:** gönderi oluşturma, medya, yorum/yanıt, beğeni, kaydetme, takip, sıralama, şikayet ve engelleme.
- **Matching/eşleştirme geri eklenecek.** Önceki `YENILEME_PLANI.md` içindeki “eşleştirmeyi kaldır” kararı kullanıcının sonraki açık isteğiyle değişti. Yeniden bu eski karara dönme.
- **Topluluk Space ana odasını ana admin yönetecek:** dinleyici, söz isteme, konuşmacı onayı, mikrofon kapatma, odadan çıkarma, başlık düzenleme, sonlandırma.
- **ATT, çerez tercihleri, hizmet koşulları, gizlilik/KVKK ve topluluk kuralları** yazılıp uygulamaya eklenecek. Hesap silme ve veri talepleri gerçek çalışacak.
- **Kontrol iOS simülatöründe yapılacak; tarayıcı değil.** Kullanıcı bunu açıkça belirtti.
- README ve bu `task.md` güncel tutulacak.

## Doğrulanmış kullanıcı bilgileri

### Seçilen uygulama ikonu ve Splash Screen — 27 Ekim 2026

- Kullanıcı ikon için açıkça **siyah-beyaz** istedi; kırmızı/bordo ikon istemiyor.
- Son siyah-beyaz serinin **3. görseli** seçildi: siyah zeminde merkez etrafında dört beyaz biçim.
- Seçilen özgün PNG: `assets/brand/ehlibyte-icon-black-white-selected.png` (1254 × 1254, opak).
- Kullanıcının “AYARLA” isteği üzerine `app.json` genel/iOS ikonu `assets/brand/ehlibyte-app-icon.png` olarak ayarlandı (1024 × 1024, opak). Android foreground için siyah kenar boşluklu `assets/brand/ehlibyte-adaptive-icon.png` hazırlandı; adaptive arka plan siyah.
- **Eski ikonlar silindi:** Eski "e" harfli SVG ikon kaynakları (`assets/icon-source.svg`, `assets/splash-icon-source.svg`) ve eski beyaz zeminli `assets/splash-icon.png` kaldırıldı.
- **Yeni Splash Screen tasarlandı ve entegre edildi:**
  - Yeni amblem şeffaf zemin üzerinde saf beyaz, anti-aliased ve Android 12+ dairesel safe-zone'a (%66 çap) tam uyumlu olarak üretildi (`assets/splash-icon.png` ve `assets/brand/ehlibyte-splash-icon.png`).
  - `app.json` içinde `splash.backgroundColor` ve `expo-splash-screen` eklentisi `#000000` (siyah zemin) olarak güncellendi, `imageWidth: 160` ayarlandı.
  - `src/app/(tabs)/_layout.tsx` içinde yazı tipleri yüklenene kadar native splash ekranının korunması ve sonrasında pürüzsüz gizlenmesi için `SplashScreen.hideAsync()` bağlandı.


Kullanıcı hukuki metinlerde kullanılmak üzere doğrudan verdi:

- Veri sorumlusu / kişi adı: **Atalay Özyıldırım**
- İletişim: **atalayozyildirim@gmail.com**
- Adres, varsa şirket/unvan/VKN ve hukuki saklama süreleri henüz doğrulanmadı. Uydurma. Bunlar yayın öncesi tamamlanmalı; diğer geliştirme işleri bu sırada sürdürülebilir.

## Depo ve dosya konumları

- Gerçek çalışma kopyası: `/Users/atalay/ehlibyte`
- Kaynak: `https://github.com/atalayozyildirim/meydandate.git`
- Başlangıç commit: `11757816cf988d3325a27e921a4bf41b3ce605f1`
- Dal: `codex/ehlibyte-community-revision`
- Değişiklikler henüz commit/push edilmedi. GitHub CLI oturumu yoktu; public clone başarılı.
- Önceki plan: `/Users/atalay/Documents/ChatGPT/ehlibyte/YENILEME_PLANI.md` (eski klasör artık bulunmayabilir).
- Seçilen ImageGen referansı: `/Users/atalay/.codex/generated_images/01a174c2-5250-7860-8a73-b2515bb2018f/exec-db57b8fc-9f06-454b-9a1d-60ba4a762580.png`.
- Kütüphaneler Expo 54 / React Native 0.81.5 / React 19.1 / Supabase / RevenueCat / LiveKit.
- iOS bundle: `com.ehlibyte.app`; App Store’daki eski ret kaydının app ID’si önceki planda `6779316827`. Başka açık App Store Connect sekmelerinin farklı uygulamalar olabileceğini unutma.

## Bu oturumda tamamlanan gerçek işler

- [x] Depo `/Users/atalay/ehlibyte` içine klonlandı; çalışma dalı açıldı; npm bağımlılıkları yüklendi.
- [x] Yeni tasarım bileşenleri, Playfair Display ve Inter fontları eklendi.
- [x] Yeni native Meydan / Etkinlik / Topluluk / Kültür / Ben deneyimi kodlandı.
- [x] Etkinlik arama, kategori/şehir/bu hafta filtresi, detay ve **yerel demo** katılım/iptal akışı.
- [x] Açık/kapalı örnek topluluklar, katılma/ayrılma, kapalı topluluğa istek, içerik gizliliği.
- [x] Kültür yazıları, okuma ve kaydetme; koleksiyon ekranları.
- [x] Yerel demo gönderi sohbeti, şikayet/engelleme/gizleme, engel kaldırma, görünürlük tercihi.
- [x] Yaş kapılı yetişkin **demo** eşleştirme, beğen/geç, karşılıklı senaryo, örnek sohbet ekranı.
- [x] **Demo** Space ekranı ve izin kontrollü saf durum modeli: ana admin/mikrofon/söz isteği/sahne/sonlandırma.
- [x] Ana sayfa, profil ve topluluk ekranından eşleştirme ve Space erişimleri.
- [x] 6 yeni raster görsel `assets/community/` içinde üretildi; görseller kurgusaldır, gerçek kişi/kurum temsil etmez. Araç: built-in ImageGen.
- [x] `scripts/community.test.ts`: 5 anlamlı test (yaş sınırı/tarih, üyenin admin yetkilerini kullanamaması, söz isteği ve onay, moderasyon/sonlandırma, karşılıklı eşleşme/tekrarlı beğeni).
- [x] `expo-tracking-transparency` SDK54 uyumlu `~6.0.8` kuruldu. **Henüz ATT ekranı, config plugin veya SDK başlatma kapısı eklenmedi.**
- [x] Expo Go SDK54 simülatöre kuruldu, uygulama native olarak açıldı. Henüz tam görsel/etkileşim QA geçmedi.

### Yeni kodun haritası

`src/features/community/`:

- `CommunityApp.tsx`: yeni uygulama kabuğu, navigasyon, etkinlik/topluluk/kültür/profil ekranları ve modal paneller.
- `ui.tsx`: renkler, fontlar, düğmeler, arama, chip ve kart bileşenleri.
- `data.ts`: **örnek** etkinlik/topluluk/kültür içerikleri ve filtre.
- `store.ts`: cihazdaki demo seçimleri; SecureStorageService üzerinden persist.
- `connections.ts`: kurgusal yetişkin eşleştirme profilleri.
- `SocialScreens.tsx`: eşleşme, örnek sohbet, Space ve admin paneli.
- `networkStore.ts`: **bellekteki demo** eşleştirme/Space durumu; gerçek auth/role değildir.
- `spaceModel.ts`: admin/member komut izinlerini doğrulayan saf model.
- `ageGate.ts`: gerçek takvim tarihi ve 18 yaş sınırı kontrolü. Tek başına üretim yaş doğrulaması değildir.

`src/app/index.tsx` yeni `CommunityApp` bileşenini açıyor. `src/app/_layout.tsx` eski reklam/oturum/push kontrolcülerini çalıştırmıyor.

### Eski kod korunuyor

Eski `src/app/` ekranları yeni Router ağacında istemsiz yüklenip native SDK hatası vermesin diye **`src/legacy-app/` altına taşındı**. Bu yüzden git diff, untracked yeni dosyalar eklenmeden çok sayıda silinmiş dosya gösteriyor. Kaynaklar kaybolmadı. İncelerken rename/move olarak değerlendir.

Eski servisler `src/features/`, `src/infrastructure/supabase/`, `src/domain/` altında duruyor. Supabase migrations, auth, feed, LiveKit ve RevenueCat altyapısı mevcut ama **yeni arayüze bağlı değil**. Yeniden kullanmadan önce güvenlik/veri sözleşmesi denetlenmeli.

## Henüz yapılmadı — üretim için kritik açıklar

- [ ] **Önce runtime sorununu düzelt ve temiz simülatör görüntüsü al.** Aşağıdaki simülatör notunu oku.
- [ ] Yeni login/register/OTP/onboarding ekranları. Şu an yalnızca eski ekranlar `src/legacy-app/` altında; yeni tasarımda hesap oluşturma yok.
- [ ] Doğrulanmış gerçek Supabase oturumu ve profil oluşturma; farklı giriş yollarında aynı yaş/şartlar kontrolü.
- [ ] Eksik yaşı `18` varsayan yolları kaldır. `SupabaseAuthRepository.ensureOwnProfileViaTable` ve `userMapper.ts` mevcut riskler içeriyor. Veritabanı `ensure_my_profile` RPC’leri de incelenmeli.
- [ ] Sunucu tarafında doğum tarihi/18+ uygunluğu; eski oturum, sosyal giriş, doğum günü sınırı, eksik tarih ve manipüle API testleri.
- [ ] Yeni onboarding: karşılama → hesap/yaş/şartlar → şehir/ilgi alanları → ilk topluluk → feed. Kültürel aidiyet sınavı zorunlu olmayacak.
- [ ] **Sosyal feed’i yeniden tasarla ve gerçek servise bağla.** Şu an ana sayfada yalnızca bir örnek Deniz sorusu var. Tam feed henüz geliştirilmedi. Mevcut `SupabaseFeedRepository`, `FeedRepository`, `domain/entities/Feed.ts` ve eski feed UI yararlı kaynaklar.
- [ ] Gerçek gönderi/medya yükleme, beğeni, yorum/yanıt, takip/kaydetme, sayfalama, yükleniyor/boş/hata durumları, kronolojik/takip edilenler, silme/düzenleme.
- [ ] Gerçek topluluk/etkinlik CRUD, üyelik/katılım ve yetki/RLS; eski kullanıcı verisini silmeden geçiş planı.
- [ ] Gerçek matching, karşılıklı izin ve mesajlaşma; yeni UI’daki kurgusal reciprocity fixture’ını kaldır. Engellenen/uygun olmayan kullanıcılar hiçbir yüzeyde görünmemeli.
- [ ] **Space gerçek LiveKit bağlantısı ve token uçları.** Admin rolünü istemciden seçen `Önizleme rolü` kontrolünü üretimde kaldır. Yetki `user_roles`/doğrulanmış sunucu rolünden gelmeli, kullanıcı adı veya user_metadata’dan değil.
- [ ] Ana adminin kimliği güvenilir kullanıcı UUID’siyle doğrulanmalı. `doc/admin-bootstrap.md` isim eşleşmesiyle bootstrap öneriyor; isimden rol dağıtımını otomatik çalıştırma.
- [ ] Sunucu moderasyonu: şikayet kaydı/kuyruğu, geliştirici bildirimi, işlem kaydı, içerik kaldırma, engellemenin tüm akış/yorum/mesaj/profil yüzeylerine yansıması.
- [ ] Yeni hukuki ekranlar: hizmet koşulları, gizlilik, **ayrı KVKK aydınlatması**, topluluk kuralları, çerez/yerel saklama, ATT/izinler, hesap silme/veri talepleri. Eski `src/shared/constants/legal.ts` çok genel ve güncel davranışla uyumsuz; doğrudan kopyalama.
- [ ] Şart kabul kaydı sürüm/zaman bilgisiyle sunucuda tutulmalı; gizlilik bilgilendirmesini zorunlu “rıza kabulü” ile birleştirme. İsteğe bağlı pazarlama varsayılan kapalı ve ayrı.
- [ ] Gerçek takip veri envanteri. Takip varsa OS ATT izni **öncesinde** reklam/takip SDK’sı başlatılmamalı. Takip yoksa gereksiz sistem ATT istemi üretme; kullanıcıya mevcut durumu açıkla. Sahte native izin ekranı yapma.
- [ ] `expo-tracking-transparency` config plugin/dynamic app.config.js ayarı ve gerçek binary doğrulaması. Mevcut AdMob/LiveKit/native pluginlerin bu sürümde hangi amaçla kullanıldığını netleştir.
- [ ] Bildirim/mikrofon/fotoğraf izinleri bağlamında istenmeli; reddetme/sonradan ayarlardan açma senaryoları.
- [ ] Gerçek hesap silme: auth oturumu, ilişkili veriler, Apple token iptali gerekiyorsa, saklama istisnaları; yalnızca yerel sıfırlama yeterli değil.
- [ ] RevenueCat/IAP gerçek ürün ve entitlement, restore, iptal/iade, sandbox ve cihaz testleri. Hazır içerik/ürün olmadan sahte Plus satışı açma.
- [ ] Erişilebilirlik, metin boyutu, keyboard/insets, iPhone/iPad, bağlantı hataları ve yeniden açılış testleri.
- [ ] Product Design `design-qa.md`: kaynak ve gerçek simülatör ekran görüntülerini aynı karşılaştırma görselinde normalize ederek değerlendir; açık P0/P1/P2 kaldığı sürece blocked.
- [ ] npm audit çıktısında bulunan mevcut riskleri gözden geçir; körlemesine `npm audit fix --force` çalıştırma. Sadece uyumlu ve gerekli güncellemeleri yap.
- [ ] `npm run validate:prod`, tip kontrolü, uygun testler, Expo/native release build, imza/provisioning.
- [ ] App Store: açıklamalar/görseller, privacy nutrition labels/manifest, yaş derecesi, reviewer test hesabı, ret maddelerine doğrulanmış cevap, gerçek cihaz kanıt videoları, ilgili hesap sözleşme durumu.
- [ ] App Store gönderimi/onayı yapıldı diye iddia etme. Kimlik bilgileri/sözleşme/Apple incelemesi uygulama koduyla ikame edilemez.

## iOS simülatör ve runtime notları

- Kullanıcı tarayıcı yerine **iOS simülatörü** istiyor.
- Xcode 27.1 kurulu. `Simulator.app` yok; arayüz **DeviceHub.app** (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`).
- Açık cihaz: iPhone 17 / iOS 26.5 / UDID **`209AB321-188C-4571-8FB7-3F98935C3252`**.
- Expo Go SDK54 önbelleği: `/Users/atalay/.expo/ios-simulator-app-cache/Expo-Go-54.0.7.tar.app`. Kopyası `.expo/Expo-Go-54.0.7.tar.app` altında, Git’e ekleme.
- Bu proje Metro portu **8082**. Port 8081’de **başka proje `/Users/atalay/latte`** çalışıyordu; onu durdurma/değiştirme.
- Son Metro session ID **51748** (eski oturumda kalabilir; süreç/portu kontrol et).
- Açma: `xcrun simctl openurl <UDID> 'exp://localhost:8082/--/?preview=home'`.
- Geliştirme amaçlı preview parametreleri: `home`, `events`, `communities`, `culture`, `profile`, `connections`, `space`, `event`. Bunlar `__DEV__` ile sınırlı; gerçek kullanıcı yetkisi sağlamaz.
- Screenshot: `xcrun simctl io <UDID> screenshot docs/design/<name>.png`.
- Native screenshot 1206×2622 (402×874 @3x). Referans 853×1844; karşılaştırmada status bar/insets ve yoğunluğu normalize et.
- UI testleri için Computer Use başlangıçta vardı, daha sonra oturum araçlarından kaldırıldı. Mevcut araçları yeniden keşfet; olmayan namespace’i çağırma. Amaç simülatör testidir, tarayıcıya dönme.
- İlk native açılış başarılıydı; Expo Go ilk açılış dev-menu onboarding paneli uygulamayı örttü.
- Dev menu’yu kapatmak için yapılan **dinamik** `import('expo-dev-menu')` Fast Refresh sırasında `Requiring unknown module "1597"` hatası üretti. Son kod bunu **statik `closeMenu` import’una çevirdi**, fakat bundan sonra Metro/Expo Go temiz yeniden başlatılıp doğrulanmadı.
- Önce kendi 8082 Metro sürecini doğru PID ile durdur, `npx expo start --go --localhost --port 8082 --clear` başlat, Expo Go’yu yeniden aç ve log/screenshot ile kontrol et. Başka projelerin süreçlerini öldürme.
- `docs/design/home-initial.png`: uygulamanın görüntüsü üstünde Expo dev-menu paneli var. `home-pass1.png`: sonradan oluşan redbox hata görüntüsüdür, **başarılı QA kanıtı değildir**.

## Çalıştırma ve kontrol komutları

```sh
cd /Users/atalay/ehlibyte
git status --short
npm ci
npm run typecheck
npm run test:community
npx expo start --go --localhost --port 8082 --clear
xcrun simctl openurl 209AB321-188C-4571-8FB7-3F98935C3252 'exp://localhost:8082/--/?preview=home'
```

Son doğrulamada 5 `test:community` testi geçti; tip kontrolü geçti. Bu yalnızca mevcut demo kodunun doğrulamasıdır, gerçek sunucu/App Store testi değildir.

## Kullanılan tasarım becerileri ve kaynaklar

Product Design index, user-context preflight, get-context, image-to-code ve design-qa yönergeleri okundu. Mevcut native projede çalışılıyor; başka bir web starter’ı ile değiştirme. Seçilen tasarım bulunduğu için tekrar üç konsept seçimi sorma.

Supabase ile çalışılacaksa `.agents/skills/supabase/SKILL.md` ve ilgili Postgres rehberini uygula; yeni migration dosyasını CLI ile üret, canlı veritabanına körlemesine push yapma. Yerel test/gerçek DB doğrulaması olmadan RLS düzeldi diye yazma. Supabase changelog 27 Ekim’de okundu; 10 Kasım TLS değişikliği mevcut JS SDK çağrılarını doğrudan değiştirmiyor.

Hukuki/ATT araştırmada okunan resmi kaynaklar:

- Apple ATT: https://developer.apple.com/documentation/apptrackingtransparency
- Apple veri kullanımı: https://developer.apple.com/app-store/user-privacy-and-data-use/
- KVKK aydınlatma: https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-
- Aydınlatma ve rızanın ayrılması: https://www.kvkk.gov.tr/Icerik/6765/AYDINLATMA-YUKUMLULUGUNUN-YERINE-GETIRILMESI-HAKKINDA-KAMUOYU-DUYURUSU
- Expo ATT: https://docs.expo.dev/versions/latest/sdk/tracking-transparency/
- Expo iOS simülatör: https://docs.expo.dev/workflow/ios-simulator/
- Supabase OTP: https://supabase.com/docs/reference/javascript/auth-signinwithotp

## Sonraki çalışma sırası

1. Runtime’ı temiz başlat; task/README doğru hedefi anlatsın.
2. Yeni onboarding + login/register/OTP + hukuki/izin ekranlarını gerçek oturum ve yaş kontrolüyle tamamla.
3. Yeni sosyal feed ve gerçek içerik servislerini bağla; üyelik/etkinlik/matching/mesaj/Space sunucu yetkilerini tamamla.
4. Simülatör + gerçek cihaz + backend testleri; görsel QA; yayın hazırlığı ve App Store gönderim kontrolü.

Her önemli adımdan sonra bu dosyada gerçek durumu güncelle. **Kullanıcı bitmiş bir sosyal platform ve mağaza sürümü istiyor; şu an o hedef tamamlanmış değil.**

## Supabase yeniden kurulum — 27 Ekim 2026

Bu bölüm aşağıdaki eski CLI/bağlantı checkpoint'inden daha günceldir. Kullanıcı eski Ehlibyte projesini sildiğini doğruladı ve sıfırdan kurulmasını istedi.

- Yeni proje: `ehlibyte`, ref `aururygssrwkayawliup`, organizasyon `nzjqsltaylkzllyablaa`, bölge `eu-central-1` (Frankfurt). Latte projesi değiştirilmedi.
- Supabase CLI yeni projeye bağlandı. `.mcp.json` URL'si güncellendi; bu oturumda Supabase MCP araçları görünür değildi, MCP bağlantısı doğrulandı diye kabul etme.
- `.env.local`: development, gerçek Supabase etkin, proje URL'si ve `sb_publishable_` public anahtarı. Ödeme ve reklam kapalı. Dosya izinleri 0600, Git tarafından ignore ediliyor.
- `/Users/atalay/.config/ehlibyte/supabase.env`: yalnızca sunucu/CLI için oluşturulan DB parolası ve proje ref'i. 0600 ve Git dışında. Mobil pakete dahil etme, içeriğini loglama.
- Depodaki 66 migration yeni boş veritabanına başarıyla uygulandı. 37 public tablonun tamamında RLS açık; `profile-photos` ve `feed-post-images` bucket'ları mevcut migration'ların davranışıyla public. Migration'lar başlangıç rehber/bot kayıtlarını da oluşturur; bunları gerçek üye kabul etme.
- `supabase/config.toml` yeni auth ayarlarıyla push edildi: `ehlibyte://auth/callback`, `ehlibyte://reset-password`, e-posta onayı açık, en az 8 karakter parola, 6 haneli e-posta OTP, TOTP MFA açık. Sabit SMS test kodu kaldırıldı. Apple kimlik bilgileri henüz kurulmadığı için sağlayıcı kapalı. Ücretli vector bucket özelliği kapalı.
- Doğrulama: canlı SQL sorgusu, 66 migration kaydı, 37 tabloda RLS, 0 admin rolü; public anahtarla Auth settings HTTP 200 ve email onayı zorunlu; oturumsuz `users`, `feed_posts`, `messages` erişimi 42501 ile reddediliyor. Expo config geçerli ve app.config.js yeni env değerlerini okuyor.
- Security advisor ERROR yok; 28 authenticated SECURITY DEFINER RPC inceleme uyarısı ve sızmış parola koruması uyarısı var. RPC yetki denetimlerinin tam denetimi hâlâ gerekli; temiz güvenlik raporu diye sunma. Ayrıntı (yerel): `supabase/.temp/security-advisors.json`.
- Edge Functions dağıtılmadı. Özel SMTP, Apple/Google giriş bilgileri, LiveKit/RevenueCat/Spotify sırları henüz kurulmadı. Yeni Community UI hâlâ yerel örnek akışları kullanıyor; env kurulumu UI entegrasyonunun tamamlandığı anlamına gelmez.
- Yeni auth kullanıcısı veya admin atanmadı. Ana admini yalnızca doğrulanmış UUID ile yetkilendir; kullanıcı adına göre rol verme.

## En son checkpoint — yukarıdaki eski runtime notundan daha güncel

- `task.md` ve README kullanıcı isteğiyle kaydedildi; uygulama hedefi gerçek sosyal platform/App Store sürümü.
- Statik `closeMenu` ve Expo Go yeniden açılışı sonrasında ana ekran redbox/dev-menu olmadan görüntülendi.
- Native hero görselindeki boyut taşması, tüm esnek görsellere açık responsive sayısal boyut verilerek düzeltildi. Logo zemini de düzeltildi.
- Son geçerli görüntü: `docs/design/home-layout-fixed.png`; karşılaştırma: `docs/design/home-comparison.png`.
- `design-qa.md` oluşturuldu; **blocked**. Yeni istenen ekranlar/gerçek backend ve native etkileşim QA eksik. Ana ekranı görmek tüm uygulamanın testi değildir.
- Son `npm run typecheck` başarılı; 5 `npm run test:community` testi başarılı. Kod Prettier ile biçimlendirildi.
- `supabase projects list --output json` çalıştırıldı. Bu CLI hesabında yalnızca **latte** adlı, Ehlibyte olmayan proje (`skgoednftugywjvlsfzp`) göründü. Bu projeye bağlanılmadı, verisi değiştirilmedi. Ehlibyte’ın doğru Supabase projesi/env bilgileri ayrıca sağlanmalı veya doğru hesaba bağlanılmalı. Başka projeyi Ehlibyte sanarak kullanma.
- ATT paketi kurulu ama hâlâ config/UI/SDK başlangıç kapısı yok. Hukuki belgeler, yeni auth/onboarding ve tam feed henüz yazılmadı; önceki niyet/progress mesajlarını tamamlanma kanıtı kabul etme.


## Güncel koordinasyon checkpoint — giriş ve Gemini görevleri

Bu bölüm, önceki “en son checkpoint” içindeki Supabase bağlantısı ve auth eksikliği notlarından daha günceldir.

- Kullanıcı Gemini için Markdown görev listesi istedi. `GEMINI_TASKS.md` kökte oluşturuldu: G1 erişim/onboarding backend, G2 feed, G3 topluluk/etkinlik, G4 matching/mesaj, G5 Space. Dosya sahipliği, API sözleşmeleri ve kabul ölçütleri var.
- Yeni `src/features/community/access/**` giriş/onboarding temeli ve 10 access testi eklendi; giriş noktası buna bağlandı. Bu temelin tip kontrolü ve mevcut 5 community + 10 access testi geçti. Canlı OTP/onboarding DB testi değildir.
- Kullanıcı “latte'ye dokunma, Supabase'de yeni proje aç” dedi. Ayrı `ehlibyte` projesinin (`aururygssrwkayawliup`, Frankfurt) oluşturulmuş/bağlı olduğu CLI ile doğrulandı; ikinci proje açılmadı. Bu sohbet Latte üzerinde işlem yapmadı.
- Kullanıcının diğer sohbette verdiği koordinasyon izni doğrudan okundu. Giriş dosyalarının sahipliği diğer Codex sohbetine devredildi; eşzamanlı düzenleme durduruldu. O sohbet e-posta magic link/PKCE callback, sağlayıcı flag'leri ve native QA'yı sürdürüyor. Gemini `access/**` dosyalarını değiştirmemeli.
- Yeni G1 migration ortak çalışma kopyasında var; varlığı deploy/test kanıtı değildir. Yeni migration'lar Gemini tarafından geliştiriliyor.
- Bu sohbet yalnızca izole 8083 Metro'yu başlattı ve kapattı; 8082'ye dokunmadı. Temiz iOS bundle HTTP200 alındı, ancak native giriş ekranı QA'sı tamamlanmadı. İlk `auth-entry-initial.png` hata toast'lı eski ekranı gösterir; başarılı QA kanıtı değildir.
- Ayrıntılı devir: `doc/codex-access-handoff.md`. Sunucu env dosyasının güncel konumu üstteki Supabase yeniden kurulum bölümündedir; sırları yanıta veya repo belgelerine ekleme.


## Giriş ve canlı G1 doğrulaması — 27 Ekim 2026, son checkpoint

- Diğer Codex sohbetiyle kullanıcı izniyle koordinasyon kuruldu. `access/**`, `scripts/community-email-access.test.ts` ve girişin sunucu konfigürasyonu bu sohbet tarafından tamamlandı; Gemini G2 ve sonraki backend/frontend görevlerini sürdürüyor. Ortak checkout'ta sahipliği koru.
- Varsayılan giriş: e-posta magic link + PKCE. `CommunityEmailCallback.tsx` / `src/app/auth/callback.tsx` gelen kodu Supabase ile değiştirir, doğrulanmış kullanıcı ve sunucu erişimini okur. E-posta OTP ve Phone OTP servis desteği mevcut; `EXPO_PUBLIC_EMAIL_OTP_ENABLED` ve `EXPO_PUBLIC_ENABLE_PHONE_AUTH` varsayılan false. Özel SMTP olmadan OTP template'lerini açma: mevcut sağlayıcı template güncellemesini HTTP 400 ile reddetti. Hazır template `supabase/templates/email-code.html` içinde, config'te yorum satırında.
- OTP veya link doğrulandıktan sonra erişim RPC'si hata verirse tüketilmiş kod tekrar kullanılmaz; mevcut oturumdan yeniden kontrol yapılır. Yanlış email, başka callback adresi, geçersiz link, kimlik uyuşmazlığı ve eski hukuki sürüm reddedilir. Yeni üyelik, hukuki belgeler yayımlanmadan Auth kullanıcısı yaratmaz.
- G1 iki migration'ı, gerçek Supabase PostgreSQL üzerinde 19 testlik transaction/savepoint rollback doğrulamasından sonra uygulandı. Kalıcı migration sayısı 68. Hukuki belgeler taslak: 0 yayımlanmış belge, 0 onboarding üyesi. Test telefon hesapları kalmadı. G2 migration henüz uygulanmadı; boş dosya yarışından oluşan history kaydı onarıldı. Ayrıntı: `docs/verification/2026-10-27-backend-check.md`.
- İstemci 19 access/email testi geçti; mevcut 5 community/domain testi geçti; son tam TypeScript kontrolü geçti. Gemini aynı anda feed kodunu yazdığından anlık kontrollerde geçici tip hataları gözlendi; son geçerli sonuç önceki bir kontrolle karıştırılmamalı.
- iOS gerçek launchAsset URL'sinden native bundle HTTP 200 doğrulandı; bu URL `transform.routerRoot=src/app` içerir. Parametresiz bundle URL'si uygulama ekranlarını içermediğinden geçerli uygulama testi değildir.
- Native CUA doğrulaması: welcome, e-posta bağlantısı formu, geçersiz email uyarısı, yayımlanmamış hukuki belgeyle kayıt reddi, kod içermeyen callback için geçersiz/süresi dolmuş link ekranı. Gerçek e-posta teslimi ve başarılı linkle tam onboarding henüz uçtan uca doğrulanmadı.
- Metro'nun env dosyasını JavaScript olarak çözmesini önlemek için gereksiz Babel root çözümü kaldırıldı ve env blockList eklendi. DB parolası workspace dışında `/Users/atalay/.config/ehlibyte/supabase.env` (0600). Mobil client URL polyfill ile başlatılır.
- Eksik olduğu için uygulamayı durduran 5 eski ikon/splash dosyası HEAD'deki içerikleriyle geri getirildi; yeni ikon konseptlerinden seçim yapılmadı. Native görüntüler: `docs/design/auth-registration-closed.png`, `docs/design/auth-callback-invalid.png`. `auth-email-live.png` eski logbox içerdiği için temiz QA kanıtı değildir.
- Metro 8082 çalışıyor (session 71938); 8081'e dokunulmadı. Kullanıcı en son simülatör arayüzünü değiştirdiği için sonraki CUA eyleminden önce yeniden durum oku.
- Açık işler: hukuki soruları doğrulayıp taslakları güncelleme/yayımlama; üretim SMTP; gerçek email teslimi/PKCE/onboarding uçtan uca test; Gemini G2+ entegrasyonu; tam native QA ve release/App Store adımları.
