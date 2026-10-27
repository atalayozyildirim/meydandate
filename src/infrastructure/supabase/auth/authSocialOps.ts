import type { AuthSession, SocialAuthProvider } from "@/domain/repositories/AuthRepository";
import { appAuthRedirectUrl } from "@/features/auth/utils/oauthRedirect";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "../client";
import { isMissingRpcError } from "../errors";
import { mapSupabaseUser } from "../userMapper";
import {
  dismissAuthSession,
  readCallbackParam,
  signOutAndThrow,
  type AppleFullName,
} from "./authHelpers";

export const getMyProfile = async () => {
  const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();
  return error ? null : data;
};

export const ensureOwnProfileViaTable = async (input: {
  email?: string | null;
  phoneNumber?: string | null;
  name: string;
  photos: Array<{ id: string; uri: string; isPrimary: boolean }>;
}) => {
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
};

export const ensureOwnProfile = async (input: {
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  photos?: Array<{ id: string; uri: string; isPrimary: boolean }>;
}) => {
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
    return ensureOwnProfileViaTable({
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
};

export const getSocialProfileName = (
  user: SupabaseAuthUser,
  fallbackName?: string,
) => {
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
};

export const getSocialProfilePhotos = (user: SupabaseAuthUser) => {
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

  let optimizedUrl = avatarUrl;
  if (
    avatarUrl.includes("googleusercontent.com") ||
    avatarUrl.includes("google.com")
  ) {
    try {
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
};

export const ensureSocialProfile = async (
  user: SupabaseAuthUser,
  fallbackName?: string,
) => {
  let profile = await getMyProfile();
  const socialPhotos = getSocialProfilePhotos(user);

  if (profile) {
    const profilePhotos = (profile as { photos?: unknown }).photos;
    const existingPhotos = Array.isArray(profilePhotos) ? profilePhotos : [];

    if (existingPhotos.length === 0 && socialPhotos.length > 0) {
      const { error } = await supabase
        .from("users")
        .update({ photos: socialPhotos })
        .eq("id", user.id);

      if (!error) {
        profile = await getMyProfile();
      }
    }

    return profile;
  }

  profile = await ensureOwnProfile({
    email: user.email ?? `${user.id}@oauth.ehlibyte.local`,
    name: getSocialProfileName(user, fallbackName),
    phoneNumber: user.phone,
    photos: socialPhotos,
  });

  if (!profile) {
    return signOutAndThrow("Sosyal giriş profili yüklenemedi.");
  }

  return profile;
};

export const buildAuthSession = async (
  session: Session,
  options?: { fallbackProfileName?: string },
): Promise<AuthSession> => {
  const profile = await ensureSocialProfile(
    session.user,
    options?.fallbackProfileName,
  );

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: mapSupabaseUser(profile),
  };
};

export const getAppleFullName = (fullName: AppleFullName | null | undefined) => {
  const parts = [
    fullName?.givenName,
    fullName?.middleName,
    fullName?.familyName,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return parts.join(" ").trim() || undefined;
};

export const signInWithAppleNative = async (): Promise<AuthSession> => {
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

  const fallbackProfileName = getAppleFullName(credential.fullName);
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

  return buildAuthSession(data.session, { fallbackProfileName });
};

export const signInWithOAuthProvider = async (
  provider: SocialAuthProvider,
): Promise<AuthSession> => {
  if (provider === "apple" && Platform.OS === "ios") {
    return signInWithAppleNative();
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

    return handleOAuthCallback(result.url);
  } finally {
    dismissAuthSession();
  }
};

export const handleOAuthCallback = async (
  callbackUrl: string,
): Promise<AuthSession> => {
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

    return buildAuthSession(data.session);
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

    return buildAuthSession(data.session);
  }

  throw new Error("Sosyal giriş callback kodu bulunamadı.");
};
