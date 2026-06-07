import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import { supabase } from "./client";
import { mapSupabaseUser } from "./userMapper";

const signOutAndThrow = async (message: string): Promise<never> => {
  await supabase.auth.signOut();
  throw new Error(message);
};

export class SupabaseAuthRepository implements AuthRepository {
  private async getMyProfile() {
    const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();

    return error ? null : data;
  }

  async requestOtp(challenge: OtpChallenge): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: challenge.phoneNumber,
      options: {
        shouldCreateUser: challenge.purpose === "register",
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

    if (!profile && payload.purpose === "register") {
      const newProfile = {
        id: data.user.id,
        name: payload.name ?? data.user.user_metadata?.name ?? "Yeni Üye",
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "ehlibyte://auth/callback",
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    throw new Error(`${provider === "apple" ? "Apple" : "Google"} girisi acildi. OAuth callback ekrani baglandiginda oturum tamamlanacak.`);
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
