// Backend olmadiginda canli oda akisini kirilmadan gosteren fallback repository.
import type { LiveRoom, LiveParticipant } from "@/domain/entities/LiveRoom";
import type { LiveRoomRepository } from "@/domain/repositories/LiveRoomRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

const participants: LiveParticipant[] = [
  { id: "zeynep", name: "Zeynep", role: "Dinleyici" },
  { id: "cem", name: "Cem", role: "Deyis" },
  { id: "elif", name: "Elif", role: "Paylasim" },
  { id: "mert", name: "Mert", role: "Canli" },
];

const createRoom = (): LiveRoom => ({
  id: "cem-erkani",
  title: "Sanal Cem odasi",
  description: "Canli yayin URL'i backend'den geldiginde bu oda video oynatir.",
  status: "scheduled",
  participantCount: participants.length,
  participants,
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

    return {
      ...room,
      participantCount: joinedParticipants.length,
      participants: joinedParticipants,
    };
  }

  async leaveRoom(): Promise<LiveRoom> {
    return createRoom();
  }
}
