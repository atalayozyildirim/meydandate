// Canli oda verisini backend live endpoint'lerinden okur.
import type { LiveParticipantStageStatus, LiveRoom } from "@/domain/entities/LiveRoom";
import type {
  ControlLiveVideoPayload,
  LiveKitJoinInfo,
  LiveRoomRepository,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import type { ApiClient } from "@/infrastructure/api/ApiClient";

export class ApiLiveRoomRepository implements LiveRoomRepository {
  constructor(private readonly apiClient: ApiClient) {}

  getRoom(roomId: string, accessToken?: string | null): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom>(`/live/rooms/${roomId}`, {
      token: accessToken ?? undefined,
    });
  }

  joinRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, { userId: string }>(
      `/live/rooms/${roomId}/join`,
      {
        method: "POST",
        body: { userId },
        token: accessToken ?? undefined,
      },
    );
  }

  leaveRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, { userId: string }>(
      `/live/rooms/${roomId}/leave`,
      {
        method: "POST",
        body: { userId },
        token: accessToken ?? undefined,
      },
    );
  }

  sendMessage(roomId: string, userId: string, body: string, accessToken?: string | null): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, { userId: string; body: string }>(
      `/live/rooms/${roomId}/messages`,
      {
        method: "POST",
        body: { userId, body },
        token: accessToken ?? undefined,
      },
    );
  }

  async reportMessage(
    roomId: string,
    messageId: string,
    reporterId: string,
    accessToken?: string | null,
  ): Promise<void> {
    await this.apiClient.http.request<void, { reporterId: string }>(
      `/live/rooms/${roomId}/messages/${messageId}/report`,
      {
        method: "POST",
        body: { reporterId },
        token: accessToken ?? undefined,
      },
    );
  }

  startRoom(
    roomId: string,
    userId: string,
    payload: StartLiveRoomPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, StartLiveRoomPayload & { userId: string }>(
      `/live/rooms/${roomId}/start`,
      {
        method: "POST",
        body: { userId, ...payload },
        token: accessToken ?? undefined,
      },
    );
  }

  stopRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, { userId: string }>(
      `/live/rooms/${roomId}/stop`,
      {
        method: "POST",
        body: { userId },
        token: accessToken ?? undefined,
      },
    );
  }

  controlVideo(
    roomId: string,
    userId: string,
    payload: ControlLiveVideoPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<
      LiveRoom,
      ControlLiveVideoPayload & { userId: string }
    >(`/live/rooms/${roomId}/video`, {
      method: "POST",
      body: { userId, ...payload },
      token: accessToken ?? undefined,
    });
  }

  getLiveKitToken(roomId: string, accessToken?: string | null): Promise<LiveKitJoinInfo> {
    return this.apiClient.http.request<LiveKitJoinInfo>(
      `/live/rooms/${roomId}/livekit-token`,
      {
        method: "POST",
        token: accessToken ?? undefined,
      },
    );
  }

  setParticipantStage(
    roomId: string,
    targetUserId: string,
    stageStatus: LiveParticipantStageStatus,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<
      LiveRoom,
      { targetUserId: string; stageStatus: LiveParticipantStageStatus }
    >(`/live/rooms/${roomId}/participants/stage`, {
      method: "POST",
      body: { targetUserId, stageStatus },
      token: accessToken ?? undefined,
    });
  }

  setParticipantMuted(
    roomId: string,
    targetUserId: string,
    isMuted: boolean,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<
      LiveRoom,
      { targetUserId: string; isMuted: boolean }
    >(`/live/rooms/${roomId}/participants/mute`, {
      method: "POST",
      body: { targetUserId, isMuted },
      token: accessToken ?? undefined,
    });
  }

  setHandRaised(
    roomId: string,
    userId: string,
    isRaised: boolean,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<
      LiveRoom,
      { userId: string; isRaised: boolean }
    >(`/live/rooms/${roomId}/participants/hand`, {
      method: "POST",
      body: { userId, isRaised },
      token: accessToken ?? undefined,
    });
  }

  removeParticipant(
    roomId: string,
    targetUserId: string,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return this.apiClient.http.request<LiveRoom, { targetUserId: string }>(
      `/live/rooms/${roomId}/participants/remove`,
      {
        method: "POST",
        body: { targetUserId },
        token: accessToken ?? undefined,
      },
    );
  }
}
