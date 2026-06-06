// Akış postları, yorumları ve etkileşimleri için repository sözleşmesi.
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";

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
  listFeed(userId: string, tag?: FeedTag | "all"): Promise<FeedPost[]>;
  createPost(payload: CreateFeedPostPayload): Promise<FeedPost>;
  togglePostLike(postId: string, userId: string): Promise<FeedPost>;
  addComment(payload: CreateFeedCommentPayload): Promise<FeedPost>;
  addReply(payload: CreateFeedReplyPayload): Promise<FeedPost>;
  reportPost(postId: string, reporterId: string): Promise<FeedPost>;
}
