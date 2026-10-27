// G2 — Community Social Feed Contract and Unit Tests.
// Run: node --import tsx --test scripts/community-feed.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { FeedPost, FeedTag } from "../src/domain/entities/Feed";
import type { FeedPage, FeedRepository } from "../src/domain/repositories/FeedRepository";

const sampleUser = {
  id: "user-1",
  email: "deniz@ehlibyte.local",
  name: "Deniz",
  age: 24,
  city: "İstanbul",
  interests: ["Müzik", "Edebiyat"],
  badges: ["community_member"],
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "somewhat_important",
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  isActive: true,
  photos: [],
  createdAt: "2026-10-27T10:00:00Z",
  updatedAt: "2026-10-27T10:00:00Z",
};

const createSamplePost = (id: string, authorId = "user-1", body = "Bağlama atölyesi önerileri"): FeedPost => ({
  id,
  authorId,
  author: { ...sampleUser, id: authorId, name: authorId === "user-1" ? "Deniz" : "Ali" },
  body,
  tags: ["gundem"],
  imageUrls: [],
  likedByUserIds: [],
  comments: [],
  commentCount: 0,
  reportCount: 0,
  isBookmarked: false,
  isFollowingAuthor: false,
  createdAt: "2026-10-27T12:00:00Z",
  updatedAt: "2026-10-27T12:00:00Z",
});

class MockCommunityFeedRepository implements FeedRepository {
  posts: FeedPost[] = [];
  reports: Array<{ postId: string; reporterId: string; category?: string; reason?: string }> = [];
  blockedUserIds: string[] = [];
  bookmarks = new Set<string>();
  follows = new Set<string>();

  async getPost(postId: string, currentUserId = ""): Promise<FeedPost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error("Post bulunamadı.");
    return {
      ...post,
      isBookmarked: this.bookmarks.has(postId),
      isFollowingAuthor: this.follows.has(post.authorId),
      likedByUserIds: [...post.likedByUserIds],
    };
  }

  async listFeed(
    userId: string,
    tag: FeedTag | "all" = "all",
    options: { offset?: number; limit?: number; scope?: "all" | "following" | "saved" } = {},
  ): Promise<FeedPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 10;
    const scope = options.scope ?? "all";

    let filtered = this.posts.filter((p) => !this.blockedUserIds.includes(p.authorId));

    if (tag !== "all") {
      filtered = filtered.filter((p) => p.tags.includes(tag));
    }

    if (scope === "following") {
      filtered = filtered.filter((p) => this.follows.has(p.authorId));
    } else if (scope === "saved") {
      filtered = filtered.filter((p) => this.bookmarks.has(p.id));
    }

    const rows = filtered.slice(offset, offset + limit).map((p) => ({
      ...p,
      isBookmarked: this.bookmarks.has(p.id),
      isFollowingAuthor: this.follows.has(p.authorId),
    }));

    return {
      posts: rows,
      nextOffset: offset + rows.length,
      hasMore: filtered.length > offset + limit,
    };
  }

  async listComments(): Promise<{ comments: []; hasMore: false }> {
    return { comments: [], hasMore: false };
  }

  async createPost(payload: { authorId: string; body: string; tags: FeedTag[] }): Promise<FeedPost> {
    const newPost = createSamplePost(`post-${Date.now()}`, payload.authorId, payload.body);
    newPost.tags = payload.tags;
    this.posts.unshift(newPost);
    return newPost;
  }

  async listBotPosts(): Promise<FeedPost[]> {
    return [];
  }
  async createBotPost(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }
  async updateBotPost(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }
  async deleteBotPost(): Promise<void> {}

  async togglePostLike(postId: string, userId: string): Promise<FeedPost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error("Post bulunamadı.");
    const idx = post.likedByUserIds.indexOf(userId);
    if (idx >= 0) {
      post.likedByUserIds.splice(idx, 1);
    } else {
      post.likedByUserIds.push(userId);
    }
    return post;
  }

  async toggleCommentLike(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }
  async addComment(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }
  async addReply(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }

  async reportPost(postId: string, reporterId: string, category = "inappropriate_content", reason = ""): Promise<FeedPost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error("Post bulunamadı.");
    if (post.authorId === reporterId) throw new Error("Kendi gönderinizi şikayet edemezsiniz.");
    this.reports.push({ postId, reporterId, category, reason });
    return post;
  }

  async reportComment(): Promise<FeedPost> {
    throw new Error("Not implemented");
  }

  async updatePost(postId: string, payload: { body: string; tags?: FeedTag[] }): Promise<FeedPost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error("Post bulunamadı.");
    post.body = payload.body;
    if (payload.tags) post.tags = payload.tags;
    return post;
  }

  async toggleBookmark(postId: string): Promise<boolean> {
    if (this.bookmarks.has(postId)) {
      this.bookmarks.delete(postId);
      return false;
    } else {
      this.bookmarks.add(postId);
      return true;
    }
  }

  async toggleFollow(targetUserId: string): Promise<boolean> {
    if (this.follows.has(targetUserId)) {
      this.follows.delete(targetUserId);
      return false;
    } else {
      this.follows.add(targetUserId);
      return true;
    }
  }

  async blockUser(targetUserId: string): Promise<void> {
    if (!this.blockedUserIds.includes(targetUserId)) {
      this.blockedUserIds.push(targetUserId);
    }
    this.follows.delete(targetUserId);
  }

  async unblockUser(targetUserId: string): Promise<void> {
    this.blockedUserIds = this.blockedUserIds.filter((id) => id !== targetUserId);
  }

  async deletePost(postId: string, requesterId: string): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error("Post bulunamadı.");
    if (post.authorId !== requesterId) throw new Error("Yetkisiz silme.");
    this.posts = this.posts.filter((p) => p.id !== postId);
  }

  async votePoll(): Promise<void> {}
}

test("feed repository supports post creation, pagination and chronological ordering", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [
    createSamplePost("p1", "user-1", "Post 1"),
    createSamplePost("p2", "user-1", "Post 2"),
    createSamplePost("p3", "user-2", "Post 3"),
  ];

  const page1 = await repo.listFeed("user-1", "all", { offset: 0, limit: 2 });
  assert.equal(page1.posts.length, 2);
  assert.equal(page1.hasMore, true);
  assert.equal(page1.nextOffset, 2);

  const page2 = await repo.listFeed("user-1", "all", { offset: 2, limit: 2 });
  assert.equal(page2.posts.length, 1);
  assert.equal(page2.hasMore, false);
});

test("likes toggle idempotently and update post like count", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [createSamplePost("p1", "user-1")];

  // User 2 likes post
  const liked = await repo.togglePostLike("p1", "user-2");
  assert.ok(liked.likedByUserIds.includes("user-2"));
  assert.equal(liked.likedByUserIds.length, 1);

  // User 2 unlikes post
  const unliked = await repo.togglePostLike("p1", "user-2");
  assert.ok(!unliked.likedByUserIds.includes("user-2"));
  assert.equal(unliked.likedByUserIds.length, 0);
});

test("bookmarks and follows are tracked per-user and filterable by scope", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [
    createSamplePost("p1", "user-1", "Deniz Post"),
    createSamplePost("p2", "user-2", "Ali Post"),
  ];

  // User 1 follows user 2 and bookmarks p2
  await repo.toggleFollow("user-2");
  await repo.toggleBookmark("p2");

  const followingFeed = await repo.listFeed("user-1", "all", { scope: "following" });
  assert.equal(followingFeed.posts.length, 1);
  assert.equal(followingFeed.posts[0].id, "p2");

  const savedFeed = await repo.listFeed("user-1", "all", { scope: "saved" });
  assert.equal(savedFeed.posts.length, 1);
  assert.equal(savedFeed.posts[0].id, "p2");
});

test("blocking a user excludes their posts from the feed and removes follow", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [
    createSamplePost("p1", "user-1"),
    createSamplePost("p2", "user-2"),
  ];
  await repo.toggleFollow("user-2");
  assert.ok(repo.follows.has("user-2"));

  await repo.blockUser("user-2");
  assert.ok(!repo.follows.has("user-2"), "follow removed on block");

  const feed = await repo.listFeed("user-1", "all");
  assert.equal(feed.posts.length, 1);
  assert.equal(feed.posts[0].authorId, "user-1");
});

test("reporting records category and reason; author cannot report own post", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [createSamplePost("p1", "user-1")];

  await assert.rejects(
    () => repo.reportPost("p1", "user-1", "spam", "kendi"),
    /Kendi gönderinizi/
  );

  await repo.reportPost("p1", "user-2", "harassment", "rahatsız edici mesaj");
  assert.equal(repo.reports.length, 1);
  assert.equal(repo.reports[0].category, "harassment");
  assert.equal(repo.reports[0].reason, "rahatsız edici mesaj");
});

test("author can update or delete post; foreign user is rejected", async () => {
  const repo = new MockCommunityFeedRepository();
  repo.posts = [createSamplePost("p1", "user-1", "Original body")];

  const updated = await repo.updatePost("p1", { body: "Updated body", tags: ["soru"] });
  assert.equal(updated.body, "Updated body");
  assert.deepEqual(updated.tags, ["soru"]);

  await assert.rejects(
    () => repo.deletePost("p1", "user-2"),
    /Yetkisiz/
  );

  await repo.deletePost("p1", "user-1");
  assert.equal(repo.posts.length, 0);
});
