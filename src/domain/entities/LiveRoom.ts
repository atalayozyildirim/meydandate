// Canli oda ve katilimci verisini domain seviyesinde tanimlar.
export type LiveRoomStatus = "offline" | "scheduled" | "live";

export interface LiveParticipant {
  id: string;
  name: string;
  role: string;
  isCurrentUser?: boolean;
}

export interface LiveRoom {
  id: string;
  title: string;
  description: string;
  status: LiveRoomStatus;
  streamUrl?: string;
  participantCount: number;
  participants: LiveParticipant[];
  startedAt?: string;
}
