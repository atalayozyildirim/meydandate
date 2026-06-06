// Kimlik dogrulama veri kaynagi icin UI'dan bagimsiz repository sozlesmesi.
import type { User } from "../entities/User";

export interface LoginCredentials {
  phoneNumber: string;
}

export interface RegisterPayload extends LoginCredentials {
  name: string;
}

export type SocialAuthProvider = "apple" | "google";

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  signInWithProvider(provider: SocialAuthProvider): Promise<AuthSession>;
  restoreSession(token: string): Promise<AuthSession | null>;
  forgotPassword(email: string): Promise<void>;
  logout(token: string): Promise<void>;
}
