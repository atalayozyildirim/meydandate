// Profil, onboarding ve guvenlik aksiyonlari icin repository sozlesmesi.
import type { ReportCategory } from "../entities/Match";
import type { User, UserProfileUpdate } from "../entities/User";

export interface OnboardingProfile extends Required<Pick<User, "name" | "age" | "city" | "bio" | "culturalIdentity" | "cultureImportance" | "interests">> {
  occupation?: string;
  hometown?: string;
  favoriteSong?: string;
  favoritePoet?: string;
  photoUri?: string;
}

export interface ReportPayload {
  reportedUserId: string;
  category: ReportCategory;
  description?: string;
}

export interface LocationMatchingUpdate {
  enabled: boolean;
  radiusKm: number;
  latitude?: number;
  longitude?: number;
}

export interface UserRepository {
  getCurrentUser(userId: string): Promise<User>;
  getUserById(userId: string): Promise<User>;
  updateProfile(userId: string, update: UserProfileUpdate): Promise<User>;
  completeOnboarding(userId: string, profile: OnboardingProfile): Promise<User>;
  activatePremiumBoost(userId: string): Promise<User>;
  setProfileDiscoverability(userId: string, isDiscoverable: boolean): Promise<User>;
  setLocationMatching(userId: string, update: LocationMatchingUpdate): Promise<User>;
  listDiscoverCandidates(userId: string): Promise<User[]>;
  reportUser(userId: string, payload: ReportPayload): Promise<void>;
  blockUser(userId: string, blockedUserId: string): Promise<void>;
  muteUser(userId: string, mutedUserId: string): Promise<void>;
}
