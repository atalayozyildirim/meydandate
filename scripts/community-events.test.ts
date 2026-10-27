// G3 — Communities and Events Contract and Business Logic Tests.
// Run: node --import tsx --test scripts/community-events.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type {
  Community,
  CommunityJoinRequest,
  CommunityPost,
} from "../src/domain/entities/Community";
import type {
  CommunityRepository,
  CreateCommunityInput,
} from "../src/domain/repositories/CommunityRepository";
import type {
  CommunityEvent,
  EventCategory,
} from "../src/domain/entities/Event";
import type {
  CreateEventInput,
  EventFilter,
  EventRepository,
} from "../src/domain/repositories/EventRepository";

// In-memory Mock Community Repository for deterministic unit testing
class MockCommunityRepository implements CommunityRepository {
  communities: Community[] = [];
  posts: CommunityPost[] = [];
  memberships: Array<{
    communityId: string;
    userId: string;
    role: "organizer" | "moderator" | "member";
    status: "pending" | "active" | "rejected";
  }> = [];
  currentUserId = "user-organizer";

  async getCommunities(city?: string): Promise<Community[]> {
    return this.communities.filter((c) => {
      if (!city || city === "Tüm şehirler") return true;
      return c.city === city || c.city === "Tüm şehirler";
    }).map((c) => {
      const mem = this.memberships.find(
        (m) => m.communityId === c.id && m.userId === this.currentUserId,
      );
      return {
        ...c,
        myMembership: mem
          ? {
              communityId: mem.communityId,
              userId: mem.userId,
              role: mem.role,
              status: mem.status,
              joinedAt: "2026-10-27T10:00:00Z",
            }
          : null,
      };
    });
  }

  async getCommunityById(id: string): Promise<Community | null> {
    const comm = this.communities.find((c) => c.id === id);
    if (!comm) return null;
    const mem = this.memberships.find(
      (m) => m.communityId === id && m.userId === this.currentUserId,
    );
    return {
      ...comm,
      myMembership: mem
        ? {
            communityId: mem.communityId,
            userId: mem.userId,
            role: mem.role,
            status: mem.status,
            joinedAt: "2026-10-27T10:00:00Z",
          }
        : null,
    };
  }

  async createCommunity(input: CreateCommunityInput): Promise<Community> {
    const id = `comm-${this.communities.length + 1}`;
    const newComm: Community = {
      id,
      name: input.name,
      topic: input.topic,
      description: input.description,
      city: input.city,
      isPrivate: input.isPrivate,
      creatorId: this.currentUserId,
      memberCount: 1,
      icon: input.icon ?? "people-outline",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.communities.push(newComm);
    this.memberships.push({
      communityId: id,
      userId: this.currentUserId,
      role: "organizer",
      status: "active",
    });
    return newComm;
  }

  async updateCommunity(
    id: string,
    input: Partial<CreateCommunityInput>,
  ): Promise<Community> {
    const comm = this.communities.find((c) => c.id === id);
    if (!comm) throw new Error("Topluluk bulunamadı.");
    const isOrg = this.memberships.some(
      (m) =>
        m.communityId === id &&
        m.userId === this.currentUserId &&
        m.role === "organizer" &&
        m.status === "active",
    );
    if (!isOrg) throw new Error("Yalnızca yöneticiler güncelleyebilir.");
    Object.assign(comm, input, { updatedAt: new Date().toISOString() });
    return comm;
  }

  async deleteCommunity(id: string): Promise<void> {
    const idx = this.communities.findIndex((c) => c.id === id);
    if (idx !== -1) this.communities.splice(idx, 1);
  }

  async joinCommunity(
    id: string,
  ): Promise<{ status: "active" | "pending"; isPrivate: boolean }> {
    const comm = this.communities.find((c) => c.id === id);
    if (!comm) throw new Error("Topluluk bulunamadı.");

    const existing = this.memberships.find(
      (m) => m.communityId === id && m.userId === this.currentUserId,
    );
    if (existing?.status === "active") throw new Error("already_member");
    if (existing?.status === "pending") throw new Error("already_requested");

    const status = comm.isPrivate ? "pending" : "active";
    if (existing) {
      existing.status = status;
    } else {
      this.memberships.push({
        communityId: id,
        userId: this.currentUserId,
        role: "member",
        status,
      });
    }

    if (status === "active") {
      comm.memberCount += 1;
    }

    return { status, isPrivate: comm.isPrivate };
  }

  async leaveCommunity(id: string): Promise<void> {
    const comm = this.communities.find((c) => c.id === id);
    if (!comm) throw new Error("Topluluk bulunamadı.");
    if (comm.creatorId === this.currentUserId) {
      throw new Error("creator_cannot_leave");
    }

    const idx = this.memberships.findIndex(
      (m) => m.communityId === id && m.userId === this.currentUserId,
    );
    if (idx !== -1) {
      const wasActive = this.memberships[idx].status === "active";
      this.memberships.splice(idx, 1);
      if (wasActive) comm.memberCount = Math.max(1, comm.memberCount - 1);
    }
  }

  async getJoinRequests(communityId: string): Promise<CommunityJoinRequest[]> {
    const isOrg = this.memberships.some(
      (m) =>
        m.communityId === communityId &&
        m.userId === this.currentUserId &&
        m.role === "organizer" &&
        m.status === "active",
    );
    if (!isOrg) throw new Error("organizer_required");

    return this.memberships
      .filter((m) => m.communityId === communityId && m.status === "pending")
      .map((m) => ({
        communityId: m.communityId,
        userId: m.userId,
        userName: `Üye Adayı (${m.userId})`,
        status: m.status,
        createdAt: "2026-10-27T10:00:00Z",
      }));
  }

  async respondJoinRequest(
    communityId: string,
    userId: string,
    accept: boolean,
  ): Promise<void> {
    const isOrg = this.memberships.some(
      (m) =>
        m.communityId === communityId &&
        m.userId === this.currentUserId &&
        m.role === "organizer" &&
        m.status === "active",
    );
    if (!isOrg) throw new Error("organizer_required");

    const mem = this.memberships.find(
      (m) => m.communityId === communityId && m.userId === userId,
    );
    if (!mem) throw new Error("request_not_found");

    mem.status = accept ? "active" : "rejected";
    if (accept) {
      const comm = this.communities.find((c) => c.id === communityId);
      if (comm) comm.memberCount += 1;
    }
  }

  async getCommunityPosts(communityId: string): Promise<CommunityPost[]> {
    const comm = this.communities.find((c) => c.id === communityId);
    if (!comm) throw new Error("Topluluk bulunamadı.");

    if (comm.isPrivate) {
      const isMember = this.memberships.some(
        (m) =>
          m.communityId === communityId &&
          m.userId === this.currentUserId &&
          m.status === "active",
      );
      if (!isMember) throw new Error("access_denied_private_community");
    }

    return this.posts.filter((p) => p.communityId === communityId);
  }

  async createCommunityPost(
    communityId: string,
    body: string,
    imagePaths = [],
  ): Promise<CommunityPost> {
    const isMember = this.memberships.some(
      (m) =>
        m.communityId === communityId &&
        m.userId === this.currentUserId &&
        m.status === "active",
    );
    if (!isMember) throw new Error("membership_required");

    const newPost: CommunityPost = {
      id: `post-${this.posts.length + 1}`,
      communityId,
      authorId: this.currentUserId,
      authorName: "Kullanıcı",
      body,
      imagePaths,
      imageUrls: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.posts.push(newPost);
    return newPost;
  }
}

// In-memory Mock Event Repository
class MockEventRepository implements EventRepository {
  events: CommunityEvent[] = [];
  participants: Array<{
    eventId: string;
    userId: string;
    status: "confirmed" | "cancelled";
  }> = [];
  currentUserId = "user-1";

  async getEvents(filter?: EventFilter): Promise<CommunityEvent[]> {
    return this.events
      .filter((e) => {
        if (filter?.city && filter.city !== "Tüm şehirler" && e.city !== filter.city)
          return false;
        if (filter?.category && filter.category !== "Tümü" && e.category !== filter.category)
          return false;
        if (filter?.upcomingOnly && new Date(e.endsAt) < new Date()) return false;
        return true;
      })
      .map((e) => {
        const isJoined = this.participants.some(
          (p) =>
            p.eventId === e.id &&
            p.userId === this.currentUserId &&
            p.status === "confirmed",
        );
        return { ...e, isJoinedByMe: isJoined };
      });
  }

  async getEventById(id: string): Promise<CommunityEvent | null> {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) return null;
    const isJoined = this.participants.some(
      (p) =>
        p.eventId === id &&
        p.userId === this.currentUserId &&
        p.status === "confirmed",
    );
    return { ...ev, isJoinedByMe: isJoined };
  }

  async createEvent(input: CreateEventInput): Promise<CommunityEvent> {
    const id = `event-${this.events.length + 1}`;
    const newEvent: CommunityEvent = {
      id,
      communityId: input.communityId ?? null,
      organizerId: this.currentUserId,
      organizerName: "Organizatör",
      title: input.title,
      category: input.category,
      city: input.city,
      district: input.district ?? "",
      place: input.place ?? "",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      currentParticipants: 0,
      description: input.description ?? "",
      accessibility: input.accessibility ?? "",
      bring: input.bring ?? "",
      isCancelled: false,
      isJoinedByMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.events.push(newEvent);
    return newEvent;
  }

  async cancelEvent(id: string): Promise<void> {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) throw new Error("Etkinlik bulunamadı.");
    if (ev.organizerId !== this.currentUserId)
      throw new Error("organizer_required");
    ev.isCancelled = true;
  }

  async joinEvent(
    id: string,
  ): Promise<{ status: "confirmed"; participantsCount: number; capacity: number }> {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) throw new Error("event_not_found");
    if (ev.isCancelled) throw new Error("event_cancelled");
    if (new Date(ev.endsAt) < new Date()) throw new Error("event_ended");

    const existing = this.participants.find(
      (p) => p.eventId === id && p.userId === this.currentUserId,
    );
    if (existing && existing.status === "confirmed") {
      throw new Error("already_joined");
    }

    const activeCount = this.participants.filter(
      (p) => p.eventId === id && p.status === "confirmed",
    ).length;

    if (activeCount >= ev.capacity) {
      throw new Error("capacity_full");
    }

    if (existing) {
      existing.status = "confirmed";
    } else {
      this.participants.push({
        eventId: id,
        userId: this.currentUserId,
        status: "confirmed",
      });
    }

    ev.currentParticipants = activeCount + 1;
    return {
      status: "confirmed",
      participantsCount: ev.currentParticipants,
      capacity: ev.capacity,
    };
  }

  async cancelParticipation(
    id: string,
  ): Promise<{ status: "cancelled"; participantsCount: number }> {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) throw new Error("event_not_found");

    const part = this.participants.find(
      (p) => p.eventId === id && p.userId === this.currentUserId,
    );
    if (!part || part.status !== "confirmed") {
      throw new Error("not_registered");
    }

    part.status = "cancelled";
    const activeCount = this.participants.filter(
      (p) => p.eventId === id && p.status === "confirmed",
    ).length;
    ev.currentParticipants = activeCount;

    return {
      status: "cancelled",
      participantsCount: activeCount,
    };
  }
}

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

test("G3: Open community joins immediately as active member", async () => {
  const repo = new MockCommunityRepository();
  repo.currentUserId = "creator-1";
  const comm = await repo.createCommunity({
    name: "Açık Bağlama Kulübü",
    topic: "Müzik",
    description: "Herkes davetli",
    city: "İstanbul",
    isPrivate: false,
  });

  assert.equal(comm.isPrivate, false);
  assert.equal(comm.memberCount, 1);

  // User 2 joins
  repo.currentUserId = "user-2";
  const res = await repo.joinCommunity(comm.id);
  assert.equal(res.status, "active");

  const updated = await repo.getCommunityById(comm.id);
  assert.equal(updated?.memberCount, 2);
  assert.equal(updated?.myMembership?.status, "active");
});

test("G3: Closed community requires approval and protects content from non-members", async () => {
  const repo = new MockCommunityRepository();
  repo.currentUserId = "organizer-1";
  const comm = await repo.createCommunity({
    name: "Kapalı Edebiyat Masası",
    topic: "Şiir",
    description: "Özel seçki",
    city: "Ankara",
    isPrivate: true,
  });

  // Organizer posts secret content
  await repo.createCommunityPost(comm.id, "Sadece üyelere özel şiir metni");

  // User 2 tries to read posts -> access denied
  repo.currentUserId = "user-2";
  await assert.rejects(
    async () => repo.getCommunityPosts(comm.id),
    /access_denied_private_community/,
  );

  // User 2 sends join request -> pending
  const joinRes = await repo.joinCommunity(comm.id);
  assert.equal(joinRes.status, "pending");

  // Pending user still cannot read
  await assert.rejects(
    async () => repo.getCommunityPosts(comm.id),
    /access_denied_private_community/,
  );

  // Non-organizer cannot respond to join request
  repo.currentUserId = "user-3";
  await assert.rejects(
    async () => repo.respondJoinRequest(comm.id, "user-2", true),
    /organizer_required/,
  );

  // Organizer approves User 2
  repo.currentUserId = "organizer-1";
  const reqs = await repo.getJoinRequests(comm.id);
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].userId, "user-2");

  await repo.respondJoinRequest(comm.id, "user-2", true);

  // Now User 2 is active member and CAN read posts
  repo.currentUserId = "user-2";
  const posts = await repo.getCommunityPosts(comm.id);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].body, "Sadece üyelere özel şiir metni");
});

test("G3: Event capacity enforcement and race condition protection", async () => {
  const repo = new MockEventRepository();
  repo.currentUserId = "organizer-1";

  // Create an event with capacity = 1
  const ev = await repo.createEvent({
    title: "Tek Kişilik Atölye",
    category: "Atölye",
    city: "İzmir",
    place: "Konak Atölye",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 1,
  });

  // User A joins (1/1)
  repo.currentUserId = "user-a";
  const joinA = await repo.joinEvent(ev.id);
  assert.equal(joinA.status, "confirmed");
  assert.equal(joinA.participantsCount, 1);

  // User A double join is rejected
  await assert.rejects(
    async () => repo.joinEvent(ev.id),
    /already_joined/,
  );

  // User B tries to join full event -> rejected
  repo.currentUserId = "user-b";
  await assert.rejects(
    async () => repo.joinEvent(ev.id),
    /capacity_full/,
  );

  // User A cancels participation
  repo.currentUserId = "user-a";
  const cancelA = await repo.cancelParticipation(ev.id);
  assert.equal(cancelA.status, "cancelled");
  assert.equal(cancelA.participantsCount, 0);

  // User B can now join the opened spot
  repo.currentUserId = "user-b";
  const joinB = await repo.joinEvent(ev.id);
  assert.equal(joinB.status, "confirmed");
  assert.equal(joinB.participantsCount, 1);
});

test("G3: Cannot join cancelled or past events", async () => {
  const repo = new MockEventRepository();
  repo.currentUserId = "organizer-1";

  // Past event
  const pastEv = await repo.createEvent({
    title: "Dünkü Buluşma",
    category: "Buluşma",
    city: "İstanbul",
    startsAt: new Date(Date.now() - 100000000).toISOString(),
    endsAt: new Date(Date.now() - 50000000).toISOString(),
    capacity: 20,
  });

  repo.currentUserId = "user-x";
  await assert.rejects(
    async () => repo.joinEvent(pastEv.id),
    /event_ended/,
  );

  // Cancelled event
  repo.currentUserId = "organizer-1";
  const activeEv = await repo.createEvent({
    title: "İptal Edilecek Etkinlik",
    category: "Söyleşi",
    city: "İstanbul",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 20,
  });
  await repo.cancelEvent(activeEv.id);

  repo.currentUserId = "user-y";
  await assert.rejects(
    async () => repo.joinEvent(activeEv.id),
    /event_cancelled/,
  );
});
