// Akış verisini, post oluşturmayı ve yorum/yanıt etkileşimlerini yönetir.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { FeedTag } from "@/domain/entities/Feed";
import type {
  BotFeedPostPayload,
  FeedCommentsPage,
  FeedPage,
} from "@/domain/repositories/FeedRepository";
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

const FEED_PAGE_SIZE = 8;
const COMMENT_PAGE_SIZE = 4;
const EMPTY_FEED_PAGE: FeedPage = {
  posts: [],
  hasMore: false,
};

const moderateFeedText = async (authorId: string, body: string) => {
  if (!body.trim()) {
    return "";
  }

  const moderation = await messageFilteringMiddleware("feed", authorId, body);

  if (moderation.isBlocked) {
    if (moderation.action === "ban") {
      throw new PermanentBanError(
        "Bu içerik ağır güvenlik ihlali nedeniyle engellendi. Hesap kalıcı olarak banlandı.",
      );
    }

    throw new Error("İçerik güvenlik filtresinden geçemedi.");
  }

  return moderation.filteredBody;
};

export const useFeed = (tag: FeedTag | "all" = "all") => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useInfiniteQuery<FeedPage, Error>({
    queryKey: [queryKeys.feed, tag, currentUser?.id],
    enabled: Boolean(currentUser),
    retry: false,
    queryFn: async ({ pageParam = 0 }) => {
      try {
        return await container.feedRepository.listFeed(
          currentUser?.id ?? "",
          tag,
          {
            offset: Number(pageParam),
            limit: FEED_PAGE_SIZE,
          },
        );
      } catch {
        return EMPTY_FEED_PAGE;
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
  });

  const invalidateFeed = async () => {
    await queryClient.invalidateQueries({ queryKey: [queryKeys.feed] });
  };

  const createPostMutation = useMutation({
    mutationFn: async (payload: {
      body: string;
      tags: FeedTag[];
      image?: { uri: string; base64?: string | null };
      images?: Array<{ uri: string; base64?: string | null }>;
      poll?: { question: string; options: string[]; endsAt?: string };
      quotedPostId?: string | null;
    }) => {
      if (!currentUser) {
        throw new Error("Post paylaşmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, payload.body);

      let filteredPoll: { question: string; options: string[]; endsAt?: string } | undefined;

      if (payload.poll) {
        const filteredQuestion = await moderateFeedText(
          currentUser.id,
          payload.poll.question,
        );
        const filteredOptions = await Promise.all(
          (payload.poll.options ?? []).map((opt) =>
            moderateFeedText(currentUser.id, opt),
          ),
        );
        filteredPoll = {
          question: filteredQuestion,
          options: filteredOptions,
          endsAt: payload.poll.endsAt,
        };
      }

      return container.feedRepository.createPost({
        authorId: currentUser.id,
        body: filteredBody,
        tags: payload.tags,
        image: payload.image,
        images: payload.images,
        ...(filteredPoll ? { poll: filteredPoll } : {}),
        ...(payload.quotedPostId ? { quotedPostId: payload.quotedPostId } : {}),
      });
    },
    onSuccess: invalidateFeed,
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => {
      if (!currentUser) {
        throw new Error("Beğenmek için oturum gerekli.");
      }

      return container.feedRepository.togglePostLike(postId, currentUser.id);
    },
    onSuccess: invalidateFeed,
  });

  const commentMutation = useMutation({
    mutationFn: async ({
      postId,
      body,
      images,
    }: {
      postId: string;
      body: string;
      images?: Array<{ uri: string; base64?: string | null }>;
    }) => {
      if (!currentUser) {
        throw new Error("Yorum yazmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.addComment({
        postId,
        authorId: currentUser.id,
        body: filteredBody,
        images,
      });
    },
    onSuccess: invalidateFeed,
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      postId,
      commentId,
      body,
      images,
    }: {
      postId: string;
      commentId: string;
      body: string;
      images?: Array<{ uri: string; base64?: string | null }>;
    }) => {
      if (!currentUser) {
        throw new Error("Yanıt yazmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.addReply({
        postId,
        commentId,
        authorId: currentUser.id,
        body: filteredBody,
        images,
      });
    },
    onSuccess: invalidateFeed,
  });

  const reportMutation = useMutation({
    mutationFn: (postId: string) => {
      if (!currentUser) {
        throw new Error("Raporlamak için oturum gerekli.");
      }

      return container.feedRepository.reportPost(postId, currentUser.id);
    },
    onSuccess: invalidateFeed,
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => {
      if (!currentUser) {
        throw new Error("Post silmek için oturum gerekli.");
      }

      return container.feedRepository.deletePost(postId, currentUser.id);
    },
    onSuccess: invalidateFeed,
  });

  const votePollMutation = useMutation({
    mutationFn: ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      if (!currentUser) {
        throw new Error("Oy vermek için oturum gerekli.");
      }

      return container.feedRepository.votePoll(
        pollId,
        optionId,
        currentUser.id,
      );
    },
    onSuccess: invalidateFeed,
  });

  return {
    posts: query.data?.pages.flatMap((page) => page.posts) ?? [],
    currentUser,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    refresh: query.refetch,
    fetchMorePosts: query.fetchNextPage,
    hasMorePosts: Boolean(query.hasNextPage),
    isFetchingMorePosts: query.isFetchingNextPage,
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,
    toggleLike: likeMutation.mutateAsync,
    addComment: commentMutation.mutateAsync,
    addReply: replyMutation.mutateAsync,
    reportPost: reportMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,
    votePoll: votePollMutation.mutateAsync,
    isMutating:
      createPostMutation.isPending ||
      likeMutation.isPending ||
      commentMutation.isPending ||
      replyMutation.isPending ||
      reportMutation.isPending ||
      deletePostMutation.isPending ||
      votePollMutation.isPending,
  };
};

export const useFeedComments = (postId: string, enabled: boolean) => {
  const query = useInfiniteQuery<FeedCommentsPage, Error>({
    queryKey: [queryKeys.feed, "comments", postId],
    enabled,
    retry: false,
    queryFn: ({ pageParam = 0 }) =>
      container.feedRepository.listComments(postId, {
        offset: Number(pageParam),
        limit: COMMENT_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
  });

  return {
    comments: query.data?.pages.flatMap((page) => page.comments) ?? [],
    isLoadingComments: query.isLoading,
    fetchMoreComments: query.fetchNextPage,
    hasMoreComments: Boolean(query.hasNextPage),
    isFetchingMoreComments: query.isFetchingNextPage,
  };
};

export const useFeedPost = (postId: string) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const postQuery = useQuery({
    queryKey: [queryKeys.feed, "post", postId, currentUser?.id],
    enabled: Boolean(currentUser && postId),
    retry: false,
    queryFn: () =>
      container.feedRepository.getPost(postId, currentUser?.id ?? ""),
  });

  const invalidatePost = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [queryKeys.feed, "post", postId],
      }),
      queryClient.invalidateQueries({ queryKey: [queryKeys.feed] }),
    ]);
  };

  const likeMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Beğenmek için oturum gerekli.");
      }

      return container.feedRepository.togglePostLike(postId, currentUser.id);
    },
    onSuccess: invalidatePost,
  });

  const commentMutation = useMutation({
    mutationFn: async (payload: {
      body: string;
      images?: Array<{ uri: string; base64?: string | null }>;
    }) => {
      if (!currentUser) {
        throw new Error("Yorum yazmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, payload.body);
      return container.feedRepository.addComment({
        postId,
        authorId: currentUser.id,
        body: filteredBody,
        images: payload.images,
      });
    },
    onSuccess: invalidatePost,
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      commentId,
      body,
      images,
    }: {
      commentId: string;
      body: string;
      images?: Array<{ uri: string; base64?: string | null }>;
    }) => {
      if (!currentUser) {
        throw new Error("Yanıt yazmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.addReply({
        postId,
        commentId,
        authorId: currentUser.id,
        body: filteredBody,
        images,
      });
    },
    onSuccess: invalidatePost,
  });

  const commentLikeMutation = useMutation({
    mutationFn: (commentId: string) => {
      if (!currentUser) {
        throw new Error("Yorumu beğenmek için oturum gerekli.");
      }

      return container.feedRepository.toggleCommentLike(
        postId,
        commentId,
        currentUser.id,
      );
    },
    onSuccess: invalidatePost,
  });

  const commentReportMutation = useMutation({
    mutationFn: (commentId: string) => {
      if (!currentUser) {
        throw new Error("Yorumu bildirmek için oturum gerekli.");
      }

      return container.feedRepository.reportComment(
        postId,
        commentId,
        currentUser.id,
      );
    },
    onSuccess: invalidatePost,
  });

  const quoteMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!currentUser) {
        throw new Error("Alıntılamak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.createPost({
        authorId: currentUser.id,
        body: filteredBody,
        tags:
          postQuery.data?.tags && postQuery.data.tags.length > 0
            ? postQuery.data.tags
            : (["gundem"] as FeedTag[]),
        quotedPostId: postId,
      });
    },
    onSuccess: invalidatePost,
  });

  const reportMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Raporlamak için oturum gerekli.");
      }

      return container.feedRepository.reportPost(postId, currentUser.id);
    },
    onSuccess: invalidatePost,
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Post silmek için oturum gerekli.");
      }

      return container.feedRepository.deletePost(postId, currentUser.id);
    },
    onSuccess: invalidatePost,
  });

  const voteMutation = useMutation({
    mutationFn: ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      if (!currentUser) {
        throw new Error("Oy vermek için oturum gerekli.");
      }

      return container.feedRepository.votePoll(
        pollId,
        optionId,
        currentUser.id,
      );
    },
    onSuccess: invalidatePost,
  });

  return {
    post: postQuery.data ?? null,
    currentUser,
    isLoading: postQuery.isLoading,
    refresh: postQuery.refetch,
    toggleLike: likeMutation.mutateAsync,
    addComment: commentMutation.mutateAsync,
    addReply: replyMutation.mutateAsync,
    toggleCommentLike: commentLikeMutation.mutateAsync,
    reportComment: commentReportMutation.mutateAsync,
    quotePost: quoteMutation.mutateAsync,
    reportPost: reportMutation.mutateAsync,
    deletePost: deleteMutation.mutateAsync,
    votePoll: voteMutation.mutateAsync,
    isMutating:
      likeMutation.isPending ||
      commentMutation.isPending ||
      replyMutation.isPending ||
      commentLikeMutation.isPending ||
      commentReportMutation.isPending ||
      quoteMutation.isPending ||
      reportMutation.isPending ||
      deleteMutation.isPending ||
      voteMutation.isPending,
  };
};

export const useBotFeedAdmin = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const botPostsQuery = useInfiniteQuery<FeedPage, Error>({
    queryKey: [queryKeys.feed, "bot-admin", currentUser?.id],
    enabled: Boolean(enabled && currentUser),
    retry: false,
    queryFn: async () => ({
      posts: await container.feedRepository.listBotPosts("all", true),
      hasMore: false,
    }),
    getNextPageParam: () => undefined,
  });

  const invalidateBotPosts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [queryKeys.feed] }),
      queryClient.invalidateQueries({
        queryKey: [queryKeys.feed, "bot-admin"],
      }),
    ]);
  };

  const createBotPostMutation = useMutation({
    mutationFn: (payload: BotFeedPostPayload) => {
      if (!currentUser) {
        throw new Error("Rehber paylaşımı için admin oturumu gerekli.");
      }

      return container.feedRepository.createBotPost(currentUser.id, payload);
    },
    onSuccess: invalidateBotPosts,
  });

  const updateBotPostMutation = useMutation({
    mutationFn: ({
      postId,
      payload,
    }: {
      postId: string;
      payload: BotFeedPostPayload;
    }) => container.feedRepository.updateBotPost(postId, payload),
    onSuccess: invalidateBotPosts,
  });

  const deleteBotPostMutation = useMutation({
    mutationFn: (postId: string) =>
      container.feedRepository.deleteBotPost(postId),
    onSuccess: invalidateBotPosts,
  });

  return {
    botPosts: botPostsQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    isLoadingBotPosts: botPostsQuery.isLoading,
    createBotPost: createBotPostMutation.mutateAsync,
    updateBotPost: updateBotPostMutation.mutateAsync,
    deleteBotPost: deleteBotPostMutation.mutateAsync,
    isSavingBotPost:
      createBotPostMutation.isPending ||
      updateBotPostMutation.isPending ||
      deleteBotPostMutation.isPending,
  };
};
