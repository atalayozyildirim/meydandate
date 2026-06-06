// Sohbet listesi ve tekil conversation verisini saglar.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useConversations = () => {
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useQuery({
    queryKey: [queryKeys.conversations, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.chatRepository.listConversations(currentUser?.id ?? "")
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading
  };
};

export const useConversation = (conversationId: string) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useQuery({
    queryKey: [queryKeys.conversation, conversationId],
    queryFn: () => container.chatRepository.getConversation(conversationId)
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!currentUser) {
        throw new Error("Mesaj gondermek icin oturum gerekli.");
      }

      const moderation = await messageFilteringMiddleware(
        conversationId,
        currentUser.id,
        body,
      );

      if (moderation.isBlocked) {
        if (moderation.action === "ban") {
          throw new PermanentBanError("Bu mesaj ağır güvenlik ihlali nedeniyle engellendi. Hesap kalıcı olarak banlandı.");
        }

        throw new Error("Mesaj güvenlik filtresinden geçemedi.");
      }

      return container.chatRepository.sendMessage({
        conversationId,
        senderId: currentUser.id,
        body: moderation.filteredBody
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.conversation, conversationId] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] })
      ]);
    }
  });

  return {
    conversation: query.data,
    currentUser,
    isLoading: query.isLoading,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending
  };
};
