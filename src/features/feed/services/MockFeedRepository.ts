// Mock akış repository'si post, yorum, yanıt ve beğeni akışını yönetir.
import type { FeedComment, FeedPost, FeedReply, FeedTag } from "@/domain/entities/Feed";
import type {
  CreateFeedCommentPayload,
  CreateFeedPostPayload,
  CreateFeedReplyPayload,
  FeedCommentsPage,
  FeedPage,
  FeedPageOptions,
  FeedRepository,
} from "@/domain/repositories/FeedRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";
import { sanitizePlainText } from "@/shared/utils/sanitize";

const now = new Date().toISOString();
const DEFAULT_FEED_PAGE_SIZE = 8;
const DEFAULT_COMMENT_PAGE_SIZE = 4;

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
    "feed-deyis-room",
    "user-cem",
    "Bu akşam kısa bir deyiş/nefes denemesi yapalım mı? Katılanlar canlı odada görünecek.",
    ["deyis"],
  ),
  createSeedPost(
    "feed-question",
    "user-elif",
    "Yeni gelenler için soru: Toplulukta tanışmayı kolaylaştıran en güzel başlangıç sizce ne?",
    ["soru", "gundem"],
  ),
];

const findPost = (postId: string) => {
  const post = feedPosts.find((candidate) => candidate.id === postId);

  if (!post) {
    throw new Error("Post bulunamadı.");
  }

  return post;
};

const isMockAdmin = (userId: string) => userId === "user-atalay-admin";

const toggleUserId = (ids: string[], userId: string) =>
  ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];

export class MockFeedRepository implements FeedRepository {
  async listFeed(
    _userId: string,
    tag: FeedTag | "all" = "all",
    options: FeedPageOptions = {},
  ): Promise<FeedPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_FEED_PAGE_SIZE;
    const filteredPosts = feedPosts
      .filter((post) => tag === "all" || post.tags.includes(tag))
      .sort((first, second) => {
        if (first.isPinned && !second.isPinned) return -1;
        if (!first.isPinned && second.isPinned) return 1;
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      })
      .map((post) => ({ ...post, comments: [] }));
    const rows = filteredPosts.slice(offset, offset + limit);

    return {
      posts: rows,
      nextOffset: offset + rows.length,
      hasMore: offset + limit < filteredPosts.length,
    };
  }

  async listComments(
    postId: string,
    options: FeedPageOptions = {},
  ): Promise<FeedCommentsPage> {
    const post = findPost(postId);
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_COMMENT_PAGE_SIZE;
    const comments = post.comments.slice(offset, offset + limit);

    return {
      comments,
      nextOffset: offset + comments.length,
      hasMore: offset + limit < post.comments.length,
    };
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    const timestamp = new Date().toISOString();
    const post: FeedPost = {
      id: createId("feed_post"),
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: sanitizePlainText(payload.body, 2000),
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
      body: sanitizePlainText(payload.body, 1000),
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
      body: sanitizePlainText(payload.body, 1000),
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

  async deletePost(postId: string, requesterId: string): Promise<void> {
    const postIndex = feedPosts.findIndex((candidate) => candidate.id === postId);

    if (postIndex === -1) {
      throw new Error("Post bulunamadı.");
    }

    const post = feedPosts[postIndex];

    if (post.authorId !== requesterId && !isMockAdmin(requesterId)) {
      throw new Error("Bu postu silme yetkiniz yok.");
    }

    feedPosts.splice(postIndex, 1);
  }
}
