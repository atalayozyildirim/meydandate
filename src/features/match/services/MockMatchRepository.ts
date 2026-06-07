// Mock eslesme repository'si swipe sonucunda karsilikli match uretir.
import type { Like, Match, SpecialMatchInvite } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import type { MatchRepository, SwipeResult } from "@/domain/repositories/MatchRepository";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { isZeynepCisemAlias } from "@/shared/utils/specialInvite";

const specialInvites: SpecialMatchInvite[] = [];

const getAtalayAdminUser = (): User => {
  const existing = mockDatabase.users.find((user) => user.email === "atalay@ehlibyte.app");

  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const atalay: User = {
    id: "user-atalay-admin",
    name: "Atalay Özyıldırım",
    email: "atalay@ehlibyte.app",
    age: 30,
    city: "Istanbul",
    occupation: "Uygulama admini",
    bio: "Ehlibyte topluluğunu yöneten admin hesabı.",
    culturalIdentity: "alevi",
    cultureImportance: "important",
    interests: ["cem_culture", "turkish_folk_music", "literature", "solidarity"],
    photos: [],
    badges: ["verified_profile", "community_member"],
    isPremium: true,
    hasPassedEntryTest: false,
    hasCompletedOnboarding: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  mockDatabase.users.push(atalay);
  return atalay;
};

const findUser = (userId: string) => {
  const user = mockDatabase.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new Error("Kullanici bulunamadi.");
  }

  return user;
};

const hasExistingMatch = (userId: string, targetUserId: string) =>
  mockDatabase.matches.some((match) => match.users.every((user) => user.id === userId || user.id === targetUserId));

export class MockMatchRepository implements MatchRepository {
  async swipe(userId: string, targetUserId: string, action: Like["action"]): Promise<SwipeResult> {
    const like: Like = {
      id: createId("like"),
      fromUserId: userId,
      toUserId: targetUserId,
      action,
      createdAt: new Date().toISOString()
    };
    mockDatabase.likes.push(like);

    if (action === "pass") {
      return { action };
    }

    const hasMutualLike = mockDatabase.likes.some(
      (candidateLike) =>
        candidateLike.fromUserId === targetUserId &&
        candidateLike.toUserId === userId &&
        candidateLike.action !== "pass"
    );

    if (!hasMutualLike || hasExistingMatch(userId, targetUserId)) {
      return { action };
    }

    const currentUser = findUser(userId);
    const targetUser = findUser(targetUserId);
    const timestamp = new Date().toISOString();
    const match: Match = {
      id: createId("match"),
      users: [currentUser, targetUser],
      compatibility: calculateCulturalMatchScore(currentUser, targetUser),
      createdAt: timestamp
    };

    mockDatabase.matches.push(match);
    const conversationId = createId("conversation");
    mockDatabase.conversations.push({
      id: conversationId,
      participants: [currentUser, targetUser],
      messages: [],
      unreadCount: 0,
      typingState: {
        conversationId,
        userId: targetUserId,
        isTyping: false,
        updatedAt: timestamp
      },
      updatedAt: timestamp
    });

    return { action, match };
  }

  async listMatches(userId: string): Promise<Match[]> {
    return mockDatabase.matches.filter((match) => match.users.some((user) => user.id === userId));
  }

  async claimSpecialInvite(userId: string): Promise<void> {
    const user = findUser(userId);

    if (!isZeynepCisemAlias(user.name)) {
      return;
    }

    const inviter = getAtalayAdminUser();

    if (inviter.id === user.id) {
      return;
    }

    const existing = specialInvites.find(
      (invite) => invite.inviter.id === inviter.id && invite.targetName === user.name,
    );

    if (existing) {
      return;
    }

    specialInvites.push({
      id: createId("special-invite"),
      inviter,
      targetName: user.name,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  async getPendingSpecialInvite(userId: string): Promise<SpecialMatchInvite | null> {
    const user = findUser(userId);

    if (!isZeynepCisemAlias(user.name)) {
      return null;
    }

    return specialInvites.find((invite) => invite.targetName === user.name && invite.status === "pending") ?? null;
  }

  async acceptSpecialInvite(userId: string, inviteId: string): Promise<Match> {
    const invite = specialInvites.find((candidate) => candidate.id === inviteId && candidate.status === "pending");
    const currentUser = findUser(userId);

    if (!invite) {
      throw new Error("Özel davet bulunamadı.");
    }

    const existingMatch = mockDatabase.matches.find((candidate) =>
      candidate.users.every((user) => user.id === userId || user.id === invite.inviter.id),
    );

    if (existingMatch) {
      invite.status = "accepted";
      return existingMatch;
    }

    const timestamp = new Date().toISOString();
    const match: Match = {
      id: createId("match"),
      users: [invite.inviter, currentUser],
      compatibility: calculateCulturalMatchScore(invite.inviter, currentUser),
      createdAt: timestamp,
    };

    mockDatabase.matches.push(match);
    const conversationId = createId("conversation");
    mockDatabase.conversations.push({
      id: conversationId,
      participants: [invite.inviter, currentUser],
      messages: [],
      unreadCount: 0,
      typingState: {
        conversationId,
        userId: invite.inviter.id,
        isTyping: false,
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    });
    invite.status = "accepted";

    return match;
  }

  async declineSpecialInvite(_userId: string, inviteId: string): Promise<void> {
    const invite = specialInvites.find((candidate) => candidate.id === inviteId && candidate.status === "pending");

    if (invite) {
      invite.status = "declined";
    }
  }
}
