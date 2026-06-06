// Akış verisini, post oluşturmayı ve yorum/yanıt etkileşimlerini yönetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedTag } from "@/domain/entities/Feed";
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

const moderateFeedText = async (authorId: string, body: string) => {
  const moderation = await messageFilteringMiddleware("feed", authorId, body);

  if (moderation.isBlocked) {
    if (moderation.action === "ban") {
      throw new PermanentBanError("Bu içerik ağır güvenlik ihlali nedeniyle engellendi. Hesap kalıcı olarak banlandı.");
    }

    throw new Error("İçerik güvenlik filtresinden geçemedi.");
  }

  return moderation.filteredBody;
};

export const useFeed = (tag: FeedTag | "all" = "all") => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useQuery({
    queryKey: [queryKeys.feed, tag, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.feedRepository.listFeed(currentUser?.id ?? "", tag),
  });

  const invalidateFeed = async () => {
    await queryClient.invalidateQueries({ queryKey: [queryKeys.feed] });
  };

  const createPostMutation = useMutation({
    mutationFn: async ({ body, tags }: { body: string; tags: FeedTag[] }) => {
      if (!currentUser) {
        throw new Error("Post paylaşmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.createPost({
        authorId: currentUser.id,
        body: filteredBody,
        tags,
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
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      if (!currentUser) {
        throw new Error("Yorum yazmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, body);
      return container.feedRepository.addComment({
        postId,
        authorId: currentUser.id,
        body: filteredBody,
      });
    },
    onSuccess: invalidateFeed,
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      postId,
      commentId,
      body,
    }: {
      postId: string;
      commentId: string;
      body: string;
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

  return {
    posts: query.data ?? [],
    currentUser,
    isLoading: query.isLoading,
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,
    toggleLike: likeMutation.mutateAsync,
    addComment: commentMutation.mutateAsync,
    addReply: replyMutation.mutateAsync,
    reportPost: reportMutation.mutateAsync,
    isMutating:
      createPostMutation.isPending ||
      likeMutation.isPending ||
      commentMutation.isPending ||
      replyMutation.isPending ||
      reportMutation.isPending,
  };
};
