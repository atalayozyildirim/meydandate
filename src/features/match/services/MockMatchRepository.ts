// Mock eslesme repository'si swipe sonucunda karsilikli match uretir.
import type { Like, Match } from "@/domain/entities/Match";
import type { MatchRepository, SwipeResult } from "@/domain/repositories/MatchRepository";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

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
}
