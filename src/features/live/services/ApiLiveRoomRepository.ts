// Canli oda verisini backend live endpoint'lerinden okur.
import type { LiveRoom } from "@/domain/entities/LiveRoom";
import type { LiveRoomRepository, StartLiveRoomPayload } from "@/domain/repositories/LiveRoomRepository";
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
}
