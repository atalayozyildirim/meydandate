import type {
  ChatRepository,
  SendMessagePayload,
} from "@/domain/repositories/ChatRepository";
import type { Conversation, Message } from "@/domain/entities/Message";
import { supabase } from "./client";

export class SupabaseChatRepository implements ChatRepository {
  async listConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant1Id.eq.${userId},participant2Id.eq.${userId}`)
      .order("lastMessageAt", { ascending: false });

    if (error) {
      throw new Error("Konuşmalar yüklenemedi");
    }

    return data || [];
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error("Konuşma bulunamadı");
    }

    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true });

    if (msgError) {
      throw new Error("Mesajlar yüklenemedi");
    }

    return {
      ...conversation,
      messages: messages || [],
    };
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
}
