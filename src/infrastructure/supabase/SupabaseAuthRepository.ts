import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import { appAuthRedirectUrl } from "@/features/auth/utils/oauthRedirect";
import { testAccount } from "@/shared/constants/testAccount";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "./client";
import { mapSupabaseUser } from "./userMapper";

WebBrowser.maybeCompleteAuthSession();

const signOutAndThrow = async (message: string): Promise<never> => {
  await supabase.auth.signOut();
  throw new Error(message);
};

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

type AppleFullName = {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
};

export class SupabaseAuthRepository implements AuthRepository {
  private async getMyProfile() {
    const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();

    return error ? null : data;
  }

  private async ensureOwnProfile(input: {
    email?: string | null;
    phoneNumber?: string | null;
    name?: string | null;
    photos?: Array<{ id: string; uri: string; isPrimary: boolean }>;
  }) {
    const { data, error } = await supabase
      .rpc("ensure_my_profile", {
        profile_email: input.email ?? null,
        profile_name: input.name ?? null,
        profile_phone_number: input.phoneNumber ?? null,
        profile_photos: input.photos ?? [],
      })
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        error?.message
          ? `Profil oluşturulamadı: ${error.message}`
          : "Profil oluşturulamadı.",
      );
    }

    return data;
  }

  private getSocialProfileName(user: SupabaseAuthUser, fallbackName?: string) {
    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name || metadata.name || metadata.display_name;

    if (typeof fullName === "string" && fullName.trim()) {
      return fullName.trim().slice(0, 80);
    }

    if (fallbackName?.trim()) {
      return fallbackName.trim().slice(0, 80);
    }

    const emailPrefix = user.email?.split("@")[0]?.replace(/[._-]+/g, " ");

    return emailPrefix?.trim() || "Yeni Üye";
  }

  private getSocialProfilePhotos(user: SupabaseAuthUser) {
    const metadata = user.user_metadata ?? {};
    const identityData = user.identities
      ?.map((identity) => identity.identity_data)
      .find((candidate) => candidate?.avatar_url || candidate?.picture);
    const avatarUrl =
      metadata.avatar_url ||
      metadata.picture ||
      metadata.photo_url ||
      metadata.image_url ||
      identityData?.avatar_url ||
      identityData?.picture;

    if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("https://")) {
      return [];
    }

    return [{ id: "oauth-avatar", uri: avatarUrl, isPrimary: true }];
  }

  private async ensureSocialProfile(user: SupabaseAuthUser, fallbackName?: string) {
    let profile = await this.getMyProfile();
    const socialPhotos = this.getSocialProfilePhotos(user);

    if (profile) {
      const profilePhotos = (profile as { photos?: unknown }).photos;
      const existingPhotos = Array.isArray(profilePhotos) ? profilePhotos : [];

      if (existingPhotos.length === 0 && socialPhotos.length > 0) {
        const { error } = await supabase
          .from("users")
          .update({ photos: socialPhotos })
          .eq("id", user.id);

        if (!error) {
          profile = await this.getMyProfile();
        }
      }

      return profile;
    }

    profile = await this.ensureOwnProfile({
      email: user.email ?? `${user.id}@oauth.ehlibyte.local`,
      name: this.getSocialProfileName(user, fallbackName),
      phoneNumber: user.phone,
      photos: socialPhotos,
    });

    if (!profile) {
      return signOutAndThrow("Sosyal giriş profili yüklenemedi.");
    }

    return profile;
  }

  private async buildAuthSession(
    session: Session,
    options?: { fallbackProfileName?: string },
  ): Promise<AuthSession> {
    const profile = await this.ensureSocialProfile(session.user, options?.fallbackProfileName);

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: mapSupabaseUser(profile),
    };
  }

  private getAppleFullName(fullName: AppleFullName | null | undefined) {
    const parts = [
      fullName?.givenName,
      fullName?.middleName,
      fullName?.familyName,
    ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

    return parts.join(" ").trim() || undefined;
  }

  private async signInWithAppleNative(): Promise<AuthSession> {
    const AppleAuthentication = await import("expo-apple-authentication").catch(
      () => null,
    );

    if (!AppleAuthentication) {
      throw new Error(
        "Apple girisi bu test ortaminda desteklenmiyor. Development build veya App Store build ile deneyin.",
      );
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();

    if (!isAvailable) {
      throw new Error("Apple girisi bu cihazda kullanilamiyor.");
    }

    let credential: {
      identityToken?: string | null;
      fullName?: AppleFullName | null;
    };

    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ERR_REQUEST_CANCELED"
      ) {
        throw new Error("Apple girisi iptal edildi.");
      }

      throw error;
    }

    if (!credential.identityToken) {
      throw new Error("Apple kimlik dogrulamasi tamamlandi ama kimlik tokeni gelmedi.");
    }

    const fallbackProfileName = this.getAppleFullName(credential.fullName);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Apple oturumu olusturulamadi.");
    }

    if (credential.fullName) {
      const { givenName, familyName } = credential.fullName;
      const metadataUpdate: Record<string, string> = {};

      if (fallbackProfileName) {
        metadataUpdate.full_name = fallbackProfileName;
      }

      if (givenName?.trim()) {
        metadataUpdate.given_name = givenName.trim();
      }

      if (familyName?.trim()) {
        metadataUpdate.family_name = familyName.trim();
      }

      if (Object.keys(metadataUpdate).length > 0) {
        await supabase.auth.updateUser({
          data: metadataUpdate,
        });
      }
    }

    return this.buildAuthSession(data.session, { fallbackProfileName });
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

    if (!profile) {
      profile = await this.ensureOwnProfile({
        email:
          data.user.email ??
          `${payload.phoneNumber.replace(/\D/g, "")}@phone.ehlibyte.local`,
        name:
          payload.name ??
          data.user.user_metadata?.name ??
          (payload.phoneNumber === testAccount.phoneNumber
            ? testAccount.name
            : "Yeni Üye"),
        phoneNumber: data.user.phone ?? payload.phoneNumber,
        photos: [],
      });
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
    if (provider === "apple" && Platform.OS === "ios") {
      return this.signInWithAppleNative();
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: appAuthRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new Error(error?.message ?? "Sosyal giriş URL'i oluşturulamadı.");
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, appAuthRedirectUrl);

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

  async deleteAccount(token: string): Promise<void> {
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      throw new Error(error.message || "Hesap silinemedi.");
    }

    await supabase.auth.signOut();
  }
}
