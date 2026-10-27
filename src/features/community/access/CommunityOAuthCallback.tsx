import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text } from "react-native";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { Brand, Button, colors, Copy, Heading } from "../ui";
import { CommunityAccessService, VerifiedSessionAccessError } from "./CommunityAccessService";
import { useCommunityFonts } from "./useCommunityFonts";

export default function CommunityOAuthCallback() {
  const [fontsLoaded] = useCommunityFonts();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const started = useRef(false);
  const [failure, setFailure] = useState("");
  const [canRestore, setCanRestore] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      if (typeof code !== "string" || !code) {
        setFailure("Giriş bağlantısı geçersiz veya süresi dolmuş. Yeniden sosyal giriş yap.");
        setBusy(false);
        return;
      }
      try {
        const api = new CommunityAccessService(getSupabaseClient());
        const expected = "ehlibyte://auth/callback";
        await api.completeOAuthCallback(`${expected}?code=${encodeURIComponent(code)}`, expected);
        router.replace("/");
      } catch (error) {
        setCanRestore(error instanceof VerifiedSessionAccessError);
        setFailure(error instanceof Error ? error.message : "Giriş doğrulanamadı. Yeniden dene.");
      } finally { setBusy(false); }
    };
    void run();
  }, [code]);

  const retry = async () => {
    setBusy(true);
    setFailure("");
    try {
      const session = await new CommunityAccessService(getSupabaseClient()).restore();
      if (!session) { setCanRestore(false); setFailure("Oturum bulunamadı. Yeniden sosyal giriş yap."); }
      else router.replace("/");
    } catch { setFailure("Hesap bilgilerin yüklenemedi. Biraz sonra yeniden dene."); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24, justifyContent: "center", maxWidth: 600, width: "100%", alignSelf: "center" }}>
      {!fontsLoaded ? <Text>Girişin kontrol ediliyor…</Text> : <>
      <Brand />
      <Heading>{busy ? "Girişin doğrulanıyor." : "Giriş bağlantısı"}</Heading>
      <Copy>{busy ? "Hesap bilgilerin güvenli biçimde kontrol ediliyor." : failure}</Copy>
      {!busy && canRestore && <Button onPress={() => void retry()}>Oturumumu yeniden kontrol et</Button>}
      {!busy && <Button secondary onPress={() => router.replace("/")}>Giriş ekranına dön</Button>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
