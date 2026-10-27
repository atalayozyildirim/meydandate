// Behavioral match scoring - swipe pattern learning ve activity matching
import type { CulturalCompatibility } from "../entities/Match";
import type { CultureImportance, User } from "../entities/User";

interface SwipePattern {
  userId: string;
  totalSwipes: number;
  likeCount: number;
  passCount: number;
  superLikeCount: number;
  averageResponseTime: number; // saat cinsinden
  peakActivityHours: number[]; // 0-23 arası saatler
  lastActiveDate: Date;
}

interface UserActivityProfile {
  userId: string;
  isActive: boolean;
  activityScore: number; // 0-1 arası
  responseRate: number; // 0-1 arası
  averageSessionDuration: number; // dakika
  peakHours: number[];
}

interface BehavioralMatchWeights {
  culturalWeight: number; // Kulturel uyum ağırlığı
  activityWeight: number; // Aktivite uyumu ağırlığı
  patternWeight: number; // Swipe pattern ağırlığı
  timeWeight: number; // Zaman uyumu ağırlığı
  recencyWeight: number; // Recency ağırlığı
  behavioralWeight: number; // Behavioral pattern ağırlığı
}

const DEFAULT_BEHAVIORAL_WEIGHTS: BehavioralMatchWeights = {
  culturalWeight: 0.30,
  activityWeight: 0.25,
  patternWeight: 0.20,
  timeWeight: 0.10,
  recencyWeight: 0.10,
  behavioralWeight: 0.05,
};

// Aktivite skoru hesapla
const calculateActivityScore = (user: User): number => {
  let score = 0.5; // Base score
  
  // Son 7 gün içinde aktif mi (updatedAt bazlı)
  const daysSinceActive = (Date.now() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActive < 1) score += 0.3;
  else if (daysSinceActive < 7) score += 0.2;
  else if (daysSinceActive < 30) score += 0.1;
  
  // Premium kullanıcılar daha aktif kabul edilir
  if (user.isPremium) score += 0.1;
  
  // Onboarding tamamlamış kullanıcılar
  if (user.hasCompletedOnboarding) score += 0.1;
  
  return Math.min(score, 1.0);
};

// Zaman uyumu skoru - kullanıcıların aktif saatleri
const calculateTimeCompatibility = (
  user1PeakHours: number[],
  user2PeakHours: number[]
): number => {
  if (user1PeakHours.length === 0 || user2PeakHours.length === 0) return 0.5;
  
  const overlap = user1PeakHours.filter(hour => user2PeakHours.includes(hour)).length;
  const totalUniqueHours = new Set([...user1PeakHours, ...user2PeakHours]).size;
  
  return totalUniqueHours > 0 ? overlap / totalUniqueHours : 0.5;
};

// Response rate compatibility
const calculateResponseCompatibility = (
  responseRate1: number,
  responseRate2: number
): number => {
  // Benzer response rate'ler daha iyi
  const diff = Math.abs(responseRate1 - responseRate2);
  return Math.max(0, 1 - diff);
};

// Behavioral compatibility skoru
export const calculateBehavioralMatchScore = (
  currentUser: User,
  candidate: User,
  currentActivity: UserActivityProfile,
  candidateActivity: UserActivityProfile,
  weights: BehavioralMatchWeights = DEFAULT_BEHAVIORAL_WEIGHTS
): CulturalCompatibility => {
  // Activity compatibility
  const activityScore = (currentActivity.activityScore + candidateActivity.activityScore) / 2;
  const responseCompatibility = calculateResponseCompatibility(
    currentActivity.responseRate,
    candidateActivity.responseRate
  );
  const timeCompatibility = calculateTimeCompatibility(
    currentActivity.peakHours,
    candidateActivity.peakHours
  );
  
  // Session duration compatibility
  const sessionDiff = Math.abs(
    currentActivity.averageSessionDuration - candidateActivity.averageSessionDuration
  );
  const sessionCompatibility = Math.max(0, 1 - sessionDiff / 30); // 30 dakika fark
  
  // Behavioral components
  const behavioralScore = (
    activityScore * 0.4 +
    responseCompatibility * 0.3 +
    timeCompatibility * 0.2 +
    sessionCompatibility * 0.1
  );
  
  // Import existing cultural score
  const { calculateCulturalMatchScore } = require("./CulturalMatchScoring");
  const culturalScore = calculateCulturalMatchScore(currentUser, candidate);
  
  // Combined weighted score
  const combinedCultural = Math.round(
    culturalScore.cultural * weights.culturalWeight +
    behavioralScore * weights.activityWeight
  );
  
  const combinedInterests = Math.round(
    culturalScore.interests * weights.patternWeight +
    responseCompatibility * 100 * weights.behavioralWeight
  );
  
  const combinedLifestyle = Math.round(
    culturalScore.lifestyle * weights.timeWeight +
    timeCompatibility * 100 * weights.timeWeight +
    sessionCompatibility * 100 * weights.recencyWeight
  );
  
  return {
    cultural: Math.max(0, Math.min(100, combinedCultural)),
    interests: Math.max(0, Math.min(100, combinedInterests)),
    lifestyle: Math.max(0, Math.min(100, combinedLifestyle)),
  };
};

export const createUserActivityProfile = (user: User): UserActivityProfile => {
  const peakHours = user.city === "İstanbul" ? [12, 13, 20, 21] : [18, 19, 20];
  
  return {
    userId: user.id,
    isActive: calculateActivityScore(user) > 0.6,
    activityScore: calculateActivityScore(user),
    responseRate: 0.5,
    averageSessionDuration: 15,
    peakHours,
  };
};

// Advanced filtering criteria
export interface AdvancedMatchFilters {
  minActivityScore?: number;
  maxDaysSinceActive?: number;
  requirePremium?: boolean;
  requiredInterests?: string[];
  excludeInterests?: string[];
  cityMatch?: boolean;
  ageRange?: { min: number; max: number };
  culturalImportance?: CultureImportance[];
}

export const filterByAdvancedCriteria = (
  candidate: User,
  activityProfile: UserActivityProfile,
  filters: AdvancedMatchFilters
): boolean => {
  if (filters.minActivityScore && activityProfile.activityScore < filters.minActivityScore) {
    return false;
  }
  
  if (filters.maxDaysSinceActive) {
    const daysSinceActive = (Date.now() - new Date(candidate.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > filters.maxDaysSinceActive) return false;
  }
  
  if (filters.requirePremium && !candidate.isPremium) return false;
  
  if (filters.requiredInterests && filters.requiredInterests.length > 0) {
    const hasRequiredInterest = filters.requiredInterests.some(required =>
      candidate.interests.some(interest => 
        interest.toLowerCase() === required.toLowerCase()
      )
    );
    if (!hasRequiredInterest) return false;
  }
  
  if (filters.excludeInterests && filters.excludeInterests.length > 0) {
    const hasExcludedInterest = filters.excludeInterests.some(excluded =>
      candidate.interests.some(interest => 
        interest.toLowerCase() === excluded.toLowerCase()
      )
    );
    if (hasExcludedInterest) return false;
  }
  
  if (filters.cityMatch && filters.cityMatch === true) {
    // Şehir eşleşmesi gerekiyor ama filtrelenmiş şehir belirtilmemiş
    // Bu opsiyon implementasyonu çağıranın şehrine göre yapmalı
  }
  
  if (filters.ageRange) {
    if (candidate.age < filters.ageRange.min || candidate.age > filters.ageRange.max) {
      return false;
    }
  }
  
  if (filters.culturalImportance && filters.culturalImportance.length > 0) {
    if (!filters.culturalImportance.includes(candidate.cultureImportance)) {
      return false;
    }
  }
  
  return true;
};

// Swipe pattern learning simülasyonu
export interface SwipeLearningData {
  preferredCulturalIdentities: Set<string>;
  preferredCities: Set<string>;
  preferredAgeRange: { min: number; max: number };
  preferredInterests: Map<string, number>; // interest -> score
  avoidedInterests: Set<string>;
}

export const analyzeSwipePatterns = (
  swipeHistory: Array<{ userId: string; action: "like" | "pass" | "super_like"; targetUser: User }>
): SwipeLearningData => {
  const likedUsers = swipeHistory.filter(s => s.action === "like" || s.action === "super_like");
  const passedUsers = swipeHistory.filter(s => s.action === "pass");
  
  const preferredCulturalIdentities = new Set<string>();
  const preferredCities = new Set<string>();
  const ages = likedUsers.map(s => s.targetUser.age);
  const preferredInterests = new Map<string, number>();
  const avoidedInterests = new Set<string>();
  
  // Analyze likes
  likedUsers.forEach(({ targetUser }) => {
    preferredCulturalIdentities.add(targetUser.culturalIdentity);
    preferredCities.add(targetUser.city);
    
    targetUser.interests.forEach(interest => {
      const key = interest.toLowerCase();
      preferredInterests.set(key, (preferredInterests.get(key) || 0) + 1);
    });
  });
  
  // Analyze passes
  passedUsers.forEach(({ targetUser }) => {
    targetUser.interests.forEach(interest => {
      if (preferredInterests.get(interest.toLowerCase()) === 0) {
        avoidedInterests.add(interest.toLowerCase());
      }
    });
  });
  
  const preferredAgeRange = ages.length > 0 
    ? { min: Math.min(...ages), max: Math.max(...ages) }
    : { min: 18, max: 100 };
  
  return {
    preferredCulturalIdentities,
    preferredCities,
    preferredAgeRange,
    preferredInterests,
    avoidedInterests,
  };
};

// Learned preference based scoring
export const calculateLearnedPreferenceScore = (
  candidate: User,
  learningData: SwipeLearningData
): number => {
  let score = 0;
  
  // Cultural identity match
  if (learningData.preferredCulturalIdentities.has(candidate.culturalIdentity)) {
    score += 0.2;
  }
  
  // City match
  if (learningData.preferredCities.has(candidate.city)) {
    score += 0.15;
  }
  
  // Age range match
  if (candidate.age >= learningData.preferredAgeRange.min && 
      candidate.age <= learningData.preferredAgeRange.max) {
    score += 0.15;
  }
  
  // Interest match
  let interestScore = 0;
  candidate.interests.forEach(interest => {
    const key = interest.toLowerCase();
    if (learningData.preferredInterests.has(key)) {
      interestScore += Math.min(learningData.preferredInterests.get(key)! / 10, 0.3);
    }
    if (learningData.avoidedInterests.has(key)) {
      interestScore -= 0.2;
    }
  });
  score += Math.max(0, interestScore);
  
  return Math.min(Math.max(score, 0), 1.0);
};