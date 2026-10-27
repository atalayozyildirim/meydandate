import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { FeedPage } from "@/domain/repositories/FeedRepository";
import type { FeedTag } from "@/domain/entities/Feed";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import {
  useCreateFeedPost,
  moderateFeedText,
  type CreateFeedPostPayload,
} from "./useCreateFeedPost";

export { useCreateFeedPost, type CreateFeedPostPayload };
export { useFeedComments } from "./useFeedComments";
export { useFeedPost } from "./useFeedPost";
export { useBotFeedAdmin } from "./useBotFeedAdmin";

const FEED_PAGE_SIZE = 8;
const EMPTY_FEED_PAGE: FeedPage = {
  posts: [],
  hasMore: false,
};

export const useFeed = (tag: FeedTag | "all" = "all") => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { createPost, isCreatingPost } = useCreateFeedPost();

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
    createPost,
    isCreatingPost,
    toggleLike: likeMutation.mutateAsync,
    addComment: commentMutation.mutateAsync,
    addReply: replyMutation.mutateAsync,
    reportPost: reportMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,
    votePoll: votePollMutation.mutateAsync,
    isMutating:
      isCreatingPost ||
      likeMutation.isPending ||
      commentMutation.isPending ||
      replyMutation.isPending ||
      reportMutation.isPending ||
      deletePostMutation.isPending ||
      votePollMutation.isPending,
  };
};
