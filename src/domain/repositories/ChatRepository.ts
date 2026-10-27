// Sohbet listesi ve mesaj gonderimi icin repository sozlesmesi.
import type { Conversation, Message } from "../entities/Message";

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  body: string;
}

export interface ListMessagesOptions {
  limit?: number;
  before?: string; // cursor (ISO timestamp)
}

export interface ChatRepository {
  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation>;
  listMessages(
    conversationId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]>;
  sendMessage(payload: SendMessagePayload): Promise<Message>;
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
  ): () => void;
  setTyping(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void>;
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;
  clearSessionCache(): void;
}
