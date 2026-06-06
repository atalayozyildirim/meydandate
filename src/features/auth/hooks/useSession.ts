// Session verisine feature seviyesinde okunabilir bir erisim saglar.
import { useAuthStore } from "@/features/auth/stores/authStore";

export const useSession = () =>
  useAuthStore((state) => ({
    accessToken: state.accessToken,
    currentUser: state.currentUser,
    isHydrated: state.isHydrated,
    logout: state.logout
  }));
