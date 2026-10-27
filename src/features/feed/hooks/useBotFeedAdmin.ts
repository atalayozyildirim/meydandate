import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BotFeedPostPayload,
  FeedPage,
} from "@/domain/repositories/FeedRepository";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";

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
