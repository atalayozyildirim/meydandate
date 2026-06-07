// Canli oda verisi ve katilim aksiyonlari icin repository sozlesmesi.
import type { LiveRoom } from "@/domain/entities/LiveRoom";

export interface StartLiveRoomPayload {
  title: string;
  description: string;
  streamUrl: string;
}

export interface LiveRoomRepository {
  getRoom(roomId: string, accessToken?: string | null): Promise<LiveRoom>;
  joinRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  leaveRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  sendMessage(roomId: string, userId: string, body: string, accessToken?: string | null): Promise<LiveRoom>;
  startRoom(
    roomId: string,
    userId: string,
    payload: StartLiveRoomPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  stopRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
}
