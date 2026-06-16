// Mock kullanici repository'si profil, onboarding ve guvenlik islemlerini yonetir.
import type { Report, BlockedUser } from "@/domain/entities/Match";
import type { Badge, User, UserProfileUpdate } from "@/domain/entities/User";
import type {
  LocationMatchingUpdate,
  OnboardingProfile,
  ReportPayload,
  UserRepository,
} from "@/domain/repositories/UserRepository";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { getProfileBoostExpiry, getProfileBoostRank } from "@/shared/utils/profileBoost";
import { clampMatchRadiusKm, getDistanceKm } from "@/shared/utils/location";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";

const findUser = (userId: string) => {
  const user = mockDatabase.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new Error("Kullanici bulunamadi.");
  }

  return user;
};

const mergeUser = (user: User, update: Partial<User>): User => ({
  ...user,
  ...update,
  updatedAt: new Date().toISOString()
});

const getMockDiscoveryRank = (
  currentUser: User,
  candidate: User,
  nowMs: number,
  candidateLikedCurrentUser = false,
) => {
  const compatibility = calculateCulturalMatchScore(currentUser, candidate);
  const compatibilityScore =
    compatibility.cultural * 0.42 +
    compatibility.interests * 0.36 +
    compatibility.lifestyle * 0.22;
  const reciprocalIntentScore = candidateLikedCurrentUser ? 46 : 0;
  const boostScore = getProfileBoostRank(candidate.boostedUntil, nowMs) * 34;
  const fireScore = Math.min(28, Math.log1p(candidate.fireScore ?? 0) * 5.5);
  const premiumScore = candidate.isPremium ? 8 : 0;
  const distanceScore =
    typeof candidate.distanceKm === "number"
      ? Math.max(0, 14 - Math.min(candidate.distanceKm, 70) / 5)
      : 0;
  const freshScore = Math.max(
    0,
    10 -
      (nowMs - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 14),
  );

  return (
    reciprocalIntentScore +
    compatibilityScore +
    boostScore +
    fireScore +
    premiumScore +
    distanceScore +
    freshScore
  );
};

export class MockUserRepository implements UserRepository {
  async getCurrentUser(userId: string): Promise<User> {
    return findUser(userId);
  }

  async getUserById(userId: string): Promise<User> {
    return findUser(userId);
  }

  async updateProfile(userId: string, update: UserProfileUpdate): Promise<User> {
    const currentUser = findUser(userId);
    const updatedUser = mergeUser(currentUser, update);
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async completeOnboarding(userId: string, profile: OnboardingProfile): Promise<User> {
    const currentUser = findUser(userId);
    const update: UserProfileUpdate = {
      name: profile.name,
      age: profile.age,
      city: profile.city,
      bio: profile.bio,
      culturalIdentity: profile.culturalIdentity,
      cultureImportance: profile.cultureImportance,
      interests: profile.interests
    };

    if (profile.occupation) {
      update.occupation = profile.occupation;
    }

    if (profile.hometown) {
      update.hometown = profile.hometown;
    }

    if (profile.favoriteSong) {
      update.favoriteSong = profile.favoriteSong;
    }

    if (profile.favoritePoet) {
      update.favoritePoet = profile.favoritePoet;
    }

    if (profile.photoUri) {
      update.photos = [{ id: createId("photo"), uri: profile.photoUri, isPrimary: true }];
    }

    const updatedUser: User = {
      ...mergeUser(currentUser, update),
      hasCompletedOnboarding: true
    };
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async claimMuharrem2026Badge(userId: string): Promise<User> {
    const currentUser = findUser(userId);
    const updatedUser = mergeUser(currentUser, {
      badges: Array.from(
        new Set([...currentUser.badges, "muharrem_orucu_2026"]),
      ),
    });
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async claimTaskBadge(userId: string, badge: Badge): Promise<User> {
    const currentUser = findUser(userId);

    if (currentUser.badges.includes(badge)) {
      return currentUser;
    }

    const canClaim =
      (badge === "asure_lokmasi" &&
        currentUser.badges.includes("muharrem_orucu_2026")) ||
      (badge === "ilk_eslesme" &&
        mockDatabase.matches.some((match) =>
          match.users.some((user) => user.id === userId),
        )) ||
      (badge === "populer_profil" && (currentUser.fireScore ?? 0) >= 50) ||
      (badge === "active_user" && currentUser.hasCompletedOnboarding);

    if (!canClaim) {
      throw new Error("Görev henüz tamamlanmadı.");
    }

    const updatedUser = mergeUser(currentUser, {
      badges: Array.from(new Set([...currentUser.badges, badge])),
    });
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async activatePremiumBoost(userId: string): Promise<User> {
    const currentUser = findUser(userId);
    const updatedUser = mergeUser(currentUser, {
      boostedUntil: getProfileBoostExpiry().toISOString(),
    });
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async setProfileDiscoverability(userId: string, isDiscoverable: boolean): Promise<User> {
    const currentUser = findUser(userId);
    const updatedUser = mergeUser(currentUser, { isDiscoverable });
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async setLocationMatching(userId: string, update: LocationMatchingUpdate): Promise<User> {
    const currentUser = findUser(userId);
    const nextUpdate: Partial<User> = {
      matchByLocation: update.enabled,
      matchRadiusKm: clampMatchRadiusKm(update.radiusKm),
    };

    if (
      typeof update.latitude === "number" &&
      Number.isFinite(update.latitude) &&
      typeof update.longitude === "number" &&
      Number.isFinite(update.longitude)
    ) {
      nextUpdate.locationLatitude = update.latitude;
      nextUpdate.locationLongitude = update.longitude;
      nextUpdate.locationUpdatedAt = new Date().toISOString();
    }

    const updatedUser = mergeUser(currentUser, nextUpdate);
    const index = mockDatabase.users.findIndex((user) => user.id === userId);
    mockDatabase.users[index] = updatedUser;

    return updatedUser;
  }

  async getFireBalance(userId: string): Promise<number> {
    return mockDatabase.fireWallets[userId] ?? 0;
  }

  async sendProfileFire(
    userId: string,
    targetUserId: string,
    amount = 1,
  ): Promise<{ balance: number; targetFireScore: number }> {
    const currentBalance = mockDatabase.fireWallets[userId] ?? 0;

    if (currentBalance < amount) {
      throw new Error("Fire bakiyen yetersiz.");
    }

    const target = findUser(targetUserId);
    mockDatabase.fireWallets[userId] = currentBalance - amount;
    target.fireScore = (target.fireScore ?? 0) + amount;

    return {
      balance: mockDatabase.fireWallets[userId],
      targetFireScore: target.fireScore,
    };
  }

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    const currentUser = findUser(userId);
    const blockedIds = new Set(
      mockDatabase.blockedUsers
        .filter((blockedUser) => blockedUser.blockerId === userId)
        .map((blockedUser) => blockedUser.blockedUserId)
    );
    const mutedIds = new Set(
      mockDatabase.mutedUsers
        .filter((mutedUser) => mutedUser.userId === userId)
        .map((mutedUser) => mutedUser.mutedUserId),
    );
    const actedUserIds = new Set(
      mockDatabase.likes
        .filter((like) => like.fromUserId === userId)
        .map((like) => like.toUserId)
    );
    const likedYouUserIds = new Set(
      mockDatabase.likes
        .filter(
          (like) => like.toUserId === userId && like.action !== "pass",
        )
        .map((like) => like.fromUserId),
    );

    const nowMs = Date.now();
    const hasLocationMatching =
      currentUser.matchByLocation === true &&
      typeof currentUser.locationLatitude === "number" &&
      typeof currentUser.locationLongitude === "number";

    const visibleCandidates = mockDatabase.users
      .flatMap((user) => {
        if (
          user.id === userId ||
          !user.hasPassedEntryTest ||
          !user.hasCompletedOnboarding ||
          !(user.isDiscoverable ?? true) ||
          user.blockedUsers?.includes(userId) ||
          user.mutedUsers?.includes(userId) ||
          blockedIds.has(user.id) ||
          mutedIds.has(user.id) ||
          actedUserIds.has(user.id)
        ) {
          return [];
        }

        if (!hasLocationMatching) {
          return [user];
        }

        if (
          typeof user.locationLatitude !== "number" ||
          typeof user.locationLongitude !== "number"
        ) {
          return [];
        }

        const distanceKm = getDistanceKm(
          currentUser.locationLatitude as number,
          currentUser.locationLongitude as number,
          user.locationLatitude,
          user.locationLongitude,
        );

        return distanceKm <= (currentUser.matchRadiusKm ?? 50)
          ? [{ ...user, distanceKm }]
          : [];
      })
      .sort((first, second) => {
        return (
          getMockDiscoveryRank(
            currentUser,
            second,
            nowMs,
            likedYouUserIds.has(second.id),
          ) -
          getMockDiscoveryRank(
            currentUser,
            first,
            nowMs,
            likedYouUserIds.has(first.id),
          )
        );
      });

    const memberCandidates = visibleCandidates.filter(
      (user) => (user.profileKind ?? "member") === "member",
    );

    return memberCandidates.length > 0
      ? memberCandidates
      : visibleCandidates.filter((user) => (user.profileKind ?? "member") !== "member");
  }

  async reportUser(userId: string, payload: ReportPayload): Promise<void> {
    const report: Report = {
      id: createId("report"),
      reporterId: userId,
      reportedUserId: payload.reportedUserId,
      category: payload.category,
      createdAt: new Date().toISOString()
    };

    if (payload.description) {
      report.description = payload.description;
    }

    if (payload.evidence) {
      report.evidence = payload.evidence;
    }

    mockDatabase.reports.push(report);
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const blockedUser: BlockedUser = {
      id: createId("blocked"),
      blockerId: userId,
      blockedUserId,
      createdAt: new Date().toISOString()
    };

    mockDatabase.blockedUsers.push(blockedUser);
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    mockDatabase.blockedUsers = mockDatabase.blockedUsers.filter(
      (blockedUser) =>
        blockedUser.blockerId !== userId ||
        blockedUser.blockedUserId !== blockedUserId,
    );
  }

  async muteUser(userId: string, mutedUserId: string): Promise<void> {
    const user = findUser(userId);
    user.mutedUsers = Array.from(
      new Set([...(user.mutedUsers ?? []), mutedUserId]),
    );

    mockDatabase.mutedUsers.push({
      userId,
      mutedUserId,
      createdAt: new Date().toISOString()
    });
  }
}
