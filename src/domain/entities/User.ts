// Kullanici profilini ve kulturel beyan alanlarini domain seviyesinde tanimlar.
export const culturalIdentityValues = [
  "alevi",
  "close_to_alevi_culture",
  "prefer_not_to_say",
] as const;

export const cultureImportanceValues = [
  "very_important",
  "important",
  "somewhat_important",
  "not_important",
] as const;

export const interestValues = [
  "baglama",
  "turkish_folk_music",
  "folk_poets",
  "cem_culture",
  "solidarity",
  "art",
  "literature",
  "travel",
  "sports",
  "nature",
] as const;

export const badgeValues = [
  "community_member",
  "verified_profile",
  "active_user",
  "premium_member",
  "muharrem_follower",
  "muharrem_orucu_2026",
  "asure_lokmasi",
  "ilk_eslesme",
  "populer_profil",
  "cem_room_supporter",
  "culture_guardian",
  "zulfiqar_sword",
  "haci_bektas_veli",
  "la_fetta_illa",
] as const;

export const profileKindValues = ["member", "starter", "ai_starter"] as const;

export type CulturalIdentity = (typeof culturalIdentityValues)[number];
export type CultureImportance = (typeof cultureImportanceValues)[number];
export type Interest = (typeof interestValues)[number];
export type Badge = (typeof badgeValues)[number];
export type ProfileKind = (typeof profileKindValues)[number];

export interface ProfilePhoto {
  id: string;
  uri: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  age: number;
  city: string;
  occupation?: string;
  bio: string;
  hometown?: string;
  favoriteSong?: string;
  favoritePoet?: string;
  culturalIdentity: CulturalIdentity;
  cultureImportance: CultureImportance;
  interests: Interest[];
  photos: ProfilePhoto[];
  badges: Badge[];
  profileKind?: ProfileKind;
  isPremium: boolean;
  isDiscoverable?: boolean;
  matchByLocation?: boolean;
  matchRadiusKm?: number;
  locationLatitude?: number;
  locationLongitude?: number;
  locationUpdatedAt?: string;
  distanceKm?: number;
  boostedUntil?: string;
  fireScore?: number;
  blockedUsers?: string[];
  mutedUsers?: string[];
  hasPassedEntryTest: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  name?: string;
  age?: number;
  city?: string;
  occupation?: string;
  bio?: string;
  hometown?: string;
  favoriteSong?: string;
  favoritePoet?: string;
  culturalIdentity?: CulturalIdentity;
  cultureImportance?: CultureImportance;
  interests?: Interest[];
  photos?: ProfilePhoto[];
  hasPassedEntryTest?: boolean;
  hasCompletedOnboarding?: boolean;
  isDiscoverable?: boolean;
}
