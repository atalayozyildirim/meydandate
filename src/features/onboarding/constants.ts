import type { OnboardingStep, OnboardingStepId } from "./types";
import type { OnboardingFormValues } from "./schemas/onboardingSchema";

export const MAX_KNOWLEDGE_TEST_ATTEMPTS = 5;
export const KNOWLEDGE_TEST_LOCK_DURATION_MS = 15 * 60 * 1000;

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "intro",
    eyebrow: "Kart",
    title: "Kartın nasıl çalışır?",
    description: "Profil, müzik ve uyum sinyalleri keşifte birlikte çalışır.",
  },
  {
    id: "quiz",
    eyebrow: "Yol ve erkân",
    title: "Bilgi testini geç",
    description: "Soruları sırayla cevapla; doğru cevaplar ilerlemeni açar.",
  },
  {
    id: "culture",
    eyebrow: "Kimlik",
    title: "Kültürel yakınlığını seç",
    description: "Bu sinyaller uyum detaylarında ve önerilerde kullanılır.",
  },
  {
    id: "interests",
    eyebrow: "İlgi",
    title: "Seni anlatan alanları seç",
    description: "En az bir ilgi alanı seçerek kartını kişiselleştir.",
  },
  {
    id: "profile",
    eyebrow: "Profil",
    title: "Temel bilgilerini gir",
    description: "İsim, yaş ve şehir profil kartında görünür.",
  },
  {
    id: "details",
    eyebrow: "Detay",
    title: "Sohbet başlatan detaylar ekle",
    description: "Bio ve sevdiğin kültürel detaylar daha iyi eşleşme sağlar.",
  },
  {
    id: "review",
    eyebrow: "Kontrol",
    title: "Kartını son kez kontrol et",
    description: "Her şey hazırsa onboarding'i tamamlayabilirsin.",
  },
];

export const stepValidationFields: Record<
  OnboardingStepId,
  Array<keyof OnboardingFormValues>
> = {
  intro: [],
  quiz: [],
  culture: ["culturalIdentity", "cultureImportance"],
  interests: ["interests"],
  profile: ["photoUri", "name", "age", "city"],
  details: ["occupation", "bio", "hometown", "favoriteSong", "favoritePoet"],
  review: [
    "photoUri",
    "name",
    "age",
    "city",
    "occupation",
    "bio",
    "hometown",
    "favoriteSong",
    "favoritePoet",
    "culturalIdentity",
    "cultureImportance",
    "interests",
  ],
};
