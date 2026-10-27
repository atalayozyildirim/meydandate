import type { CommunityAccess } from "./contracts";
import type { CommunityAccessService, SocialProvider } from "./CommunityAccessService";

export type SocialAuthRuntime = {
  platform: string;
  providerEnabled(provider: SocialProvider): Promise<boolean>;
  appleAvailable(): Promise<boolean>;
  randomValue(): string;
  hashNonce(value: string): Promise<string>;
  appleSignIn(nonce: string, state: string): Promise<{ identityToken: string | null; state: string | null; fullName?: string }>;
  openAuthSession(url: string, redirect: string): Promise<{ type: string; url?: string }>;
};

export class SocialAuthCoordinator {
  constructor(private readonly api: CommunityAccessService, private readonly runtime: SocialAuthRuntime) {}

  async signIn(provider: SocialProvider, redirect: string): Promise<CommunityAccess | null> {
    try {
      if (!await this.runtime.providerEnabled(provider))
        throw new Error(`${provider === "apple" ? "Apple" : "Google"} ile giriş henüz kullanıma açılmadı. Lütfen daha sonra yeniden dene.`);
      if (provider === "apple" && this.runtime.platform === "ios") {
        if (!await this.runtime.appleAvailable()) throw new Error("Apple ile giriş bu cihazda kullanılamıyor.");
        const rawNonce = this.runtime.randomValue();
        const state = this.runtime.randomValue();
        const credential = await this.runtime.appleSignIn(await this.runtime.hashNonce(rawNonce), state);
        if (!credential.identityToken || credential.state !== state) throw new Error("Apple kimlik doğrulaması tamamlanamadı. Yeniden dene.");
        return this.api.signInWithAppleIdentity(credential.identityToken, rawNonce, credential.fullName);
      }
      const url = await this.api.createOAuthUrl(provider, redirect);
      const result = await this.runtime.openAuthSession(url, redirect);
      if (result.type === "cancel" || result.type === "dismiss") return null;
      if (result.type !== "success" || !result.url) throw new Error("Sosyal giriş tamamlanamadı. Yeniden dene.");
      return this.api.completeOAuthCallback(result.url, redirect);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ERR_REQUEST_CANCELED") return null;
      throw error;
    }
  }
}
