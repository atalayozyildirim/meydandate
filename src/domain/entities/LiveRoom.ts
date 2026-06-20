// Canli oda ve katilimci verisini domain seviyesinde tanimlar.
export type LiveRoomStatus = "offline" | "scheduled" | "live";
export type LiveRoomProvider = "livekit" | "stream";
export type LiveParticipantStageStatus = "listener" | "invited" | "speaker";

export interface LiveParticipant {
  id: string;
  name: string;
  role: string;
  stageStatus?: LiveParticipantStageStatus;
  isMuted?: boolean;
  photoUri?: string;
  isPremium?: boolean;
  isCurrentUser?: boolean;
}

export interface LiveChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderPhotoUri?: string;
  senderIsPremium?: boolean;
  body: string;
  createdAt: string;
  isCurrentUser?: boolean;
}

export interface LiveRoom {
  id: string;
  title: string;
  description: string;
  status: LiveRoomStatus;
  voiceProvider?: LiveRoomProvider;
  livekitRoomName?: string;
  streamUrl?: string;
  participantCount: number;
  speakerCount?: number;
  participants: LiveParticipant[];
  messages: LiveChatMessage[];
  canManage?: boolean;
  startedAt?: string;
}
