// Mock kullanici repository'si profil, onboarding ve guvenlik islemlerini yonetir.
import type { Report, BlockedUser } from "@/domain/entities/Match";
import type { User, UserProfileUpdate } from "@/domain/entities/User";
import type { OnboardingProfile, ReportPayload, UserRepository } from "@/domain/repositories/UserRepository";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

const findUser = (userId: string) => {
  const user = mockDatabase.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new Error("Kullanici bulunamadi.");
  }

  return user;
};

const mergeUser = (user: User, update: UserProfileUpdate): User => ({
  ...user,
  ...update,
  updatedAt: new Date().toISOString()
});

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

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    const blockedIds = new Set(
      mockDatabase.blockedUsers
        .filter((blockedUser) => blockedUser.blockerId === userId)
        .map((blockedUser) => blockedUser.blockedUserId)
    );
    const actedUserIds = new Set(
      mockDatabase.likes
        .filter((like) => like.fromUserId === userId)
        .map((like) => like.toUserId)
    );

    return mockDatabase.users.filter(
      (user) =>
        user.id !== userId &&
        user.hasPassedEntryTest &&
        user.hasCompletedOnboarding &&
        !blockedIds.has(user.id) &&
        !actedUserIds.has(user.id)
    );
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

  async muteUser(userId: string, mutedUserId: string): Promise<void> {
    mockDatabase.mutedUsers.push({
      userId,
      mutedUserId,
      createdAt: new Date().toISOString()
    });
  }
}
