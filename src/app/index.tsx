// Session durumuna gore kullaniciyi auth, onay testi, onboarding veya ana taba yonlendirir.
import { Redirect } from "expo-router";
import { Loading } from "@/shared/components/Loading";
import { useSession } from "@/features/auth/hooks/useSession";

export default function IndexScreen() {
  const { currentUser, isHydrated } = useSession();

  if (!isHydrated) {
    return <Loading label="Oturum hazirlaniyor" />;
  }

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  if (!currentUser.hasPassedEntryTest) {
    return <Redirect href="/approval-test" />;
  }

  if (!currentUser.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/tabs/feed" />;
}
