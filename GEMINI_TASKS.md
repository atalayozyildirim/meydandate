# Gemini görevleri — Ehlibyte

Güncelleme: **27 Ekim 2026, Europe/Istanbul**.
Çalışma dizini: `/Users/atalay/ehlibyte`.
Hedef: gerçek backend'e bağlı sosyal platform ve ardından App Store teslimi.

## Önce oku

- `task.md`, `README.md`, `design-qa.md` ve `.agents/skills/supabase/SKILL.md`.
- Tasarım: **Yakınındaki Meydan**; krem, bordo, serif başlıklar. Expo/React Native uygulamasını koru.
- Matching kapsamda. Kültürel aidiyet testi zorunlu olmayacak.
- `src/legacy-app/` taşınmış kaynaklardır; Git'teki silinmiş görünen ekranları geri taşıma.
- Mevcut değişiklikleri resetleme, temizleme veya başka çalışanın kodunu üzerine yazma.
- **Güncel backend doğrulandı:** proje `ehlibyte`, ref `aururygssrwkayawliup`, Frankfurt (`eu-central-1`), durum `ACTIVE_HEALTHY`; CLI bu projeye bağlı. Kullanıcı ayrıca açıkça “latte'ye dokunma, yeni proje aç” dedi. Ayrı Ehlibyte projesi oluşturulmuş olduğundan ikinci bir proje açma. **latte** (`skgoednftugywjvlsfzp`) üzerinde işlem yapma. Bağlantı değerleri Git dışındaki `.env.local` içinde; secret değerleri loglama.
- Migration'ları CLI ile oluştur; veri silme, canlı migration/deploy ve mağaza gönderimi yapma.
- Doğrulama iOS simülatöründe; tarayıcı kullanılmayacak. Metro 8082; 8081 başka proje olabilir.

## Dosya sahipliği

| Alan                                             | Sorumlu     | Çalışma sınırı                                                                                      |
| ------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| Yeni giriş, OTP ve onboarding arayüzü            | Codex       | `src/features/community/access/**`                                                                  |
| Yeni ekranların ana uygulamaya bağlanması        | Codex       | `src/app/**`, `src/features/community/CommunityApp.tsx`                                             |
| Ortak tasarım, mevcut demo ekranlar              | Codex       | `src/features/community/ui.tsx`, `data.ts`, `store.ts`, `SocialScreens.tsx`, `networkStore.ts`      |
| Backend migration/RLS ve aşağıdaki sunucu işleri | Gemini      | Yeni migration dosyaları, ilgili mevcut repository ve Edge Function dosyaları                       |
| Yeni gerçek feed                                 | Gemini      | `src/features/community/feed/**`, `src/features/feed/**`, feed domain/repository                    |
| Yeni topluluk/etkinlik servis ve ekranları       | Gemini      | `src/features/community/groups/**`, `src/features/community/events/**`                              |
| Yeni matching/mesaj/Space                        | Gemini      | `src/features/community/matching/**`, `messaging/**`, `live/**`; ilgili mevcut servisler            |
| Hukuki belge kaynakları                          | Gemini      | `docs/legal/**` ve backend belge sürümleri                                                          |
| Ortak ayarlar                                    | Koordine et | `package.json`, lockfile, env, app config, README ve task.md; gerekli değişikliği ayrı notta bildir |

**G1 sunucu temeli uygulandı; G1'in açık yayın/sağlayıcı işleri sürerken G2 → G3 → G4 → G5 sırasıyla ilerle.** Ana `CommunityApp.tsx` dosyasını düzenleme: bağımsız bileşenleri export et, entegrasyon örneğini `docs/gemini-handoff.md` içine yaz. Aynı checkout'ta toplu format/reset, otomatik commit/push yapma. Ek bağımlılık gerekiyorsa önce mevcut paketlerle çözümü değerlendir; gereksinimi teslim notuna ekle.

**Eşzamanlı çalışma notu:** Diğer Codex sohbeti giriş dosyalarının sahipliğini devraldı; e-posta girişini ve native QA'yı sürdürüyor. `access/**`, `scripts/community-access.test.ts` ve `scripts/community-email-access.test.ts` dosyalarını Gemini değiştirmesin. Bu sohbet görev belgesi ve entegrasyon handoff'unu tutar. Ayrıntı: `doc/codex-access-handoff.md`.

**Son doğrulama checkpoint'i:** `task.md` içindeki “Giriş ve canlı G1 doğrulaması” bölümüne göre 19 access/email testi, 5 community testi ve tam TypeScript kontrolü geçti. Native welcome, email formu, yanlış email reddi, yayımlanmamış belgelerle kayıt reddi ve geçersiz callback ekranı kontrol edildi. **Gerçek email teslimi ve başarılı üyelik/onboarding E2E açık.** 68 kalıcı migration var; G2 henüz uygulanmadı. Native bundle kontrolünde gerçek manifest `launchAsset` URL'sini (`transform.routerRoot=src/app`) kullan; parametresiz `entry.bundle` HTTP200 sonucu uygulamanın çalıştığına kanıt değildir. Simülatör kullanıcı tarafından değiştirilmiş olabilir; yeni UI eyleminden önce güncel durumu oku.

## G1 — Giriş/onboarding sunucu sözleşmesi (ilk öncelik)

Codex istemcisinde telefon OTP altyapısı eklendi; yeni projede SMS sağlayıcısı kapalı. Diğer Codex sohbeti **e-posta magic link + PKCE callback** akışını tamamlıyor; SMTP ve e-posta şablonu hazır olmadan kod OTP'sini etkinleştirme. Telefon/e-posta/sosyal giriş hangi yolla yapılırsa yapılsın aşağıdaki ortak erişim sözleşmesini kullan. Sunucudaki eski `age=18` varsayımı erişim kanıtı değildir. Şu üç RPC'yi aşağıdaki **JSON nesnesi** sözleşmesiyle uygula (array döndürme):

**Güncel ilerleme:** Diğer Codex sohbetinin `docs/verification/2026-10-27-backend-check.md` raporuna göre G1 migration'ları (`20261027192356`, `20261027192357`) gerçek PostgreSQL üzerinde 19 SQL testinden geçti; test transaction'ı geri alınıp test verilerinin kalmadığı doğrulandıktan sonra bu iki migration kalıcı uygulandı. Aynı işi yapan ikinci migration üretme. Hukuki metinler **taslak ve yayımlanmamış** durumda; kayıt kapısı kapalı. Telefonla giriş için gerçek SMS sağlayıcısı, email OTP için uygun SMTP/şablon ayarı ayrıca gerekli; sabit test kodu veya sahte başarı ekleme. E-posta magic link/PKCE kodu Codex tarafında hazır; native etkileşim QA'sı sürüyor.

**Migration koordinasyonu:** G1 push'u sırasında G2 `20261027193450_feed_community_enhancements.sql` henüz boşken history'ye alınmıştı. Rapora göre 0 statement olduğu doğrulandı ve yalnızca boş history kaydı `repair --status reverted` ile kaldırıldı; G2 SQL o işlemde uygulanmadı. G2 dosyası şimdi geliştiriliyor. Dosyayı yeniden numaralandırma veya uygulandı varsayma; güncel içeriği ayrıca incele ve test et. Canlı deploy'u Codex koordine eder: ortak migration dizininden doğrudan push yerine yalnız seçilmiş/tamamlanmış migration'ların ayrı bir snapshot'ı kullanılmalı.

### `get_community_legal_documents()` → anonim ve authenticated

```ts
{
  documents: Array<{
    kind: "terms" | "privacy" | "kvkk" | "community_rules";
    version: string;
    title: string;
    body: string; // Düz metin; HTML çalıştırılmayacak.
  }>;
}
```

Her türden tam bir belge; boş/yer tutucu metin yayınlama. Eksik hukuki bilgi varsa hazır gibi dönme. Kişi: Atalay Özyıldırım, iletişim: atalayozyildirim@gmail.com. Adres/unvan/VKN/saklama süresi uydurma; doğrulanmamış noktaları `docs/legal/open-questions.md` dosyasında belirt. Aydınlatma ve sözleşme onayını ayrı tut. Uygulamanın gerçek veri/SDK envanterine ve güncel resmi kaynaklara göre yaz; hukuki uygunluğu otomatik garanti etme.

### `get_my_community_access()` → authenticated

```ts
{
  userId: string; // auth.uid()
  eligible: boolean; // Sunucunun geçerli doğum tarihinden hesapladığı 18+ sonucu.
  profileCompleted: boolean;
  termsAccepted: boolean; // Güncel terms ve community_rules sürümleri.
  displayName: string;
  city: string;
}
```

Eksik doğum tarihi/üyelik kaydı için yetki verme; nesne dön, onboarding'e yönlendir. `user_metadata`, `age`, istemcinin `eligible`/`role` alanı veya eski entry-test bayrağı erişim kanıtı olamaz. Sunucu doğum tarihi yalnızca beyana dayalıysa bunu kimlik doğrulaması olarak tanımlama. Eski hesaplar da yeni kontrolü geçsin.

### `complete_community_onboarding(...)` → authenticated

```ts
// RPC parametre adları tam olarak:
{
  display_name: string;
  birth_date: string; // YYYY-MM-DD
  city: string;
  interests: string[];
  terms_version: string;
  community_rules_version: string;
}
// Çıktı get_my_community_access ile aynı nesne.
```

- Kullanıcı ID'sini parametreden alma; `auth.uid()` ile belirle.
- Gerçek takvim tarihi, gelecekteki tarih, 18. doğum günü ve eksik tarih kontrolünü sunucuda uygula. Tarih sınırı Europe/Istanbul.
- Profil ve sözleşme kabul sürüm/zaman kaydını tek transaction'da yaz; eski sürümü reddet. İstemci zamanını kanıt kabul etme.
- Gizlilik/KVKK'yı zorunlu rıza checkbox'ına dönüştürme; pazarlama/takip varsayılan kapalı ve ayrı.
- Doğum tarihi herkese açık profil SELECT'lerine sızmasın. Yeni kayıt varsayılanı yetişkin olmasın; eski `ensure_my_profile` ve auth trigger'larını incele.
- `public` tablolarda RLS; kolon güncellemesiyle `eligible`, admin, premium veya kabul kayıtları taklit edilemesin. Gerekirse private tablo ve kontrollü RPC; SECURITY DEFINER gerekiyorsa gerekçeyi, auth kontrolünü, sabit search_path ve dar grant'leri göster.
- İstemcideki kontrol tek başına yeterli değil: feed, keşfet, sohbet, matching ve LiveKit token erişiminde sunucu uygunluğunu zorunlu kıl. G1'de altyapıyı hazırla, diğer görevlerde uygula.

**Kabul:** 17 yaş, tam 18 sınırı, geçersiz/eksik tarih, eski oturum, yabancı UUID, rol/metadata manipülasyonu, eski belge sürümü, iki kez onboarding ve işlem yarıda kalması için DB testleri. Mevcut kullanıcı içeriği korunmalı. Canlı DB doğrulanmadıysa açıkça yaz.

## G2 — Gerçek sosyal feed

- Kaynak: `src/domain/entities/Feed.ts`, `src/domain/repositories/FeedRepository.ts`, `src/infrastructure/supabase/SupabaseFeedRepository.ts`, eski feed ekranları.
- Bağımsız export: `src/features/community/feed/FeedScreen.tsx`. Girdi/oturum bağımlılıklarını ve kullanımını teslim notunda belirt.
- Gönderi oluştur/düzenle/sil; fotoğraf yükleme ve yetkili storage; yorum ve yanıt; beğen/kaydet/takip; şikayet/engelle.
- Kronolojik ve takip edilenler; kararlı cursor/sayfalama, yenileme, boş/hata/yükleniyor durumları. Hatalı istekte sahte başarı üretme.
- Engellenen/uygun olmayan kullanıcı ve kaldırılmış içerik tüm feed/yorum/profil yüzeylerinden filtrelensin. İstemci filtresine güvenme.
- Şikayetler gerçek moderasyon kuyruğuna, işlem kayıtlarıyla yazılsın.
- Kabul: iki kullanıcıyla gerçek kayıt, tekrar eden beğeni, ağ hatası/yeniden deneme, yabancı gönderiyi değiştirme, engelleme ve pagination testleri.

## G3 — Topluluk ve etkinlik

- Önce mevcut migration'ları incele, aynı işi yapan ikinci şema üretme.
- Topluluk CRUD, açık/kapalı üyelik, istek/onay/ret, ayrılma; kapalı içeriğin RLS ile korunması.
- Etkinlik CRUD, şehir/kategori/tarih filtresi, detay, gerçek katıl/iptal, kapasite ve eşzamanlı istekler.
- Admin/organizatör yetkileri sunucudan gelsin. Başkasının topluluğunda veya etkinliğinde işlem yapılamasın.
- Yeni bağımsız ekranları `groups/**` ve `events/**` altında hazırla; mevcut fixture'ları gerçek veriyle karıştırma.
- Kabul: kapalı topluluğun üye olmayan kullanıcıya API düzeyinde kapalı olması; çift katılım, son kontenjan yarışı, iptal ve saat dilimi testleri.

## G4 — Matching ve gerçek mesajlaşma

- Matching korunacak, kültürel kimlik beyanı isteğe bağlı. Gerçek yetişkin uygunluğu zorunlu.
- Sahte reciprocity fixture'ı yerine sunucu beğeni/geç ve tekil karşılıklı eşleşme işlemi.
- Yalnızca izinli katılımcılar konuşmayı okuyabilsin/yazabilsin; engelleme anında yeni mesajı ve ilgili görünürlüğü durdursun.
- Mesaj cursor'ı, gönderiliyor/başarısız/yeniden dene; realtime aboneliği cleanup; oturum değişiminde önbellek temizliği.
- Kabul: aynı eşleşmeye paralel istek, tek taraflı beğeni, yetkisiz konuşma ID'si, engel sonrası gönderim, hesap değişimi testleri.

## G5 — Ana admin kontrollü gerçek Space

- Kaynak: `SupabaseLiveRoomRepository.ts`, `supabase/functions/livekit-token/index.ts`, mevcut Space migration'ları.
- Ana adminin UUID'si doğrulanmalı; isim veya user_metadata'dan rol üretme. `doc/admin-bootstrap.md` içindeki isimle rol verme yaklaşımını uygulama.
- LiveKit listener token'ı publish yetkisi olmadan; söz isteği → admin onayı → yetkili token/izin güncellemesi.
- Admin mikrofon kapatma, konuşmacıyı indirme, odadan çıkarma, başlık değiştirme ve sonlandırma sunucuda uygulanmalı.
- Token üretimi gerçek oturum/uygunluk/oda/ban/üyelik kontrolü yapsın. İstemcideki preview rolü üretim yetkisi değildir.
- Mikrofon yalnızca kullanıcı konuşmaya geçtiğinde istenmeli; ret/ayar/bağlantı kesilmesi senaryoları.
- Kabul: üye admin uçlarına erişemez; listener ses yayınlayamaz; engellenen/çıkarılan kişi eski token ile dönemez; biten oda yeni bağlantı/token kabul etmez. Cihaz/LiveKit doğrulaması yoksa raporla.

## Teslim biçimi

Her görev sonrası `docs/gemini-handoff.md` dosyasına şunları yaz:

1. Biten görev ID'si ve değişen dosyalar.
2. Export edilen bileşen/API sözleşmesi ve küçük entegrasyon örneği.
3. Çalıştırılan testlerin komutu ve gerçek sonucu; çalışmayan doğrulamaların engeli.
4. Migration sırası, veri koruma/geri dönüş yaklaşımı, gereken env isimleri (değer/secret yazma).
5. Açık riskler ve sonraki görev.

Minimum: `npm run typecheck`, `npm run test:community`, `node --import tsx --test scripts/community-access.test.ts` ve geliştirdiğin davranışa uygun DB/servis testleri. Başkasının dosyasındaki hatayı sessizce düzeltmek yerine handoff'a belirt.

`docs/` altında belge yazıyorsan Git ignore durumunu kontrol et. Hukuki kaynaklar veya handoff ignore ediliyorsa bunları kaybolacak bir teslim olarak bırakma; `doc/` altındaki takip edilebilir konumu kullan ve dosya yolunu handoff'ta bildir. Mevcut görselleri veya diğer çalışanın belgelerini taşımadan önce koordine et.

**Bu liste görev devridir; tamamlanma raporu değildir.** Gerçek backend/cihaz/release testleri olmadan “yayına hazır” yazma.
