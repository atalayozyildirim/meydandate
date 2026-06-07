// Kimlik dogrulama veri kaynagi icin UI'dan bagimsiz repository sozlesmesi.
import type { User } from "../entities/User";

export interface LoginCredentials {
  phoneNumber: string;
}

export interface RegisterPayload extends LoginCredentials {
  name: string;
}

export type OtpPurpose = "login" | "register";

export interface OtpChallenge {
  phoneNumber: string;
  purpose: OtpPurpose;
  name?: string;
}

export interface VerifyOtpPayload extends OtpChallenge {
  token: string;
}

export type SocialAuthProvider = "apple" | "google";

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface AuthRepository {
  requestOtp(challenge: OtpChallenge): Promise<void>;
  verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession>;
  signInWithProvider(provider: SocialAuthProvider): Promise<AuthSession>;
  completeOAuthCallback(callbackUrl: string): Promise<AuthSession>;
  restoreSession(token: string, refreshToken?: string): Promise<AuthSession | null>;
  forgotPassword(email: string): Promise<void>;
  logout(token: string): Promise<void>;
}
