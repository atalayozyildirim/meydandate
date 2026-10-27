# Codex giriş arayüzü — entegrasyon notu

Tarih: **27 Ekim 2026, Europe/Istanbul**.

## İş bölümü

Gemini'nin sıralı görevleri kökteki `GEMINI_TASKS.md` dosyasındadır. G1 sunucu erişim sözleşmesi, G2 feed, G3 topluluk/etkinlik, G4 matching/mesaj, G5 LiveKit Space.

Giriş/onboarding kodu diğer Codex sohbetine devredildi. Kullanıcının sohbetler arası koordinasyon izni o sohbette doğrulandı. İki Codex sohbeti artık `access/**` üzerinde eşzamanlı değişiklik yapmıyor. Bu belge ve Gemini görev belgesi bu sohbetin teslimidir.

## Bu sohbette eklenen temel

- `src/features/community/access/CommunityEntry.tsx`: fontları yükleyen yeni giriş noktası; `src/app/index.tsx` burayı export ediyor.
- `CommunityAccessGate.tsx`: karşılama, giriş/kayıt, doğrulama, ad/doğum tarihi/şehir/isteğe bağlı ilgi alanları, belge okuma ve ayrı koşul/kural kabul alanları.
- `CommunityAccessService.ts`: eski DI container'ı ve native ödeme SDK'larını başlatmadan Supabase Auth ve ortak erişim RPC'leriyle iletişim.
- `contracts.ts`: UUID/alan tipleri, dört ayrı sürümlü belge, doğum tarihi/18 yaş sınırı, telefon normalizasyonu ve erişim kararı. E-posta desteği diğer Codex sohbetinde geliştiriliyor.
- `CommunityApp.tsx`: profil alanı doğrulanmış oturumdan görünen ad/şehri okuyabiliyor ve çıkış eylemi var. Diğer içerikler hâlâ demo; gerçek feed/topluluk bağlantısı bitmedi.
- `scripts/community-access.test.ts`: 10 servis/sözleşme testi. Sahte sunucu yanıtları yalnızca test fixture'larıdır; uygulama çalışma zamanında mock oturuma düşmez.

Normal açılış giriş kontrolünden geçer. Tasarım için mevcut `home`, `events`, `communities`, `culture`, `profile`, `connections`, `space`, `event` development preview deep link'leri korunmuştur. Release güvenliği ayrıca sunucu/RLS katmanında uygulanmalı; preview bir sunucu yetkisi değildir.

## Ortak sunucu API'si

Tam parametre/JSON biçimleri `GEMINI_TASKS.md` G1 bölümünde yazılıdır:

1. `get_community_legal_documents()` — dört ayrı türde sürümlü, yayınlanmış belge.
2. `get_my_community_access()` — doğrulanmış kullanıcı UUID'si, `eligible`, `profileCompleted`, `termsAccepted`, görünen ad ve şehir.
3. `complete_community_onboarding(display_name, birth_date, city, interests, terms_version, community_rules_version)` — atomik profil/kabul kaydı ve aynı erişim nesnesi.

İstemci; belirsiz yanıt, eksik belge, uyuşmayan UUID, eski şart sürümü veya başarısız RPC durumunda ana ekrana ilerlemez. Son sunucu uygunluğu yalnızca bu UI kontrolüne bırakılamaz; Gemini backend yüzeylerinde de uygulamalı.

G1 için `20261027192356_community_access_onboarding.sql` ve `20261027192357_community_legal_documents_seed.sql` dosyaları tamamlandı. Diğer Codex sohbetinin `docs/verification/2026-10-27-backend-check.md` raporuna göre gerçek Supabase PostgreSQL üzerinde 19 SQL testi transaction/rollback ile geçti, test kalıntısı olmadığı doğrulandı ve bu iki migration kalıcı uygulandı. Hukuki belgeler taslak olarak kaldı; yayınlanmış kabul edilmedi.

## Yeni backend ve sağlayıcı durumu

- Ayrı Ehlibyte projesi doğrulandı: `aururygssrwkayawliup`, `eu-central-1`, `ACTIVE_HEALTHY`; CLI bağlı.
- **Latte üzerinde bu sohbet işlem yapmadı.** İkinci Ehlibyte projesi açılmadı.
- `.env.local` yalnızca mobil public ayarlarını içerir. Sunucu DB dosyasını diğer Codex sohbeti workspace dışına taşıdı; hiçbir belgeye sır değerini ekleme.
- SMS sağlayıcısı kapalı. Özel SMTP hazır değil. Diğer Codex sohbeti e-posta magic link ve PKCE callback kodunu tamamladı; email OTP/SMS ayrı opsiyonel flag'lerle kapalı kalacak. Güncel etkileşim testleri sürüyor.
- G1 RPC'leri uygulandı; hukuki belgeler yayımlanmadığından yeni üyeliğin tamamlanamaması beklenen davranıştır. Demo başarı ekleme.

## Doğrulama ve native QA

Bu sohbetin telefon OTP temelini eklemesinden sonra şu kontroller geçti:

```sh
npm run typecheck
npm run test:community
node --import tsx --test scripts/community-access.test.ts
```

İlk temel sonucu: tip kontrolü başarılı; 5 community ve 10 access testi başarılı. Güncel `task.md` checkpoint'ine göre diğer Codex sohbetinin e-posta değişikliklerinden sonra **19 access/email testi**, 5 community testi ve tam TypeScript kontrolü geçti. Bunlar gerçek SMS/e-posta teslim testi değildir. G1'in 19 canlı SQL testi ayrı bir doğrulamadır.

Native QA kısmen tamamlandı. Diğer Codex sohbetinin son checkpoint'inde welcome, e-posta magic-link formu, yanlış email'in yerel reddi, yayımlanmamış hukuki belgeyle kayıt reddi ve geçersiz callback ekranı doğrulandı. Kanıtlar: `docs/design/auth-registration-closed.png`, `docs/design/auth-callback-invalid.png`. **Gerçek email teslimi ve başarılı linkle tam onboarding E2E henüz doğrulanmadı.**

Eski `docs/design/auth-entry-initial.png` ve `auth-email-live.png` hata toast'ı/logbox içerir; temiz native QA kanıtı olarak kullanılmamalı.

Diğer Codex sohbeti gerçek iOS manifest'indeki `launchAsset` URL'sinden (`transform.routerRoot=src/app`) native bundle HTTP200 doğruladı. Daha önce bu sohbetin 8083 üzerindeki parametresiz `entry.bundle` HTTP200 kontrolü uygulama kodunun dahil olduğunu kanıtlamadığı için yeterli doğrulama sayılmaz. Bu sohbet kendi 8083 sürecini kapattı; 8082 çalışıyor (diğer Codex sohbetindeki session 71938). Kullanıcı simülatörü değiştirdiği için sonraki UI eyleminden önce durumu yeniden oku.

Runtime sırasında env dosyasının JS olarak taranması ve mevcut `image-size`/Metro uyumsuzluğu gözlendi. Ortak checkout'ta `metro.config.js` env blockList'i, Babel resolver düzeltmesi ve `patches/metro+0.83.3.patch` mevcut. Diğer çalışanın bu düzeltmelerini koru. Başarılı bundle dışında bir native QA sonucu iddia etme.

## Devam sırası

1. E-posta giriş/callback kodu ve temel native ret senaryoları doğrulandı; gerçek email teslimi, başarılı PKCE dönüşü ve tam onboarding E2E tamamlansın.
2. G1 sunucu migration/test temeli tamamlandı. Gemini hukuki taslaklardaki açıkları ve gerçek yayın için eksik veri/SMTP/SMS gereksinimlerini raporlasın; belgeleri hazır olmadan yayımlamasın.
3. Gemini G2–G5 bağımsız ekran/servislerini sırayla teslim etsin; Codex ana uygulamaya entegre etsin.
4. Canlı backend, gerçek cihaz, erişilebilirlik ve release/App Store doğrulamaları tamamlanmadan üretime hazır kabul etme.

## Migration dağıtımı için güncel koordinasyon

G1 dry-run ile push arasındaki aralıkta Gemini'nin boş G2 dosyası CLI history'sine girdi. Diğer Codex sohbeti `20261027193450` kaydının 0 statement olduğunu doğrulayıp yalnızca history kaydını reverted olarak düzeltti; G2 kaynak dosyasına dokunmadı. G2 dosyası artık içerik taşıyor ve geliştiriliyor, ancak bu işlemle SQL'i uygulanmış sayılmaz.

G2 ve sonraki deploy'lar, değişen ortak migration dizininden doğrudan yapılmamalı. Codex yalnız tamamlanıp incelenmiş dosyaları ayrı bir deploy snapshot'ına almalı; deploy edilecek dosyaların içeriği dry-run ile uygulama arasında değişmemeli. Gemini migration kaynaklarını geliştirir, canlı deploy'u Codex koordine eder. Ayrıntılı kanıt: `docs/verification/2026-10-27-backend-check.md`.
