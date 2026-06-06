// Canli oda verisini backend live endpoint'lerinden okur.
import type { LiveRoom } from "@/domain/entities/LiveRoom";
import type { LiveRoomRepository } from "@/domain/repositories/LiveRoomRepository";
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
}
