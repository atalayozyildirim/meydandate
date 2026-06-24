// Backend olmadiginda canli oda akisini kirilmadan gosteren fallback repository.
import type {
  LiveRoom,
  LiveParticipant,
  LiveChatMessage,
  LiveVideoPlaybackStatus,
} from "@/domain/entities/LiveRoom";
import type {
  ControlLiveVideoPayload,
  LiveKitJoinInfo,
  LiveRoomRepository,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";

const participants: LiveParticipant[] = [
  { id: "zeynep", name: "Zeynep", role: "Dinleyici", stageStatus: "listener", isMuted: true },
  { id: "cem", name: "Cem", role: "Konusmaci", stageStatus: "speaker", isMuted: false },
  { id: "elif", name: "Elif", role: "Dinleyici", stageStatus: "listener", isMuted: true },
  { id: "mert", name: "Mert", role: "Dinleyici", stageStatus: "listener", isMuted: true },
];

let roomStatus: LiveRoom["status"] = "scheduled";
let roomStreamUrl: string | undefined;
let roomStartedAt: string | undefined;
let roomVideoStatus: LiveVideoPlaybackStatus = "idle";
let roomVideoPositionMillis = 0;
let roomVideoUpdatedAt: string | undefined;
let roomTitle = "Meydan";
let roomDescription = "Admin yayını açtığında herkes aynı canlı akışı ve sohbeti burada görür.";
let roomParticipants = [...participants];
let roomMessages: LiveChatMessage[] = [];

const createRoom = (): LiveRoom => ({
  id: "meydan-erkani",
  title: roomTitle,
  description: roomDescription,
  status: roomStatus,
  voiceProvider: "livekit",
  livekitRoomName: "ehlibyte-meydan-erkani",
  streamUrl: roomStreamUrl,
  videoSync: {
    status: roomVideoStatus,
    positionMillis: roomVideoPositionMillis,
    updatedAt: roomVideoUpdatedAt ?? roomStartedAt,
    controlledBy: "mock-admin",
  },
  participantCount: roomParticipants.length,
  speakerCount: roomParticipants.filter((participant) => participant.stageStatus === "speaker").length,
  participants: roomParticipants,
  messages: roomMessages,
  canManage: true,
  startedAt: roomStartedAt,
});

export class MockLiveRoomRepository implements LiveRoomRepository {
  async getRoom(): Promise<LiveRoom> {
    return createRoom();
  }

  async joinRoom(_roomId: string, userId: string): Promise<LiveRoom> {
    const user = mockDatabase.users.find((candidate) => candidate.id === userId);
    const room = createRoom();

    if (!user) {
      return room;
    }

    const joinedParticipants = [
      { id: user.id, name: user.name, role: "Sen", stageStatus: "listener" as const, isMuted: true, isCurrentUser: true },
      ...room.participants.filter((participant) => participant.id !== user.id),
    ];
    roomParticipants = joinedParticipants;

    return {
      ...room,
      participantCount: joinedParticipants.length,
      participants: joinedParticipants,
    };
  }

  async leaveRoom(): Promise<LiveRoom> {
    roomParticipants = participants;
    return createRoom();
  }

  async sendMessage(_roomId: string, userId: string, body: string): Promise<LiveRoom> {
    const user = mockDatabase.users.find((candidate) => candidate.id === userId);

    if (!user) {
      return createRoom();
    }

    roomMessages = [
      ...roomMessages,
      {
        id: createId("live-message"),
        roomId: "meydan-erkani",
        senderId: user.id,
        senderName: user.name,
        body,
        createdAt: new Date().toISOString(),
        isCurrentUser: true,
      },
    ].slice(-50);

    return createRoom();
  }

  async reportMessage(): Promise<void> {
    return undefined;
  }

  async startRoom(_roomId: string, _userId: string, payload: StartLiveRoomPayload): Promise<LiveRoom> {
    roomTitle = payload.title;
    roomDescription = payload.description;
    roomStreamUrl = payload.streamUrl;
    roomVideoStatus = payload.streamUrl ? "playing" : "idle";
    roomVideoPositionMillis = 0;
    roomStatus = "live";
    roomStartedAt = new Date().toISOString();
    roomVideoUpdatedAt = roomStartedAt;

    return createRoom();
  }

  async stopRoom(): Promise<LiveRoom> {
    roomStatus = "offline";
    roomStartedAt = undefined;
    roomVideoStatus = "idle";
    roomVideoPositionMillis = 0;
    roomVideoUpdatedAt = undefined;

    return createRoom();
  }

  async controlVideo(
    _roomId: string,
    _userId: string,
    payload: ControlLiveVideoPayload,
  ): Promise<LiveRoom> {
    roomStreamUrl = payload.streamUrl;
    roomVideoStatus = payload.status;
    roomVideoPositionMillis = Math.max(0, payload.positionMillis);
    roomVideoUpdatedAt = new Date().toISOString();

    if (payload.streamUrl && roomStatus !== "live") {
      roomStatus = "live";
      roomStartedAt = roomVideoUpdatedAt;
    }

    return createRoom();
  }

  async getLiveKitToken(_roomId: string): Promise<LiveKitJoinInfo> {
    return {
      serverUrl: "ws://localhost:7880",
      token: "mock-livekit-token",
      roomName: "ehlibyte-meydan-erkani",
      identity: "mock-user",
      canPublish: true,
    };
  }

  async setParticipantStage(
    _roomId: string,
    targetUserId: string,
    stageStatus: "listener" | "invited" | "speaker",
  ): Promise<LiveRoom> {
    roomParticipants = roomParticipants.map((participant) =>
      participant.id === targetUserId
        ? {
            ...participant,
            role: stageStatus === "speaker" ? "Konusmaci" : "Dinleyici",
            stageStatus,
            isMuted: stageStatus !== "speaker",
          }
        : participant,
    );

    return createRoom();
  }

  async setParticipantMuted(
    _roomId: string,
    targetUserId: string,
    isMuted: boolean,
  ): Promise<LiveRoom> {
    roomParticipants = roomParticipants.map((participant) =>
      participant.id === targetUserId ? { ...participant, isMuted } : participant,
    );

    return createRoom();
  }

  async setHandRaised(
    _roomId: string,
    userId: string,
    isRaised: boolean,
  ): Promise<LiveRoom> {
    roomParticipants = roomParticipants.map((participant) =>
      participant.id === userId
        ? {
            ...participant,
            handRaisedAt: isRaised ? new Date().toISOString() : null,
          }
        : participant,
    );

    return createRoom();
  }

  async removeParticipant(
    _roomId: string,
    targetUserId: string,
  ): Promise<LiveRoom> {
    roomParticipants = roomParticipants.filter(
      (participant) => participant.id !== targetUserId,
    );

    return createRoom();
  }
}
