import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeCommunityPhone,
  parseAccess,
  parseLegalDocuments,
  validateOnboarding,
  type CommunityAccess,
  type OnboardingInput,
} from "./contracts";

// The OTP has already been consumed; recovery must reload access, not reuse it.
export class VerifiedSessionAccessError extends Error {}
export type SocialProvider = "apple" | "google";
const oauthExchanges = new WeakMap<object, { code: string; identity: Promise<string> }>();

// Kept independent of the legacy container, which imports payment/native SDKs.
export class CommunityAccessService {
  constructor(private readonly client: Pick<SupabaseClient, "auth" | "rpc">) {}

  async getLegalDocuments() {
    const { data, error } = await this.client.rpc(
      "get_community_legal_documents",
    );
    if (error?.message?.includes("legal_documents_unpublished"))
      throw new Error("Yeni üyelikler henüz açılmadı. Bilgilendirme metinleri yayımlandığında hesap oluşturabilirsin.");
    if (error)
      throw new Error(
        "Bilgilendirme metinleri yüklenemedi. Biraz sonra yeniden dene.",
      );
    return parseLegalDocuments(data);
  }

  async restore(): Promise<CommunityAccess | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error("Oturum okunamadı. Yeniden dene.");
    if (!data.session) return null;
    return this.loadAccess();
  }

  async loadAccess(): Promise<CommunityAccess> {
    // getSession alone is not proof of identity. Verify with Auth before reading access.
    const { data: identity, error: identityError } =
      await this.client.auth.getUser();
    if (identityError || !identity.user)
      throw new Error("Oturum doğrulanamadı. Yeniden giriş yap.");
    const { data, error } = await this.client.rpc("get_my_community_access");
    if (error) throw new Error("Hesap bilgilerin yüklenemedi. Yeniden dene.");
    return parseAccess(data, identity.user.id);
  }

  async requestCode(rawPhone: string, purpose: "login" | "register") {
    const phone = normalizeCommunityPhone(rawPhone);
    if (purpose === "register") await this.getLegalDocuments();
    const { error } = await this.client.auth.signInWithOtp({ phone, options: { shouldCreateUser: purpose === "register" } });
    if (error) throw new Error("Kod gönderilemedi. Numaranı kontrol edip yeniden dene.");
    return phone;
  }

  async createOAuthUrl(provider: SocialProvider, redirectTo: string) {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider, options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error(`${provider === "apple" ? "Apple" : "Google"} girişi şu anda kullanılamıyor. Biraz sonra yeniden dene.`);
    return data.url;
  }

  async completeOAuthCallback(url: string, expectedRedirect: string) {
    const callback = new URL(url);
    const expected = new URL(expectedRedirect);
    if (callback.protocol !== expected.protocol || callback.host !== expected.host || callback.pathname !== expected.pathname)
      throw new Error("Bu bağlantı Ehlibyte giriş ekranına ait değil.");
    const code = callback.searchParams.get("code");
    if (callback.searchParams.has("error") || !code || code.length > 2048)
      throw new Error("Sosyal giriş bağlantısı geçersiz veya süresi dolmuş. Yeniden giriş yap.");
    let exchange = oauthExchanges.get(this.client);
    if (!exchange || exchange.code !== code) {
      const identity = (async () => {
        const { data, error } = await this.client.auth.exchangeCodeForSession(code);
        if (error || !data.user || !data.session) throw new Error("Sosyal giriş doğrulanamadı. Giriş ekranından yeniden dene.");
        return data.user.id;
      })();
      exchange = { code, identity };
      oauthExchanges.set(this.client, exchange);
    }
    const exchangedUser = await exchange.identity;
    try {
      const access = await this.loadAccess();
      if (access.userId !== exchangedUser) throw new Error("Oturum değişti.");
      return access;
    } catch {
      throw new VerifiedSessionAccessError("Girişin doğrulandı ancak hesap bilgilerin yüklenemedi. Yeniden dene.");
    }
  }

  async signInWithAppleIdentity(token: string, nonce: string, fullName?: string) {
    if (!token || !nonce) throw new Error("Apple kimlik doğrulaması tamamlanamadı.");
    const { data, error } = await this.client.auth.signInWithIdToken({ provider: "apple", token, nonce });
    if (error || !data.user || !data.session) throw new Error("Apple oturumu oluşturulamadı. Yeniden dene.");
    const name = fullName?.trim().slice(0, 80);
    if (name) {
      // Display metadata only; authorization comes exclusively from the access RPC.
      await this.client.auth.updateUser({ data: { full_name: name } }).catch(() => undefined);
    }
    try {
      const access = await this.loadAccess();
      return { ...access, displayName: access.displayName || name || "" };
    } catch { throw new VerifiedSessionAccessError("Apple girişin doğrulandı ancak hesap bilgilerin yüklenemedi. Yeniden dene."); }
  }

  async verifyCode(
    contact: string,
    rawCode: string,
  ) {
    const token = rawCode.trim();
    if (!/^\d{6,8}$/.test(token))
      throw new Error("Gönderilen 6–8 haneli kodu gir.");
    const { data, error } = await this.client.auth.verifyOtp({
      phone: normalizeCommunityPhone(contact), type: "sms",
      token,
    });
    if (error || !data.user || !data.session)
      throw new Error("Kod doğrulanamadı. Yeni kod isteyip tekrar dene.");
    try {
      return await this.loadAccess();
    } catch {
      throw new VerifiedSessionAccessError(
        "Kodun doğrulandı ancak hesap bilgilerin yüklenemedi. Oturumunu yeniden kontrol et.",
      );
    }
  }

  async completeOnboarding(rawInput: OnboardingInput) {
    const input = validateOnboarding(rawInput);
    const documents = await this.getLegalDocuments();
    if (
      documents.find((item) => item.kind === "terms")?.version !==
        input.termsVersion ||
      documents.find((item) => item.kind === "community_rules")?.version !==
        input.communityRulesVersion
    )
      throw new Error(
        "Koşullar güncellendi. Metinleri yeniden yükleyip incele.",
      );
    const { data: identity, error: identityError } =
      await this.client.auth.getUser();
    if (identityError || !identity.user)
      throw new Error("Oturum doğrulanamadı. Yeniden giriş yap.");
    const { data, error } = await this.client.rpc(
      "complete_community_onboarding",
      {
        display_name: input.displayName,
        birth_date: input.birthDate,
        city: input.city,
        interests: input.interests,
        terms_version: input.termsVersion,
        community_rules_version: input.communityRulesVersion,
      },
    );
    if (error)
      throw new Error(
        "Profil kaydedilemedi. Bağlantını ve bilgilerini kontrol edip yeniden dene.",
      );
    return parseAccess(data, identity.user.id);
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error("Çıkış yapılamadı. Yeniden dene.");
    oauthExchanges.delete(this.client);
  }
}
