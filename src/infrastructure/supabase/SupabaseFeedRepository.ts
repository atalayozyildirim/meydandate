import type { FeedComment, FeedPost, FeedReply, FeedTag } from "@/domain/entities/Feed";
import type { User } from "@/domain/entities/User";
import type {
  CreateFeedCommentPayload,
  CreateFeedPostPayload,
  CreateFeedReplyPayload,
  FeedRepository,
} from "@/domain/repositories/FeedRepository";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";

const feedSelect = `
  id,
  author_id,
  body,
  tags,
  report_count,
  is_pinned,
  created_at,
  updated_at,
  author:users!feed_posts_author_id_fkey(${publicUserColumns}),
  likes:feed_post_likes(user_id),
  comments:feed_comments(
    id,
    post_id,
    author_id,
    body,
    created_at,
    author:users!feed_comments_author_id_fkey(${publicUserColumns}),
    likes:feed_comment_likes(user_id),
    replies:feed_replies(
      id,
      comment_id,
      author_id,
      body,
      created_at,
      author:users!feed_replies_author_id_fkey(${publicUserColumns}),
      likes:feed_reply_likes(user_id)
    )
  )
`;

type LikeRow = { user_id: string };

type ReplyRow = {
  id: string;
  comment_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: User;
  likes?: LikeRow[];
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: User;
  likes?: LikeRow[];
  replies?: ReplyRow[];
};

type PostRow = {
  id: string;
  author_id: string;
  body: string;
  tags: FeedTag[];
  report_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author: User;
  likes?: LikeRow[];
  comments?: CommentRow[];
};

const mapReply = (postId: string, row: ReplyRow): FeedReply => ({
  id: row.id,
  postId,
  commentId: row.comment_id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 1000),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  createdAt: row.created_at,
});

const mapComment = (row: CommentRow): FeedComment => ({
  id: row.id,
  postId: row.post_id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 1000),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  replies: (row.replies ?? [])
    .map((reply) => mapReply(row.post_id, reply))
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  createdAt: row.created_at,
});

const mapPost = (row: PostRow): FeedPost => ({
  id: row.id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 2000),
  tags: row.tags,
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  comments: (row.comments ?? [])
    .map(mapComment)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  reportCount: row.report_count,
  isPinned: row.is_pinned,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseFeedRepository implements FeedRepository {
  private async getPost(postId: string): Promise<FeedPost> {
    const { data, error } = await supabase
      .from("feed_posts")
      .select(feedSelect)
      .eq("id", postId)
      .single();

    if (error || !data) {
      throw new Error("Post yüklenemedi.");
    }

    return mapPost(data as unknown as PostRow);
  }

  async listFeed(_userId: string, tag: FeedTag | "all" = "all"): Promise<FeedPost[]> {
    let query = supabase
      .from("feed_posts")
      .select(feedSelect)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (tag !== "all") {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Akış yüklenemedi.");
    }

    return (data ?? []).map((row) => mapPost(row as unknown as PostRow));
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    const { data, error } = await supabase
      .from("feed_posts")
      .insert({
        author_id: payload.authorId,
        body: sanitizePlainText(payload.body, 2000).trim(),
        tags: payload.tags,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Post paylaşılamadı.");
    }

    return this.getPost(data.id);
  }

  async togglePostLike(postId: string, userId: string): Promise<FeedPost> {
    const { data: existingLike, error: likeError } = await supabase
      .from("feed_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (likeError) {
      throw new Error("Beğeni durumu alınamadı.");
    }

    const { error } = existingLike
      ? await supabase
          .from("feed_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
      : await supabase.from("feed_post_likes").insert({ post_id: postId, user_id: userId });

    if (error) {
      throw new Error("Beğeni güncellenemedi.");
    }

    return this.getPost(postId);
  }

  async addComment(payload: CreateFeedCommentPayload): Promise<FeedPost> {
    const { error } = await supabase.from("feed_comments").insert({
      post_id: payload.postId,
      author_id: payload.authorId,
      body: sanitizePlainText(payload.body, 1000).trim(),
    });

    if (error) {
      throw new Error("Yorum gönderilemedi.");
    }

    return this.getPost(payload.postId);
  }

  async addReply(payload: CreateFeedReplyPayload): Promise<FeedPost> {
    const { error } = await supabase.from("feed_replies").insert({
      comment_id: payload.commentId,
      author_id: payload.authorId,
      body: sanitizePlainText(payload.body, 1000).trim(),
    });

    if (error) {
      throw new Error("Yanıt gönderilemedi.");
    }

    return this.getPost(payload.postId);
  }

  async reportPost(postId: string, reporterId: string): Promise<FeedPost> {
    const { error } = await supabase
      .from("feed_post_reports")
      .insert({ post_id: postId, reporter_id: reporterId });

    if (error?.code === "23505") {
      throw new Error("Bu postu daha önce bildirdiniz.");
    }

    if (error) {
      throw new Error("Bildirim gönderilemedi.");
    }

    return this.getPost(postId);
  }
}
