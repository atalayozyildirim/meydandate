// Akış postları, yorumları ve etkileşimleri için repository sözleşmesi.
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
}

export interface CreateFeedCommentPayload {
  postId: string;
  authorId: string;
  body: string;
}

export interface CreateFeedReplyPayload extends CreateFeedCommentPayload {
  commentId: string;
}

export interface FeedRepository {
  listFeed(userId: string, tag?: FeedTag | "all", options?: FeedPageOptions): Promise<FeedPage>;
  listComments(postId: string, options?: FeedPageOptions): Promise<FeedCommentsPage>;
  createPost(payload: CreateFeedPostPayload): Promise<FeedPost>;
  togglePostLike(postId: string, userId: string): Promise<FeedPost>;
  addComment(payload: CreateFeedCommentPayload): Promise<FeedPost>;
  addReply(payload: CreateFeedReplyPayload): Promise<FeedPost>;
  reportPost(postId: string, reporterId: string): Promise<FeedPost>;
  deletePost(postId: string, requesterId: string): Promise<void>;
}
