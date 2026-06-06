// Mock sohbet repository'si conversation ve mesaj akisini yonetir.
import type { Conversation, Message } from "@/domain/entities/Message";
import type { ChatRepository, SendMessagePayload } from "@/domain/repositories/ChatRepository";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

const findConversation = (conversationId: string) => {
  const conversation = mockDatabase.conversations.find((candidate) => candidate.id === conversationId);

  if (!conversation) {
    throw new Error("Sohbet bulunamadi.");
  }

  return conversation;
};

export class MockChatRepository implements ChatRepository {
  async listConversations(userId: string): Promise<Conversation[]> {
    return mockDatabase.conversations
      .filter((conversation) => conversation.participants.some((participant) => participant.id === userId))
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return findConversation(conversationId);
  }

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    const conversation = findConversation(payload.conversationId);
    const message: Message = {
      id: createId("message"),
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      body: payload.body,
      status: "sent",
      createdAt: new Date().toISOString()
    };

    conversation.messages.push(message);
    conversation.updatedAt = message.createdAt;
    conversation.unreadCount = 0;

    return message;
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const conversation = findConversation(conversationId);
    conversation.typingState = {
      conversationId,
      userId,
      isTyping,
      updatedAt: new Date().toISOString()
    };
  }
}
