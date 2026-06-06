import type {
  MatchRepository,
  SwipeResult,
} from "@/domain/repositories/MatchRepository";
import type { Match, LikeAction } from "@/domain/entities/Match";
import { supabase } from "./client";

export class SupabaseMatchRepository implements MatchRepository {
  async swipe(
    userId: string,
    targetUserId: string,
    action: LikeAction,
  ): Promise<SwipeResult> {
    // Record the swipe
    const { error: swipeError } = await supabase.from("swipes").insert({
      userId,
      targetUserId,
      action,
    });

    if (swipeError) {
      throw new Error("Swipe kaydedilemedi");
    }

    // Check if there's a mutual like
    if (action === "like") {
      const { data: reverseSwipe } = await supabase
        .from("swipes")
        .select("*")
        .eq("userId", targetUserId)
        .eq("targetUserId", userId)
        .eq("action", "like")
        .single();

      if (reverseSwipe) {
        // Create a match
        const { data: match, error: matchError } = await supabase
          .from("matches")
          .insert({
            user1Id: userId,
            user2Id: targetUserId,
            matchedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (matchError || !match) {
          throw new Error("Eşleşme oluşturulamadı");
        }

        // Create conversation
        await supabase.from("conversations").insert({
          participant1Id: userId,
          participant2Id: targetUserId,
          matchId: match.id,
        });

        return {
          action,
          match,
        };
      }
    }

    return { action };
  }

  async listMatches(userId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .or(`user1Id.eq.${userId},user2Id.eq.${userId}`)
      .order("matchedAt", { ascending: false });

    if (error) {
      throw new Error("Eşleşmeler yüklenemedi");
    }

    return data || [];
  }
}
