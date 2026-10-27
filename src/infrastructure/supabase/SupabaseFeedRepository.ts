import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type {
  BotFeedPostPayload,
  CreateFeedCommentPayload,
  CreateFeedPostPayload,
  CreateFeedReplyPayload,
  FeedCommentsPage,
  FeedPage,
  FeedPageOptions,
  FeedRepository,
} from "@/domain/repositories/FeedRepository";
import {
  fetchPost,
  fetchFeedList,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  castPollVote,
} from "./feed/feedPostOps";
import {
  fetchBotPosts,
  insertBotPost,
  patchBotPost,
  removeBotPost,
} from "./feed/feedBotPostOps";
import {
  fetchComments,
  insertComment,
  insertReply,
  toggleLikePost,
  toggleLikeComment,
  togglePostBookmark,
  toggleUserFollow,
  blockTargetUser,
  unblockTargetUser,
  reportFeedPost,
  reportFeedComment,
} from "./feed/feedInteractionOps";

export class SupabaseFeedRepository implements FeedRepository {
  async getPost(postId: string, currentUserId = ""): Promise<FeedPost> {
    return fetchPost(postId, currentUserId);
  }

  async listFeed(
    userId: string,
    tag: FeedTag | "all" = "all",
    options: FeedPageOptions = {},
  ): Promise<FeedPage> {
    return fetchFeedList(userId, tag, options);
  }

  async listBotPosts(
    tag: FeedTag | "all" = "all",
    includeInactive = false,
  ): Promise<FeedPost[]> {
    return fetchBotPosts(tag, includeInactive);
  }

  async createBotPost(
    adminUserId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    return insertBotPost(adminUserId, payload);
  }

  async updateBotPost(
    postId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    return patchBotPost(postId, payload);
  }

  async deleteBotPost(postId: string): Promise<void> {
    return removeBotPost(postId);
  }

  async listComments(
    postId: string,
    options: FeedPageOptions = {},
  ): Promise<FeedCommentsPage> {
    return fetchComments(postId, options);
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    return createFeedPost(
      payload,
      (id, user) => this.getPost(id, user),
      (id, req) => this.deletePost(id, req),
    );
  }

  async togglePostLike(postId: string, userId: string): Promise<FeedPost> {
    return toggleLikePost(postId, userId, (id, u) => this.getPost(id, u));
  }

  async toggleCommentLike(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<FeedPost> {
    return toggleLikeComment(postId, commentId, userId, (id, u) =>
      this.getPost(id, u),
    );
  }

  async addComment(payload: CreateFeedCommentPayload): Promise<FeedPost> {
    return insertComment(payload, (id, u) => this.getPost(id, u));
  }

  async addReply(payload: CreateFeedReplyPayload): Promise<FeedPost> {
    return insertReply(payload, (id, u) => this.getPost(id, u));
  }

  async reportPost(
    postId: string,
    reporterId: string,
    category = "inappropriate_content",
    reason = "",
  ): Promise<FeedPost> {
    return reportFeedPost(postId, reporterId, category, reason, (id, u) =>
      this.getPost(id, u),
    );
  }

  async reportComment(
    postId: string,
    commentId: string,
    reporterId: string,
    reason = "",
  ): Promise<FeedPost> {
    return reportFeedComment(
      postId,
      commentId,
      reporterId,
      reason,
      (id, u) => this.getPost(id, u),
    );
  }

  async updatePost(
    postId: string,
    payload: { body: string; tags?: FeedTag[] },
  ): Promise<FeedPost> {
    return updateFeedPost(postId, payload, (id) => this.getPost(id));
  }

  async toggleBookmark(postId: string, userId: string): Promise<boolean> {
    return togglePostBookmark(postId, userId);
  }

  async toggleFollow(targetUserId: string, userId: string): Promise<boolean> {
    return toggleUserFollow(targetUserId, userId);
  }

  async blockUser(targetUserId: string): Promise<void> {
    return blockTargetUser(targetUserId);
  }

  async unblockUser(targetUserId: string): Promise<void> {
    return unblockTargetUser(targetUserId);
  }

  async deletePost(postId: string, requesterId: string): Promise<void> {
    return deleteFeedPost(postId, requesterId);
  }

  async votePoll(
    pollId: string,
    optionId: string,
    userId: string,
  ): Promise<void> {
    return castPollVote(pollId, optionId, userId);
  }
}
