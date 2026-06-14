import type {
  FeedComment,
  FeedPoll,
  FeedPost,
  FeedReply,
  FeedTag,
} from "@/domain/entities/Feed";
import type { User } from "@/domain/entities/User";
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
import { ehlibyteBotUser } from "@/shared/constants/ehlibyteBot";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { supabase } from "./client";
import { createSupabaseRepositoryError } from "./errors";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";

const activeFeedTagSet = new Set<FeedTag>([
  "muharrem",
  "deyis",
  "soru",
  "gundem",
]);
const DEFAULT_FEED_PAGE_SIZE = 8;
const DEFAULT_COMMENT_PAGE_SIZE = 4;
const FEED_IMAGE_BUCKET = "feed-post-images";
const MAX_FEED_IMAGE_BYTES = 6 * 1024 * 1024;
const base64Alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const values = ["code", "message", "details", "hint"].map((field) => {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : "";
  });

  return values.join(" ");
};

const isMissingFeedImageColumnError = (error: unknown) =>
  /PGRST204|42703|schema cache|column/i.test(getErrorText(error)) &&
  /image_path|image_url/i.test(getErrorText(error));

const decodeBase64 = (value: string): ArrayBuffer => {
  const cleanValue = value.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = cleanValue.endsWith("==")
    ? 2
    : cleanValue.endsWith("=")
      ? 1
      : 0;
  const bytes = new Uint8Array(
    Math.floor((cleanValue.length * 3) / 4) - padding,
  );
  let byteIndex = 0;

  for (let index = 0; index < cleanValue.length; index += 4) {
    const first = base64Alphabet.indexOf(cleanValue[index] ?? "A");
    const second = base64Alphabet.indexOf(cleanValue[index + 1] ?? "A");
    const thirdCharacter = cleanValue[index + 2] ?? "=";
    const fourthCharacter = cleanValue[index + 3] ?? "=";
    const third =
      thirdCharacter === "=" ? 0 : base64Alphabet.indexOf(thirdCharacter);
    const fourth =
      fourthCharacter === "=" ? 0 : base64Alphabet.indexOf(fourthCharacter);
    const chunk = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 16) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 8) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = chunk & 255;
  }

  return bytes.buffer;
};

const normalizeFeedTags = (tags: unknown): FeedTag[] => {
  if (!Array.isArray(tags)) {
    return ["gundem"];
  }

  const activeTags = tags.filter((tag): tag is FeedTag =>
    activeFeedTagSet.has(tag as FeedTag),
  );

  return activeTags.length > 0 ? activeTags : ["gundem"];
};

const postSelect = `
  id,
  author_id,
  body,
  image_url,
  tags,
  report_count,
  is_pinned,
  created_at,
  updated_at,
  author:users!feed_posts_author_id_fkey(${publicUserColumns}),
  likes:feed_post_likes(user_id),
  poll:feed_polls(
    id,
    post_id,
    question,
    ends_at,
    options:feed_poll_options(id, text, display_order),
    votes:feed_poll_votes(option_id, user_id)
  )
`;

const commentSelect = `
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
`;

const botPostSelect = `
  id,
  body,
  tags,
  cta_label,
  is_active,
  show_admob,
  sort_order,
  starts_at,
  ends_at,
  created_at,
  updated_at
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

type PollVoteRow = {
  option_id: string;
  user_id: string;
};

type PollOptionRow = {
  id: string;
  text: string;
  display_order: number;
};

type PollRow = {
  id: string;
  post_id: string;
  question: string;
  ends_at: string | null;
  options: PollOptionRow[];
  votes: PollVoteRow[];
};

type PostRow = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  image_path?: string | null;
  tags: FeedTag[];
  report_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author: User;
  likes?: LikeRow[];
  comments?: CommentRow[];
  poll?: PollRow | PollRow[] | null;
};

type BotPostRow = {
  id: string;
  body: string;
  tags: FeedTag[];
  cta_label: string;
  is_active: boolean;
  show_admob: boolean;
  sort_order: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
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

const mapPoll = (
  rawPoll: PollRow | PollRow[] | null | undefined,
  currentUserId: string,
): FeedPoll | null => {
  if (!rawPoll) return null;
  const poll = Array.isArray(rawPoll) ? rawPoll[0] : rawPoll;
  if (!poll) return null;
  const options = (poll.options ?? [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: (poll.votes ?? []).filter((v) => v.option_id === opt.id)
        .length,
    }));
  const userVote = (poll.votes ?? []).find(
    (v) => v.user_id === currentUserId,
  );
  return {
    id: poll.id,
    postId: poll.post_id,
    question: poll.question,
    options,
    totalVotes: (poll.votes ?? []).length,
    votedOptionId: userVote?.option_id ?? null,
    endsAt: poll.ends_at ?? null,
  };
};

const mapPost = (row: PostRow, currentUserId = ""): FeedPost => ({
  id: row.id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 2000),
  ...(row.image_url ? { imageUrl: row.image_url } : {}),
  tags: normalizeFeedTags(row.tags),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  comments: [],
  reportCount: row.report_count,
  isPinned: row.is_pinned,
  poll: mapPoll(row.poll, currentUserId),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBotPost = (row: BotPostRow): FeedPost => ({
  id: `bot-${row.id}`,
  authorId: ehlibyteBotUser.id,
  author: ehlibyteBotUser,
  body: sanitizePlainText(row.body, 2000),
  tags: normalizeFeedTags(row.tags),
  likedByUserIds: [],
  comments: [],
  reportCount: 0,
  isPinned: true,
  isSponsored: true,
  sponsorLabel: "Resmi rehber",
  ctaLabel: sanitizePlainText(row.cta_label, 40) || "İncele",
  showAdMob: row.show_admob,
  botPostId: row.id,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const botPayloadToRow = (
  adminUserId: string | null,
  payload: BotFeedPostPayload,
) => ({
  body: sanitizePlainText(payload.body, 2000).trim(),
  tags: normalizeFeedTags(payload.tags),
  cta_label: sanitizePlainText(payload.ctaLabel, 40).trim() || "İncele",
  is_active: payload.isActive,
  show_admob: payload.showAdMob,
  sort_order: payload.sortOrder ?? 0,
  starts_at: payload.startsAt ?? new Date().toISOString(),
  ends_at: payload.endsAt ?? null,
  ...(adminUserId ? { created_by: adminUserId } : {}),
});

export class SupabaseFeedRepository implements FeedRepository {
  async getPost(postId: string, currentUserId = ""): Promise<FeedPost> {
    const { data, error } = await supabase
      .from("feed_posts")
      .select(postSelect)
      .eq("id", postId)
      .single();

    if (error || !data) {
      throw createSupabaseRepositoryError("Post yüklenemedi.", error);
    }

    return mapPost(data as unknown as PostRow, currentUserId);
  }

  async listFeed(
    userId: string,
    tag: FeedTag | "all" = "all",
    options: FeedPageOptions = {},
  ): Promise<FeedPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_FEED_PAGE_SIZE;
    let query = supabase
      .from("feed_posts")
      .select(postSelect)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit);

    if (tag !== "all") {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) {
      throw createSupabaseRepositoryError("Akış yüklenemedi.", error);
    }

    const rows = (data ?? []).slice(0, limit);
    const posts = rows.map((row) => mapPost(row as unknown as PostRow, userId));
    const botPosts =
      offset === 0 ? await this.listFeaturedBotPosts(tag) : [];

    return {
      posts: [...botPosts, ...posts].sort((first, second) => {
        if (first.isSponsored && !second.isSponsored) return -1;
        if (!first.isSponsored && second.isSponsored) return 1;
        if (first.isPinned && !second.isPinned) return -1;
        if (!first.isPinned && second.isPinned) return 1;
        return (
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime()
        );
      }),
      nextOffset: offset + rows.length,
      hasMore: (data ?? []).length > limit,
    };
  }

  async listBotPosts(
    tag: FeedTag | "all" = "all",
    includeInactive = false,
  ): Promise<FeedPost[]> {
    let query = supabase
      .from("bot_feed_posts")
      .select(botPostSelect)
      .order("sort_order", { ascending: false })
      .order("updated_at", { ascending: false });

    if (!includeInactive) {
      query = query
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
    }

    if (tag !== "all") {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) {
      throw createSupabaseRepositoryError(
        "Bot paylaşımları yüklenemedi.",
        error,
      );
    }

    return (data ?? []).map((row) => mapBotPost(row as unknown as BotPostRow));
  }

  private async listFeaturedBotPosts(
    tag: FeedTag | "all" = "all",
  ): Promise<FeedPost[]> {
    const botPosts = await this.listBotPosts(tag, false);

    if (botPosts.length <= 1) {
      return botPosts;
    }

    const featuredIndex = Math.floor(Math.random() * botPosts.length);
    const featuredPost = botPosts[featuredIndex];

    return featuredPost ? [featuredPost] : [];
  }

  async createBotPost(
    adminUserId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    const { data, error } = await supabase
      .from("bot_feed_posts")
      .insert(botPayloadToRow(adminUserId, payload))
      .select(botPostSelect)
      .single();

    if (error || !data) {
      throw createSupabaseRepositoryError(
        "Bot paylaşımı oluşturulamadı.",
        error,
      );
    }

    return mapBotPost(data as unknown as BotPostRow);
  }

  async updateBotPost(
    postId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    const { data, error } = await supabase
      .from("bot_feed_posts")
      .update(botPayloadToRow(null, payload))
      .eq("id", postId)
      .select(botPostSelect)
      .single();

    if (error || !data) {
      throw createSupabaseRepositoryError(
        "Bot paylaşımı güncellenemedi.",
        error,
      );
    }

    return mapBotPost(data as unknown as BotPostRow);
  }

  async deleteBotPost(postId: string): Promise<void> {
    const { error } = await supabase
      .from("bot_feed_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      throw createSupabaseRepositoryError("Bot paylaşımı silinemedi.", error);
    }
  }

  async listComments(
    postId: string,
    options: FeedPageOptions = {},
  ): Promise<FeedCommentsPage> {
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
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    let imagePath: string | null = null;
    let imageUrl: string | null = null;

    if (payload.image) {
      // Allow passing an external URL (e.g., picked GIF from Tenor/Giphy) directly
      if (payload.image.uri && /^https?:\/\//i.test(payload.image.uri)) {
        imageUrl = payload.image.uri;
      } else {
        if (!payload.image.base64) {
          throw new Error("Fotoğraf hazırlanamadı. Görseli tekrar seçin.");
        }

        const imageData = decodeBase64(payload.image.base64);

        if (imageData.byteLength > MAX_FEED_IMAGE_BYTES) {
          throw new Error("Fotoğraf en fazla 6 MB olabilir.");
        }

        // Detect GIF by checking file signature (GIF87a / GIF89a) and upload with appropriate mime/extension
        const header = new Uint8Array(imageData.slice(0, 6));
        const headerStr = String.fromCharCode(...Array.from(header));
        const isGif = headerStr.startsWith("GIF87a") || headerStr.startsWith("GIF89a");
        const ext = isGif ? "gif" : "jpg";
        const contentType = isGif ? "image/gif" : "image/jpeg";

        imagePath = `${payload.authorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(FEED_IMAGE_BUCKET)
          .upload(imagePath, imageData, {
            cacheControl: "3600",
            contentType,
            upsert: false,
          });

        if (uploadError) {
          throw createSupabaseRepositoryError(
            "Fotoğraf yüklenemedi.",
            uploadError,
          );
        }

        imageUrl = supabase.storage
          .from(FEED_IMAGE_BUCKET)
          .getPublicUrl(imagePath).data.publicUrl;
      }
    }

    const postPayload = {
      author_id: payload.authorId,
      body: sanitizePlainText(payload.body, 2000).trim(),
      tags: payload.tags,
    };
    const postPayloadWithImage =
      imageUrl && imagePath
        ? { ...postPayload, image_url: imageUrl, image_path: imagePath }
        : postPayload;

    let { data, error } = await supabase
      .from("feed_posts")
      .insert(postPayloadWithImage)
      .select("id")
      .single();

    if (
      error &&
      imagePath &&
      imageUrl &&
      isMissingFeedImageColumnError(error)
    ) {
      const imageUrlOnlyResult = await supabase
        .from("feed_posts")
        .insert({ ...postPayload, image_url: imageUrl })
        .select("id")
        .single();

      if (!imageUrlOnlyResult.error) {
        data = imageUrlOnlyResult.data;
        error = null;
        imagePath = null;
      } else {
        await supabase.storage
          .from(FEED_IMAGE_BUCKET)
          .remove([imagePath])
          .catch(() => undefined);

        const retryResult = await supabase
          .from("feed_posts")
          .insert(postPayload)
          .select("id")
          .single();

        data = retryResult.data;
        error = retryResult.error;
        imagePath = null;
      }
    } else if (error && imagePath && isMissingFeedImageColumnError(error)) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove([imagePath])
        .catch(() => undefined);

      const retryResult = await supabase
        .from("feed_posts")
        .insert(postPayload)
        .select("id")
        .single();

      data = retryResult.data;
      error = retryResult.error;
      imagePath = null;
    }

    if (error || !data) {
      if (imagePath) {
        await supabase.storage
          .from(FEED_IMAGE_BUCKET)
          .remove([imagePath])
          .catch(() => undefined);
      }

      throw createSupabaseRepositoryError("Post paylaşılamadı.", error);
    }

    if (payload.poll && data.id) {
      const sanitizedOptions = (payload.poll.options ?? [])
        .map((text) => sanitizePlainText(text, 200).trim())
        .filter(Boolean);

      const { error: pollError } = await supabase.rpc(
        "create_feed_poll_for_post",
        {
          target_post_id: data.id,
          poll_question: sanitizePlainText(payload.poll.question, 1000).trim(),
          poll_options: sanitizedOptions,
          poll_ends_at: payload.poll.endsAt ?? null,
        },
      );

      if (pollError) {
        await this.deletePost(data.id, payload.authorId).catch(() => undefined);
        throw createSupabaseRepositoryError("Anket oluşturulamadı.", pollError);
      }
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
      throw createSupabaseRepositoryError(
        "Beğeni durumu alınamadı.",
        likeError,
      );
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

    return this.getPost(postId);
  }

  async addComment(payload: CreateFeedCommentPayload): Promise<FeedPost> {
    const { error } = await supabase.from("feed_comments").insert({
      post_id: payload.postId,
      author_id: payload.authorId,
      body: sanitizePlainText(payload.body, 1000).trim(),
    });

    if (error) {
      throw createSupabaseRepositoryError("Yorum gönderilemedi.", error);
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
      throw createSupabaseRepositoryError("Yanıt gönderilemedi.", error);
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
      throw createSupabaseRepositoryError("Bildirim gönderilemedi.", error);
    }

    return this.getPost(postId);
  }

  async deletePost(postId: string, _requesterId: string): Promise<void> {
    const { data: existingPost } = await supabase
      .from("feed_posts")
      .select("image_path")
      .eq("id", postId)
      .maybeSingle();
    const { data, error } = await supabase
      .from("feed_posts")
      .delete()
      .eq("id", postId)
      .select("id");

    if (error) {
      throw createSupabaseRepositoryError("Post silinemedi.", error);
    }

    if (!data || data.length === 0) {
      throw new Error("Bu postu silme yetkiniz yok.");
    }

    if (existingPost?.image_path) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove([existingPost.image_path])
        .catch(() => undefined);
    }
  }

  async votePoll(
    pollId: string,
    optionId: string,
    userId: string,
  ): Promise<void> {
    // Önce varsa eski oyu sil (değiştirme desteği)
    await supabase
      .from("feed_poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", userId);

    const { error } = await supabase.from("feed_poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
    });

    if (error) {
      throw createSupabaseRepositoryError("Oy verilemedi.", error);
    }
  }
}
