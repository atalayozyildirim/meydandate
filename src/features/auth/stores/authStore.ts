// Session durumunu, token saklamayı ve auth aksiyonlarını Zustand ile yönetir.
import { create } from "zustand";
import type { User } from "@/domain/entities/User";
import type {
  AuthSession,
  LoginCredentials,
  OtpChallenge,
  RegisterPayload,
  SocialAuthProvider,
} from "@/domain/repositories/AuthRepository";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";

interface AuthState {
  accessToken: string | null;
  currentUser: User | null;
  isHydrated: boolean;
  isSubmitting: boolean;
  pendingOtp: OtpChallenge | null;
  initializeSession: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyOtp: (token: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  clearPendingOtp: () => void;
  socialLogin: (provider: SocialAuthProvider) => Promise<void>;
  completeSocialLoginCallback: (callbackUrl: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  applyPermanentBan: () => Promise<void>;
  setCurrentUser: (user: User) => void;
}

const assertDeviceIsAllowed = async () => {
  const ban = await container.tokenStorage.getItem(env.permanentBanKey);

  if (ban) {
    throw new Error(
      "Bu cihaz kalıcı ban aldı. Yeni kayıt veya giriş yapılamaz.",
    );
  }
};

const mergePremiumStatus = async (user: User): Promise<User> => {
  try {
    const subscription = await container.paymentService.getSubscription(
      user.id,
    );

    if (subscription.status !== "active") {
      return {
        ...user,
        isPremium: false,
        badges: user.badges.filter((badge) => badge !== "premium_member"),
      };
    }

    return {
      ...user,
      isPremium: true,
      badges: Array.from(new Set([...user.badges, "premium_member"])),
    };
  } catch {
    return user;
  }
};

const persistSession = async (session: AuthSession) => {
  await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
  if (session.refreshToken) {
    await container.tokenStorage.setItem(
      env.secureRefreshTokenKey,
      session.refreshToken,
    );
  }

  return {
    ...session,
    user: await mergePremiumStatus(session.user),
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  currentUser: null,
  isHydrated: false,
  isSubmitting: false,
  pendingOtp: null,
  initializeSession: async () => {
    const localBan = await container.tokenStorage.getItem(env.permanentBanKey);

    if (localBan) {
      await container.tokenStorage.deleteItem(env.secureTokenKey);
      await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
      set({ accessToken: null, currentUser: null, isHydrated: true });
      return;
    }

    const token = await container.tokenStorage.getItem(env.secureTokenKey);
    const refreshToken = await container.tokenStorage.getItem(
      env.secureRefreshTokenKey,
    );

    if (!token) {
      set({ isHydrated: true });
      return;
    }

    try {
      const session = await container.authRepository.restoreSession(
        token,
        refreshToken ?? undefined,
      );

      if (!session) {
        await container.tokenStorage.deleteItem(env.secureTokenKey);
        await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
        set({ accessToken: null, currentUser: null, isHydrated: true });
        return;
      }

      const hydratedSession = await persistSession(session);

      set({
        accessToken: hydratedSession.accessToken,
        currentUser: hydratedSession.user,
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },
  login: async (credentials) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const challenge: OtpChallenge = {
        phoneNumber: credentials.phoneNumber,
        purpose: "login",
      };
      await container.authRepository.requestOtp(challenge);
      set({ pendingOtp: challenge });
    } finally {
      set({ isSubmitting: false });
    }
  },
  register: async (payload) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const challenge: OtpChallenge = {
        phoneNumber: payload.phoneNumber,
        purpose: "register",
        name: payload.name,
      };
      await container.authRepository.requestOtp(challenge);
      set({ pendingOtp: challenge });
    } finally {
      set({ isSubmitting: false });
    }
  },
  verifyOtp: async (token) => {
    const challenge = get().pendingOtp;

    if (!challenge) {
      throw new Error("Doğrulama isteği bulunamadı. Yeni kod isteyin.");
    }

    set({ isSubmitting: true });

    try {
      const session = await container.authRepository.verifyOtp({
        ...challenge,
        token,
      });
      const hydratedSession = await persistSession(session);
      set({
        accessToken: hydratedSession.accessToken,
        currentUser: hydratedSession.user,
        pendingOtp: null,
      });
    } finally {
      set({ isSubmitting: false });
    }
  },
  resendOtp: async () => {
    const challenge = get().pendingOtp;

    if (!challenge) {
      throw new Error("Doğrulama isteği bulunamadı.");
    }

    set({ isSubmitting: true });

    try {
      await container.authRepository.requestOtp(challenge);
    } finally {
      set({ isSubmitting: false });
    }
  },
  clearPendingOtp: () => set({ pendingOtp: null }),
  socialLogin: async (provider) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session =
        await container.authRepository.signInWithProvider(provider);
      const hydratedSession = await persistSession(session);
      set({
        accessToken: hydratedSession.accessToken,
        currentUser: hydratedSession.user,
      });
    } finally {
      set({ isSubmitting: false });
    }
  },
  completeSocialLoginCallback: async (callbackUrl) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session =
        await container.authRepository.completeOAuthCallback(callbackUrl);
      const hydratedSession = await persistSession(session);
      set({
        accessToken: hydratedSession.accessToken,
        currentUser: hydratedSession.user,
      });
    } finally {
      set({ isSubmitting: false });
    }
  },
  forgotPassword: async (email) => {
    set({ isSubmitting: true });

    try {
      await container.authRepository.forgotPassword(email);
    } finally {
      set({ isSubmitting: false });
    }
  },
  logout: async () => {
    const token = get().accessToken;

    if (token) {
      await container.authRepository.logout(token);
    }

    await container.tokenStorage.deleteItem(env.secureTokenKey);
    await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
    set({ accessToken: null, currentUser: null });
  },
  deleteAccount: async () => {
    const token = get().accessToken;

    if (!token) {
      throw new Error("Hesap silmek için oturum gerekli.");
    }

    await container.authRepository.deleteAccount(token);
    await container.tokenStorage.deleteItem(env.secureTokenKey);
    await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
    set({ accessToken: null, currentUser: null });
  },
  applyPermanentBan: async () => {
    const token = get().accessToken;
    const user = get().currentUser;

    await container.tokenStorage.setItem(
      env.permanentBanKey,
      new Date().toISOString(),
    );

    if (user) {
      try {
        await container.moderationRepository.banUser(
          user.id,
          "permanent",
          "Giriş testi veya içerik güvenliği ihlali.",
        );
      } catch (error) {
        // Yerel cihaz kilidi ve logout yine çalışmalı; backend kaydı tekrar denenebilir.
        if (__DEV__) console.warn("applyPermanentBan backend error:", error);
      }
    }

    if (token) {
      await container.authRepository.logout(token);
    }

    await container.tokenStorage.deleteItem(env.secureTokenKey);
    await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
    set({ accessToken: null, currentUser: null });
  },
  setCurrentUser: (user) => set({ currentUser: user }),
}));
