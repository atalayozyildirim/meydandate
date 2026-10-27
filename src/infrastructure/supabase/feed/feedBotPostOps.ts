import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type { BotFeedPostPayload } from "@/domain/repositories/FeedRepository";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import { botPostSelect, type BotPostRow } from "./feedTypes";
import { botPayloadToRow, mapBotPost } from "./feedMappers";

export const fetchBotPosts = async (
  tag: FeedTag | "all" = "all",
  includeInactive = false,
): Promise<FeedPost[]> => {
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
};

export const fetchFeaturedBotPosts = async (
  tag: FeedTag | "all" = "all",
): Promise<FeedPost[]> => {
  const botPosts = await fetchBotPosts(tag, false);

  if (botPosts.length <= 1) {
    return botPosts;
  }

  const featuredIndex = Math.floor(Math.random() * botPosts.length);
  const featuredPost = botPosts[featuredIndex];

  return featuredPost ? [featuredPost] : [];
};

export const insertBotPost = async (
  adminUserId: string,
  payload: BotFeedPostPayload,
): Promise<FeedPost> => {
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
};

export const patchBotPost = async (
  postId: string,
  payload: BotFeedPostPayload,
): Promise<FeedPost> => {
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
};

export const removeBotPost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from("bot_feed_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    throw createSupabaseRepositoryError("Bot paylaşımı silinemedi.", error);
  }
};
