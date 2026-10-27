# Ehlibyte

Atalay klasöründeki gerçek çalışma kopyası: `/Users/atalay/ehlibyte`.
Dal: `codex/ehlibyte-community-revision`.

**Devam etmeden önce [task.md](task.md) dosyasını oku.** Kullanıcının son hedefi App Store’a gönderilecek, gerçek backend’e bağlı eksiksiz sosyal platformdur. Mevcut kod bu hedefin devam eden tasarım/geliştirme aşamasıdır; üretime hazır değildir.

Gemini iş bölümü ve kabul ölçütleri: [GEMINI_TASKS.md](GEMINI_TASKS.md). Giriş arayüzünün entegrasyon durumu: [Codex handoff](doc/codex-access-handoff.md).

## Geçerli kapsam

Baştan tasarlanan onboarding, login/register/OTP; sosyal feed; eşleştirme ve karşılıklı mesajlaşma; topluluk ve etkinlikler; ana adminin yönettiği Space odası; profil/ayarlar; ATT, çerez, hizmet koşulları, gizlilik/KVKK, hesap silme ve veri talepleri.

Görsel yön: **Yakınındaki Meydan** — krem zemin, bordo vurgu, serif başlıklar ve sıcak editoryal fotoğraflar. Kullanıcı matching’in korunmasını sonradan açıkça istedi; eski plandaki kaldırma kararına dönme.

Uygulama ikonu kullanıcının seçtiği **3. siyah-beyaz semboldür**. iOS/genel ikon `assets/brand/ehlibyte-app-icon.png`, Android uyarlanabilir ikon `assets/brand/ehlibyte-adaptive-icon.png` üzerinden ayarlıdır. İkon değişikliği yeni native derlemede görünür; Expo Go ana ekran ikonu değişmez.

## Çalıştırma

```sh
cd /Users/atalay/ehlibyte
npm ci
npm run typecheck
npm run test:community
npx expo start --go --localhost --port 8082 --clear
```

**Kontrol iOS simülatöründe yapılacak; tarayıcı kullanılmayacak.** Xcode 27’de simülatör uygulaması Device Hub’dır. Port 8081’de başka proje çalışabilir; onu durdurma.

## Kod haritası

- `src/features/community/`: yeni mobil tasarım ve mevcut yerel etkileşimler.
- `src/app/`: yeni uygulama giriş noktası.
- `src/legacy-app/`: önceki ekranların korunmuş kaynakları; eski native servisleri yeni Router’a istemeden yüklememek için taşındı.
- `src/infrastructure/supabase/`, `supabase/`: yeniden bağlanacak mevcut backend ve migrations.
- `docs/design/`: native simülatör görüntüleri; her görüntü başarılı test kanıtı değildir.
- `task.md`: son durum, açıklar, simülatör hatası, gereken doğrulamalar ve ayrıntılı devam sırası.

Supabase projesi 27 Ekim 2026'da yeniden oluşturuldu: `aururygssrwkayawliup` (Frankfurt). CLI bu projeye bağlı; 66 mevcut migration uygulandı, 37 public tablonun tamamında RLS açık. Yerel bağlantı ayarları Git dışında tutulan `.env.local` içinde. Veritabanı parolası yalnızca `/Users/atalay/.config/ehlibyte/supabase.env` içinde; bu dosyayı mobil uygulamaya dahil etme.

Giriş akışı e-posta bağlantısı ve PKCE callback kullanır. G1 onboarding/erişim ve hukuki taslak migration'ları da uygulandı (toplam 68 migration). 18+ uygunluğu ve belge kabulü sunucudan okunur. Hukuki belgeler henüz yayımlanmadığından yeni üyelikler kapalıdır. SMS ve özel e-posta OTP, ilgili sağlayıcı kurulana kadar kapalıdır.

Yeni arayüzün diğer gerçek servislere bağlanması hâlâ devam ediyor. Edge Functions, Apple/Google sağlayıcıları ve üretim SMTP kurulumu henüz yapılmadı; release build veya App Store gönderimi yapılmadı. Mevcut örnek arayüz davranışları gerçek sunucu işlemlerinin yerine geçmez. Sonraki oturumda önce task.md, Git durumu ve en son test/QA sonuçlarını kontrol et.
