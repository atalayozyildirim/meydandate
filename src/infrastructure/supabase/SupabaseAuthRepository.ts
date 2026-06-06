import type {
  AuthRepository,
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  SocialAuthProvider,
} from "@/domain/repositories/AuthRepository";
import { supabase } from "./client";

export class SupabaseAuthRepository implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: credentials.phoneNumber,
    });

    if (error) {
      throw new Error(error.message);
    }

    throw new Error("Telefon dogrulama kodu gonderildi. OTP dogrulama ekrani baglandiginda devam edilecek.");
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: payload.phoneNumber,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    throw new Error("Telefon dogrulama kodu gonderildi. OTP dogrulama ekrani baglandiginda kayit tamamlanacak.");
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
      user: userData,
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
