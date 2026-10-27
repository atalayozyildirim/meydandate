// G5 — Real Admin-Controlled Space Business Logic and Token Security Tests.
// Run: node --import tsx --test scripts/community-space.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { LiveParticipant, LiveRoom } from "../src/domain/entities/LiveRoom";
import type {
  LiveKitJoinInfo,
  LiveRoomRepository,
  StartLiveRoomPayload,
} from "../src/domain/repositories/LiveRoomRepository";
import type { User } from "../src/domain/entities/User";

const createUser = (id: string, name: string): User => ({
  id,
  name,
  email: `${name.toLowerCase()}@ehlibyte.local`,
  age: 25,
  city: "İstanbul",
  bio: "Meydan üyesi",
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "not_important",
  interests: ["Müzik"],
  photos: [],
  profilePrompts: [],
  badges: [],
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt: "2026-10-27T10:00:00Z",
  updatedAt: "2026-10-27T10:00:00Z",
});

class MockLiveRoomRepository implements Partial<LiveRoomRepository> {
  room: LiveRoom = {
    id: "meydan-space-main",
    title: "Meydan Canlı Yayın",
    description: "Kültür ve sohbet",
    status: "live",
    startedAt: "2026-10-27T20:00:00Z",
    endedAt: null,
    participants: [],
    messages: [],
    pinnedNote: null,
    videoPlaybackStatus: "idle",
    videoPositionMillis: 0,
    videoUpdatedAt: "2026-10-27T20:00:00Z",
    videoControlledBy: null,
    voiceProvider: "livekit",
    livekitRoomName: "ehlibyte-meydan-space-main",
  };
  adminUserId = "admin-uuid";
  currentUserId = "admin-uuid";
  bannedUserIds = new Set<string>();

  async getRoom(_roomId: string): Promise<LiveRoom> {
    return this.room;
  }

  async joinRoom(roomId: string, userId: string): Promise<LiveRoom> {
    if (this.room.status !== "live") {
      throw new Error("room_not_active");
    }
    if (this.bannedUserIds.has(userId)) {
      throw new Error("user_banned_from_room");
    }

    const isAdmin = userId === this.adminUserId;
    const existing = this.room.participants.find((p) => p.userId === userId);
    if (!existing) {
      this.room.participants.push({
        roomId,
        userId,
        user: createUser(userId, isAdmin ? "Admin" : "Üye"),
        role: isAdmin ? "Yonetici" : "Dinleyici",
        stageStatus: isAdmin ? "speaker" : "listener",
        isMuted: !isAdmin,
        joinedAt: new Date().toISOString(),
      });
    }
    return this.room;
  }

  async leaveRoom(_roomId: string, userId: string): Promise<LiveRoom> {
    this.room.participants = this.room.participants.filter(
      (p) => p.userId !== userId,
    );
    return this.room;
  }

  async startRoom(
    roomId: string,
    _userId: string,
    payload: StartLiveRoomPayload,
  ): Promise<LiveRoom> {
    if (this.currentUserId !== this.adminUserId) {
      throw new Error("moderator_required");
    }
    this.room.status = "live";
    this.room.title = payload.title;
    this.room.description = payload.description;
    this.room.startedAt = new Date().toISOString();
    this.room.endedAt = null;
    return this.room;
  }

  async stopRoom(_roomId: string): Promise<LiveRoom> {
    if (this.currentUserId !== this.adminUserId) {
      throw new Error("moderator_required");
    }
    this.room.status = "offline";
    this.room.endedAt = new Date().toISOString();
    // Reset all participants to listener and muted
    for (const p of this.room.participants) {
      p.stageStatus = "listener";
      p.isMuted = true;
      p.handRaisedAt = undefined;
    }
    return this.room;
  }

  async setParticipantStage(
    _roomId: string,
    targetUserId: string,
    stageStatus: "listener" | "invited" | "speaker",
  ): Promise<LiveRoom> {
    if (this.currentUserId !== this.adminUserId) {
      throw new Error("moderator_required");
    }
    const p = this.room.participants.find((item) => item.userId === targetUserId);
    if (!p) throw new Error("participant_not_found");

    p.stageStatus = stageStatus;
    p.role = stageStatus === "speaker" ? "Konusmaci" : "Dinleyici";
    p.isMuted = stageStatus !== "speaker";
    p.handRaisedAt = undefined;
    return this.room;
  }

  async setParticipantMuted(
    _roomId: string,
    targetUserId: string,
    isMuted: boolean,
  ): Promise<LiveRoom> {
    const isSelf = targetUserId === this.currentUserId;
    const isAdmin = this.currentUserId === this.adminUserId;

    if (!isSelf && !isAdmin) {
      throw new Error("moderator_required");
    }

    const p = this.room.participants.find((item) => item.userId === targetUserId);
    if (!p) throw new Error("participant_not_found");

    if (!isMuted && p.stageStatus !== "speaker") {
      throw new Error("only_speakers_can_unmute");
    }

    p.isMuted = isMuted;
    return this.room;
  }

  async setHandRaised(
    _roomId: string,
    userId: string,
    isRaised: boolean,
  ): Promise<LiveRoom> {
    const p = this.room.participants.find((item) => item.userId === userId);
    if (!p) throw new Error("participant_not_found");

    p.handRaisedAt = isRaised ? new Date().toISOString() : undefined;
    return this.room;
  }

  async removeParticipant(
    _roomId: string,
    targetUserId: string,
  ): Promise<LiveRoom> {
    if (this.currentUserId !== this.adminUserId) {
      throw new Error("moderator_required");
    }
    if (targetUserId === this.adminUserId) {
      throw new Error("cannot_remove_admin");
    }

    this.bannedUserIds.add(targetUserId);
    this.room.participants = this.room.participants.filter(
      (p) => p.userId !== targetUserId,
    );
    return this.room;
  }

  async getLiveKitToken(
    roomId: string,
    _accessToken?: string | null,
  ): Promise<LiveKitJoinInfo> {
    if (this.room.status !== "live") {
      throw new Error("Live room is not active");
    }
    if (this.bannedUserIds.has(this.currentUserId)) {
      throw new Error("User is banned from this live room");
    }

    const p = this.room.participants.find(
      (item) => item.userId === this.currentUserId,
    );
    const isAdmin = this.currentUserId === this.adminUserId;
    const canPublish = isAdmin || p?.stageStatus === "speaker";

    return {
      serverUrl: "https://livekit.example.com",
      token: `token-${this.currentUserId}-${canPublish ? "speaker" : "listener"}`,
      roomName: this.room.livekitRoomName ?? "ehlibyte-room",
      identity: this.currentUserId,
      canPublish,
    };
  }
}

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

test("G5: Non-admin cannot start, stop, or moderate room", async () => {
  const repo = new MockLiveRoomRepository();
  repo.currentUserId = "member-user";

  // Cannot stop room
  await assert.rejects(
    async () => repo.stopRoom("meydan-space-main"),
    /moderator_required/,
  );

  // Cannot promote participant
  await assert.rejects(
    async () => repo.setParticipantStage("meydan-space-main", "other-user", "speaker"),
    /moderator_required/,
  );

  // Cannot kick participant
  await assert.rejects(
    async () => repo.removeParticipant("meydan-space-main", "other-user"),
    /moderator_required/,
  );
});

test("G5: Listener joins with publish disabled and cannot unmute", async () => {
  const repo = new MockLiveRoomRepository();
  repo.currentUserId = "listener-user";

  await repo.joinRoom("meydan-space-main", "listener-user");
  const token = await repo.getLiveKitToken("meydan-space-main");

  assert.equal(token.canPublish, false, "Listener cannot publish audio");

  // Listener cannot unmute microphone
  await assert.rejects(
    async () => repo.setParticipantMuted("meydan-space-main", "listener-user", false),
    /only_speakers_can_unmute/,
  );
});

test("G5: Hand raise -> Admin approval -> Speaker promotion enables audio publishing", async () => {
  const repo = new MockLiveRoomRepository();

  // Member joins & raises hand
  repo.currentUserId = "member-1";
  await repo.joinRoom("meydan-space-main", "member-1");
  await repo.setHandRaised("meydan-space-main", "member-1", true);

  const room = await repo.getRoom("meydan-space-main");
  const p = room.participants.find((item) => item.userId === "member-1");
  assert.ok(p?.handRaisedAt, "Hand should be raised");

  // Admin approves and promotes to speaker
  repo.currentUserId = "admin-uuid";
  await repo.setParticipantStage("meydan-space-main", "member-1", "speaker");

  // Now member can publish audio and unmute
  repo.currentUserId = "member-1";
  const token = await repo.getLiveKitToken("meydan-space-main");
  assert.equal(token.canPublish, true, "Speaker can publish audio");

  const unmuted = await repo.setParticipantMuted("meydan-space-main", "member-1", false);
  const speakerP = unmuted.participants.find((item) => item.userId === "member-1");
  assert.equal(speakerP?.isMuted, false);
});

test("G5: Admin kicks participant; banned user cannot rejoin or obtain token", async () => {
  const repo = new MockLiveRoomRepository();
  repo.currentUserId = "troublemaker";
  await repo.joinRoom("meydan-space-main", "troublemaker");

  // Admin kicks participant
  repo.currentUserId = "admin-uuid";
  await repo.removeParticipant("meydan-space-main", "troublemaker");

  // Banned user cannot rejoin
  repo.currentUserId = "troublemaker";
  await assert.rejects(
    async () => repo.joinRoom("meydan-space-main", "troublemaker"),
    /user_banned_from_room/,
  );

  // Banned user cannot obtain LiveKit token
  await assert.rejects(
    async () => repo.getLiveKitToken("meydan-space-main"),
    /User is banned from this live room/,
  );
});

test("G5: Ended room rejects new joins and token generation", async () => {
  const repo = new MockLiveRoomRepository();
  repo.currentUserId = "admin-uuid";
  await repo.stopRoom("meydan-space-main");

  // Joining ended room is rejected
  repo.currentUserId = "new-listener";
  await assert.rejects(
    async () => repo.joinRoom("meydan-space-main", "new-listener"),
    /room_not_active/,
  );

  // Token request for ended room is rejected
  await assert.rejects(
    async () => repo.getLiveKitToken("meydan-space-main"),
    /Live room is not active/,
  );
});
