// Canli oda verisi ve katilim aksiyonlari icin repository sozlesmesi.
import type {
  LiveParticipantStageStatus,
  LiveVideoPlaybackStatus,
  LiveRoom,
} from "@/domain/entities/LiveRoom";

export interface StartLiveRoomPayload {
  title: string;
  description: string;
  streamUrl?: string;
}

export interface ControlLiveVideoPayload {
  streamUrl?: string;
  status: LiveVideoPlaybackStatus;
  positionMillis: number;
}

export interface LiveKitJoinInfo {
  serverUrl: string;
  token: string;
  roomName: string;
  identity: string;
  canPublish: boolean;
}

export interface LiveRoomRepository {
  getRoom(roomId: string, accessToken?: string | null): Promise<LiveRoom>;
  joinRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  leaveRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  sendMessage(roomId: string, userId: string, body: string, accessToken?: string | null): Promise<LiveRoom>;
  reportMessage(
    roomId: string,
    messageId: string,
    reporterId: string,
    accessToken?: string | null,
  ): Promise<void>;
  startRoom(
    roomId: string,
    userId: string,
    payload: StartLiveRoomPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  stopRoom(roomId: string, userId: string, accessToken?: string | null): Promise<LiveRoom>;
  controlVideo(
    roomId: string,
    userId: string,
    payload: ControlLiveVideoPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  getLiveKitToken(roomId: string, accessToken?: string | null): Promise<LiveKitJoinInfo>;
  setParticipantStage(
    roomId: string,
    targetUserId: string,
    stageStatus: LiveParticipantStageStatus,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  setParticipantMuted(
    roomId: string,
    targetUserId: string,
    isMuted: boolean,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  setHandRaised(
    roomId: string,
    userId: string,
    isRaised: boolean,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
  removeParticipant(
    roomId: string,
    targetUserId: string,
    accessToken?: string | null,
  ): Promise<LiveRoom>;
}
