import type {
  AuthSession,
  OtpChallenge,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import { testAccount } from "@/shared/constants/testAccount";
import { supabase } from "../client";
import { mapSupabaseUser } from "../userMapper";
import {
  isOtpSignupNotAllowed,
  isSmsProviderInvalidParameter,
  signOutAndThrow,
} from "./authHelpers";
import { ensureOwnProfile, getMyProfile } from "./authSocialOps";

export const requestOtpChallenge = async (
  challenge: OtpChallenge,
): Promise<void> => {
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
};

export const verifyOtpChallenge = async (
  payload: VerifyOtpPayload,
): Promise<AuthSession> => {
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

  let profile = await getMyProfile();

  if (profile && payload.purpose === "register") {
    return signOutAndThrow("Bu telefon numarası zaten kayıtlı.");
  }

  if (!profile) {
    profile = await ensureOwnProfile({
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
};
