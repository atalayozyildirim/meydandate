import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedTag } from "@/domain/entities/Feed";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";

export type CreateFeedPostPayload = {
  body: string;
  tags: FeedTag[];
  image?: { uri: string; base64?: string | null };
  images?: Array<{ uri: string; base64?: string | null }>;
  poll?: { question: string; options: string[]; endsAt?: string };
  quotedPostId?: string | null;
};

export const moderateFeedText = async (authorId: string, body: string) => {
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

export const useCreateFeedPost = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const mutation = useMutation({
    mutationFn: async (payload: CreateFeedPostPayload) => {
      if (!currentUser) {
        throw new Error("Post paylaşmak için oturum gerekli.");
      }

      const filteredBody = await moderateFeedText(currentUser.id, payload.body);

      let filteredPoll:
        | { question: string; options: string[]; endsAt?: string }
        | undefined;

      if (payload.poll) {
        const filteredQuestion = await moderateFeedText(
          currentUser.id,
          payload.poll.question,
        );
        const filteredOptions = await Promise.all(
          (payload.poll.options ?? []).map((option) =>
            moderateFeedText(currentUser.id, option),
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKeys.feed] });
    },
  });

  return {
    createPost: mutation.mutateAsync,
    isCreatingPost: mutation.isPending,
  };
};
