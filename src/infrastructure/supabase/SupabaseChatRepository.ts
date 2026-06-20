import type {
  ChatRepository,
  SendMessagePayload,
} from "@/domain/repositories/ChatRepository";
import type { Conversation, Message } from "@/domain/entities/Message";
import type { User } from "@/domain/entities/User";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";
import {
  createSupabaseRepositoryError,
  isMissingRpcError,
  isMissingRowError,
} from "./errors";

type ConversationRow = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string | null;
  createdAt: string;
};

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: Message["status"];
  createdAt: string;
};

const createMissingParticipant = (id: string, createdAt: string): User => ({
  id,
  name: "Kullanıcı",
  email: "",
  age: 0,
  city: "",
  bio: "",
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "not_important",
  interests: [],
  photos: [],
  badges: [],
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt,
  updatedAt: createdAt,
});

export class SupabaseChatRepository implements ChatRepository {
  private async deleteConversationDirectly(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error && !isMissingRowError(error)) {
      throw createSupabaseRepositoryError("Sohbet silinemedi.", error);
    }
  }

  private async getUsersById(userIds: string[]): Promise<Map<string, User>> {
    const uniqueIds = Array.from(new Set(userIds));

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .in("id", uniqueIds);

    if (error) {
      throw new Error("Konuşma kullanıcıları yüklenemedi");
    }

    return new Map(
      (data || []).map((row) => {
        const user = mapSupabaseUser(row as unknown as Partial<User>);
        return [user.id, user];
      }),
    );
  }

  private async buildConversation(row: ConversationRow): Promise<Conversation> {
    const [{ data: messageRows, error: messageError }, usersById] = await Promise.all([
      supabase
        .from("messages")
        .select("id,conversationId,senderId,body,status,createdAt")
        .eq("conversationId", row.id)
        .order("createdAt", { ascending: true }),
      this.getUsersById([row.participant1Id, row.participant2Id]),
    ]);

    if (messageError) {
      throw new Error("Mesajlar yüklenemedi");
    }

    const participant1 =
      usersById.get(row.participant1Id) ??
      createMissingParticipant(row.participant1Id, row.createdAt);
    const participant2 =
      usersById.get(row.participant2Id) ??
      createMissingParticipant(row.participant2Id, row.createdAt);

    const messages: Message[] = ((messageRows || []) as MessageRow[]).map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      status: message.status ?? "sent",
      createdAt: message.createdAt,
    }));

    return {
      id: row.id,
      participants: [participant1, participant2],
      messages,
      unreadCount: 0,
      updatedAt: row.lastMessageAt ?? row.createdAt,
    };
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,participant1Id,participant2Id,lastMessageAt,createdAt")
      .or(`participant1Id.eq.${userId},participant2Id.eq.${userId}`)
      .order("lastMessageAt", { ascending: false });

    if (error) {
      throw new Error("Konuşmalar yüklenemedi");
    }

    return Promise.all(
      ((data || []) as ConversationRow[]).map((conversation) =>
        this.buildConversation(conversation),
      ),
    );
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id,participant1Id,participant2Id,lastMessageAt,createdAt")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error("Konuşma bulunamadı");
    }

    return this.buildConversation(conversation as unknown as ConversationRow);
  }

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        body: payload.body,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Mesaj gönderilemedi");
    }

    // Update last message in conversation
    await supabase
      .from("conversations")
      .update({ lastMessageAt: new Date().toISOString() })
      .eq("id", payload.conversationId);

    await supabase.functions
      .invoke("send-message-push", {
        body: {
          conversationId: payload.conversationId,
          messageId: data.id,
        },
      })
      .catch(() => undefined);

    await supabase.functions
      .invoke("gemini-bot-reply", {
        body: {
          conversationId: payload.conversationId,
          messageId: data.id,
        },
      })
      .catch(() => undefined);

    return data;
  }

  async setTyping(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    // Broadcast typing status via Supabase Realtime
    const channel = supabase.channel(`typing:${conversationId}`);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { userId, isTyping },
        });
      }
    });
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const { error } = await supabase.rpc("delete_conversation_message", {
      target_conversation_id: conversationId,
      target_message_id: messageId,
    });

    if (error && !isMissingRowError(error)) {
      throw createSupabaseRepositoryError("Mesaj silinemedi.", error);
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.rpc("delete_user_conversation", {
      target_conversation_id: conversationId,
    });

    if (!error || isMissingRowError(error)) {
      return;
    }

    if (isMissingRpcError(error, "delete_user_conversation")) {
      await this.deleteConversationDirectly(conversationId);
      return;
    }

    throw createSupabaseRepositoryError("Sohbet silinemedi.", error);
  }
}
