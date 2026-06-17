import type { ProfilePhoto, ProfilePromptAnswer, User } from "@/domain/entities/User";
import { sanitizePlainText } from "@/shared/utils/sanitize";

type SupabaseUserRow = Partial<User> & {
  distance_km?: number | null;
  distanceKm?: number | null;
};

// Tum users tablosu kolonlari DB'de quoted camelCase olarak tanimlidir.
// PostgREST bu kolonlari dogrudan camelCase olarak expose eder; alias gerekmez.
//
// NOT: "profileKind" kolonu migration 20260612183753 ile eklenmistir.
// Remote DB'de bu migration uygulandiktan sonra profileKind listeye geri eklenebilir:
//   supabase db push  veya  EAS deploy sonrasi otomatik
export const publicUserColumns = [
  "id",
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
  "photos",
  "profilePrompts",
  "badges",
  "profileKind",
  "isPremium",
  "isDiscoverable",
  "matchByLocation",
  "matchRadiusKm",
  "locationLatitude",
  "locationLongitude",
  "locationUpdatedAt",
  "boostedUntil",
  "fireScore",
  "hasPassedEntryTest",
  "hasCompletedOnboarding",
  "createdAt",
  "updatedAt",
].join(",");

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizePhotos = (photos: unknown): ProfilePhoto[] => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos.flatMap((photo, index) => {
    if (typeof photo === "string") {
      return [
        { id: `profile-photo-${index}`, uri: photo, isPrimary: index === 0 },
      ];
    }

    if (
      photo &&
      typeof photo === "object" &&
      "uri" in photo &&
      typeof photo.uri === "string"
    ) {
      return [
        {
          id:
            "id" in photo && typeof photo.id === "string"
              ? photo.id
              : `profile-photo-${index}`,
          uri: photo.uri,
          isPrimary:
            "isPrimary" in photo ? Boolean(photo.isPrimary) : index === 0,
        },
      ];
    }

    return [];
  });
};

const normalizeProfilePrompts = (prompts: unknown): ProfilePromptAnswer[] => {
  if (!Array.isArray(prompts)) {
    return [];
  }

  return prompts.flatMap((prompt) => {
    if (!prompt || typeof prompt !== "object") {
      return [];
    }

    const rawPrompt = prompt as Partial<ProfilePromptAnswer>;
    const questionId =
      typeof rawPrompt.questionId === "string" ? rawPrompt.questionId.trim() : "";
    const question =
      typeof rawPrompt.question === "string"
        ? sanitizePlainText(rawPrompt.question, 160)
        : "";
    const answer =
      typeof rawPrompt.answer === "string"
        ? sanitizePlainText(rawPrompt.answer, 220)
        : "";

    if (!questionId || !question || !answer) {
      return [];
    }

    return [{ questionId, question, answer }];
  });
};

export const mapSupabaseUser = (row: SupabaseUserRow): User => ({
  id: row.id ?? "",
  name: sanitizePlainText(row.name, 80),
  email: row.email ?? "",
  ...(row.phoneNumber ? { phoneNumber: row.phoneNumber } : {}),
  age: row.age ?? 18,
  city: sanitizePlainText(row.city, 80),
  ...(row.occupation
    ? { occupation: sanitizePlainText(row.occupation, 120) }
    : {}),
  bio: sanitizePlainText(row.bio, 280),
  ...(row.hometown ? { hometown: sanitizePlainText(row.hometown, 80) } : {}),
  ...(row.favoriteSong
    ? { favoriteSong: sanitizePlainText(row.favoriteSong, 120) }
    : {}),
  ...(row.favoritePoet
    ? { favoritePoet: sanitizePlainText(row.favoritePoet, 120) }
    : {}),
  culturalIdentity: row.culturalIdentity ?? "prefer_not_to_say",
  cultureImportance: row.cultureImportance ?? "somewhat_important",
  interests: row.interests ?? [],
  photos: normalizePhotos(row.photos),
  profilePrompts: normalizeProfilePrompts(row.profilePrompts),
  badges: row.badges ?? [],
  profileKind: row.profileKind ?? "member",
  isPremium: row.isPremium ?? false,
  isDiscoverable: row.isDiscoverable ?? true,
  matchByLocation: row.matchByLocation ?? false,
  matchRadiusKm: row.matchRadiusKm ?? 50,
  ...(finiteNumber(row.locationLatitude) !== undefined
    ? { locationLatitude: finiteNumber(row.locationLatitude) }
    : {}),
  ...(finiteNumber(row.locationLongitude) !== undefined
    ? { locationLongitude: finiteNumber(row.locationLongitude) }
    : {}),
  ...(row.locationUpdatedAt
    ? { locationUpdatedAt: row.locationUpdatedAt }
    : {}),
  ...(finiteNumber(row.distanceKm ?? row.distance_km) !== undefined
    ? { distanceKm: finiteNumber(row.distanceKm ?? row.distance_km) }
    : {}),
  ...(row.boostedUntil ? { boostedUntil: row.boostedUntil } : {}),
  ...(finiteNumber(row.fireScore) !== undefined
    ? { fireScore: finiteNumber(row.fireScore) }
    : {}),
  ...(row.blockedUsers ? { blockedUsers: row.blockedUsers } : {}),
  ...(row.mutedUsers ? { mutedUsers: row.mutedUsers } : {}),
  hasPassedEntryTest: row.hasPassedEntryTest ?? false,
  hasCompletedOnboarding: row.hasCompletedOnboarding ?? false,
  createdAt: row.createdAt ?? new Date(0).toISOString(),
  updatedAt: row.updatedAt ?? new Date(0).toISOString(),
});
