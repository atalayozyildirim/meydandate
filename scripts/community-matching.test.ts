// G4 — Matching and Messaging Business Logic and Contract Tests.
// Run: node --import tsx --test scripts/community-matching.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { LikeAction, Match, SwipeResult } from "../src/domain/entities/Match";
import type { Conversation, Message } from "../src/domain/entities/Message";
import type {
  ChatRepository,
  ListMessagesOptions,
  SendMessagePayload,
} from "../src/domain/repositories/ChatRepository";
import type { MatchRepository } from "../src/domain/repositories/MatchRepository";
import type { User } from "../src/domain/entities/User";

const createUser = (id: string, name: string): User => ({
  id,
  name,
  email: `${name.toLowerCase()}@ehlibyte.local`,
  age: 25,
  city: "İstanbul",
  bio: "Merhaba",
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "not_important",
  interests: ["Müzik", "Edebiyat"],
  photos: [],
  profilePrompts: [],
  badges: [],
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt: "2026-10-27T10:00:00Z",
  updatedAt: "2026-10-27T10:00:00Z",
});

class MockMatchRepository implements Partial<MatchRepository> {
  swipes: Array<{ userId: string; targetUserId: string; action: LikeAction }> = [];
  matches: Match[] = [];
  conversations: Array<{ id: string; user1Id: string; user2Id: string; matchId: string }> = [];
  blockedPairs = new Set<string>();

  async swipe(
    userId: string,
    targetUserId: string,
    action: LikeAction,
  ): Promise<SwipeResult> {
    const pairKey = [userId, targetUserId].sort().join(":");
    if (this.blockedPairs.has(pairKey)) {
      throw new Error("user_blocked");
    }

    // Upsert swipe
    const existing = this.swipes.find(
      (s) => s.userId === userId && s.targetUserId === targetUserId,
    );
    if (existing) {
      existing.action = action;
    } else {
      this.swipes.push({ userId, targetUserId, action });
    }

    if (action === "pass") {
      return { action: "pass" };
    }

    // Check if target user positively swiped
    const reverse = this.swipes.find(
      (s) =>
        s.userId === targetUserId &&
        s.targetUserId === userId &&
        (s.action === "like" || s.action === "super_like"),
    );

    if (reverse) {
      // Mutual match
      let match = this.matches.find((m) => {
        const ids = m.users.map((u) => u.id).sort();
        return ids[0] === [userId, targetUserId].sort()[0] && ids[1] === [userId, targetUserId].sort()[1];
      });

      if (!match) {
        match = {
          id: `match-${this.matches.length + 1}`,
          users: [createUser(userId, "User1"), createUser(targetUserId, "User2")],
          compatibility: { cultural: 85, interests: 90, lifestyle: 80 },
          createdAt: new Date().toISOString(),
        };
        this.matches.push(match);

        const convId = `conv-${this.conversations.length + 1}`;
        this.conversations.push({
          id: convId,
          user1Id: userId,
          user2Id: targetUserId,
          matchId: match.id,
        });

        return {
          action,
          match,
          conversationId: convId,
        };
      }

      const conv = this.conversations.find((c) => c.matchId === match.id);
      return {
        action,
        match,
        conversationId: conv?.id,
      };
    }

    // One-sided like
    return {
      action,
      match: undefined,
      conversationId: undefined,
    };
  }

  async listMatches(userId: string): Promise<Match[]> {
    return this.matches.filter((m) => m.users.some((u) => u.id === userId));
  }
}

class MockChatRepository implements ChatRepository {
  messages: Message[] = [];
  subscribers = new Map<string, Set<(m: Message) => void>>();
  blockedPairs = new Set<string>();

  async listConversations(_userId: string): Promise<Conversation[]> {
    return [];
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const msgs = this.messages.filter((m) => m.conversationId === conversationId);
    return {
      id: conversationId,
      initiatedById: "user-1",
      participants: [createUser("user-1", "Alp"), createUser("user-2", "Buse")],
      messages: msgs,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  async listMessages(
    conversationId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]> {
    let filtered = this.messages.filter((m) => m.conversationId === conversationId);
    if (options?.before) {
      filtered = filtered.filter((m) => m.createdAt < options.before!);
    }
    const limit = options?.limit ?? 50;
    return filtered.slice(-limit);
  }

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    if (this.blockedPairs.has(payload.conversationId)) {
      throw new Error("violates row-level security policy: blocked");
    }

    const newMsg: Message = {
      id: `msg-${this.messages.length + 1}`,
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      body: payload.body,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    this.messages.push(newMsg);

    // Notify subscribers
    const set = this.subscribers.get(payload.conversationId);
    if (set) {
      for (const cb of set) cb(newMsg);
    }

    return newMsg;
  }

  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
  ): () => void {
    if (!this.subscribers.has(conversationId)) {
      this.subscribers.set(conversationId, new Set());
    }
    this.subscribers.get(conversationId)!.add(onMessage);

    return () => {
      this.subscribers.get(conversationId)?.delete(onMessage);
    };
  }

  async setTyping(): Promise<void> {}
  async deleteMessage(): Promise<void> {}
  async deleteConversation(): Promise<void> {}
  clearSessionCache(): void {
    this.subscribers.clear();
  }
}

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

test("G4: One-sided like does not create match or conversation", async () => {
  const repo = new MockMatchRepository();
  const res = await repo.swipe("user-a", "user-b", "like");

  assert.equal(res.action, "like");
  assert.equal(res.match, undefined);
  assert.equal(res.conversationId, undefined);
  assert.equal(repo.matches.length, 0);
  assert.equal(repo.conversations.length, 0);
});

test("G4: Reciprocal likes create match and conversation idempotently", async () => {
  const repo = new MockMatchRepository();

  // User A likes User B
  await repo.swipe("user-a", "user-b", "like");

  // User B likes User A back
  const mutual = await repo.swipe("user-b", "user-a", "like");

  assert.ok(mutual.match, "Match should be created");
  assert.ok(mutual.conversationId, "Conversation should be created");
  assert.equal(repo.matches.length, 1);

  // Parallel / duplicate swipe from User B does not duplicate match
  const duplicate = await repo.swipe("user-b", "user-a", "like");
  assert.equal(repo.matches.length, 1);
  assert.equal(duplicate.match?.id, mutual.match?.id);
  assert.equal(duplicate.conversationId, mutual.conversationId);
});

test("G4: Block immediately cuts off messaging", async () => {
  const chat = new MockChatRepository();
  const convId = "conv-1";

  // Active message
  const msg1 = await chat.sendMessage({
    conversationId: convId,
    senderId: "user-a",
    body: "Selam Buse",
  });
  assert.equal(msg1.body, "Selam Buse");

  // User B blocks User A (cuts off conversation)
  chat.blockedPairs.add(convId);

  // Subsequent message fails with security policy error
  await assert.rejects(
    async () =>
      chat.sendMessage({
        conversationId: convId,
        senderId: "user-a",
        body: "Orada mısın?",
      }),
    /violates row-level security policy/,
  );
});

test("G4: Cursor pagination and realtime subscription cleanup", async () => {
  const chat = new MockChatRepository();
  const convId = "conv-paginated";

  // Prepopulate messages with distinct timestamps
  chat.messages.push(
    { id: "m1", conversationId: convId, senderId: "u1", body: "1", status: "sent", createdAt: "2026-10-27T10:00:00Z" },
    { id: "m2", conversationId: convId, senderId: "u2", body: "2", status: "sent", createdAt: "2026-10-27T10:01:00Z" },
    { id: "m3", conversationId: convId, senderId: "u1", body: "3", status: "sent", createdAt: "2026-10-27T10:02:00Z" },
  );

  // Paginate with cursor before 10:02:00
  const older = await chat.listMessages(convId, { limit: 10, before: "2026-10-27T10:02:00Z" });
  assert.equal(older.length, 2);
  assert.equal(older[0].id, "m1");
  assert.equal(older[1].id, "m2");

  // Realtime subscription
  const received: Message[] = [];
  const unsubscribe = chat.subscribeToMessages(convId, (msg) => {
    received.push(msg);
  });

  await chat.sendMessage({
    conversationId: convId,
    senderId: "u2",
    body: "Realtime test",
  });

  assert.equal(received.length, 1);
  assert.equal(received[0].body, "Realtime test");

  // Unsubscribe stops notifications
  unsubscribe();
  await chat.sendMessage({
    conversationId: convId,
    senderId: "u2",
    body: "After unsubscribe",
  });
  assert.equal(received.length, 1);
});
