// Session durumunu, token saklamayı ve auth aksiyonlarını Zustand ile yönetir.
import { create } from "zustand";
import type { User } from "@/domain/entities/User";
import type {
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
  applyPermanentBan: () => Promise<void>;
  setCurrentUser: (user: User) => void;
}

const assertDeviceIsAllowed = async () => {
  const ban = await container.tokenStorage.getItem(env.permanentBanKey);

  if (ban) {
    throw new Error("Bu cihaz kalıcı ban aldı. Yeni kayıt veya giriş yapılamaz.");
  }
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
    const refreshToken = await container.tokenStorage.getItem(env.secureRefreshTokenKey);

    if (!token) {
      set({ isHydrated: true });
      return;
    }

    const session = await container.authRepository.restoreSession(token, refreshToken ?? undefined);

    if (!session) {
      await container.tokenStorage.deleteItem(env.secureTokenKey);
      await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
      set({ accessToken: null, currentUser: null, isHydrated: true });
      return;
    }

    await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
    if (session.refreshToken) {
      await container.tokenStorage.setItem(env.secureRefreshTokenKey, session.refreshToken);
    }

    set({ accessToken: session.accessToken, currentUser: session.user, isHydrated: true });
  },
  login: async (credentials) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const challenge: OtpChallenge = { phoneNumber: credentials.phoneNumber, purpose: "login" };
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
      const session = await container.authRepository.verifyOtp({ ...challenge, token });
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
      if (session.refreshToken) {
        await container.tokenStorage.setItem(env.secureRefreshTokenKey, session.refreshToken);
      }
      set({ accessToken: session.accessToken, currentUser: session.user, pendingOtp: null });
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
      const session = await container.authRepository.signInWithProvider(provider);
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
      if (session.refreshToken) {
        await container.tokenStorage.setItem(env.secureRefreshTokenKey, session.refreshToken);
      }
      set({ accessToken: session.accessToken, currentUser: session.user });
    } finally {
      set({ isSubmitting: false });
    }
  },
  completeSocialLoginCallback: async (callbackUrl) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session = await container.authRepository.completeOAuthCallback(callbackUrl);
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
      if (session.refreshToken) {
        await container.tokenStorage.setItem(env.secureRefreshTokenKey, session.refreshToken);
      }
      set({ accessToken: session.accessToken, currentUser: session.user });
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
  applyPermanentBan: async () => {
    const token = get().accessToken;
    const user = get().currentUser;

    await container.tokenStorage.setItem(env.permanentBanKey, new Date().toISOString());

    if (user) {
      try {
        await container.moderationRepository.banUser(
          user.id,
          "permanent",
          "Giriş testi veya içerik güvenliği ihlali.",
        );
      } catch {
        // Yerel cihaz kilidi ve logout yine çalışmalı; backend kaydı tekrar denenebilir.
      }
    }

    if (token) {
      await container.authRepository.logout(token);
    }

    await container.tokenStorage.deleteItem(env.secureTokenKey);
    await container.tokenStorage.deleteItem(env.secureRefreshTokenKey);
    set({ accessToken: null, currentUser: null });
  },
  setCurrentUser: (user) => set({ currentUser: user })
}));
