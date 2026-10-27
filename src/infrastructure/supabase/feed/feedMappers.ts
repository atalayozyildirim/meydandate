import type {
  FeedComment,
  FeedLinkPreview,
  FeedPoll,
  FeedPost,
  FeedQuotedPost,
  FeedReply,
  FeedTag,
} from "@/domain/entities/Feed";
import type { BotFeedPostPayload } from "@/domain/repositories/FeedRepository";
import { ehlibyteBotUser } from "@/shared/constants/ehlibyteBot";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { mapSupabaseUser } from "../userMapper";
import {
  activeFeedTagSet,
  isRecord,
  readOptionalUrl,
  readString,
  type BotPostRow,
  type CommentRow,
  type PollRow,
  type PostRow,
  type ReplyRow,
} from "./feedTypes";

export const normalizeFeedTags = (tags: unknown): FeedTag[] => {
  if (!Array.isArray(tags)) {
    return ["gundem"];
  }

  const activeTags = tags.filter((tag): tag is FeedTag =>
    activeFeedTagSet.has(tag as FeedTag),
  );

  return activeTags.length > 0 ? activeTags : ["gundem"];
};

export const mapLinkPreview = (value: unknown): FeedLinkPreview | null => {
  if (!isRecord(value)) {
    return null;
  }

  const url = readOptionalUrl(value, "url");

  if (!url) {
    return null;
  }

  const title = sanitizePlainText(readString(value, "title"), 140);
  const description = sanitizePlainText(readString(value, "description"), 220);
  const siteName = sanitizePlainText(readString(value, "siteName"), 80);
  const imageUrl = readOptionalUrl(value, "imageUrl");

  return {
    url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(siteName ? { siteName } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
};

export const mapQuotedPost = (
  value: unknown,
  quotedPostId?: string | null,
): FeedQuotedPost | null => {
  if (!isRecord(value)) {
    return null;
  }

  const authorName = sanitizePlainText(readString(value, "authorName"), 80);
  const body = sanitizePlainText(readString(value, "body"), 260);

  if (!authorName && !body) {
    return null;
  }

  const id = readString(value, "id") || quotedPostId || null;
  const authorId = readString(value, "authorId") || null;
  const authorPhotoUrl = readOptionalUrl(value, "authorPhotoUrl");
  const imageUrl = readOptionalUrl(value, "imageUrl");
  const createdAt = readString(value, "createdAt") || null;

  return {
    id,
    authorId,
    authorName: authorName || "Paylaşım",
    body,
    ...(authorPhotoUrl ? { authorPhotoUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
};

export const buildQuoteSnapshot = (post: FeedPost): FeedQuotedPost => ({
  id: post.id,
  authorId: post.authorId,
  authorName: sanitizePlainText(post.author.name, 80),
  authorPhotoUrl: post.author.photos[0]?.uri ?? null,
  body: sanitizePlainText(post.body, 260),
  imageUrl: post.imageUrl ?? null,
  createdAt: post.createdAt,
});

export const normalizeImageUrls = (
  imageUrls?: string[] | null,
  legacyImageUrl?: string | null,
) => {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [];

  if (urls.length > 0) {
    return urls.slice(0, 4);
  }

  return legacyImageUrl ? [legacyImageUrl] : [];
};

export const mapReply = (postId: string, row: ReplyRow): FeedReply => ({
  id: row.id,
  postId,
  commentId: row.comment_id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 1000),
  imageUrls: normalizeImageUrls(row.image_urls),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  createdAt: row.created_at,
});

export const mapComment = (row: CommentRow): FeedComment => ({
  id: row.id,
  postId: row.post_id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 1000),
  imageUrls: normalizeImageUrls(row.image_urls),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  replies: (row.replies ?? [])
    .map((reply) => mapReply(row.post_id, reply))
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  createdAt: row.created_at,
});

export const mapPoll = (
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

export const mapPost = (
  row: PostRow,
  currentUserId = "",
  extras?: { isBookmarked?: boolean; isFollowingAuthor?: boolean },
): FeedPost => ({
  id: row.id,
  authorId: row.author_id,
  author: mapSupabaseUser(row.author),
  body: sanitizePlainText(row.body, 2000),
  imageUrls: normalizeImageUrls(row.image_urls, row.image_url),
  ...(normalizeImageUrls(row.image_urls, row.image_url)[0]
    ? { imageUrl: normalizeImageUrls(row.image_urls, row.image_url)[0] }
    : {}),
  tags: normalizeFeedTags(row.tags),
  likedByUserIds: (row.likes ?? []).map((like) => like.user_id),
  comments: [],
  commentCount: row.comments?.length ?? 0,
  reportCount: row.report_count,
  isPinned: row.is_pinned,
  poll: mapPoll(row.poll, currentUserId),
  quotedPost: mapQuotedPost(row.quote_snapshot, row.quoted_post_id),
  linkPreview: mapLinkPreview(row.link_preview),
  isBookmarked: extras?.isBookmarked ?? false,
  isFollowingAuthor: extras?.isFollowingAuthor ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapBotPost = (row: BotPostRow): FeedPost => ({
  id: `bot-${row.id}`,
  authorId: ehlibyteBotUser.id,
  author: ehlibyteBotUser,
  body: sanitizePlainText(row.body, 2000),
  imageUrls: [],
  tags: normalizeFeedTags(row.tags),
  likedByUserIds: [],
  comments: [],
  commentCount: 0,
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

export const botPayloadToRow = (
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
