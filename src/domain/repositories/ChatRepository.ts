// Sohbet listesi ve mesaj gonderimi icin repository sozlesmesi.
import type { Conversation, Message } from "../entities/Message";

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  body: string;
}

export interface ChatRepository {
  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation>;
  sendMessage(payload: SendMessagePayload): Promise<Message>;
  setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;
}
