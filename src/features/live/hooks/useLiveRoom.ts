// Cem odasinin canli verisini ve katilim aksiyonlarini yonetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LiveParticipantStageStatus } from "@/domain/entities/LiveRoom";
import type {
  ControlLiveVideoPayload,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useLiveRoom = (roomId: string) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accessToken = useAuthStore((state) => state.accessToken);

  const query = useQuery({
    queryKey: [queryKeys.liveRoom, roomId],
    enabled: Boolean(currentUser),
    refetchInterval: 1500,
    retry: false,
    queryFn: () => container.liveRoomRepository.getRoom(roomId, accessToken),
  });

  const joinMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Canli odaya katilmak icin oturum gerekli.");
      }

      return container.liveRoomRepository.joinRoom(roomId, currentUser.id, accessToken);
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Canli odadan ayrilmak icin oturum gerekli.");
      }

      return container.liveRoomRepository.leaveRoom(roomId, currentUser.id, accessToken);
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!currentUser) {
        throw new Error("Sohbet icin oturum gerekli.");
      }

      const moderation = await messageFilteringMiddleware(
        `live:${roomId}`,
        currentUser.id,
        body,
      );

      if (moderation.isBlocked) {
        if (moderation.action === "ban") {
          throw new PermanentBanError("Bu canlı sohbet mesajı ağır güvenlik ihlali nedeniyle engellendi. Hesap kalıcı olarak banlandı.");
        }

        throw new Error("Mesaj güvenlik filtresinden geçemedi.");
      }

      return container.liveRoomRepository.sendMessage(
        roomId,
        currentUser.id,
        moderation.filteredBody,
        accessToken,
      );
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const reportMessageMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!currentUser) {
        throw new Error("Mesaj şikayeti için oturum gerekli.");
      }

      return container.liveRoomRepository.reportMessage(
        roomId,
        messageId,
        currentUser.id,
        accessToken,
      );
    },
  });

  const startRoomMutation = useMutation({
    mutationFn: (payload: StartLiveRoomPayload) => {
      if (!currentUser) {
        throw new Error("Canlı yayın icin oturum gerekli.");
      }

      return container.liveRoomRepository.startRoom(roomId, currentUser.id, payload, accessToken);
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const stopRoomMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Canlı yayın icin oturum gerekli.");
      }

      return container.liveRoomRepository.stopRoom(roomId, currentUser.id, accessToken);
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const controlVideoMutation = useMutation({
    mutationFn: (payload: ControlLiveVideoPayload) => {
      if (!currentUser) {
        throw new Error("Video kontrolü için oturum gerekli.");
      }

      return container.liveRoomRepository.controlVideo(
        roomId,
        currentUser.id,
        payload,
        accessToken,
      );
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const liveKitTokenMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Live odaya katılmak için oturum gerekli.");
      }

      return container.liveRoomRepository.getLiveKitToken(roomId, accessToken);
    },
  });

  const setParticipantStageMutation = useMutation({
    mutationFn: ({
      targetUserId,
      stageStatus,
    }: {
      targetUserId: string;
      stageStatus: LiveParticipantStageStatus;
    }) =>
      container.liveRoomRepository.setParticipantStage(
        roomId,
        targetUserId,
        stageStatus,
        accessToken,
      ),
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const setParticipantMutedMutation = useMutation({
    mutationFn: ({
      targetUserId,
      isMuted,
    }: {
      targetUserId: string;
      isMuted: boolean;
    }) =>
      container.liveRoomRepository.setParticipantMuted(
        roomId,
        targetUserId,
        isMuted,
        accessToken,
      ),
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const setHandRaisedMutation = useMutation({
    mutationFn: (isRaised: boolean) => {
      if (!currentUser) {
        throw new Error("El kaldırmak için oturum gerekli.");
      }

      return container.liveRoomRepository.setHandRaised(
        roomId,
        currentUser.id,
        isRaised,
        accessToken,
      );
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      container.liveRoomRepository.removeParticipant(
        roomId,
        targetUserId,
        accessToken,
      ),
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
    },
  });

  const isJoined = Boolean(
    currentUser &&
      query.data?.participants.some(
        (participant) => participant.id === currentUser.id || participant.isCurrentUser,
      ),
  );

  return {
    room: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isJoined,
    joinRoom: joinMutation.mutateAsync,
    leaveRoom: leaveMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    reportMessage: reportMessageMutation.mutateAsync,
    startRoom: startRoomMutation.mutateAsync,
    stopRoom: stopRoomMutation.mutateAsync,
    controlVideo: controlVideoMutation.mutateAsync,
    getLiveKitToken: liveKitTokenMutation.mutateAsync,
    setParticipantStage: setParticipantStageMutation.mutateAsync,
    setParticipantMuted: setParticipantMutedMutation.mutateAsync,
    setHandRaised: setHandRaisedMutation.mutateAsync,
    removeParticipant: removeParticipantMutation.mutateAsync,
    isJoining: joinMutation.isPending || leaveMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isReportingMessage: reportMessageMutation.isPending,
    isManagingRoom:
      startRoomMutation.isPending ||
      stopRoomMutation.isPending ||
      controlVideoMutation.isPending,
    isConnectingLiveKit: liveKitTokenMutation.isPending,
    isManagingStage:
      setParticipantStageMutation.isPending ||
      setParticipantMutedMutation.isPending ||
      setHandRaisedMutation.isPending ||
      removeParticipantMutation.isPending,
  };
};
