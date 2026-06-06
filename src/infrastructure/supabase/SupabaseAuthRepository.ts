import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import type { User } from "@/domain/entities/User";
import { supabase } from "./client";
import { mapSupabaseUser } from "./userMapper";

export class SupabaseAuthRepository implements AuthRepository {
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

    let { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile && payload.purpose === "register") {
      const timestamp = new Date().toISOString();
      const newProfile: User = {
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
        badges: ["community_member"],
        isPremium: false,
        hasPassedEntryTest: false,
        hasCompletedOnboarding: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const { data: createdProfile, error: profileError } = await supabase
        .from("users")
        .insert(newProfile)
        .select()
        .single();

      if (profileError || !createdProfile) {
        throw new Error("Telefon doğrulandı ancak profil oluşturulamadı.");
      }

      profile = createdProfile;
    }

    if (!profile) {
      throw new Error("Bu telefon numarasına bağlı profil bulunamadı.");
    }

    return {
      accessToken: data.session.access_token,
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

  async restoreSession(token: string): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      accessToken: token,
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
