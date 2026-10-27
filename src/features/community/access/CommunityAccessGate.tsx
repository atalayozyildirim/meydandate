import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SocialAuthCoordinator } from "./SocialAuthCoordinator";
import { socialAuthRuntime } from "./socialAuthRuntime";
import { CommunitySocialButtons } from "./CommunitySocialButtons";
import { accessGateStyles as s } from "./components/accessGateStyles";
import { LegalDocumentModal } from "./components/AccessGatePrimitives";
import { OnboardingForm } from "./components/OnboardingForm";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { env } from "@/infrastructure/config/env";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { useNetworkStore } from "../networkStore";
import { Brand, Button, colors, Copy, Eyebrow, fonts, Heading, Icon } from "../ui";
import {
  CommunityAccessService,
  VerifiedSessionAccessError,
  type SocialProvider,
} from "./CommunityAccessService";
import {
  canEnterCommunity,
  type CommunityAccess,
  type LegalDocument,
} from "./contracts";

type Step =
  "loading" | "welcome" | "onboarding" | "ready" | "error";
const SessionContext = createContext<{
  access: CommunityAccess;
  signOut: () => void;
  busy: boolean;
  error: string;
} | null>(null);
// Explicit development deep links preserve the existing design review workflow.
const designPreviews = new Set([
  "home",
  "events",
  "communities",
  "culture",
  "profile",
  "connections",
  "space",
  "event",
]);
const ADMIN_DEV_STORAGE_KEY = "ehlibyte_admin_dev_session_active";
const ADMIN_DEV_ACCESS: CommunityAccess = {
  userId: "00000000-0000-0000-0000-000000000001",
  eligible: true,
  profileCompleted: true,
  termsAccepted: true,
  displayName: "Atalay (Admin Dev)",
  city: "İstanbul",
};
const interests = [
  "Müzik",
  "Edebiyat",
  "Sanat",
  "Dayanışma",
  "Doğa",
  "Seyahat",
];

export function CommunitySessionAction() {
  const session = useContext(SessionContext);
  if (!session) return null;
  return (
    <View style={{ gap: 12 }}>
      <Button secondary disabled={session.busy} onPress={session.signOut}>
        {session.busy ? "Çıkış yapılıyor…" : "Çıkış yap"}
      </Button>
      {Boolean(session.error) && (
        <View accessibilityRole="alert">
          <Copy>{session.error}</Copy>
        </View>
      )}
    </View>
  );
}

export const useCommunityIdentity = () =>
  useContext(SessionContext)?.access ?? null;

export function CommunityAccessGate({
  children,
  preview,
}: PropsWithChildren<{ preview?: string }>) {
  const bypass = __DEV__ && designPreviews.has(preview ?? "");
  const authRedirect = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? Linking.createURL("auth/callback") : "ehlibyte://auth/callback";
  const [step, setStep] = useState<Step>("loading");
  const [access, setAccess] = useState<CommunityAccess | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const generation = useRef(0);
  const service = useRef<CommunityAccessService | null>(null);
  const currentStep = useRef(step);
  currentStep.current = step;
  const errorMessage = (failure: unknown) =>
    failure instanceof Error && failure.name !== "ZodError"
      ? failure.message
      : "Hesap hizmeti beklenen yanıtı vermedi. Biraz sonra yeniden dene.";

  const adopt = (next: CommunityAccess | null) => {
    setAccess(next);
    if (!next) {
      setStep("welcome");
      return;
    }
    setName(next.displayName);
    setCity(next.city);
    setStep(canEnterCommunity(next) ? "ready" : "onboarding");
  };

  const requireService = () => {
    if (!service.current)
      throw new Error(
        "Hesap hizmetine şu anda bağlanılamıyor. Lütfen daha sonra yeniden dene.",
      );
    return service.current;
  };

  async function run(work: (api: CommunityAccessService) => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work(requireService());
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof VerifiedSessionAccessError) {
        setStep("error");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (bypass) return;
    let active = true;
    if (
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(env.supabaseUrl) ||
      !/^(sb_publishable_|eyJ)/.test(env.supabaseAnonKey) ||
      /your[-_]|placeholder/i.test(env.supabaseUrl + env.supabaseAnonKey)
    ) {
      SecureStore.getItemAsync(ADMIN_DEV_STORAGE_KEY).then((isDev) => {
        if (isDev === "true" && active) {
          useNetworkStore.getState().setSpaceRole("admin");
          adopt(ADMIN_DEV_ACCESS);
        } else if (active) {
          setStep("welcome");
          setError(
            "Hesap hizmeti henüz kullanıma açılmadı. Giriş ve kayıt şu anda tamamlanamıyor.",
          );
        }
      }).catch(() => {
        if (active) setStep("welcome");
      });
      return;
    }
    const client = getSupabaseClient();
    const api = new CommunityAccessService(client);
    service.current = api;
    const restore = async () => {
      const current = ++generation.current;
      setStep("loading");
      setError("");
      try {
        const isDev = await SecureStore.getItemAsync(ADMIN_DEV_STORAGE_KEY).catch(() => null);
        if (isDev === "true") {
          useNetworkStore.getState().setSpaceRole("admin");
          if (active && current === generation.current) {
            adopt(ADMIN_DEV_ACCESS);
            return;
          }
        }
        const next = await api.restore();
        if (active && current === generation.current) adopt(next);
      } catch (failure) {
        if (active && current === generation.current) {
          setError(errorMessage(failure));
          setStep("error");
        }
      }
    };
    void restore();
    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" || !active) return;
      ++generation.current;
      setAccess(null);
      setName("");
      setBirthDate("");
      setCity("");
      setSelectedInterests([]);
      setTermsAccepted(false);
      setRulesAccepted(false);
      setDocuments([]);
      setOpenDocument(null);
      setStep("welcome");
    });
    const stateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.auth.startAutoRefresh();
        // OAuth returning from the system browser is handled by the active sign-in operation.
        if (
          !lock.current &&
          currentStep.current !== "welcome"
        )
          void restore();
      } else {
        client.auth.stopAutoRefresh();
        // Hide protected content while away; foreground always revalidates access.
        setStep((current) => (current === "ready" ? "loading" : current));
      }
    });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    return () => {
      active = false;
      ++generation.current;
      service.current = null;
      stateSubscription.remove();
      subscription.subscription.unsubscribe();
      client.auth.stopAutoRefresh();
    };
  }, [bypass]);

  useEffect(() => {
    if (bypass || step !== "onboarding") return;
    let active = true;
    setDocuments([]);
    setTermsAccepted(false);
    setRulesAccepted(false);
    requireService()
      .getLegalDocuments()
      .then((next) => {
        if (active) setDocuments(next);
      })
      .catch((failure) => {
        if (active) setError(errorMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [step, bypass]);

  if (bypass) return <>{children}</>;
  const signOut = () => {
    void (async () => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        await SecureStore.deleteItemAsync(ADMIN_DEV_STORAGE_KEY).catch(() => {});
        useNetworkStore.getState().setSpaceRole("member");
        if (service.current) {
          await service.current.signOut().catch(() => {});
        }
        adopt(null);
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        lock.current = false;
        setBusy(false);
      }
    })();
  };

  const handleAdminDevSignIn = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await SecureStore.setItemAsync(ADMIN_DEV_STORAGE_KEY, "true").catch(() => {});
      useNetworkStore.getState().setSpaceRole("admin");
      adopt(ADMIN_DEV_ACCESS);
    } catch {
      setError("Admin dev oturumu başlatılamadı.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (step === "ready" && access && canEnterCommunity(access))
    return (
      <SessionContext.Provider value={{ access, signOut, busy, error }}>
        {children}
      </SessionContext.Provider>
    );

  const socialSignIn = (provider: SocialProvider) => {
    void run(async (api) => {
      const current = generation.current;
      const next = await new SocialAuthCoordinator(api, socialAuthRuntime).signIn(provider, authRedirect);
      if (next && current === generation.current) adopt(next);
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.safe}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Brand />
          <View style={s.intro}>
            <Eyebrow>YAKININDAKİ MEYDAN</Eyebrow>
            <Heading large>{step === "welcome" ? "Aynı meydanda\nbuluşalım." : step === "onboarding" ? "Biraz da seni tanıyalım." : "Meydan hazırlanıyor."}</Heading>
            <Copy muted>{step === "welcome" ? "Bir sohbet, bir ezgi, yeni bir tanışma. Apple veya Google hesabınla meydana katıl." : step === "onboarding" ? "18 yaş ve üzeri üyeler için. Kültürel kimliğine ilişkin bir sınav yok; ilgi alanlarını paylaşmak sana kalmış." : "Oturumun ve hesap bilgilerin kontrol ediliyor."}</Copy>
          </View>
          {Boolean(error) && (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={s.error}
            >
              <Copy>{error}</Copy>
            </View>
          )}
          {step === "welcome" && (
            <View style={s.form}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Admin Dev hesabı ile hızlı giriş yap"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={handleAdminDevSignIn}
                style={[s.adminButton, busy && s.disabled]}
              >
                <Icon name="shield-checkmark" color="#FFFFFF" size={20} />
                <Text style={s.adminButtonText}>Admin Dev Hesabı ile Giriş Yap</Text>
              </Pressable>

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Copy small muted style={s.dividerText}>veya</Copy>
                <View style={s.dividerLine} />
              </View>

              <CommunitySocialButtons busy={busy} onSignIn={socialSignIn} />
              <Copy small muted>
                Ehlibyte 18 yaş ve üzeri içindir. Hesabınla devam ettikten sonra profilini ve üyelik koşullarını tamamlayabilirsin.
              </Copy>
            </View>
          )}
          {step === "onboarding" && (
            <OnboardingForm
              name={name}
              setName={setName}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              city={city}
              setCity={setCity}
              interests={interests}
              selectedInterests={selectedInterests}
              setSelectedInterests={setSelectedInterests}
              documents={documents}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              rulesAccepted={rulesAccepted}
              setRulesAccepted={setRulesAccepted}
              busy={busy}
              onOpenDocument={setOpenDocument}
              onRefreshDocuments={() => {
                void run(async (api) => {
                  setDocuments(await api.getLegalDocuments());
                  setTermsAccepted(false);
                  setRulesAccepted(false);
                });
              }}
              onSubmit={() => {
                void run(async (api) => {
                  const current = generation.current;
                  const next = await api.completeOnboarding({
                    displayName: name,
                    birthDate,
                    city,
                    interests: selectedInterests,
                    termsVersion: documents.find(
                      (item) => item.kind === "terms",
                    )!.version,
                    communityRulesVersion: documents.find(
                      (item) => item.kind === "community_rules",
                    )!.version,
                  });
                  if (current === generation.current) {
                    adopt(next);
                    if (!canEnterCommunity(next))
                      setError(
                        "Hesap uygunluğu henüz doğrulanmadı. Bilgilerini kontrol edip yeniden dene.",
                      );
                  }
                });
              }}
              onSignOut={signOut}
            />
          )}
          {step === "error" && (
            <View style={s.form}>
              <Button
                disabled={busy}
                onPress={() => {
                  void run(async (api) => adopt(await api.restore()));
                }}
              >
                Yeniden dene
              </Button>
              <Button secondary disabled={busy} onPress={signOut}>
                Giriş ekranına dön
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <LegalDocumentModal
        document={openDocument}
        onClose={() => setOpenDocument(null)}
      />
    </SafeAreaView>
  );
}
