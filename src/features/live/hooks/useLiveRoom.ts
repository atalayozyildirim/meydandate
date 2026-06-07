// Cem odasinin canli verisini ve katilim aksiyonlarini yonetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StartLiveRoomPayload } from "@/domain/repositories/LiveRoomRepository";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useLiveRoom = (roomId: string) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accessToken = useAuthStore((state) => state.accessToken);

  const query = useQuery({
    queryKey: [queryKeys.liveRoom, roomId],
    enabled: Boolean(currentUser),
    refetchInterval: 3000,
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
    mutationFn: (body: string) => {
      if (!currentUser) {
        throw new Error("Sohbet icin oturum gerekli.");
      }

      return container.liveRoomRepository.sendMessage(roomId, currentUser.id, body, accessToken);
    },
    onSuccess: async (room) => {
      queryClient.setQueryData([queryKeys.liveRoom, roomId], room);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom, roomId] });
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
    startRoom: startRoomMutation.mutateAsync,
    stopRoom: stopRoomMutation.mutateAsync,
    isJoining: joinMutation.isPending || leaveMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isManagingRoom: startRoomMutation.isPending || stopRoomMutation.isPending,
  };
};
