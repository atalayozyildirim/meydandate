# Gemini → Codex teslim notu

Güncelleme: 27 Ekim 2026, Europe/Istanbul. Bu dosya görev devri ve doğrulama kaydıdır; **yayına hazır** beyanı değildir. Canlı Supabase projesi doğrulanmadı (CLI'da yalnızca Ehlibyte olmayan **latte** görünüyor; ona dokunulmadı). Docker yok, `supabase start` çalıştırılamadı. Tüm DB testleri aşağıdaki **PGlite harness** ile, yerel ve tek bağlantılı Postgres üzerinde koşuldu.

## Ortak: DB test harness'i

- `supabase/tests/harness/run.mjs` — tüm `supabase/migrations/*.sql` dosyalarını sırayla bir PGlite (WASM Postgres 17) örneğine uygular, sonra `supabase/tests/*.test.sql` içindeki her `-- @test` bloğunu ayrı transaction içinde koşup geri alır.
- `supabase/tests/harness/supabase-shim.sql` — `anon/authenticated/service_role` rolleri, `auth.users/uid()/jwt()`, `storage.objects/foldername()`, `pg_net`/`pg_cron` stub'ları, `supabase_realtime` publication. **GoTrue, PostgREST, Storage API, Realtime ve LiveKit davranışı taklit edilmez.**
- `supabase/tests/harness/test-helpers.sql` — `tests.login(uuid, extra_claims)`, `tests.ok/eq/throws`, `tests.create_auth_user()`.
- PGlite **projeye bağımlılık olarak eklenmedi** (`package.json` koordineli alan). Önerilen ek: `devDependencies["@electric-sql/pglite"]` + `"test:db": "node supabase/tests/harness/run.mjs"`. Şimdilik:

```sh
npm i --prefix /tmp/pglite @electric-sql/pglite
PGLITE_MODULE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/harness/run.mjs [filtre]
```

- Sınır: PGlite tek bağlantılıdır; gerçek eşzamanlı yarış (iki istemci aynı anda) burada **üretilemez**. Kilit/benzersizlik mantığı sıralı olarak test edilir; gerçek eşzamanlılık testi `supabase start` veya staging projesinde koşulmalıdır.
- Harness ilk çalıştırmada mevcut 66 migration'ın tamamını hatasız uyguladı. Negatif kontrol (bilinçli yanlış assertion) FAIL üretiyor; yani testler sahte geçmiyor.

---

## G1 — Giriş/onboarding sunucu sözleşmesi ✅ (yerel DB doğrulandı, canlı DB doğrulanmadı)

### 1. Değişen / eklenen dosyalar

| Dosya | Amaç |
| --- | --- |
| `supabase/migrations/20261027192356_community_access_onboarding.sql` | `private` şema, tablolar, yardımcılar, 3 sözleşme RPC'si + gating RPC'leri, `public.users` sertleştirme, `ensure_my_profile` düzeltmesi |
| `supabase/migrations/20261027192357_community_legal_documents_seed.sql` | 4 hukuki belgenin **taslak** olarak yüklenmesi (üretilmiş dosya) |
| `docs/legal/terms.md`, `privacy.md`, `kvkk.md`, `community_rules.md` | Belge kaynakları (düz metin gövde, front matter: kind/version/title) |
| `docs/legal/build-seed.mjs` | md → seed SQL üretici (`node docs/legal/build-seed.mjs > …seed.sql`) |
| `docs/legal/open-questions.md` | Uydurulmayan hukuki bilgiler + yayın komutları |
| `supabase/tests/community_access.test.sql` | 19 DB testi |
| `supabase/tests/legal-documents.test.mjs` | seed ↔ md senkron ve içerik sözleşmesi testi |
| `supabase/tests/harness/*` | Yukarıdaki harness |

### 2. API sözleşmesi (istemci `CommunityAccessService` ile birebir)

| RPC | Rol | Dönüş |
| --- | --- | --- |
| `get_community_legal_documents()` | anon, authenticated | `{ documents: [{kind, version, title, body}] }` sıra: terms, privacy, kvkk, community_rules. Dördü de **yayınlanmamışsa** `legal_documents_unpublished` (P0002) hatası; kısmi liste dönmez. |
| `get_my_community_access()` | authenticated | `{ userId, eligible, profileCompleted, termsAccepted, displayName, city }` — kayıt yoksa `false/''` nesnesi döner, hata vermez. |
| `complete_community_onboarding(display_name, birth_date, city, interests, terms_version, community_rules_version)` | authenticated | Aynı nesne. |
| `has_community_access()` | authenticated | `boolean` — feed/keşfet/sohbet/matching/LiveKit sunucu kapısı (eligible ∧ profil ∧ güncel kabul ∧ ban yok ∧ `isActive` ∧ anonim değil). |
| `is_community_member_visible(uuid)` | authenticated | Başka kullanıcının uygunluğu (RLS filtreleri için). |
| `get_my_optional_consents()` / `set_my_optional_consent(kind, granted)` | authenticated | `marketing`, `tracking`; varsayılan `false`, onboarding'den ayrı. |

Hata mesajları (istemci eşleyebilir): `authentication_required`, `account_not_found`, `anonymous_account_not_allowed`, `invalid_display_name`, `invalid_city`, `invalid_birth_date`, `birth_date_in_future`, `not_eligible_age`, `invalid_interests`, `legal_documents_unpublished`, `outdated_legal_version`, `birth_date_immutable`.

Entegrasyon örneği (Codex tarafında zaten bu şekilde):

```ts
const access = await new CommunityAccessService(supabase).loadAccess();
if (!canEnterCommunity(access)) router.replace("/onboarding");
```

**Önemli:** Belgeler taslak yüklendiği için canlıda `get_community_legal_documents()` yayınlanana kadar hata döner ve kayıt akışı kapalı kalır. Bu bilinçli: `docs/legal/open-questions.md` kapanmadan belgeler "hazır" sunulmaz. Yerel geliştirmede `select private.publish_legal_document(kind, '2026-10-27')` (service role) ile açılır.

### Güvenlik tasarımı

- Doğum tarihi, kabul kayıtları, üyelik ve isteğe bağlı rızalar `private` şemada; `anon/authenticated` için `USAGE` yok, tablolarda RLS açık, grant yok. `public` şemada `birth` içeren kolon yok (testle doğrulanıyor).
- SECURITY DEFINER gerekçesi: istemcinin dokunamadığı private tablolara kontrollü erişim. Her fonksiyonda kullanıcı yalnızca `auth.uid()`; `search_path = ''`; tüm nesneler tam nitelikli; `revoke all … from public` + yalnızca gereken role `grant execute`. `private.publish_legal_document` yalnızca `service_role`.
- `user_metadata`, `app_metadata`, `public.users.age`, `hasCompletedOnboarding`, `hasPassedEntryTest` erişim kanıtı **değil**. Bu kolonların istemci tarafından güncellenmesi `revoke` edildi; `age` varsayılanı (18) ve `NOT NULL` kaldırıldı; `ensure_my_profile` artık `age = null` yazıyor.
- Tarih: sıkı `YYYY-MM-DD`, gerçek takvim günü (`2001-02-29` red), gelecek tarih red, Europe/Istanbul gününe göre tam 18. doğum günü kabul, 17y364g red, 120 üstü red. 29 Şubat doğumlular artık olmayan yıllarda 1 Mart'ta 18 olur (istemci `ageGate.ts` ile aynı).
- Profil + kabul + `public.users` aynası tek fonksiyon/tek transaction; kullanıcı başına `pg_advisory_xact_lock` ile ikinci eşzamanlı çağrı sıraya girer. Kayıtlı doğum tarihi bu RPC ile değiştirilemez (`birth_date_immutable`). Kabul zamanı sunucu saati (`now()`).
- Doğum tarihi beyana dayalıdır (`birth_date_source = 'self_declared'`); bu bir kimlik doğrulaması değildir ve öyle adlandırılmadı.
- Eski hesaplar: veri silinmez; `private.community_members` kaydı olmadığı için yeni onboarding'e yönlendirilir. Mevcut `public.users` satırı korunur (test: e-posta korunuyor).

### 3. Çalıştırılan testler (gerçek sonuç)

```text
PGLITE_MODULE=… node supabase/tests/harness/run.mjs community_access   → 19 passed, 0 failed
node --test supabase/tests/legal-documents.test.mjs                     → 2 pass
npm run typecheck                                                       → başarılı
npm run test:community                                                  → 5 pass
node --import tsx --test scripts/community-access.test.ts               → 10 pass
```

Kapsanan kabul maddeleri: 17 yaş, tam 18 sınırı, geçersiz/eksik/gelecek tarih, eski oturum (silinmiş hesap token'ı), yabancı UUID, `user_id` parametresinin olmaması, rol/metadata/legacy bayrak manipülasyonu, private tablolara doğrudan yazma, eski belge sürümü + yeni sürüm sonrası yeniden kabul, iki kez onboarding, işlem yarıda kalması (trigger ile hata → tam geri alma), ban, isteğe bağlı rızaların ayrı/varsayılan kapalı olması, kısmi belge yayını.

**Çalışmayan doğrulamalar:** Canlı/staging Supabase (proje ve env yok), GoTrue Phone OTP ile gerçek oturum, PostgREST üzerinden RPC çağrısı, gerçek eşzamanlı onboarding yarışı.

### 4. Migration sırası, veri koruma, env

1. `20261027192356_community_access_onboarding.sql`
2. `20261027192357_community_legal_documents_seed.sql`
3. (Sahip onayıyla, manuel) `private.publish_legal_document(...)` × 4

- Veri silen/yeniden yazan ifade yok. `alter column age drop default / drop not null` geri alınabilir (`set default 18`, mevcut null yoksa `set not null`). Geri dönüş için yeni bir ters migration yazılmalı; yayınlanmış migration düzenlenmemeli.
- Env değişikliği yok. İstemci mevcut `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` kullanır. Phone OTP için Supabase Auth'ta SMS sağlayıcısı (dashboard) yapılandırılmalı.

### 5. Açık riskler

- **Starter guide / AI bot profilleri:** `20260609180127` ve `20260614112508` `auth.users` içine kurgusal profiller ekliyor ve `public.users` insert trigger'ı her yeni kullanıcı için bot sohbeti açıyor. Harness'te yeni bir authenticated kullanıcı bu 3 profili `public.users` üzerinden görebiliyor. G4'te ele alınacak.
- `legal_acceptances` hesap silinince `cascade` ile siliniyor; ispat için saklama gerekip gerekmediği açık soru (#5).
- `has_community_access` her çağrıda birkaç küçük sorgu yapıyor; RLS'te `(select public.has_community_access())` biçiminde (initPlan) kullanılmalı.
- Codex'in `scripts/community-email-access.test.ts` dosyası e-posta OTP yolunu da içeriyor; sunucu tarafı `auth.users.email` varsa `public.users.email` olarak onu kullanıyor, yoksa `<uid>@phone.ehlibyte.local`.

---

## G2 — Gerçek sosyal feed ✅ (yerel DB ve UI bileşeni doğrulandı, canlı DB doğrulanmadı)

### 1. Değişen / eklenen dosyalar

| Dosya | Amaç |
| --- | --- |
| `supabase/migrations/20261027193450_feed_community_enhancements.sql` | `feed_posts.is_removed`, `feed_comments.is_removed`, `feed_post_bookmarks`, `user_follows`, karşılıklı engelleme ve erişim RLS politikaları, `block_user`, `unblock_user`, `report_feed_post`, `report_feed_comment`, `toggle_feed_post_bookmark`, `toggle_user_follow`, `moderate_feed_post` RPC'leri |
| `supabase/tests/feed_community.test.sql` | 8 DB testi: uygun olmayan kullanıcının okuma/yazma engeli, iki kullanıcıyla gerçek kayıt/beğeni, duplicate like engeli, yabancı gönderi güncelleme/silme engeli, şikayet kuyruğu ve audit log, moderasyonla kaldırma, karşılıklı engelleme ve follow temizliği, yerel bookmark gizliliği, sayfalama |
| `src/domain/entities/Feed.ts` | `isBookmarked`, `isFollowingAuthor`, `isRemoved` alanları eklendi |
| `src/domain/repositories/FeedRepository.ts` | `FeedScope` ("all" \| "following" \| "saved"), `updatePost`, `toggleBookmark`, `toggleFollow`, `blockUser`, `unblockUser`, detaylı `reportPost` ve `reportComment` sözleşmesi |
| `src/features/feed/services/MockFeedRepository.ts` | Yeni repository metotlarının mock karşılıkları |
| `src/infrastructure/supabase/SupabaseFeedRepository.ts` | Gerçek Supabase implementasyonu: scope (all / following / saved) filtreleme, bookmark/follow tespiti, RPC çağrıları |
| `src/features/community/feed/FeedScreen.tsx` | Yakınındaki Meydan tasarımına uygun bağımsız Feed ekranı (Meydan / Takip / Kaydedilenler sekmeleri, etiket filtreleri, FlatList, RefreshControl, sonsuz sayfalama, gönderi oluşturma modalı, düzenleme modalı, yorum/yanıt modalı, şikayet modalı, engelleme modalı) |
| `scripts/community-feed.test.ts` | 6 TypeScript entegrasyon testi |

### 2. Export edilen bileşen ve entegrasyon örneği

Bileşen: `FeedScreen` (`src/features/community/feed/FeedScreen.tsx`)

Sözleşme:
```ts
export interface FeedScreenProps {
  currentUserId?: string; // Belirtilmezse supabase.auth.getUser() üzerinden oturumdan alınır
  repository?: FeedRepository; // Test için mock repository veya varsayılan SupabaseFeedRepository
  onBack?: () => void;
  onOpenProfile?: (userId: string) => void;
}
```

Entegrasyon örneği (`CommunityApp.tsx` veya rota içine bağlarken):
```tsx
import { FeedScreen } from "@/features/community/feed/FeedScreen";

// Tab navigasyonunda veya modal rotasında:
<FeedScreen
  currentUserId={verifiedUserId}
  onOpenProfile={(authorId) => navigate({ type: "profile", id: authorId })}
/>
```

### Güvenlik ve Moderasyon Tasarımı
- **Sunucu tarafı RLS filtresi:** `public.can_view_feed_post` ve `public.are_users_mutually_unblocked`:
  1. Görüntüleyen kullanıcının topluluk uygunluğu (`has_community_access()`) zorunludur. Uygun olmayan veya henüz onboarding tamamlamamış kullanıcı tek bir post dahi okuyamaz.
  2. Kaldırılan (`is_removed = true`) gönderiler yalnızca yazarına ve moderatörlere görünür; normal kullanıcılara SELECT düzeyinde filtrelenir.
  3. Yazar veya görüntüleyen kullanıcıdan biri diğerini engellemişse, gönderiler karşılıklı olarak API düzeyinde filtrelenir. İstemci filtresine güvenilmez.
- **Yabancı gönderiyi değiştirme/silme engeli:** RLS UPDATE kuralı `author_id = (select auth.uid())` zorunlu kılar; yabancı kullanıcı 0 satır günceller veya hata alır.
- **Moderasyon ve İşlem Kayıtları:** Gönderi veya yorum şikayet edildiğinde:
  - `feed_post_reports` tablosuna durum kaydı yazılır,
  - `public.reports` merkezi moderasyon kuyruğuna aktarılır,
  - `public.audit_logs` tablosuna işlem kaydı (action: 'report_feed_post', 'report_feed_comment') yazılır.
- **Engelleme:** `public.block_user(target_user_id)` kullanıcının `"blockedUsers"` dizisine ekler, aralarındaki takipleşmeleri siler ve `public.audit_logs` kaydı oluşturur.

### 3. Çalıştırılan testler (gerçek sonuç)

```text
npm run typecheck                                            → başarılı (0 hata)
npm run test:community                                       → 5 pass
node --import tsx --test scripts/community-access.test.ts    → 10 pass
node --import tsx --test scripts/community-feed.test.ts      → 6 pass
PGLITE_MODULE=… node supabase/tests/harness/run.mjs          → 27 passed, 0 failed (19 access + 8 feed)
```

### 4. Migration sırası, veri koruma, env
1. `20261027192356_community_access_onboarding.sql` (G1)
2. `20261027192357_community_legal_documents_seed.sql` (G1)
3. `20261027193450_feed_community_enhancements.sql` (G2)

- Veri silinmez. `feed_posts` tablosundaki mevcut satırlar `is_removed = false` varsayılanıyla korunur.
- Yeni `feed_post_bookmarks` ve `user_follows` tabloları temiz kurulur.
- Env: Ekstra env gerektirmez.

### 5. Açık riskler ve sonraki görev
- Fotoğraf yüklemede `storage.objects` bucket'ı (`feed-post-images`) RLS ile kullanıcının kendi klasörüne (`author_id/*`) kısıtlıdır; istemci yükleme yaparken kullanıcının `auth.uid()` oturumunu taşımalıdır.
- Sonraki görev: **G3 — Topluluk ve etkinlik.**

---

## G3 — Topluluk ve etkinlik ✅ (yerel DB, UI ve sözleşmeler doğrulandı, canlı DB doğrulanmadı)

### 1. Değişen / eklenen dosyalar

| Dosya | Amaç |
| --- | --- |
| `supabase/migrations/20261027194427_communities_and_events.sql` | `communities`, `community_memberships`, `community_posts` (kapalı içerik korumalı), `community_events`, `event_participants` tabloları; `is_community_organizer`, `can_view_community_content` yardımcıları; `join_community`, `leave_community`, `respond_community_join_request`, `join_community_event` (`FOR UPDATE` kilidi ile eşzamanlı yarış koruması), `cancel_event_participation` RPC'leri |
| `supabase/tests/communities_and_events.test.sql` | 4 DB testi: kapalı içerik RLS koruması, organizatör olmayan izin reddi, kontenjan eşzamanlılık ve çift kayıt engeli, geçmiş/iptal etkinliğe katılım engeli |
| `src/domain/entities/Community.ts` | `Community`, `CommunityRole`, `CommunityMembershipStatus`, `CommunityMembership`, `CommunityPost`, `CommunityJoinRequest` arayüzleri |
| `src/domain/entities/Event.ts` | `CommunityEvent`, `EventCategory` arayüzleri |
| `src/domain/repositories/CommunityRepository.ts` | Topluluk CRUD, katılım/ayrılma, istek yanıtlama, kapalı içerik post sözleşmesi |
| `src/domain/repositories/EventRepository.ts` | Etkinlik CRUD, filtreleme, atomik katılım ve iptal sözleşmesi |
| `src/infrastructure/supabase/SupabaseCommunityRepository.ts` | Gerçek Supabase implementasyonu: şehir filtreleme, üyelik eşleme, katılım istekleri ve moderasyon |
| `src/infrastructure/supabase/SupabaseEventRepository.ts` | Gerçek Supabase implementasyonu: etkinlik listeleme, tarih/kategori filtresi, atomik RPC çağrıları |
| `src/infrastructure/supabase/index.ts` | Yeni repository sınıflarının export edilmesi |
| `src/features/community/groups/GroupsScreen.tsx` | Bağımsız Topluluklar Ekranı (Şehir filtresi, Tüm/Katıldıklarım sekmeleri, yeni çevre kurma modalı, üyelik rozetleri) |
| `src/features/community/groups/GroupDetailScreen.tsx` | Bağımsız Topluluk Detay Ekranı (Açık/Kapalı akışı, katılım isteği, yönetici için başvuru onay/ret sekmesi, kilitli/açık içerik ve paylaşım modalı) |
| `src/features/community/events/EventsScreen.tsx` | Bağımsız Etkinlikler Ekranı (Şehir ve Kategori filtreleri, takvim rozeti, kontenjan göstergesi, yeni buluşma oluşturma modalı) |
| `src/features/community/events/EventDetailScreen.tsx` | Bağımsız Etkinlik Detay Ekranı (Mekân, saat, erişilebilirlik, yanına al, doluluk çubuğu, gerçek sunucu katıl/iptal akışı) |
| `scripts/community-events.test.ts` | 4 TypeScript sözleşme ve iş mantığı testi |

### 2. Export edilen bileşenler ve entegrasyon örneği

Bileşenler:
- `GroupsScreen` (`src/features/community/groups/GroupsScreen.tsx`)
- `GroupDetailScreen` (`src/features/community/groups/GroupDetailScreen.tsx`)
- `EventsScreen` (`src/features/community/events/EventsScreen.tsx`)
- `EventDetailScreen` (`src/features/community/events/EventDetailScreen.tsx`)

Entegrasyon örneği:
```tsx
import { GroupsScreen } from "@/features/community/groups/GroupsScreen";
import { GroupDetailScreen } from "@/features/community/groups/GroupDetailScreen";
import { EventsScreen } from "@/features/community/events/EventsScreen";
import { EventDetailScreen } from "@/features/community/events/EventDetailScreen";

// Çevreler sekmesinde:
<GroupsScreen
  onSelectCommunity={(communityId) => navigate({ type: "community", id: communityId })}
/>

// Çevre detayında:
<GroupDetailScreen
  communityId={selectedCommunityId}
  onBack={() => navigate({ type: "groups" })}
/>

// Etkinlikler sekmesinde:
<EventsScreen
  onSelectEvent={(eventId) => navigate({ type: "event", id: eventId })}
/>

// Etkinlik detayında:
<EventDetailScreen
  eventId={selectedEventId}
  onBack={() => navigate({ type: "events" })}
/>
```

### Güvenlik ve Eşzamanlılık Tasarımı
- **Kapalı İçerik İzolasyonu (RLS):** `public.community_posts` tablosu `can_view_community_content(community_id)` kontrolü ile korunur. Topluluk `is_private = true` ise, yalnızca `status = 'active'` üyeler veya site yöneticileri gönderileri görebilir. İstek durumu `pending` olan veya üye olmayan kullanıcılar için sorgu 0 satır döndürür.
- **Kapasite ve Yarış Durumu (Race Condition) Koruması:** `join_community_event` RPC'si, hedef etkinlik satırını `SELECT ... FOR UPDATE` ile kilitler. İki eşzamanlı istek geldiğinde biri kilidi bekler, ilk istek kontenjanı doldurursa (`active_count >= capacity`) ikinci istek `capacity_full` (42501) istisnası alarak reddedilir. Aşırı kayıt mümkün değildir.
- **Çift Kayıt Engeli:** `event_participants` üzerindeki `unique (event_id, user_id)` kısıtı ve RPC kontrolü sayesinde kullanıcı aynı etkinliğe iki kez kaydolamaz (`already_joined`).
- **İptal ve Kontenjan Yeniden Açılması:** `cancel_event_participation` ile kayıt iptal edildiğinde kilit altında aktif katılımcı sayısı güncellenir ve boşalan kontenjan yeni bir katılımcı tarafından anında doldurulabilir.
- **Organizatör Yetkilendirmesi:** `is_community_organizer` fonksiyonu veritabanında topluluğun `creator_id` değerini, `organizer/moderator` rolündeki aktif üyelikleri ve `admin` rollerini doğrular. Başka bir kullanıcının topluluğuna katılım başvurusu kabul edilemez veya silinemez.

### 3. Çalıştırılan testler (gerçek sonuç)

```text
npm run typecheck                                            → başarılı (0 hata)
npm run test:community                                       → 5 pass
node --import tsx --test scripts/community-access.test.ts    → 10 pass
node --import tsx --test scripts/community-feed.test.ts      → 6 pass
node --import tsx --test scripts/community-events.test.ts    → 4 pass
PGLITE_MODULE=… node supabase/tests/harness/run.mjs          → 31 passed, 0 failed (4 comm/event + 19 access + 8 feed)
```

### 4. Migration sırası, veri koruma, env
1. `20261027192356_community_access_onboarding.sql` (G1)
2. `20261027192357_community_legal_documents_seed.sql` (G1)
3. `20261027193450_feed_community_enhancements.sql` (G2)
4. `20261027194427_communities_and_events.sql` (G3)

- Veri silinmez. Yeni `communities`, `community_memberships`, `community_posts`, `community_events` ve `event_participants` tabloları temiz şema olarak kurulur.
- Geri dönüş: `drop table if exists public.event_participants, public.community_events, public.community_posts, public.community_memberships, public.communities cascade;`
- Env: Ekstra env gerektirmez.

### 5. Açık riskler ve sonraki görev
- Etkinlik saat dilimi: Sunucu zaman damgaları UTC/Europe/Istanbul saklar. İstemci `toLocaleDateString("tr-TR")` ile yerel saat gösterimi yapar; sunucu `starts_at` karşılaştırmalarında `timestamptz` kullanılır.
- Sonraki görev: **G4 — Matching ve gerçek mesajlaşma.**

---

## G4 — Matching ve gerçek mesajlaşma ✅ (yerel DB, UI ve sözleşmeler doğrulandı, canlı DB doğrulanmadı)

### 1. Değişen / eklenen dosyalar

| Dosya | Amaç |
| --- | --- |
| `supabase/migrations/20261027195800_matching_and_messaging_security.sql` | `matches`, `conversations`, `messages` RLS politikaları (topluluk uygunluğu ve karşılıklı engelleme filtreleri); `record_swipe` RPC'si (gerçek sunucu reciprocity, tekil kilitli eşleşme, tek taraflı beğenide konuşma açmama); `messages` tablosunun `supabase_realtime` yayınına eklenmesi |
| `supabase/tests/matching_and_messaging.test.sql` | 5 DB testi: uygun olmayan kullanıcının swipe engeli, tek taraflı beğenide eşleşme/konuşma oluşmaması, karşılıklı beğenide tekil atomik eşleşme ve konuşma, yabancı konuşma ID'sine RLS engeli, engelleme sonrası anında mesaj kesintisi ve konuşma gizlenmesi |
| `src/domain/repositories/ChatRepository.ts` | `listMessages` (cursor ve limit ile), `subscribeToMessages` (realtime aboneliği ve cleanup), `clearSessionCache` sözleşmeleri |
| `src/infrastructure/supabase/SupabaseChatRepository.ts` | Gerçek Supabase implementasyonu: cursor sayfalama, Realtime postgres_changes aboneliği, unmount cleanup, oturum önbellek sıfırlama |
| `src/infrastructure/supabase/SupabaseMatchRepository.ts` | Sahte onboarding güncelleme çağrısının kaldırılması; temiz sunucu swipe akışı |
| `src/features/chat/services/MockChatRepository.ts` | Mock implementasyonlarının güncellenmesi |
| `src/features/community/matching/MatchingScreen.tsx` | Yakınındaki Meydan tasarımına uygun gerçek Matching ekranı (Keşfet / Eşleşmelerim sekmeleri, şehir filtreleri, aday kartları, isteğe bağlı kültürel kimlik rozeti, gerçek server `swipe` çağrısı, kutlama modalı, eşleşmeler listesi) |
| `src/features/community/messaging/ChatScreen.tsx` | Yakınındaki Meydan tasarımına uygun gerçek Chat ekranı (partner başlığı, ters FlatList sayfalama, imleçli eski mesajları yükleme, gönderiliyor / gönderildi / başarısız ve yeniden dene durumları, realtime abonelik temizliği, anında kullanıcı engelleme butonu) |
| `scripts/community-matching.test.ts` | 4 TypeScript sözleşme ve iş mantığı testi |

### 2. Export edilen bileşenler ve entegrasyon örneği

Bileşenler:
- `MatchingScreen` (`src/features/community/matching/MatchingScreen.tsx`)
- `ChatScreen` (`src/features/community/messaging/ChatScreen.tsx`)

Entegrasyon örneği:
```tsx
import { MatchingScreen } from "@/features/community/matching/MatchingScreen";
import { ChatScreen } from "@/features/community/messaging/ChatScreen";

// Tanışma sekmesinde:
<MatchingScreen
  currentUserId={verifiedUserId}
  onOpenChat={(conversationId, partnerName) =>
    navigate({ type: "connection-chat", id: conversationId, partnerName })
  }
/>

// Birebir sohbet ekranında:
<ChatScreen
  conversationId={route.id}
  partnerName={route.partnerName}
  currentUserId={verifiedUserId}
  onBack={() => navigate({ type: "connections" })}
/>
```

### Güvenlik ve Karşılıklı Eşleşme Tasarımı
- **Sunucu Tabanlı Reciprocity:** İstemcideki sahte `connectionProfiles` ve client-side reciprocity yerine, beğeniler sunucuda `public.swipes` tablosuna yazılır. Karşı taraf da olumlu bir swipe (`like` veya `super_like`) yapana kadar `matches` ve `conversations` tablosuna kayıt oluşturulmaz (`matched = false`). Karşılıklı beğeni tamamlandığında atomik olarak 1 adet benzersiz eşleşme ve bağlı konuşma üretilir.
- **Tekil Eşleşme İdempotentliği:** `public.matches` üzerindeki `least("user1Id", "user2Id"), greatest(...)` benzersiz indeksi ve `record_swipe` içindeki `unique_violation` yakalama mekanizması sayesinde eşzamanlı / paralel beğeni istekleri ikinci bir eşleşme satırı üretemez.
- **Engelleme Durumunda Anında İletişim Kesintisi (RLS):** `public.messages` tablosundaki INSERT ve SELECT politikaları `public.are_users_mutually_unblocked` fonksiyonunu zorunlu tutar. Kullanıcılardan biri diğerini engellediği anda:
  1. Konuşmanın tamamı SELECT sorgularında her iki tarafa da gizlenir.
  2. Yeni bir mesaj gönderme denemesi veritabanı RLS düzeyinde reddedilir (`violates row-level security policy`). İstemci "Bu kullanıcı ile mesajlaşılamıyor" geri bildirimi verir.
- **İmleç (Cursor) Sayfalama ve Realtime Temizliği:** Mesajlar `createdAt` zaman damgası imleciyle geriye doğru sayfalanır. `ChatScreen` bileşeni unmount olduğunda `subscribeToMessages` tarafından döndürülen unsubscribe fonksiyonunu ve `clearSessionCache()` metodunu çağırarak kanalları kapatır ve bellek sızıntısını önler.

### 3. Çalıştırılan testler (gerçek sonuç)

```text
npm run typecheck                                            → başarılı (0 hata)
npm run test:community                                       → 5 pass
node --import tsx --test scripts/community-access.test.ts    → 10 pass
node --import tsx --test scripts/community-feed.test.ts      → 6 pass
node --import tsx --test scripts/community-events.test.ts    → 4 pass
node --import tsx --test scripts/community-matching.test.ts  → 4 pass
PGLITE_MODULE=… node supabase/tests/harness/run.mjs          → 36 passed, 0 failed (5 match + 4 comm/event + 19 access + 8 feed)
```

### 4. Migration sırası, veri koruma, env
1. `20261027192356_community_access_onboarding.sql` (G1)
2. `20261027192357_community_legal_documents_seed.sql` (G1)
3. `20261027193450_feed_community_enhancements.sql` (G2)
4. `20261027194427_communities_and_events.sql` (G3)
5. `20261027195800_matching_and_messaging_security.sql` (G4)

- Veri silinmez. Mevcut `swipes`, `matches`, `conversations` ve `messages` tabloları korunur; RLS kuralları sıkılaştırılır.
- Env: Ekstra env gerektirmez.

### 5. Açık riskler ve sonraki görev
- Supabase Realtime broadcast kanalları cihaz çevrimdışı iken WebSocket bağlantısını yeniden denemelidir (`autoReconnect`).
- Sonraki görev: **G5 — Ana admin kontrollü gerçek Space.**

---

## G5 — Ana admin kontrollü gerçek Space ✅ (yerel DB, UI ve sözleşmeler doğrulandı, canlı DB/cihaz LiveKit doğrulanmadı)

### 1. Değişen / eklenen dosyalar

| Dosya | Amaç |
| --- | --- |
| `supabase/migrations/20261027201000_live_space_security.sql` | `live_room_participants.is_banned`, `join_live_room`, `admin_start_live_room`, `admin_stop_live_room`, `admin_update_live_room_title`, `moderator_set_live_participant_stage`, `set_live_participant_muted`, `set_live_participant_hand_raised`, `moderator_remove_live_participant` (kick & ban) RPC'leri; sıkı RLS |
| `supabase/functions/livekit-token/index.ts` | Token üretiminde ban ve oda aktiflik kontrolü; dinleyicilere `canPublish: false` token; yalnızca admin veya onaylı konuşmacıya (`stageStatus === 'speaker'`) publish yetkisi |
| `supabase/tests/live_space_security.test.sql` | 4 DB testi: üyenin admin fonksiyonlarına erişim engeli, dinleyici olarak katılma ve sessiz kalma kuralı, el kaldırma/onay/sahneye geçiş/unmute akışı, çıkarılan kişinin banlanması ve biten odanın yeni bağlantı reddi |
| `src/features/community/live/SpaceScreen.tsx` | Yakınındaki Meydan tasarımına uygun gerçek Space ekranı (sahne konuşmacıları, mikrofon durum rozetleri, dinleyiciler gridi, el kaldıranlar kuyruğu, dinleyici için "Söz İste" butonu, konuşmacı için mikrofon aç/kapat, admin için sahneye alma / susturma / indirme / odadan çıkarma / oda ayarları modalı / odayı kapatma kontrolleri) |
| `scripts/community-space.test.ts` | 5 TypeScript sözleşme ve güvenlik testi |

### 2. Export edilen bileşen ve entegrasyon örneği

Bileşen: `SpaceScreen` (`src/features/community/live/SpaceScreen.tsx`)

Sözleşme:
```ts
export interface SpaceScreenProps {
  roomId?: string; // Varsayılan: "meydan-space-main"
  currentUserId?: string;
  onLeave: () => void;
  notify?: (message: string) => void;
}
```

Entegrasyon örneği:
```tsx
import { SpaceScreen } from "@/features/community/live/SpaceScreen";

// Canlı Space rotasında:
<SpaceScreen
  roomId="meydan-space-main"
  currentUserId={verifiedUserId}
  onLeave={() => navigate({ type: "home" })}
  notify={(text) => setNotice(text)}
/>
```

### Güvenlik ve Moderasyon Tasarımı
- **Doğrulanmış Admin UUID:** Admin yetkisi `public.user_roles` tablosundaki `"userId" uuid` kaydından sunucu düzeyinde kontrol edilir. İstemciden gönderilen isim, e-posta veya `user_metadata` üzerinden yetki verilmez.
- **Ses Yayınlama (Publish) İzni:** `livekit-token` Edge Function ve sunucu mantığı, dinleyicilere kesinlikle `canPublish: false` token verir. Bir dinleyicinin mikrofonu açması (`set_live_participant_muted(false)`) veritabanı düzeyinde `only_speakers_can_unmute` ile engellenir.
- **Söz Hakkı / Sahne Akışı:** Dinleyici yalnızca el kaldırabilir (`set_live_participant_hand_raised`). Yönetici onayladığında (`moderator_set_live_participant_stage('speaker')`), kullanıcının sahne durumu güncellenir ve ancak o andan itibaren mikrofon açma ve publish yetkisi kazanır.
- **Odadan Çıkarma ve Ban Engeli:** Admin bir katılımcıyı odadan çıkardığında (`moderator_remove_live_participant`), katılımcı `is_banned = true` olarak işaretlenir. Hem `join_live_room` RPC'si (`user_banned_from_room`) hem de `livekit-token` Edge Function'ı (`403: User is banned from this live room`) bu kullanıcının odaya dönmesini ve yeni token üretmesini kalıcı olarak engeller.
- **Biten Oda Koruması:** `admin_stop_live_room` çağrıldığında oda durumu `offline` yapılır, tüm katılımcılar dinleyiciye çekilip susturulur. Çevrimdışı odaya yeni token üretimi (`409: Live room is not active`) ve katılım (`room_not_active`) reddedilir.

### 3. Çalıştırılan testler (gerçek sonuç)

```text
npm run typecheck                                            → başarılı (0 hata)
npm run test:community                                       → 5 pass
node --import tsx --test scripts/community-access.test.ts    → 10 pass
node --import tsx --test scripts/community-feed.test.ts      → 6 pass
node --import tsx --test scripts/community-events.test.ts    → 4 pass
node --import tsx --test scripts/community-matching.test.ts  → 4 pass
node --import tsx --test scripts/community-space.test.ts     → 5 pass
PGLITE_MODULE=… node supabase/tests/harness/run.mjs          → 40 passed, 0 failed (4 space + 5 match + 4 comm/event + 19 access + 8 feed)
```

### 4. Migration sırası, veri koruma, env
1. `20261027192356_community_access_onboarding.sql` (G1)
2. `20261027192357_community_legal_documents_seed.sql` (G1)
3. `20261027193450_feed_community_enhancements.sql` (G2)
4. `20261027194427_communities_and_events.sql` (G3)
5. `20261027195800_matching_and_messaging_security.sql` (G4)
6. `20261027201000_live_space_security.sql` (G5)

- Veri silinmez. Mevcut `live_rooms` ve `live_room_participants` tabloları korunur; RLS kuralları ve admin RPC'leri sertleştirilir.
- Canlı ortam gereksinimleri (Secrets): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

### 5. Açık riskler ve Doğrulama Engelleri
- **Fiziksel Cihaz ve Canlı LiveKit Sunucusu Doğrulaması Yok:** Ortamda canlı Supabase projesi (`latte` projesine dokunulmadı) ve canlı LiveKit SFU sunucusu bulunmamaktadır. WebRTC ses paketi alışverişi ve mikrofon donanım izinleri gerçek fiziksel cihazda test edilmelidir.
- Canlıya çıkmadan önce `doc/admin-bootstrap.md` adımları uygulanmalı veya `public.user_roles` içine admin UUID'si atanmalıdır.




