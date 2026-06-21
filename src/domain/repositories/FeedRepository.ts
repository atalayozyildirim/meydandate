// Akış postları, yorumları, anketler ve etkileşimleri için repository sözleşmesi.
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";

export interface FeedPageOptions {
  offset?: number;
  limit?: number;
}

export interface FeedPage {
  posts: FeedPost[];
  nextOffset?: number;
  hasMore: boolean;
}

export interface FeedCommentsPage {
  comments: FeedPost["comments"];
  nextOffset?: number;
  hasMore: boolean;
}

export interface CreateFeedPostPayload {
  authorId: string;
  body: string;
  tags: FeedTag[];
  image?: {
    uri: string;
    base64?: string | null;
  };
  poll?: {
    question: string;
    options: string[]; // seçenek metinleri
    endsAt?: string;
  };
  quotedPostId?: string | null;
}

export interface CreateFeedCommentPayload {
  postId: string;
  authorId: string;
  body: string;
}

export interface CreateFeedReplyPayload extends CreateFeedCommentPayload {
  commentId: string;
}

export interface BotFeedPostPayload {
  body: string;
  tags: FeedTag[];
  ctaLabel: string;
  isActive: boolean;
  showAdMob: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string | null;
}

export interface FeedRepository {
  getPost(postId: string, currentUserId?: string): Promise<FeedPost>;
  listFeed(
    userId: string,
    tag?: FeedTag | "all",
    options?: FeedPageOptions,
  ): Promise<FeedPage>;
  listComments(
    postId: string,
    options?: FeedPageOptions,
  ): Promise<FeedCommentsPage>;
  createPost(payload: CreateFeedPostPayload): Promise<FeedPost>;
  listBotPosts(
    tag?: FeedTag | "all",
    includeInactive?: boolean,
  ): Promise<FeedPost[]>;
  createBotPost(
    adminUserId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost>;
  updateBotPost(postId: string, payload: BotFeedPostPayload): Promise<FeedPost>;
  deleteBotPost(postId: string): Promise<void>;
  togglePostLike(postId: string, userId: string): Promise<FeedPost>;
  toggleCommentLike(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<FeedPost>;
  addComment(payload: CreateFeedCommentPayload): Promise<FeedPost>;
  addReply(payload: CreateFeedReplyPayload): Promise<FeedPost>;
  reportPost(postId: string, reporterId: string): Promise<FeedPost>;
  reportComment(
    postId: string,
    commentId: string,
    reporterId: string,
  ): Promise<FeedPost>;
  deletePost(postId: string, requesterId: string): Promise<void>;
  votePoll(pollId: string, optionId: string, userId: string): Promise<void>;
}
