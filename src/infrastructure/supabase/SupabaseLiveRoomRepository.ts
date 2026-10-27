import type {
  LiveParticipantStageStatus,
  LiveRoom,
} from "@/domain/entities/LiveRoom";
import type {
  ControlLiveVideoPayload,
  LiveKitJoinInfo,
  LiveRoomRepository,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import {
  fetchLiveRoom,
  sendChatMessage,
  reportChatMessage,
  startRoomLive,
  stopRoomLive,
  controlPlayback,
  getLiveKitJoinInfo,
} from "./live/liveRoomOps";
import {
  joinLiveRoom,
  leaveLiveRoom,
  setStageStatus,
  setMutedStatus,
  setHandRaisedStatus,
  kickLiveParticipant,
} from "./live/liveParticipantOps";

export class SupabaseLiveRoomRepository implements LiveRoomRepository {
  async getRoom(roomId: string): Promise<LiveRoom> {
    return fetchLiveRoom(roomId);
  }

  async joinRoom(roomId: string, userId: string): Promise<LiveRoom> {
    await joinLiveRoom(roomId, userId);
    return this.getRoom(roomId);
  }

  async leaveRoom(roomId: string, userId: string): Promise<LiveRoom> {
    await leaveLiveRoom(roomId, userId);
    return this.getRoom(roomId);
  }

  async sendMessage(
    roomId: string,
    userId: string,
    body: string,
  ): Promise<LiveRoom> {
    await sendChatMessage(roomId, userId, body);
    return this.getRoom(roomId);
  }

  async reportMessage(
    roomId: string,
    messageId: string,
    reporterId: string,
  ): Promise<void> {
    return reportChatMessage(roomId, messageId, reporterId);
  }

  async startRoom(
    roomId: string,
    _userId: string,
    payload: StartLiveRoomPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    return startRoomLive(roomId, payload, accessToken);
  }

  async stopRoom(roomId: string): Promise<LiveRoom> {
    return stopRoomLive(roomId);
  }

  async controlVideo(
    roomId: string,
    _userId: string,
    payload: ControlLiveVideoPayload,
  ): Promise<LiveRoom> {
    return controlPlayback(roomId, payload);
  }

  async getLiveKitToken(
    roomId: string,
    accessToken?: string | null,
  ): Promise<LiveKitJoinInfo> {
    return getLiveKitJoinInfo(roomId, accessToken);
  }

  async setParticipantStage(
    roomId: string,
    targetUserId: string,
    stageStatus: LiveParticipantStageStatus,
  ): Promise<LiveRoom> {
    await setStageStatus(roomId, targetUserId, stageStatus);
    return this.getRoom(roomId);
  }

  async setParticipantMuted(
    roomId: string,
    targetUserId: string,
    isMuted: boolean,
  ): Promise<LiveRoom> {
    await setMutedStatus(roomId, targetUserId, isMuted);
    return this.getRoom(roomId);
  }

  async setHandRaised(
    roomId: string,
    userId: string,
    isRaised: boolean,
  ): Promise<LiveRoom> {
    await setHandRaisedStatus(roomId, userId, isRaised);
    return this.getRoom(roomId);
  }

  async removeParticipant(
    roomId: string,
    targetUserId: string,
  ): Promise<LiveRoom> {
    await kickLiveParticipant(roomId, targetUserId);
    return this.getRoom(roomId);
  }
}
