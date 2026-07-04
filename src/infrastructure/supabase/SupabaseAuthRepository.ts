import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import { appAuthRedirectUrl } from "@/features/auth/utils/oauthRedirect";
import { installCryptoPolyfill } from "@/shared/utils/installCryptoPolyfill";
import { testAccount } from "@/shared/constants/testAccount";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "./client";
import { isMissingRpcError } from "./errors";
import { mapSupabaseUser } from "./userMapper";

installCryptoPolyfill();

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

const isSmsProviderInvalidParameter = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  return /60200|invalid parameter|error sending confirmation otp/i.test(message);
};

const getAuthErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

const isOtpSignupNotAllowed = (error: unknown) =>
  /signup(s)? not allowed|signups? (is|are) disabled|otp.*not allowed/i.test(
    getAuthErrorMessage(error),
  );

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
    const fallbackEmail = input.email ?? null;
    const fallbackPhoneNumber = input.phoneNumber ?? null;
    const fallbackName = input.name?.trim().slice(0, 80) || "Yeni Üye";
    const fallbackPhotos = input.photos ?? [];
    const { data, error } = await supabase
      .rpc("ensure_my_profile", {
        profile_email: fallbackEmail,
        profile_name: fallbackName,
        profile_phone_number: fallbackPhoneNumber,
        profile_photos: fallbackPhotos,
      })
      .maybeSingle();

    if (isMissingRpcError(error, "ensure_my_profile")) {
      return this.ensureOwnProfileViaTable({
        email: fallbackEmail,
        phoneNumber: fallbackPhoneNumber,
        name: fallbackName,
        photos: fallbackPhotos,
      });
    }

    if (error || !data) {
      throw new Error(
        error?.message
          ? `Profil oluşturulamadı: ${error.message}`
          : "Profil oluşturulamadı.",
      );
    }

    return data;
  }

  private async ensureOwnProfileViaTable(input: {
    email?: string | null;
    phoneNumber?: string | null;
    name: string;
    photos: Array<{ id: string; uri: string; isPrimary: boolean }>;
  }) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authUser = authData?.user;

    if (authError || !authUser) {
      return signOutAndThrow("Sosyal giriş oturumu okunamadı.");
    }

    const safeEmail =
      input.email?.trim() || `${authUser.id}@oauth.ehlibyte.local`;
    const row = {
      id: authUser.id,
      email: safeEmail,
      phoneNumber: input.phoneNumber?.trim() || null,
      name: input.name,
      age: 18,
      city: "",
      bio: "",
      culturalIdentity: "prefer_not_to_say",
      cultureImportance: "somewhat_important",
      interests: [],
      photos: input.photos,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();

    if (!error && data) {
      return data;
    }

    const { data: retryData, error: retryError } = await supabase
      .from("users")
      .upsert(
        {
          ...row,
          email: `${authUser.id}@oauth.ehlibyte.local`,
          phoneNumber: null,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (retryError || !retryData) {
      throw new Error(
        retryError?.message
          ? `Profil oluşturulamadı: ${retryError.message}`
          : "Profil oluşturulamadı.",
      );
    }

    return retryData;
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

    // Optimize Google profile image URL for higher resolution
    let optimizedUrl = avatarUrl;
    if (avatarUrl.includes("googleusercontent.com") || avatarUrl.includes("google.com")) {
      try {
        // Remove existing size parameters and add high resolution.
        const url = new URL(avatarUrl);
        url.searchParams.delete("sz");
        url.searchParams.delete("s");
        url.searchParams.set("sz", "500");
        optimizedUrl = url.toString();
      } catch {
        optimizedUrl = avatarUrl;
      }
    }

    return [{ id: "oauth-avatar", uri: optimizedUrl, isPrimary: true }];
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

    if (isTestAccountLogin) {
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: challenge.phoneNumber,
      options: {
        shouldCreateUser: challenge.purpose === "register" || isTestAccountLogin,
        ...(challenge.name ? { data: { name: challenge.name } } : {}),
      },
    });

    if (error) {
      if (isOtpSignupNotAllowed(error)) {
        if (challenge.purpose === "login") {
          throw new Error(
            "Bu telefon numarasıyla kayıtlı hesap bulunamadı. Hesap oluştur ekranından yeni üyelik başlat.",
          );
        }

        throw new Error(
          "Yeni üyelik şu anda sunucu tarafında kapalı. Supabase Authentication ayarlarında yeni kullanıcı kaydına izin verilmeli.",
        );
      }

      if (
        challenge.phoneNumber === testAccount.phoneNumber &&
        isSmsProviderInvalidParameter(error)
      ) {
        throw new Error(
          "Test hesabı için Supabase Phone test OTP ayarı eksik. Dashboard > Authentication > Providers > Phone altında +905551112233 numarasına 123456 kodunu tanımla.",
        );
      }

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
      if (payload.phoneNumber === testAccount.phoneNumber) {
        throw new Error(
          "Test hesabı kodu Supabase tarafından kabul edilmedi. Phone Test OTP kaydında numara 905551112233, kod 123456 ve geçerlilik tarihi gelecekte olmalı. Twilio Verify provider kullanılıyorsa Supabase hosted test OTP bypass'ı çalışmayabilir.",
        );
      }

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
      if (typeof WebBrowser.openAuthSessionAsync !== "function") {
        throw new Error(
          "Sosyal giriş modülü bu build içinde hazır değil. Yeni production build alın.",
        );
      }

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
    // Supabase rotates refresh tokens. Its persisted session is the single source
    // of truth; replaying the separately cached token causes "Refresh Token Not Found".
    void token;
    void refreshToken;
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session || !data.session.user) {
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
