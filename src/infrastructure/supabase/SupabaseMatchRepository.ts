import type {
  MatchRepository,
  SwipeResult,
} from "@/domain/repositories/MatchRepository";
import type { Match, LikeAction, SpecialMatchInvite } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";

type SupabaseMatchRow = {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: string;
};

type PendingSpecialInviteRow = {
  id: string;
  inviter_id: string;
  inviter_name: string;
  inviter_city: string | null;
  inviter_photo_uri: string | null;
  target_name: string;
  status: SpecialMatchInvite["status"];
  created_at: string;
};

const minimalPublicUserColumns = [
  "id",
  "name",
  "age",
  "city",
  "bio",
  "culturalIdentity",
  "cultureImportance",
  "interests",
  "photos",
  "badges",
  "isPremium",
  "hasPassedEntryTest",
  "hasCompletedOnboarding",
  "createdAt",
  "updatedAt",
].join(",");

const createMissingMatchUser = (id: string, createdAt: string): User => ({
  id,
  name: "Kullanıcı",
  email: "",
  age: 18,
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

export class SupabaseMatchRepository implements MatchRepository {
  private async getExistingMatchBetween(
    userId: string,
    targetUserId: string,
  ): Promise<Match | null> {
    const { data } = await supabase
      .from("matches")
      .select("id,user1Id,user2Id,matchedAt")
      .or(`user1Id.eq.${userId},user2Id.eq.${userId}`)
      .order("matchedAt", { ascending: false });

    const existing = (data ?? []).find((row) => {
      const matchRow = row as unknown as SupabaseMatchRow;
      return (
        (matchRow.user1Id === userId && matchRow.user2Id === targetUserId) ||
        (matchRow.user1Id === targetUserId && matchRow.user2Id === userId)
      );
    });

    return existing ? this.buildMatch(existing as unknown as SupabaseMatchRow) : null;
  }

  private async ensureConversationBetween(
    userId: string,
    targetUserId: string,
    matchId: string,
  ): Promise<void> {
    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("id,participant1Id,participant2Id")
      .or(`participant1Id.eq.${userId},participant2Id.eq.${userId}`)
      .limit(20);

    const hasExistingConversation = (existingConversations ?? []).some((row) => {
      const conversation = row as unknown as {
        participant1Id?: string;
        participant2Id?: string;
      };
      return (
        (conversation.participant1Id === userId && conversation.participant2Id === targetUserId) ||
        (conversation.participant1Id === targetUserId && conversation.participant2Id === userId)
      );
    });

    if (hasExistingConversation) {
      return;
    }

    await supabase.from("conversations").insert({
      participant1Id: userId,
      participant2Id: targetUserId,
      matchId,
    });
  }

  private async createMatchBetween(userId: string, targetUserId: string): Promise<Match> {
    const existingMatch = await this.getExistingMatchBetween(userId, targetUserId);

    if (existingMatch) {
      return existingMatch;
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        user1Id: userId,
        user2Id: targetUserId,
        matchedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (matchError?.code === "23505") {
      const duplicateMatch = await this.getExistingMatchBetween(userId, targetUserId);

      if (duplicateMatch) {
        return duplicateMatch;
      }
    }

    if (matchError || !match) {
      throw new Error("Eşleşme oluşturulamadı");
    }

    await this.ensureConversationBetween(userId, targetUserId, match.id);

    return this.buildMatch(match as unknown as SupabaseMatchRow);
  }

  private async getMatchUsers(row: SupabaseMatchRow): Promise<User[]> {
    const userIds = [row.user1Id, row.user2Id];
    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .in("id", userIds);

    if (!error) {
      return (data ?? []).map((userRow) =>
        mapSupabaseUser(userRow as unknown as Partial<User>),
      );
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("users")
      .select(minimalPublicUserColumns)
      .in("id", userIds);

    if (fallbackError) {
      return [];
    }

    return (fallbackData ?? []).map((userRow) =>
      mapSupabaseUser(userRow as unknown as Partial<User>),
    );
  }

  private async buildMatch(row: SupabaseMatchRow): Promise<Match> {
    const users = await this.getMatchUsers(row);
    const user1 =
      users.find((user) => user.id === row.user1Id) ??
      createMissingMatchUser(row.user1Id, row.matchedAt);
    const user2 =
      users.find((user) => user.id === row.user2Id) ??
      createMissingMatchUser(row.user2Id, row.matchedAt);

    return {
      id: row.id,
      users: [user1, user2],
      compatibility: calculateCulturalMatchScore(user1, user2),
      createdAt: row.matchedAt,
    };
  }

  private async getMatchById(matchId: string): Promise<Match> {
    const { data, error } = await supabase
      .from("matches")
      .select("id,user1Id,user2Id,matchedAt")
      .eq("id", matchId)
      .single();

    if (error || !data) {
      throw new Error("Eşleşme yüklenemedi");
    }

    return this.buildMatch(data as unknown as SupabaseMatchRow);
  }

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

    // Check if there's a mutual positive action. Super Like also counts as intent to match.
    if (action !== "pass") {
      const { data: targetProfile } = await supabase
        .from("users")
        .select("profileKind")
        .eq("id", targetUserId)
        .maybeSingle();

      if (
        targetProfile &&
        ["starter", "ai_starter"].includes(
          String((targetProfile as { profileKind?: string }).profileKind ?? "member"),
        )
      ) {
        return {
          action,
          match: await this.createMatchBetween(userId, targetUserId),
        };
      }

      const { data: reverseSwipe } = await supabase
        .from("swipes")
        .select("*")
        .eq("userId", targetUserId)
        .eq("targetUserId", userId)
        .neq("action", "pass")
        .single();

      if (reverseSwipe) {
        return {
          action,
          match: await this.createMatchBetween(userId, targetUserId),
        };
      }
    }

    return { action };
  }

  async listMatches(userId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("id,user1Id,user2Id,matchedAt")
      .or(`user1Id.eq.${userId},user2Id.eq.${userId}`)
      .order("matchedAt", { ascending: false });

    if (error) {
      throw new Error("Eşleşmeler yüklenemedi");
    }

    const matches = await Promise.allSettled(
      (data || []).map((match) =>
        this.buildMatch(match as unknown as SupabaseMatchRow),
      ),
    );

    return matches.flatMap((match) =>
      match.status === "fulfilled" ? [match.value] : [],
    );
  }

  async claimSpecialInvite(_userId: string): Promise<void> {
    const { error } = await supabase.rpc("claim_zeynep_cisem_invite");

    if (error) {
      throw new Error("Özel davet kontrol edilemedi");
    }
  }

  async getPendingSpecialInvite(_userId: string): Promise<SpecialMatchInvite | null> {
    const { data, error } = await supabase
      .rpc("get_pending_special_match_invite")
      .maybeSingle();

    if (error) {
      throw new Error("Özel davet yüklenemedi");
    }

    if (!data) {
      return null;
    }

    const invite = data as PendingSpecialInviteRow;
    const inviter = mapSupabaseUser({
      id: invite.inviter_id,
      name: invite.inviter_name,
      city: invite.inviter_city ?? "",
      photos: invite.inviter_photo_uri
        ? [{ id: `special-invite-${invite.inviter_id}`, uri: invite.inviter_photo_uri, isPrimary: true }]
        : [],
      hasCompletedOnboarding: true,
      hasPassedEntryTest: true,
    });

    return {
      id: invite.id,
      inviter,
      targetName: invite.target_name,
      status: invite.status,
      createdAt: invite.created_at,
    };
  }

  async acceptSpecialInvite(_userId: string, inviteId: string): Promise<Match> {
    const { data, error } = await supabase.rpc("accept_special_match_invite", {
      invite_id: inviteId,
    });

    if (error || !data) {
      throw new Error("Özel davet kabul edilemedi");
    }

    return this.getMatchById(data as string);
  }

  async declineSpecialInvite(_userId: string, inviteId: string): Promise<void> {
    const { error } = await supabase.rpc("decline_special_match_invite", {
      invite_id: inviteId,
    });

    if (error) {
      throw new Error("Özel davet reddedilemedi");
    }
  }
}
