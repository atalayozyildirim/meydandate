import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./client";
import { mapSupabaseUser } from "./userMapper";
import { testAccount } from "@/shared/constants/testAccount";

WebBrowser.maybeCompleteAuthSession();

const signOutAndThrow = async (message: string): Promise<never> => {
  await supabase.auth.signOut();
  throw new Error(message);
};

const authRedirectUrl = Linking.createURL("auth/callback");

const readCallbackParam = (callbackUrl: string, key: string) => {
  const url = new URL(callbackUrl);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  return url.searchParams.get(key) ?? hashParams.get(key);
};

const dismissAuthSession = () => {
  try {
    WebBrowser.dismissAuthSession();
  } catch {
    // Some platforms close the auth session themselves after cancel/redirect.
  }
};

export class SupabaseAuthRepository implements AuthRepository {
  private async getMyProfile() {
    const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();

    return error ? null : data;
  }

  private getSocialProfileName(user: SupabaseAuthUser) {
    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name || metadata.name || metadata.display_name;

    if (typeof fullName === "string" && fullName.trim()) {
      return fullName.trim().slice(0, 80);
    }

    const emailPrefix = user.email?.split("@")[0]?.replace(/[._-]+/g, " ");

    return emailPrefix?.trim() || "Yeni Üye";
  }

  private getSocialProfilePhotos(user: SupabaseAuthUser) {
    const metadata = user.user_metadata ?? {};
    const avatarUrl = metadata.avatar_url || metadata.picture;

    if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("https://")) {
      return [];
    }

    return [{ id: "oauth-avatar", uri: avatarUrl, isPrimary: true }];
  }

  private async ensureSocialProfile(user: SupabaseAuthUser) {
    let profile = await this.getMyProfile();

    if (profile) {
      return profile;
    }

    const { error } = await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? `${user.id}@oauth.ehlibyte.local`,
      ...(user.phone ? { phoneNumber: user.phone } : {}),
      name: this.getSocialProfileName(user),
      age: 18,
      city: "",
      bio: "",
      culturalIdentity: "prefer_not_to_say",
      cultureImportance: "somewhat_important",
      interests: [],
      photos: this.getSocialProfilePhotos(user),
    });

    if (error) {
      return signOutAndThrow("Sosyal giriş tamamlandı ancak profil oluşturulamadı.");
    }

    profile = await this.getMyProfile();

    if (!profile) {
      return signOutAndThrow("Sosyal giriş profili yüklenemedi.");
    }

    return profile;
  }

  private async buildAuthSession(session: Session): Promise<AuthSession> {
    const profile = await this.ensureSocialProfile(session.user);

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: mapSupabaseUser(profile),
    };
  }

  async requestOtp(challenge: OtpChallenge): Promise<void> {
    const isTestAccountLogin =
      challenge.purpose === "login" &&
      challenge.phoneNumber === testAccount.phoneNumber;

    const { error } = await supabase.auth.signInWithOtp({
      phone: challenge.phoneNumber,
      options: {
        shouldCreateUser: challenge.purpose === "register" || isTestAccountLogin,
        ...(challenge.name ? { data: { name: challenge.name } } : {}),
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: payload.phoneNumber,
      token: payload.token,
      type: "sms",
    });

    if (error || !data.session || !data.user) {
      throw new Error(error?.message ?? "Telefon doğrulanamadı.");
    }

    let profile = await this.getMyProfile();

    if (profile && payload.purpose === "register") {
      return signOutAndThrow("Bu telefon numarası zaten kayıtlı.");
    }

    const shouldCreateProfile =
      payload.purpose === "register" ||
      (payload.purpose === "login" && payload.phoneNumber === testAccount.phoneNumber);

    if (!profile && shouldCreateProfile) {
      const newProfile = {
        id: data.user.id,
        name:
          payload.name ??
          data.user.user_metadata?.name ??
          (payload.phoneNumber === testAccount.phoneNumber
            ? testAccount.name
            : "Yeni Üye"),
        email: data.user.email ?? `${payload.phoneNumber.replace(/\D/g, "")}@phone.ehlibyte.local`,
        phoneNumber: data.user.phone ?? payload.phoneNumber,
        age: 18,
        city: "",
        bio: "",
        culturalIdentity: "prefer_not_to_say",
        cultureImportance: "somewhat_important",
        interests: [],
        photos: [],
      };
      const { error: profileError } = await supabase
        .from("users")
        .insert(newProfile);

      if (profileError) {
        return signOutAndThrow("Telefon doğrulandı ancak profil oluşturulamadı.");
      }

      profile = await this.getMyProfile();
    }

    if (!profile) {
      return signOutAndThrow("Bu telefon numarasına bağlı profil bulunamadı.");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: mapSupabaseUser(profile),
    };
  }

  async signInWithProvider(provider: SocialAuthProvider): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new Error(error?.message ?? "Sosyal giriş URL'i oluşturulamadı.");
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);

      if (result.type !== "success" || !("url" in result)) {
        throw new Error(`${provider === "apple" ? "Apple" : "Google"} girişi iptal edildi.`);
      }

      return this.completeOAuthCallback(result.url);
    } finally {
      dismissAuthSession();
    }
  }

  async completeOAuthCallback(callbackUrl: string): Promise<AuthSession> {
    const errorDescription = readCallbackParam(callbackUrl, "error_description");
    const oauthError = readCallbackParam(callbackUrl, "error");
    const errorCode = readCallbackParam(callbackUrl, "error_code");

    if (errorDescription || oauthError) {
      throw new Error(
        [errorCode, errorDescription ?? oauthError ?? "Sosyal giriş tamamlanamadı."]
          .filter(Boolean)
          .join(": "),
      );
    }

    const code = readCallbackParam(callbackUrl, "code");

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        throw new Error(error?.message ?? "Sosyal giriş oturumu alınamadı.");
      }

      return this.buildAuthSession(data.session);
    }

    const accessToken = readCallbackParam(callbackUrl, "access_token");
    const refreshToken = readCallbackParam(callbackUrl, "refresh_token");

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new Error(error?.message ?? "Sosyal giriş oturumu kaydedilemedi.");
      }

      return this.buildAuthSession(data.session);
    }

    throw new Error("Sosyal giriş callback kodu bulunamadı.");
  }

  async restoreSession(token: string, refreshToken?: string): Promise<AuthSession | null> {
    if (!refreshToken) {
      return null;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return null;
    }

    const userData = await this.getMyProfile();

    if (!userData) {
      return null;
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: mapSupabaseUser(userData),
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "ehlibyte://reset-password",
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async logout(token: string): Promise<void> {
    await supabase.auth.signOut();
  }
}
