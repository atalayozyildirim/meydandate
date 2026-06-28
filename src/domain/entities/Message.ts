// Mesajlasma modelleri realtime entegrasyona hazir sozlesmeleri barindirir.
import type { User } from "./User";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
}

export interface TypingState {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  matchId?: string | null;
  initiatedById: string;
  participants: [User, User];
  messages: Message[];
  unreadCount: number;
  typingState?: TypingState;
  updatedAt: string;
}
