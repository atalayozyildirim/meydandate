// Backend olmadiginda canli oda akisini kirilmadan gosteren fallback repository.
import type { LiveRoom, LiveParticipant, LiveChatMessage } from "@/domain/entities/LiveRoom";
import type { LiveRoomRepository, StartLiveRoomPayload } from "@/domain/repositories/LiveRoomRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";

const participants: LiveParticipant[] = [
  { id: "zeynep", name: "Zeynep", role: "Dinleyici" },
  { id: "cem", name: "Cem", role: "Deyis" },
  { id: "elif", name: "Elif", role: "Paylasim" },
  { id: "mert", name: "Mert", role: "Canli" },
];

let roomStatus: LiveRoom["status"] = "scheduled";
let roomStreamUrl: string | undefined;
let roomStartedAt: string | undefined;
let roomTitle = "Meydan";
let roomDescription = "Admin yayını açtığında herkes aynı canlı akışı ve sohbeti burada görür.";
let roomParticipants = [...participants];
let roomMessages: LiveChatMessage[] = [];

const createRoom = (): LiveRoom => ({
  id: "meydan-erkani",
  title: roomTitle,
  description: roomDescription,
  status: roomStatus,
  streamUrl: roomStreamUrl,
  participantCount: roomParticipants.length,
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
      { id: user.id, name: user.name, role: "Sen", isCurrentUser: true },
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

  async startRoom(_roomId: string, _userId: string, payload: StartLiveRoomPayload): Promise<LiveRoom> {
    roomTitle = payload.title;
    roomDescription = payload.description;
    roomStreamUrl = payload.streamUrl;
    roomStatus = "live";
    roomStartedAt = new Date().toISOString();

    return createRoom();
  }

  async stopRoom(): Promise<LiveRoom> {
    roomStatus = "offline";
    roomStartedAt = undefined;

    return createRoom();
  }
}
