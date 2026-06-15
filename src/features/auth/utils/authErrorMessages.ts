import type { SocialAuthProvider } from "@/domain/repositories/AuthRepository";
import { env } from "@/infrastructure/config/env";

const appCallbackUrl = "ehlibyte://auth/callback";

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
      `Supabase > Authentication > URL Configuration > Additional Redirect URLs alanında şu da olmalı: ${appCallbackUrl}`,
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
      "Apple giris ayarinda iOS native kimlik dogrulamasi ile Supabase client ID listesi uyusmuyor.",
      "Bu projede iOS Apple girisi artik native calisiyor. Supabase > Authentication > Providers > Apple ekranindaki Client IDs alanina App ID eklenmeli: com.ehlibyte.app",
      "Expo Go ile test ediyorsan ayni listeye host.exp.Exponent de ekle. Development build kullaniyorsan kendi bundle identifier de listede olmali.",
      "Services ID ve web Return URL ayari yalnizca web OAuth fallback icin gerekir; iOS native giriste esas dogrulanan deger bundle identifier tarafidir.",
      "Son kod degisikligi native Apple girisine gectigi icin uygulamayi yeniden ac ve gerekiyorsa yeni development build/TestFlight build al.",
      `Deep link callback icin Supabase > Authentication > URL Configuration > Additional Redirect URLs alaninda su da olmali: ${appCallbackUrl}`,
    ].join("\n\n");
  }

  if (hasAny(message, ["invalid client", "invalid_client", "unauthorized_client"])) {
    return `${providerLabel} OAuth client bilgileri hatalı görünüyor. Supabase provider ekranına Web OAuth Client ID ve Client Secret girilmeli; Firebase Web SDK apiKey/appId değerleri burada kullanılmaz.`;
  }

  if (hasAny(message, ["callback kodu bulunamadı", "auth session missing", "code verifier"])) {
    return [
      `${providerLabel} dönüşü alındı ama oturum tamamlanamadı.`,
      `Supabase Additional Redirect URLs içinde ${appCallbackUrl} olduğundan emin ol ve giriş akışını baştan başlat.`,
    ].join("\n\n");
  }

  return message;
};
