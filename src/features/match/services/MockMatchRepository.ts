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
    badges: ["verified_profile", "community_member", "staff_badge"],
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
    const existingLike = mockDatabase.likes.find(
      (like) => like.fromUserId === userId && like.toUserId === targetUserId,
    );
    const timestamp = new Date().toISOString();

    if (existingLike) {
      existingLike.action = action;
      existingLike.createdAt = timestamp;
    } else {
      mockDatabase.likes.push({
        id: createId("like"),
        fromUserId: userId,
        toUserId: targetUserId,
        action,
        createdAt: timestamp
      });
    }

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

  async undoLastSwipe(userId: string) {
    const user = findUser(userId);

    if (!user.isPremium) {
      throw new Error("Geri al Premium ile kullanılabilir.");
    }

    const lastLike = [...mockDatabase.likes]
      .filter((like) => like.fromUserId === userId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0];

    if (!lastLike) {
      throw new Error("Geri alınacak işlem yok.");
    }

    mockDatabase.likes = mockDatabase.likes.filter((like) => like.id !== lastLike.id);
    const match = mockDatabase.matches.find((candidate) =>
      candidate.users.every((candidateUser) =>
        candidateUser.id === userId || candidateUser.id === lastLike.toUserId,
      ),
    );

    if (match) {
      mockDatabase.matches = mockDatabase.matches.filter(
        (candidate) => candidate.id !== match.id,
      );
      mockDatabase.conversations = mockDatabase.conversations.filter(
        (conversation) =>
          !conversation.participants.every((participant) =>
            participant.id === userId || participant.id === lastLike.toUserId,
          ),
      );
    }

    return {
      targetUserId: lastLike.toUserId,
      action: lastLike.action,
      matchRemoved: Boolean(match),
    };
  }

  async listLikedMe(userId: string) {
    const user = findUser(userId);

    if (!user.isPremium) {
      throw new Error("Seni beğenenleri görmek Premium ile kullanılabilir.");
    }

    const ownActions = new Set(
      mockDatabase.likes
        .filter((like) => like.fromUserId === userId)
        .map((like) => like.toUserId),
    );

    return mockDatabase.likes
      .filter(
        (like) =>
          like.toUserId === userId &&
          like.action !== "pass" &&
          !ownActions.has(like.fromUserId) &&
          !hasExistingMatch(userId, like.fromUserId),
      )
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .map((like) => ({
        user: findUser(like.fromUserId),
        action: like.action as "like" | "super_like",
        likedAt: like.createdAt,
      }));
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
