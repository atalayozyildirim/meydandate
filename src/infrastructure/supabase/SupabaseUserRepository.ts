import type {
  UserRepository,
  LocationMatchingUpdate,
  OnboardingProfile,
  ReportPayload,
} from "@/domain/repositories/UserRepository";
import type { Badge, User, UserProfileUpdate } from "@/domain/entities/User";
import {
  fetchCurrentUser,
  fetchUserById,
  updateUserProfile,
  finishOnboarding,
  changeProfileDiscoverability,
  changeLocationMatching,
} from "./user/userProfileOps";
import {
  claimMuharremBadge,
  claimBadge,
  activateBoost,
  readFireBalance,
  transferProfileFire,
  fetchFireLeaderboard,
} from "./user/userBadgeAndFireOps";
import {
  submitUserReport,
  blockTargetUser,
  unblockTargetUser,
  muteTargetUser,
} from "./user/userModerationOps";
import { listDiscoverCandidates } from "./user/userCandidateOps";

export class SupabaseUserRepository implements UserRepository {
  async getCurrentUser(userId: string): Promise<User> {
    return fetchCurrentUser(userId);
  }

  async getUserById(userId: string): Promise<User> {
    return fetchUserById(userId);
  }

  async updateProfile(
    userId: string,
    update: UserProfileUpdate,
  ): Promise<User> {
    return updateUserProfile(userId, update);
  }

  async completeOnboarding(
    userId: string,
    profile: OnboardingProfile,
  ): Promise<User> {
    return finishOnboarding(userId, profile);
  }

  async claimMuharrem2026Badge(userId: string): Promise<User> {
    return claimMuharremBadge(userId);
  }

  async claimTaskBadge(userId: string, badge: Badge): Promise<User> {
    return claimBadge(userId, badge);
  }

  async activatePremiumBoost(userId: string): Promise<User> {
    return activateBoost(userId);
  }

  async setProfileDiscoverability(
    userId: string,
    isDiscoverable: boolean,
  ): Promise<User> {
    return changeProfileDiscoverability(userId, isDiscoverable);
  }

  async setLocationMatching(
    userId: string,
    update: LocationMatchingUpdate,
  ): Promise<User> {
    return changeLocationMatching(userId, update);
  }

  async getFireBalance(userId: string): Promise<number> {
    return readFireBalance(userId);
  }

  async sendProfileFire(
    userId: string,
    targetUserId: string,
    amount = 1,
  ): Promise<{ balance: number; targetFireScore: number }> {
    return transferProfileFire(userId, targetUserId, amount);
  }

  async listFireLeaderboard(limit = 5): Promise<User[]> {
    return fetchFireLeaderboard(limit);
  }

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    return listDiscoverCandidates(userId);
  }

  async reportUser(userId: string, payload: ReportPayload): Promise<void> {
    return submitUserReport(userId, payload);
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    return blockTargetUser(userId, blockedUserId);
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    return unblockTargetUser(userId, blockedUserId);
  }

  async muteUser(userId: string, mutedUserId: string): Promise<void> {
    return muteTargetUser(userId, mutedUserId);
  }
}
