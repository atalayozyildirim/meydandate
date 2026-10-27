import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { clampMatchRadiusKm, getDistanceKm } from "@/shared/utils/location";
import { isProfileBoostActive } from "@/shared/utils/profileBoost";

export type PrivateProfile = Partial<User> & {
  blockedUsers?: string[];
  mutedUsers?: string[];
};

export type SpotifyPresenceRow = {
  user_id: string;
  spotify_track_id: string;
  track_name: string;
  artist_names: string[] | null;
  expires_at: string;
};

export const hasStoredLocation = (profile: Partial<User>) =>
  typeof profile.locationLatitude === "number" &&
  typeof profile.locationLongitude === "number";

export const getDailyCandidateJitter = (userId: string, candidateId: string) => {
  const dayKey = Math.floor(Date.now() / 86_400_000);
  const value = `${userId}:${candidateId}:${dayKey}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }

  return hash / 9973;
};

export const normalizeText = (value?: string) =>
  value?.trim().toLocaleLowerCase("tr-TR") ?? "";

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const getDaysSince = (dateValue?: string, nowMs = Date.now()) => {
  const dateMs = new Date(dateValue ?? 0).getTime();

  if (!Number.isFinite(dateMs) || dateMs <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (nowMs - dateMs) / 86_400_000);
};

export const getProfileCompletenessScore = (candidate: User) => {
  let score = 0;

  if (candidate.photos.length > 0) score += 8;
  if (candidate.photos.length > 1) score += 4;
  if (candidate.bio.trim().length >= 40) score += 5;
  if (candidate.occupation?.trim()) score += 3;
  if (candidate.hometown?.trim()) score += 3;
  if (candidate.favoritePoet?.trim()) score += 3;
  if (candidate.favoriteSong?.trim()) score += 3;
  if ((candidate.profilePrompts?.length ?? 0) > 0) score += 5;
  score += Math.min(6, candidate.interests.length * 1.2);

  return Math.min(40, score);
};

export const getAgeCompatibilityScore = (currentUser: User, candidate: User) => {
  const ageGap = Math.abs(currentUser.age - candidate.age);

  if (ageGap <= 3) return 12;
  if (ageGap <= 6) return 9;
  if (ageGap <= 10) return 5;
  if (ageGap <= 15) return 2;
  return 0;
};

export const getCandidateDistanceKm = (currentUser: User, candidate: User) => {
  if (typeof candidate.distanceKm === "number") {
    return candidate.distanceKm;
  }

  if (
    typeof currentUser.locationLatitude === "number" &&
    typeof currentUser.locationLongitude === "number" &&
    typeof candidate.locationLatitude === "number" &&
    typeof candidate.locationLongitude === "number"
  ) {
    return getDistanceKm(
      currentUser.locationLatitude,
      currentUser.locationLongitude,
      candidate.locationLatitude,
      candidate.locationLongitude,
    );
  }

  return undefined;
};

export const getLocationAffinityScore = (currentUser: User, candidate: User) => {
  const radiusKm = clampMatchRadiusKm(currentUser.matchRadiusKm ?? 50);
  const distanceKm = getCandidateDistanceKm(currentUser, candidate);
  const sameCity =
    normalizeText(currentUser.city) !== "" &&
    normalizeText(currentUser.city) === normalizeText(candidate.city);
  const sameHometown =
    normalizeText(currentUser.hometown) !== "" &&
    normalizeText(currentUser.hometown) === normalizeText(candidate.hometown);

  if (typeof distanceKm === "number" && Number.isFinite(distanceKm)) {
    const radiusRatio = clamp(distanceKm / Math.max(radiusKm, 1), 0, 1);
    const distanceScore = (1 - radiusRatio) ** 1.35 * 34;
    const closeBonus = distanceKm <= 10 ? 8 : distanceKm <= 25 ? 5 : 0;

    return distanceScore + closeBonus + (sameCity ? 7 : 0) + (sameHometown ? 4 : 0);
  }

  return (sameCity ? 16 : 0) + (sameHometown ? 6 : 0);
};

export const getDiscoveryRank = (
  currentUser: User,
  candidate: User,
  nowMs: number,
  candidateLikedCurrentUser = false,
) => {
  const compatibility = calculateCulturalMatchScore(currentUser, candidate);
  const compatibilityScore =
    compatibility.cultural * 0.34 +
    compatibility.interests * 0.3 +
    compatibility.lifestyle * 0.2;
  const reciprocalIntentScore = candidateLikedCurrentUser ? 48 : 0;
  const boostScore = isProfileBoostActive(candidate.boostedUntil, nowMs) ? 30 : 0;
  const fireScore = Math.min(24, Math.log1p(candidate.fireScore ?? 0) * 4.8);
  const premiumScore = candidate.isPremium ? 6 : 0;
  const locationScore = getLocationAffinityScore(currentUser, candidate);
  const ageScore = getAgeCompatibilityScore(currentUser, candidate);
  const activityScore = Math.max(0, 14 - getDaysSince(candidate.updatedAt, nowMs) * 1.2);
  const completenessScore = getProfileCompletenessScore(candidate) * 0.45;
  const freshScore = Math.max(0, 8 - getDaysSince(candidate.createdAt, nowMs) / 2);
  const jitter = getDailyCandidateJitter(currentUser.id, candidate.id) * 4;

  return (
    reciprocalIntentScore +
    compatibilityScore +
    boostScore +
    fireScore +
    premiumScore +
    locationScore +
    ageScore +
    activityScore +
    completenessScore +
    freshScore +
    jitter
  );
};
