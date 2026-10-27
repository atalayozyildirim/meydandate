import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import {
  signInWithOAuthProvider,
  handleOAuthCallback,
} from "./auth/authSocialOps";
import {
  requestOtpChallenge,
  verifyOtpChallenge,
} from "./auth/authOtpOps";
import {
  restoreUserSession,
  handleForgotPassword,
  signOutUser,
  deleteUserAccount,
} from "./auth/authSessionOps";

export class SupabaseAuthRepository implements AuthRepository {
  async requestOtp(challenge: OtpChallenge): Promise<void> {
    return requestOtpChallenge(challenge);
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    return verifyOtpChallenge(payload);
  }

  async signInWithProvider(
    provider: SocialAuthProvider,
  ): Promise<AuthSession> {
    return signInWithOAuthProvider(provider);
  }

  async completeOAuthCallback(callbackUrl: string): Promise<AuthSession> {
    return handleOAuthCallback(callbackUrl);
  }

  async restoreSession(
    token: string,
    refreshToken?: string,
  ): Promise<AuthSession | null> {
    return restoreUserSession(token, refreshToken);
  }

  async forgotPassword(email: string): Promise<void> {
    return handleForgotPassword(email);
  }

  async logout(token: string): Promise<void> {
    return signOutUser(token);
  }

  async deleteAccount(token: string): Promise<void> {
    return deleteUserAccount(token);
  }
}
