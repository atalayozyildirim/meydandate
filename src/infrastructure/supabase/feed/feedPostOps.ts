import type {
  FeedPost,
  FeedQuotedPost,
  FeedTag,
} from "@/domain/entities/Feed";
import type { User } from "@/domain/entities/User";
import type {
  CreateFeedPostPayload,
  FeedPage,
  FeedPageOptions,
} from "@/domain/repositories/FeedRepository";
import {
  balanceContentVariety,
  createFeedScoringContext,
  rankFeedPosts,
} from "@/domain/services/FeedRankingService";
import { fetchLinkPreview } from "@/shared/utils/linkPreview";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import { mapSupabaseUser } from "../userMapper";
import {
  DEFAULT_FEED_PAGE_SIZE,
  FEED_IMAGE_BUCKET,
  isMissingFeedEnrichmentColumnError,
  isMissingFeedImageColumnError,
  legacyPostSelect,
  postSelect,
  uploadFeedImages,
  type PostRow,
  type UploadedFeedImage,
} from "./feedTypes";
import { buildQuoteSnapshot, mapPost } from "./feedMappers";
import { fetchFeaturedBotPosts } from "./feedBotPostOps";

export const fetchPost = async (
  postId: string,
  currentUserId = "",
): Promise<FeedPost> => {
  let { data, error } = await supabase
    .from("feed_posts")
    .select(postSelect)
    .eq("id", postId)
    .maybeSingle();

  if (error && isMissingFeedEnrichmentColumnError(error)) {
    const legacyResult = await supabase
      .from("feed_posts")
      .select(legacyPostSelect)
      .eq("id", postId)
      .maybeSingle();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw createSupabaseRepositoryError("Post yüklenemedi.", error);
  }

  if (!data) {
    throw new Error("Post bulunamadı veya artık görüntülenemiyor.");
  }

  let isBookmarked = false;
  let isFollowingAuthor = false;
  if (currentUserId) {
    const [{ data: bm }, { data: fl }] = await Promise.all([
      supabase
        .from("feed_post_bookmarks")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle(),
      supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .eq("following_id", (data as unknown as PostRow).author_id)
        .maybeSingle(),
    ]);
    isBookmarked = Boolean(bm);
    isFollowingAuthor = Boolean(fl);
  }

  return mapPost(data as unknown as PostRow, currentUserId, {
    isBookmarked,
    isFollowingAuthor,
  });
};

export const fetchFeedList = async (
  userId: string,
  tag: FeedTag | "all" = "all",
  options: FeedPageOptions = {},
): Promise<FeedPage> => {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? DEFAULT_FEED_PAGE_SIZE;
  const scope = options.scope ?? "all";

  let followingIds: string[] = [];
  let bookmarkedIds: string[] = [];

  if (userId) {
    const [{ data: flRows }, { data: bmRows }] = await Promise.all([
      supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId),
      supabase
        .from("feed_post_bookmarks")
        .select("post_id")
        .eq("user_id", userId),
    ]);
    followingIds = (flRows ?? []).map((r: { following_id: string }) => r.following_id);
    bookmarkedIds = (bmRows ?? []).map((r: { post_id: string }) => r.post_id);
  }

  if (scope === "following" && followingIds.length === 0) {
    return { posts: [], nextOffset: offset, hasMore: false };
  }
  if (scope === "saved" && bookmarkedIds.length === 0) {
    return { posts: [], nextOffset: offset, hasMore: false };
  }

  const followingSet = new Set(followingIds);
  const bookmarkSet = new Set(bookmarkedIds);

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      "id,name,age,city,bio,culturalIdentity,cultureImportance,interests,photos,profilePrompts,badges,isPremium,hasPassedEntryTest,hasCompletedOnboarding,createdAt,updatedAt",
    )
    .eq("id", userId)
    .single();

  const currentUser =
    userError || !userData
      ? null
      : mapSupabaseUser(userData as unknown as Partial<User>);

  const { data: matches } = await supabase
    .from("matches")
    .select("user1Id,user2Id")
    .or(`user1Id.eq.${userId},user2Id.eq.${userId}`);

  const friendIds = matches
    ? matches.flatMap((m) =>
        (m as { user1Id: string; user2Id: string }).user1Id === userId
          ? [(m as { user1Id: string; user2Id: string }).user2Id]
          : [(m as { user1Id: string; user2Id: string }).user1Id],
      )
    : [];

  const buildFeedQuery = (select: string) => {
    let query = supabase
      .from("feed_posts")
      .select(select)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit);

    if (tag !== "all") {
      query = query.contains("tags", [tag]);
    }

    if (scope === "following") {
      query = query.in("author_id", followingIds);
    } else if (scope === "saved") {
      query = query.in("id", bookmarkedIds);
    }

    return query;
  };

  let { data, error } = await buildFeedQuery(postSelect);

  if (error && isMissingFeedEnrichmentColumnError(error)) {
    const legacyResult = await buildFeedQuery(legacyPostSelect);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw createSupabaseRepositoryError("Akış yüklenemedi.", error);
  }

  const rows = (data ?? []).slice(0, limit);
  const posts = rows.map((r) => {
    const row = r as unknown as PostRow;
    return mapPost(row, userId, {
      isBookmarked: bookmarkSet.has(row.id),
      isFollowingAuthor: followingSet.has(row.author_id),
    });
  });
  const botPosts =
    offset === 0 && scope === "all" ? await fetchFeaturedBotPosts(tag) : [];

  let rankedPosts: FeedPost[];
  if (currentUser) {
    const scoringContext = createFeedScoringContext(
      currentUser,
      friendIds,
      [],
      5.0,
    );

    const allPosts = [...botPosts, ...posts];
    rankedPosts = rankFeedPosts(allPosts, scoringContext);

    if (offset === 0) {
      rankedPosts = balanceContentVariety(rankedPosts, limit);
    }
  } else {
    rankedPosts = [...botPosts, ...posts].sort((first, second) => {
      if (first.isSponsored && !second.isSponsored) return -1;
      if (!first.isSponsored && second.isSponsored) return 1;
      if (first.isPinned && !second.isPinned) return -1;
      if (!first.isPinned && second.isPinned) return 1;
      return (
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime()
      );
    });
  }

  return {
    posts: rankedPosts,
    nextOffset: offset + rows.length,
    hasMore: (data ?? []).length > limit,
  };
};

export const createFeedPost = async (
  payload: CreateFeedPostPayload,
  getPost: (postId: string, currentUserId?: string) => Promise<FeedPost>,
  deletePost: (postId: string, requesterId: string) => Promise<void>,
): Promise<FeedPost> => {
  let uploadedImages: UploadedFeedImage[] = [];
  let quoteSnapshot: FeedQuotedPost | null = null;

  if (payload.quotedPostId) {
    try {
      quoteSnapshot = buildQuoteSnapshot(
        await getPost(payload.quotedPostId, payload.authorId),
      );
    } catch (error) {
      throw createSupabaseRepositoryError("Alıntılanan post bulunamadı.", error);
    }
  }

  const imageInputs = [
    ...(payload.images ?? []),
    ...(payload.image ? [payload.image] : []),
  ].slice(0, 4);

  if (imageInputs.length > 0) {
    uploadedImages = await uploadFeedImages(payload.authorId, imageInputs);
  }

  const imageUrls = uploadedImages.map((image) => image.url);
  const imagePaths = uploadedImages
    .map((image) => image.path)
    .filter((path): path is string => Boolean(path));
  const firstImageUrl = imageUrls[0] ?? null;
  const firstImagePath = imagePaths[0] ?? null;

  const sanitizedBody = sanitizePlainText(payload.body, 2000).trim();
  const linkPreview = await fetchLinkPreview(sanitizedBody);
  const basePostPayload = {
    author_id: payload.authorId,
    body: sanitizedBody,
    tags: payload.tags,
  };
  const postPayload = {
    ...basePostPayload,
    ...(quoteSnapshot
      ? {
          quoted_post_id: quoteSnapshot.id,
          quote_snapshot: quoteSnapshot,
        }
      : {}),
    ...(linkPreview ? { link_preview: linkPreview } : {}),
  };
  const postPayloadWithImage =
    imageUrls.length > 0
      ? {
          ...postPayload,
          image_urls: imageUrls,
          image_paths: imagePaths,
          ...(firstImageUrl ? { image_url: firstImageUrl } : {}),
          ...(firstImagePath ? { image_path: firstImagePath } : {}),
        }
      : postPayload;

  let { data, error } = await supabase
    .from("feed_posts")
    .insert(postPayloadWithImage)
    .select("id")
    .single();

  if (error && isMissingFeedEnrichmentColumnError(error)) {
    const legacyPostPayloadWithImage =
      firstImageUrl && firstImagePath
        ? { ...basePostPayload, image_url: firstImageUrl, image_path: firstImagePath }
        : basePostPayload;
    const retryResult = await supabase
      .from("feed_posts")
      .insert(legacyPostPayloadWithImage)
      .select("id")
      .single();

    data = retryResult.data;
    error = retryResult.error;
  }

  if (
    error &&
    firstImagePath &&
    firstImageUrl &&
    isMissingFeedImageColumnError(error)
  ) {
    const imageUrlOnlyResult = await supabase
      .from("feed_posts")
      .insert({ ...postPayload, image_url: firstImageUrl })
      .select("id")
      .single();

    if (!imageUrlOnlyResult.error) {
      data = imageUrlOnlyResult.data;
      error = null;
    } else {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove(imagePaths)
        .catch(() => undefined);

      const retryResult = await supabase
        .from("feed_posts")
        .insert(postPayload)
        .select("id")
        .single();

      data = retryResult.data;
      error = retryResult.error;
    }
  } else if (error && imagePaths.length > 0 && isMissingFeedImageColumnError(error)) {
    await supabase.storage
      .from(FEED_IMAGE_BUCKET)
      .remove(imagePaths)
      .catch(() => undefined);

    const retryResult = await supabase
      .from("feed_posts")
      .insert(postPayload)
      .select("id")
      .single();

    data = retryResult.data;
    error = retryResult.error;
  }

  if (error || !data) {
    if (imagePaths.length > 0) {
      await supabase.storage
        .from(FEED_IMAGE_BUCKET)
        .remove(imagePaths)
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
      await deletePost(data.id, payload.authorId).catch(() => undefined);
      throw createSupabaseRepositoryError("Anket oluşturulamadı.", pollError);
    }
  }

  return getPost(data.id);
};

export const updateFeedPost = async (
  postId: string,
  payload: { body: string; tags?: FeedTag[] },
  getPost: (postId: string) => Promise<FeedPost>,
): Promise<FeedPost> => {
  const sanitizedBody = sanitizePlainText(payload.body, 2000).trim();
  if (!sanitizedBody) {
    throw new Error("Gönderi metni boş olamaz.");
  }
  const { error } = await supabase
    .from("feed_posts")
    .update({
      body: sanitizedBody,
      ...(payload.tags ? { tags: payload.tags } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) {
    throw createSupabaseRepositoryError("Gönderi güncellenemedi.", error);
  }
  return getPost(postId);
};

export const deleteFeedPost = async (
  postId: string,
  _requesterId: string,
): Promise<void> => {
  const { data: existingPost } = await supabase
    .from("feed_posts")
    .select("image_path,image_paths")
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

  const storagePaths = [
    ...(Array.isArray(existingPost?.image_paths) ? existingPost.image_paths : []),
    ...(existingPost?.image_path ? [existingPost.image_path] : []),
  ].filter((path): path is string => typeof path === "string" && path.length > 0);

  if (storagePaths.length > 0) {
    await supabase.storage
      .from(FEED_IMAGE_BUCKET)
      .remove([...new Set(storagePaths)])
      .catch(() => undefined);
  }
};

export const castPollVote = async (
  pollId: string,
  optionId: string,
  userId: string,
): Promise<void> => {
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
};
