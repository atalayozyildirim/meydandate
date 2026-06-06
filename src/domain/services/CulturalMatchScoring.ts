// Kulturel uyum skorunu merkezi ve test edilebilir bir domain servisi olarak hesaplar.
import type { CulturalCompatibility } from "../entities/Match";
import type { CultureImportance, User } from "../entities/User";

const MAX_SCORE = 100;
const CITY_WEIGHT = 15;
const HOMETOWN_WEIGHT = 15;
const IMPORTANCE_WEIGHT = 22;
const FAVORITE_POET_WEIGHT = 18;
const FAVORITE_SONG_WEIGHT = 12;
const BASE_CULTURAL_SCORE = 35;
const BASE_LIFESTYLE_SCORE = 45;

const importanceRank: Record<CultureImportance, number> = {
  very_important: 4,
  important: 3,
  somewhat_important: 2,
  not_important: 1
};

const normalize = (value?: string) => value?.trim().toLocaleLowerCase("tr-TR") ?? "";

const clampScore = (score: number) => Math.max(0, Math.min(MAX_SCORE, Math.round(score)));

const getSharedInterestRatio = (currentUser: User, candidate: User) => {
  const candidateInterests = new Set(candidate.interests);
  const sharedCount = currentUser.interests.filter((interest) => candidateInterests.has(interest)).length;
  const largestSetSize = Math.max(currentUser.interests.length, candidate.interests.length, 1);

  return sharedCount / largestSetSize;
};

export const calculateCulturalMatchScore = (currentUser: User, candidate: User): CulturalCompatibility => {
  const interestRatio = getSharedInterestRatio(currentUser, candidate);
  const importanceGap = Math.abs(
    importanceRank[currentUser.cultureImportance] - importanceRank[candidate.cultureImportance]
  );
  const importanceScore = IMPORTANCE_WEIGHT - importanceGap * 6;
  const sameCityScore = normalize(currentUser.city) === normalize(candidate.city) ? CITY_WEIGHT : 0;
  const sameHometownScore =
    normalize(currentUser.hometown) !== "" && normalize(currentUser.hometown) === normalize(candidate.hometown)
      ? HOMETOWN_WEIGHT
      : 0;
  const samePoetScore =
    normalize(currentUser.favoritePoet) !== "" && normalize(currentUser.favoritePoet) === normalize(candidate.favoritePoet)
      ? FAVORITE_POET_WEIGHT
      : 0;
  const sameSongScore =
    normalize(currentUser.favoriteSong) !== "" && normalize(currentUser.favoriteSong) === normalize(candidate.favoriteSong)
      ? FAVORITE_SONG_WEIGHT
      : 0;

  return {
    cultural: clampScore(BASE_CULTURAL_SCORE + importanceScore + sameHometownScore + samePoetScore + sameSongScore),
    interests: clampScore(interestRatio * MAX_SCORE),
    lifestyle: clampScore(BASE_LIFESTYLE_SCORE + sameCityScore + interestRatio * 40)
  };
};
