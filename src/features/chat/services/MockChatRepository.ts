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

const starterGuideReplies: Record<string, string[]> = {
  "user-guide-ece": [
    "Hoş geldin. İlk sohbetlerde kısa ve içten başlamak iyi oluyor; profilinde en sevdiğin türkü güzel bir başlangıç olabilir.",
    "Bunu sevdim. İstersen Discover'da ortak ilgi alanlarına bakıp sohbeti oradan açabilirsin.",
    "Ben buradayım; takıldığın yerde yaz, birlikte daha rahat bir ilk adım buluruz.",
  ],
  "user-guide-selin": [
    "Ne güzel. Yeni gelenler için en iyi başlangıç genelde şehir, müzik ya da kitaplardan biri oluyor.",
    "Anladım. Profilindeki bio kısa ama sıcak olursa eşleşmeler daha doğal ilerler.",
    "İstersen birkaç cümle daha yaz; ben de sohbeti nasıl yumuşatabileceğini söyleyeyim.",
  ],
  "user-guide-murat": [
    "Selam. Burada sakin ve saygılı sohbet iyi çalışıyor; acele etmeden ilerlemek en doğrusu.",
    "Güzel bir başlangıç. Ortak müzik ya da memleket detayı varsa sohbet hemen akıyor.",
    "Yazmaya devam et; ilk günlerde ritmi bulmana yardımcı olurum.",
  ],
};

const starterGuideIds = new Set(Object.keys(starterGuideReplies));

const maybeAppendStarterGuideReply = (conversation: ReturnType<typeof findConversation>, senderId: string) => {
  const guide = conversation.participants.find((participant) => starterGuideIds.has(participant.id));

  if (!guide || guide.id === senderId) {
    return;
  }

  const guideMessageCount = conversation.messages.filter((message) => message.senderId === guide.id).length;
  const replies = starterGuideReplies[guide.id] ?? [];
  const body = replies[Math.min(Math.max(guideMessageCount - 1, 0), replies.length - 1)];

  if (!body) {
    return;
  }

  const createdAt = new Date(Date.now() + 300).toISOString();
  conversation.messages.push({
    id: createId("message"),
    conversationId: conversation.id,
    senderId: guide.id,
    body,
    status: "sent",
    createdAt,
  });
  conversation.updatedAt = createdAt;
  conversation.unreadCount += 1;
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
    maybeAppendStarterGuideReply(conversation, payload.senderId);

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

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const conversation = findConversation(conversationId);
    const index = conversation.messages.findIndex(
      (message) => message.id === messageId,
    );

    if (index === -1) {
      throw new Error("Mesaj bulunamadı.");
    }

    conversation.messages.splice(index, 1);
    conversation.updatedAt =
      conversation.messages[conversation.messages.length - 1]?.createdAt ??
      conversation.updatedAt;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const idx = mockDatabase.conversations.findIndex((c) => c.id === conversationId);
    if (idx !== -1) {
      mockDatabase.conversations.splice(idx, 1);
    }
  }
}
