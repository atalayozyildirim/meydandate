# Google ve Apple Login Kurulumu

Son kontrol: 2026-06-08

## Durum

Kod tarafında OAuth akışı bağlandı:

- `expo-web-browser` eklendi.
- Supabase client `flowType: "pkce"` kullanıyor.
- `Google` ve `Apple` butonları `openAuthSessionAsync()` ile provider ekranını açıyor.
- Callback URL içindeki `code`, `supabase.auth.exchangeCodeForSession(code)` ile session'a çevriliyor.
- Access/refresh token mevcut secure storage akışına yazılıyor.
- Social login ile gelen kullanıcı için `public.users` profil satırı yoksa otomatik oluşturuluyor.
- `src/app/auth/callback.tsx` fallback callback ekranı eklendi.
- OAuth hata mesajları `redirect_uri_mismatch`, kapalı provider ve hatalı client id gibi
  dashboard kurulum hatalarını anlaşılır aksiyonlara çeviriyor.

Dashboard/provider tarafı tamamlanmadan prod'da çalışmaz.

## Firebase Native Dosya Durumu

Google iOS Firebase config dosyası projeye eklendi:

```text
ios/Ehlibyte/GoogleService-Info.plist
```

Yerel iOS ayarları:

- `GoogleService-Info.plist` Xcode resource bundle'a eklendi.
- `app.json` içine `ios.googleServicesFile` eklendi.
- Google `REVERSED_CLIENT_ID` iOS URL scheme olarak eklendi.
- `ios.usesAppleSignIn` ve Apple Sign In entitlement/capability açıldı.
- Dosyadaki `BUNDLE_ID`, uygulamanın `com.ehlibyte.app` bundle identifier'ı ile uyumlu.

Android tarafı henüz tamam değil; Firebase Console'da Android app için `com.ehlibyte.app`
package name ile `google-services.json` indirilmeli. Android native klasörü oluşturulduktan sonra
dosya `android/app/google-services.json` konumuna eklenmeli ve `app.json` içinde
`android.googleServicesFile` tanımlanmalı.

Not: Bu projede çalışan sosyal giriş kodu şu anda Supabase Auth OAuth akışıdır. Firebase
Console'da Google/Apple provider açmak native Firebase config'i hazırlar, ancak uygulamanın
oturumlarını Firebase Auth'a taşımaz. Firebase Auth'a tam geçiş istenirse `AuthRepository`,
session saklama ve Supabase RLS/JWT stratejisi ayrıca yeniden tasarlanmalı.

## Uygulama Kimlikleri

```text
iOS bundleIdentifier: com.ehlibyte.app
Android package: com.ehlibyte.app
Custom scheme: ehlibyte
Callback URL: ehlibyte://auth/callback
Supabase project callback: https://ymrzddxgxdswibtypuwr.supabase.co/auth/v1/callback
```

## Supabase Ayarları

Supabase Dashboard > Authentication > URL Configuration:

- Site URL: production web siten varsa onu gir. Yoksa geçici olarak app landing URL'i kullan.
- Additional Redirect URLs:

```text
ehlibyte://auth/callback
```

Supabase Dashboard > Authentication > Providers:

- Google provider enabled olmalı.
- Apple provider enabled olmalı.

## Google Cloud Ayarları

Google Cloud Console > APIs & Services > Credentials:

- OAuth consent screen ayarla.
- Web OAuth Client oluştur.
- Authorized redirect URI olarak şunu ekle:

```text
https://ymrzddxgxdswibtypuwr.supabase.co/auth/v1/callback
```

Bu Web Client ID/Secret değerlerini Supabase Google provider içine gir.

Not: Supabase OAuth redirect kullandığımız için ilk aşamada native Google Sign-In SHA ayarı şart değil. Native Google Sign-In'e geçilirse Android SHA-1/SHA-256 ayrıca gerekir.

## Apple Developer Ayarları

Apple Developer:

- App ID için Sign in with Apple capability aç.
- Services ID oluştur.
- Services ID return URL olarak şunu ekle:

```text
https://ymrzddxgxdswibtypuwr.supabase.co/auth/v1/callback
```

Supabase Apple provider içine şunlar girilmeli:

- Team ID
- Key ID
- Services ID
- Sign in with Apple private key

App Store kuralı: Google login varsa iOS'ta Apple login de çalışmalı.

## Test Planı

1. Supabase redirect URL'leri gir.
2. Google provider client ID/secret gir.
3. Apple provider bilgilerini gir.
4. `npm run typecheck` çalıştır.
5. `npx expo config --type public` ile scheme ve bundle/package değerlerini kontrol et.
6. iOS gerçek cihaz veya TestFlight build'de Google login dene.
7. iOS gerçek cihaz veya TestFlight build'de Apple login dene.
8. Android internal testing build'de Google login dene.
9. İlk social login sonrası kullanıcının onboarding'e düştüğünü kontrol et.
10. `public.users` içinde aynı auth user id ile profil satırı oluştuğunu kontrol et.
11. App'i kapat/aç; session restore çalışmalı.

## Beklenen Hatalar

### `redirect_uri_mismatch`

Google Cloud veya Apple Developer return URL'i yanlış/eksik.

### Provider ekranı açılıyor ama app'e dönmüyor

Supabase Additional Redirect URLs içinde `ehlibyte://auth/callback` eksik olabilir.

### App'e dönüyor ama session oluşmuyor

Callback URL'de `code` yoktur veya PKCE code verifier aynı app instance içinde bulunamamıştır. Akışı baştan başlat.

### Session oluşuyor ama profil yok

`public.users` insert RLS/grant sorunu vardır. Social login sonrası profil otomatik oluşturulmalı.

## Referans

- Supabase Expo social auth: https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
- Supabase `exchangeCodeForSession`: https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
- Supabase PKCE flow: https://supabase.com/docs/guides/auth/sessions/pkce-flow
