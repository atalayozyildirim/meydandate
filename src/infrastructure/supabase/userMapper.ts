import type { ProfilePhoto, User } from "@/domain/entities/User";
import { sanitizePlainText } from "@/shared/utils/sanitize";

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
  "badges",
  "isPremium",
  "hasPassedEntryTest",
  "hasCompletedOnboarding",
  "createdAt",
  "updatedAt",
].join(",");

const normalizePhotos = (photos: unknown): ProfilePhoto[] => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos.flatMap((photo, index) => {
    if (typeof photo === "string") {
      return [{ id: `profile-photo-${index}`, uri: photo, isPrimary: index === 0 }];
    }

    if (
      photo &&
      typeof photo === "object" &&
      "uri" in photo &&
      typeof photo.uri === "string"
    ) {
      return [
        {
          id: "id" in photo && typeof photo.id === "string" ? photo.id : `profile-photo-${index}`,
          uri: photo.uri,
          isPrimary: "isPrimary" in photo ? Boolean(photo.isPrimary) : index === 0,
        },
      ];
    }

    return [];
  });
};

export const mapSupabaseUser = (row: Partial<User>): User => ({
  id: row.id ?? "",
  name: sanitizePlainText(row.name, 80),
  email: row.email ?? "",
  ...(row.phoneNumber ? { phoneNumber: row.phoneNumber } : {}),
  age: row.age ?? 18,
  city: sanitizePlainText(row.city, 80),
  ...(row.occupation ? { occupation: sanitizePlainText(row.occupation, 120) } : {}),
  bio: sanitizePlainText(row.bio, 280),
  ...(row.hometown ? { hometown: sanitizePlainText(row.hometown, 80) } : {}),
  ...(row.favoriteSong ? { favoriteSong: sanitizePlainText(row.favoriteSong, 120) } : {}),
  ...(row.favoritePoet ? { favoritePoet: sanitizePlainText(row.favoritePoet, 120) } : {}),
  culturalIdentity: row.culturalIdentity ?? "prefer_not_to_say",
  cultureImportance: row.cultureImportance ?? "somewhat_important",
  interests: row.interests ?? [],
  photos: normalizePhotos(row.photos),
  badges: row.badges ?? [],
  isPremium: row.isPremium ?? false,
  hasPassedEntryTest: row.hasPassedEntryTest ?? false,
  hasCompletedOnboarding: row.hasCompletedOnboarding ?? false,
  createdAt: row.createdAt ?? new Date(0).toISOString(),
  updatedAt: row.updatedAt ?? new Date(0).toISOString(),
});

