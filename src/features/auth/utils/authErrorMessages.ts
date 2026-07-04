import type { SocialAuthProvider } from "@/domain/repositories/AuthRepository";
import { env } from "@/infrastructure/config/env";
import { appAuthRedirectUrl, supabaseRedirectUrlPattern } from "./oauthRedirect";

const providerLabels: Record<SocialAuthProvider, string> = {
  apple: "Apple",
  google: "Google",
};

const getProviderLabel = (provider?: SocialAuthProvider) =>
  provider ? providerLabels[provider] : "Sosyal";

const getSupabaseCallbackUrl = () =>
  env.supabaseUrl ? `${env.supabaseUrl}/auth/v1/callback` : "<SUPABASE_URL>/auth/v1/callback";

const getMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Giriş tamamlanamadı. Tekrar deneyin.";

const hasAny = (message: string, fragments: string[]) => {
  const normalized = message.toLocaleLowerCase("tr-TR");

  return fragments.some((fragment) => normalized.includes(fragment.toLocaleLowerCase("tr-TR")));
};

export const formatAuthErrorMessage = (
  error: unknown,
  provider?: SocialAuthProvider,
) => {
  const message = getMessage(error);
  const providerLabel = getProviderLabel(provider);

  if (hasAny(message, ["redirect_uri_mismatch", "redirect uri mismatch"])) {
    return [
      `${providerLabel} giriş ayarında redirect URL eksik veya yanlış.`,
      `Google Cloud tarafında Web OAuth Client > Authorized redirect URIs alanına şunu ekle: ${getSupabaseCallbackUrl()}`,
      `Supabase > Authentication > URL Configuration > Additional Redirect URLs alanında şu da olmalı: ${appAuthRedirectUrl} veya ${supabaseRedirectUrlPattern}`,
    ].join("\n\n");
  }

  if (
    hasAny(message, [
      "provider is not enabled",
      "unsupported provider",
      "provider not enabled",
      "external provider",
    ])
  ) {
    return `${providerLabel} provider Supabase tarafında kapalı görünüyor. Supabase > Authentication > Providers ekranından ${providerLabel} provider'ını etkinleştir.`;
  }

  if (
    provider === "apple" &&
    hasAny(message, [
      "invalid client id or web redirect",
      "invalid_request",
      "web redirect",
      "invalid aud",
      "audience",
    ])
  ) {
    return [
      "Apple giriş ayarı Supabase tarafında eksik.",
      "Supabase > Authentication > Providers > Apple > Client IDs alanına com.ehlibyte.app ekle.",
      `URL Configuration > Additional Redirect URLs içinde ${appAuthRedirectUrl} veya ${supabaseRedirectUrlPattern} olmalı.`,
      "Bunları kaydettikten sonra uygulamayı kapatıp tekrar aç.",
    ].join("\n\n");
  }

  if (hasAny(message, ["invalid client", "invalid_client", "unauthorized_client"])) {
    return `${providerLabel} OAuth client bilgileri hatalı görünüyor. Supabase provider ekranına Web OAuth Client ID ve Client Secret girilmeli; Firebase Web SDK apiKey/appId değerleri burada kullanılmaz.`;
  }

  if (
    hasAny(message, [
      "60200",
      "error sending confirmation otp",
      "invalid parameter",
    ])
  ) {
    return "Telefon numarası SMS sağlayıcısı tarafından kabul edilmedi. Numarayı ülke koduyla ve eksiksiz gir: örn. +90 5XX XXX XX XX.";
  }

  if (hasAny(message, ["token has expired", "invalid otp", "otp expired"])) {
    return "Doğrulama kodu geçersiz veya süresi dolmuş. En son gönderilen 6 haneli kodu kullan ya da yeni kod iste.";
  }

  if (hasAny(message, ["refresh token not found", "invalid refresh token"])) {
    return "Oturumun süresi dolmuş. Güvenliğin için yeniden giriş yap.";
  }

  if (hasAny(message, ["callback kodu bulunamadı", "auth session missing", "code verifier"])) {
    return [
      `${providerLabel} dönüşü alındı ama oturum tamamlanamadı.`,
      `Supabase Additional Redirect URLs içinde ${appAuthRedirectUrl} veya ${supabaseRedirectUrlPattern} olduğundan emin ol ve giriş akışını baştan başlat.`,
    ].join("\n\n");
  }

  return message;
};
