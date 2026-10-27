import type { FeedTag } from "@/domain/entities/Feed";
import { publicUserColumns } from "../userMapper";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";

export const activeFeedTagSet = new Set<FeedTag>([
  "muharrem",
  "deyis",
  "soru",
  "gundem",
]);
export const DEFAULT_FEED_PAGE_SIZE = 8;
export const DEFAULT_COMMENT_PAGE_SIZE = 4;
export const FEED_IMAGE_BUCKET = "feed-post-images";
export const MAX_FEED_IMAGE_BYTES = 6 * 1024 * 1024;
export const base64Alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const values = ["code", "message", "details", "hint"].map((field) => {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : "";
  });

  return values.join(" ");
};

export const isMissingFeedImageColumnError = (error: unknown) =>
  /PGRST204|42703|schema cache|column/i.test(getErrorText(error)) &&
  /image_path|image_url|image_paths|image_urls/i.test(getErrorText(error));

export const isMissingFeedEnrichmentColumnError = (error: unknown) =>
  /PGRST204|42703|schema cache|column/i.test(getErrorText(error)) &&
  /quoted_post_id|quote_snapshot|link_preview/i.test(getErrorText(error));

export const decodeBase64 = (value: string): ArrayBuffer => {
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

export const postSelect = `
  id,
  author_id,
  body,
  image_url,
  image_urls,
  image_paths,
  quoted_post_id,
  quote_snapshot,
  link_preview,
  tags,
  report_count,
  is_pinned,
  created_at,
  updated_at,
  author:users!feed_posts_author_id_fkey(${publicUserColumns}),
  likes:feed_post_likes(user_id),
  comments:feed_comments(id),
  poll:feed_polls(
    id,
    post_id,
    question,
    ends_at,
    options:feed_poll_options(id, text, display_order),
    votes:feed_poll_votes(option_id, user_id)
  )
`;

export const legacyPostSelect = `
  id,
  author_id,
  body,
  image_url,
  image_urls,
  image_paths,
  tags,
  report_count,
  is_pinned,
  created_at,
  updated_at,
  author:users!feed_posts_author_id_fkey(${publicUserColumns}),
  likes:feed_post_likes(user_id),
  comments:feed_comments(id),
  poll:feed_polls(
    id,
    post_id,
    question,
    ends_at,
    options:feed_poll_options(id, text, display_order),
    votes:feed_poll_votes(option_id, user_id)
  )
`;

export const commentSelect = `
  id,
  post_id,
  author_id,
  body,
  image_urls,
  image_paths,
  created_at,
  author:users!feed_comments_author_id_fkey(${publicUserColumns}),
  likes:feed_comment_likes(user_id),
  replies:feed_replies(
    id,
    comment_id,
    author_id,
    body,
    image_urls,
    image_paths,
    created_at,
    author:users!feed_replies_author_id_fkey(${publicUserColumns}),
    likes:feed_reply_likes(user_id)
  )
`;

export const botPostSelect = `
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

export type LikeRow = { user_id: string };

export type ReplyRow = {
  id: string;
  comment_id: string;
  author_id: string;
  body: string;
  image_urls?: string[] | null;
  image_paths?: string[] | null;
  created_at: string;
  author: import("@/domain/entities/User").User;
  likes?: LikeRow[];
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  image_urls?: string[] | null;
  image_paths?: string[] | null;
  created_at: string;
  author: import("@/domain/entities/User").User;
  likes?: LikeRow[];
  replies?: ReplyRow[];
};

export type PollVoteRow = {
  option_id: string;
  user_id: string;
};

export type PollOptionRow = {
  id: string;
  text: string;
  display_order: number;
};

export type PollRow = {
  id: string;
  post_id: string;
  question: string;
  ends_at: string | null;
  options: PollOptionRow[];
  votes: PollVoteRow[];
};

export type PostRow = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  image_path?: string | null;
  image_urls?: string[] | null;
  image_paths?: string[] | null;
  quoted_post_id?: string | null;
  quote_snapshot?: unknown | null;
  link_preview?: unknown | null;
  tags: FeedTag[];
  report_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author: import("@/domain/entities/User").User;
  likes?: LikeRow[];
  comments?: CommentRow[] | Array<{ id: string }>;
  poll?: PollRow | PollRow[] | null;
};

export type FeedImageInput = {
  uri: string;
  base64?: string | null;
};

export type UploadedFeedImage = {
  url: string;
  path: string | null;
};

export type BotPostRow = {
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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
};

export const readOptionalUrl = (record: Record<string, unknown>, key: string) => {
  const value = readString(record, key);
  return /^https?:\/\//i.test(value) ? value : null;
};

export const getImageSignature = (imageData: ArrayBuffer) => {
  const header = new Uint8Array(imageData.slice(0, 12));
  const headerStr = String.fromCharCode(...Array.from(header));

  if (headerStr.startsWith("GIF87a") || headerStr.startsWith("GIF89a")) {
    return { ext: "gif", contentType: "image/gif" };
  }

  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e) {
    return { ext: "png", contentType: "image/png" };
  }

  if (headerStr.startsWith("RIFF") && headerStr.includes("WEBP")) {
    return { ext: "webp", contentType: "image/webp" };
  }

  return { ext: "jpg", contentType: "image/jpeg" };
};

export const uploadFeedImage = async (
  authorId: string,
  image: FeedImageInput,
): Promise<UploadedFeedImage> => {
  if (image.uri && /^https?:\/\//i.test(image.uri)) {
    return { url: image.uri, path: null };
  }

  if (!image.base64) {
    throw new Error("Fotoğraf hazırlanamadı. Görseli tekrar seçin.");
  }

  const imageData = decodeBase64(image.base64);

  if (imageData.byteLength > MAX_FEED_IMAGE_BYTES) {
    throw new Error("Fotoğraf en fazla 6 MB olabilir.");
  }

  const signature = getImageSignature(imageData);
  const imagePath = `${authorId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${signature.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(FEED_IMAGE_BUCKET)
    .upload(imagePath, imageData, {
      cacheControl: "3600",
      contentType: signature.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw createSupabaseRepositoryError("Fotoğraf yüklenemedi.", uploadError);
  }

  return {
    path: imagePath,
    url: supabase.storage.from(FEED_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl,
  };
};

export const uploadFeedImages = async (authorId: string, images: FeedImageInput[]) => {
  const limitedImages = images.slice(0, 4);
  const uploaded: UploadedFeedImage[] = [];

  try {
    for (const image of limitedImages) {
      uploaded.push(await uploadFeedImage(authorId, image));
    }

    return uploaded;
  } catch (error) {
    const uploadedPaths = uploaded
      .map((image) => image.path)
      .filter((path): path is string => Boolean(path));

    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove(uploadedPaths)
        .catch(() => undefined);
    }

    throw error;
  }
};
