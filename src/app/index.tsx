// Ilk acilis ve session durumuna gore kullaniciyi dogru akisa yonlendirir.
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { Loading } from "@/shared/components/Loading";
import { useSession } from "@/features/auth/hooks/useSession";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";

export default function IndexScreen() {
  const { currentUser, isHydrated } = useSession();
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    void container.tokenStorage
      .getItem(env.introSeenKey)
      .then((value) => {
        if (mounted) {
          setHasSeenIntro(value === "true");
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSeenIntro(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isHydrated || hasSeenIntro === null) {
    return <Loading label="Ehlibyte hazırlanıyor" />;
  }

  if (!hasSeenIntro) {
    return <Redirect href="/intro" />;
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
