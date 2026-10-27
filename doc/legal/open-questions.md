# Hukuki belgeler — açık sorular ve yayın kapısı

Güncelleme: 27 Ekim 2026. Bu dosya hukuki danışmanlık değildir; metinlerin hukuki uygunluğu otomatik olarak garanti edilmez.

## Yayın durumu

`docs/legal/*.md` metinleri `20261027192357_community_legal_documents_seed.sql` ile **taslak** olarak (`published_at = null`, `is_current = false`) veritabanına yüklenir. `get_community_legal_documents()` dört türün tamamı yayınlanmadıkça `legal_documents_unpublished` hatası döner; istemci bu durumda kayıt akışını açmaz. Bu bilinçli bir kapıdır: aşağıdaki sorular kapanmadan belgeler "hazır" gibi sunulmaz.

Yayınlamak için (yalnızca service role / SQL Editor, canlıda sahibinin onayıyla):

```sql
select private.publish_legal_document('terms', '2026-10-27');
select private.publish_legal_document('privacy', '2026-10-27');
select private.publish_legal_document('kvkk', '2026-10-27');
select private.publish_legal_document('community_rules', '2026-10-27');
```

Metin değişirse **yeni sürüm** (yeni `version`) ile yeni migration üretilmeli; yayınlanmış bir sürümün gövdesi değiştirilmemeli (kabul kayıtları sürüme bağlıdır). `terms` veya `community_rules` için yeni sürüm yayınlanınca tüm kullanıcıların `termsAccepted` değeri `false` olur ve yeniden kabul gerekir.

## Doğrulanmış bilgiler

- Veri sorumlusu / hizmeti sunan kişi: **Atalay Özyıldırım**
- İletişim: **atalayozyildirim@gmail.com**

## Kapanması gereken sorular (uydurulmadı)

| # | Konu | Neden önemli | Etkilenen belge |
| --- | --- | --- | --- |
| 1 | Veri sorumlusunun tebligat adresi | KVKK aydınlatmasında kimlik bilgisiyle birlikte beklenir; başvuru kanalı netliği | kvkk, privacy, terms |
| 2 | Şirket/unvan, MERSİS/VKN (varsa) veya şahıs olarak mı sunulduğu | Sözleşme tarafı ve ticari kimlik | terms, kvkk |
| 3 | VERBİS kayıt yükümlülüğü durumu | Eşik/istisna değerlendirmesi | kvkk |
| 4 | Somut saklama süreleri (hesap, içerik, mesaj, moderasyon kaydı, kabul kaydı, giriş/IP logları) | Şu an genel ifade var; süre uydurulmadı | privacy, kvkk |
| 5 | Hesap silinince `legal_acceptances` ve moderasyon kayıtlarının saklanıp saklanmayacağı | Şu an şema `on delete cascade` ile siler; ispat yükü için saklama gerekebilir | privacy, backend |
| 6 | Supabase proje bölgesi ve diğer sağlayıcıların (SMS, LiveKit, RevenueCat) sunucu konumu | KVKK m.9 yurt dışı aktarım dayanağı (standart sözleşme + Kurul'a 5 iş günü içinde bildirim vb.) | kvkk, privacy |
| 7 | SMS sağlayıcısının adı (Supabase Auth Phone: Twilio/MessageBird/Vonage/…) | Aktarım alıcısı olarak adlandırılmalı | kvkk, privacy |
| 8 | AdMob / Google Mobile Ads, RevenueCat, Expo Push, Spotify, Gemini bot, konum eşleştirme yeni sürümde etkin mi | Gizlilik metni "takip yok" diyor; `app.config.js` hâlâ AdMob ve ATT eklentisi içeriyor. Etkinse metin + App Privacy etiketleri + ATT akışı güncellenmeli | privacy, kvkk |
| 9 | Kültürel kimlik/inanç beyanı için açık rıza metni ve rıza kayıt RPC'si | KVKK m.6 özel nitelikli veri; G4'te eşleştirme profilinde isteğe bağlı alan olarak kullanılacak | kvkk, G4 |
| 10 | 5651 sayılı Kanun kapsamında yer sağlayıcı sıfatı, trafik verisi saklama ve içerik kaldırma bildirim kanalı | Uygulanabilirlik ve süre değerlendirmesi | terms, privacy |
| 11 | Pazarlama iletileri gönderilecekse İYS kaydı ve ticari elektronik ileti onay metni | 6563 sayılı Kanun | ayrı onay metni |
| 12 | Ücretli özellikler açılacaksa mesafeli satış/ön bilgilendirme gerekliliği (Apple IAP kapsamında) | Tüketici mevzuatı | terms |
| 13 | Çerez/yerel saklama bilgilendirmesi (SecureStore, AsyncStorage, oturum token'ı) | Uygulamada web çerezi yok; yerel saklama ayrıca anlatılabilir | privacy |
| 14 | Mevcut (eski) kullanıcı verisi için geçiş bildirimi | Eski hesaplar yeni onboarding'e yönlendirilir; bilgilendirme metni | privacy |

## Kullanılan resmi kaynaklar

- KVKK aydınlatma yükümlülüğü: https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-
- Aydınlatma ile açık rızanın ayrılması: https://www.kvkk.gov.tr/Icerik/6765/AYDINLATMA-YUKUMLULUGUNUN-YERINE-GETIRILMESI-HAKKINDA-KAMUOYU-DUYURUSU
- 6698 sayılı Kanun (m.5, 6, 9, 10, 11, 13; 7499 sayılı Kanun ile değişen m.6 ve m.9 dahil)
- Apple ATT: https://developer.apple.com/documentation/apptrackingtransparency
- Apple veri kullanımı: https://developer.apple.com/app-store/user-privacy-and-data-use/
- App Store Review Guidelines 1.2 (kullanıcı içeriği: filtreleme, şikayet, engelleme, iletişim bilgisi)
