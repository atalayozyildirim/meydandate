// Session durumunu, token saklamayi ve auth aksiyonlarini Zustand ile yonetir.
import { create } from "zustand";
import type { User } from "@/domain/entities/User";
import type { LoginCredentials, RegisterPayload, SocialAuthProvider } from "@/domain/repositories/AuthRepository";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";

interface AuthState {
  accessToken: string | null;
  currentUser: User | null;
  isHydrated: boolean;
  isSubmitting: boolean;
  initializeSession: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  socialLogin: (provider: SocialAuthProvider) => Promise<void>;
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
  initializeSession: async () => {
    const localBan = await container.tokenStorage.getItem(env.permanentBanKey);

    if (localBan) {
      await container.tokenStorage.deleteItem(env.secureTokenKey);
      set({ accessToken: null, currentUser: null, isHydrated: true });
      return;
    }

    const token = await container.tokenStorage.getItem(env.secureTokenKey);

    if (!token) {
      set({ isHydrated: true });
      return;
    }

    const session = await container.authRepository.restoreSession(token);

    if (!session) {
      await container.tokenStorage.deleteItem(env.secureTokenKey);
      set({ accessToken: null, currentUser: null, isHydrated: true });
      return;
    }

    set({ accessToken: session.accessToken, currentUser: session.user, isHydrated: true });
  },
  login: async (credentials) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session = await container.authRepository.login(credentials);
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
      set({ accessToken: session.accessToken, currentUser: session.user });
    } finally {
      set({ isSubmitting: false });
    }
  },
  register: async (payload) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session = await container.authRepository.register(payload);
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
      set({ accessToken: session.accessToken, currentUser: session.user });
    } finally {
      set({ isSubmitting: false });
    }
  },
  socialLogin: async (provider) => {
    set({ isSubmitting: true });

    try {
      await assertDeviceIsAllowed();
      const session = await container.authRepository.signInWithProvider(provider);
      await container.tokenStorage.setItem(env.secureTokenKey, session.accessToken);
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
    set({ accessToken: null, currentUser: null });
  },
  applyPermanentBan: async () => {
    const token = get().accessToken;

    await container.tokenStorage.setItem(env.permanentBanKey, new Date().toISOString());

    if (token) {
      await container.authRepository.logout(token);
    }

    await container.tokenStorage.deleteItem(env.secureTokenKey);
    set({ accessToken: null, currentUser: null });
  },
  setCurrentUser: (user) => set({ currentUser: user })
}));
