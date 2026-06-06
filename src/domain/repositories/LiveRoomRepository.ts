// Canli oda verisi ve katilim aksiyonlari icin repository sozlesmesi.
import type { LiveRoom } from "@/domain/entities/LiveRoom";

export interface LiveRoomRepository {
  getRoom(roomId: string, accessToken?: string | null): Promise<LiveRoom>;
  joinRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  leaveRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
}
