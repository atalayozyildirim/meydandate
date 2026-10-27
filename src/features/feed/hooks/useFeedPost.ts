import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedTag } from "@/domain/entities/Feed";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { moderateFeedText } from "./useCreateFeedPost";

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
