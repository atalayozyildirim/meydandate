import type { User } from "@/domain/entities/User";

const botCreatedAt = "2026-06-10T19:56:00.000Z";

export const ehlibyteBotUser: User = {
  id: "ehlibyte-bot",
  name: "Ehlibyte Rehberi",
  email: "rehber@ehlibyte.app",
  age: 27,
  city: "Ehlibyte",
  bio: "AI destekli resmi rehber hesabı; topluluk duyuruları, güvenli başlangıç önerileri ve kampanyaları paylaşır.",
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "important",
  interests: ["solidarity", "cem_culture", "art"],
  photos: [],
  badges: ["verified_profile", "zulfiqar_sword"],
  isPremium: true,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt: botCreatedAt,
  updatedAt: botCreatedAt,
};
