// Mock akış repository'si post, yorum, yanıt ve beğeni akışını yönetir.
import type { FeedComment, FeedPost, FeedReply, FeedTag } from "@/domain/entities/Feed";
import type {
  CreateFeedCommentPayload,
  CreateFeedPostPayload,
  CreateFeedReplyPayload,
  FeedRepository,
} from "@/domain/repositories/FeedRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";

const now = new Date().toISOString();

const getUser = (userId: string) => {
  const user = mockDatabase.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  return user;
};

const createSeedPost = (
  id: string,
  authorId: string,
  body: string,
  tags: FeedTag[],
  isPinned = false,
): FeedPost => ({
  id,
  authorId,
  author: getUser(authorId),
  body,
  tags,
  likedByUserIds: ["user-current"],
  comments: [],
  reportCount: 0,
  isPinned,
  createdAt: now,
  updatedAt: now,
});

const feedPosts: FeedPost[] = [
  createSeedPost(
    "feed-muharrem-2026",
    "user-zeynep",
    "2026 Muharrem takvimi açıldı. 1 Muharrem 16 Haziran Salı, Aşure günü 25 Haziran Perşembe. Takip edenler hatırlatıcıyı açmayı unutmasın.",
    ["muharrem", "gundem"],
    true,
  ),
  createSeedPost(
    "feed-cem-room",
    "user-cem",
    "Bu akşam Cem odasında kısa bir deyiş/nefes denemesi yapalım mı? Katılanlar canlı odada görünecek.",
    ["cem", "deyis"],
  ),
  createSeedPost(
    "feed-question",
    "user-elif",
    "Yeni gelenler için soru: Lokma paylaşımı sizce topluluk hissini nasıl güçlendiriyor?",
    ["soru", "lokma"],
  ),
];

const findPost = (postId: string) => {
  const post = feedPosts.find((candidate) => candidate.id === postId);

  if (!post) {
    throw new Error("Post bulunamadı.");
  }

  return post;
};

const toggleUserId = (ids: string[], userId: string) =>
  ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];

export class MockFeedRepository implements FeedRepository {
  async listFeed(_userId: string, tag: FeedTag | "all" = "all"): Promise<FeedPost[]> {
    return feedPosts
      .filter((post) => tag === "all" || post.tags.includes(tag))
      .sort((first, second) => {
        if (first.isPinned && !second.isPinned) return -1;
        if (!first.isPinned && second.isPinned) return 1;
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      });
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    const timestamp = new Date().toISOString();
    const post: FeedPost = {
      id: createId("feed_post"),
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: payload.body,
      tags: payload.tags,
      likedByUserIds: [],
      comments: [],
      reportCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    feedPosts.unshift(post);
    return post;
  }

  async togglePostLike(postId: string, userId: string): Promise<FeedPost> {
    const post = findPost(postId);
    post.likedByUserIds = toggleUserId(post.likedByUserIds, userId);
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async addComment(payload: CreateFeedCommentPayload): Promise<FeedPost> {
    const post = findPost(payload.postId);
    const timestamp = new Date().toISOString();
    const comment: FeedComment = {
      id: createId("feed_comment"),
      postId: payload.postId,
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: payload.body,
      likedByUserIds: [],
      replies: [],
      createdAt: timestamp,
    };

    post.comments.push(comment);
    post.updatedAt = timestamp;
    return post;
  }

  async addReply(payload: CreateFeedReplyPayload): Promise<FeedPost> {
    const post = findPost(payload.postId);
    const comment = post.comments.find((candidate) => candidate.id === payload.commentId);

    if (!comment) {
      throw new Error("Yorum bulunamadı.");
    }

    const timestamp = new Date().toISOString();
    const reply: FeedReply = {
      id: createId("feed_reply"),
      postId: payload.postId,
      commentId: payload.commentId,
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: payload.body,
      likedByUserIds: [],
      createdAt: timestamp,
    };

    comment.replies.push(reply);
    post.updatedAt = timestamp;
    return post;
  }

  async reportPost(postId: string, _reporterId: string): Promise<FeedPost> {
    const post = findPost(postId);
    post.reportCount += 1;
    post.updatedAt = new Date().toISOString();
    return post;
  }
}
