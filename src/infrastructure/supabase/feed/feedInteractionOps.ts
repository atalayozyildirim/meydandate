import type { FeedPost } from "@/domain/entities/Feed";
import type {
  CreateFeedCommentPayload,
  CreateFeedReplyPayload,
  FeedCommentsPage,
  FeedPageOptions,
} from "@/domain/repositories/FeedRepository";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import {
  commentSelect,
  DEFAULT_COMMENT_PAGE_SIZE,
  FEED_IMAGE_BUCKET,
  uploadFeedImages,
  type CommentRow,
} from "./feedTypes";
import { mapComment } from "./feedMappers";

export const notifyFeedEvent = async (payload: {
  type: "like" | "comment";
  postId: string;
  commentId?: string;
}): Promise<void> => {
  const { error } = await supabase.functions.invoke("send-feed-event-push", {
    body: payload,
  });

  if (error && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("Feed bildirimi gönderilemedi", error.message);
  }
};

export const fetchComments = async (
  postId: string,
  options: FeedPageOptions = {},
): Promise<FeedCommentsPage> => {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? DEFAULT_COMMENT_PAGE_SIZE;
  const { data, error } = await supabase
    .from("feed_comments")
    .select(commentSelect)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit);

  if (error) {
    throw createSupabaseRepositoryError("Yorumlar yüklenemedi.", error);
  }

  const rows = (data ?? []).slice(0, limit);

  return {
    comments: rows.map((row) => mapComment(row as unknown as CommentRow)),
    nextOffset: offset + rows.length,
    hasMore: (data ?? []).length > limit,
  };
};

export const toggleLikePost = async (
  postId: string,
  userId: string,
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const { data: existingLike, error: likeError } = await supabase
    .from("feed_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (likeError) {
    throw createSupabaseRepositoryError("Beğeni durumu alınamadı.", likeError);
  }

  const { error } = existingLike
    ? await supabase
        .from("feed_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
    : await supabase
        .from("feed_post_likes")
        .insert({ post_id: postId, user_id: userId });

  if (error) {
    throw createSupabaseRepositoryError("Beğeni güncellenemedi.", error);
  }

  if (!existingLike) {
    void notifyFeedEvent({ type: "like", postId });
  }

  return getPost(postId, userId);
};

export const toggleLikeComment = async (
  postId: string,
  commentId: string,
  userId: string,
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const { data: existingLike, error: likeError } = await supabase
    .from("feed_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (likeError) {
    throw createSupabaseRepositoryError(
      "Yorum beğenisi alınamadı.",
      likeError,
    );
  }

  const { error } = existingLike
    ? await supabase
        .from("feed_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId)
    : await supabase
        .from("feed_comment_likes")
        .insert({ comment_id: commentId, user_id: userId });

  if (error) {
    throw createSupabaseRepositoryError(
      "Yorum beğenisi güncellenemedi.",
      error,
    );
  }

  return getPost(postId, userId);
};

export const insertComment = async (
  payload: CreateFeedCommentPayload,
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const uploadedImages = await uploadFeedImages(
    payload.authorId,
    payload.images ?? [],
  );
  const imageUrls = uploadedImages.map((image) => image.url);
  const imagePaths = uploadedImages
    .map((image) => image.path)
    .filter((path): path is string => Boolean(path));
  const { data: comment, error } = await supabase
    .from("feed_comments")
    .insert({
      post_id: payload.postId,
      author_id: payload.authorId,
      body: sanitizePlainText(payload.body, 1000).trim(),
      ...(imageUrls.length > 0
        ? { image_urls: imageUrls, image_paths: imagePaths }
        : {}),
    })
    .select("id")
    .single();

  if (error || !comment) {
    if (imagePaths.length > 0) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove(imagePaths)
        .catch(() => undefined);
    }

    throw createSupabaseRepositoryError("Yorum gönderilemedi.", error);
  }

  void notifyFeedEvent({
    type: "comment",
    postId: payload.postId,
    commentId: comment.id,
  });

  return getPost(payload.postId, payload.authorId);
};

export const insertReply = async (
  payload: CreateFeedReplyPayload,
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const uploadedImages = await uploadFeedImages(
    payload.authorId,
    payload.images ?? [],
  );
  const imageUrls = uploadedImages.map((image) => image.url);
  const imagePaths = uploadedImages
    .map((image) => image.path)
    .filter((path): path is string => Boolean(path));
  const { error } = await supabase.from("feed_replies").insert({
    comment_id: payload.commentId,
    author_id: payload.authorId,
    body: sanitizePlainText(payload.body, 1000).trim(),
    ...(imageUrls.length > 0
      ? { image_urls: imageUrls, image_paths: imagePaths }
      : {}),
  });

  if (error) {
    if (imagePaths.length > 0) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove(imagePaths)
        .catch(() => undefined);
    }

    throw createSupabaseRepositoryError("Yanıt gönderilemedi.", error);
  }

  return getPost(payload.postId, payload.authorId);
};

export const reportFeedPost = async (
  postId: string,
  reporterId: string,
  category = "inappropriate_content",
  reason = "",
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const { error } = await supabase.rpc("report_feed_post", {
    target_post_id: postId,
    report_category: category,
    report_reason: reason,
  });

  if (error) {
    if (error.code === "23505" || error.message.includes("23505")) {
      throw new Error("Bu postu daha önce bildirdiniz.");
    }
    throw createSupabaseRepositoryError("Bildirim gönderilemedi.", error);
  }

  return getPost(postId, reporterId);
};

export const reportFeedComment = async (
  postId: string,
  commentId: string,
  reporterId: string,
  reason = "",
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const { error } = await supabase.rpc("report_feed_comment", {
    target_comment_id: commentId,
    report_reason: reason,
  });

  if (error) {
    if (error.code === "23505" || error.message.includes("23505")) {
      throw new Error("Bu yorumu daha önce bildirdiniz.");
    }
    throw createSupabaseRepositoryError("Yorum bildirilemedi.", error);
  }

  return getPost(postId, reporterId);
};

export const togglePostBookmark = async (
  postId: string,
  _userId: string,
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("toggle_feed_post_bookmark", {
    target_post_id: postId,
  });
  if (error) {
    throw createSupabaseRepositoryError("Kaydetme işlemi başarısız oldu.", error);
  }
  return Boolean(data);
};

export const toggleUserFollow = async (
  targetUserId: string,
  _userId: string,
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("toggle_user_follow", {
    target_user_id: targetUserId,
  });
  if (error) {
    throw createSupabaseRepositoryError("Takip işlemi başarısız oldu.", error);
  }
  return Boolean(data);
};

export const blockTargetUser = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc("block_user", {
    target_user_id: targetUserId,
  });
  if (error) {
    throw createSupabaseRepositoryError("Kullanıcı engellenemedi.", error);
  }
};

export const unblockTargetUser = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc("unblock_user", {
    target_user_id: targetUserId,
  });
  if (error) {
    throw createSupabaseRepositoryError("Engel kaldırılamadı.", error);
  }
};
