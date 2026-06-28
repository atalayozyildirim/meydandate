import type {
  MatchRepository,
  SwipeResult,
} from "@/domain/repositories/MatchRepository";
import type {
  LikedMeProfile,
  Match,
  LikeAction,
  SpecialMatchInvite,
  UndoSwipeResult,
} from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { 
  calculateBehavioralMatchScore, 
  createMockActivityProfile,
  type AdvancedMatchFilters,
  filterByAdvancedCriteria 
} from "@/domain/services/BehavioralMatchScoring";
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

type RecordSwipeRow = {
  action: LikeAction;
  match_id?: string | null;
  matched?: boolean | null;
  conversation_id?: string | null;
};

type UndoSwipeRow = {
  target_user_id: string;
  action: LikeAction;
  match_removed?: boolean | null;
};

type LikedMeRow = Partial<User> & {
  likeAction?: LikeAction;
  likedAt?: string;
};

type PrivateProfileReadinessRow = {
  id?: string;
  isActive?: boolean | null;
  hasCompletedOnboarding?: boolean | null;
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
  "profilePrompts",
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
  profilePrompts: [],
  badges: [],
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt,
  updatedAt: createdAt,
});

export class SupabaseMatchRepository implements MatchRepository {
  private async repairRequesterDiscoverReadiness(userId: string): Promise<boolean> {
    const { data: profile, error: profileError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const readiness = profile as PrivateProfileReadinessRow | null;

    if (
      profileError ||
      !readiness ||
      readiness.id !== userId ||
      readiness.isActive === false ||
      readiness.hasCompletedOnboarding === true
    ) {
      return false;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ hasCompletedOnboarding: true })
      .eq("id", userId);

    return !updateError;
  }

  private async notifyMatchEvent(
    targetUserId: string,
    action: LikeAction,
    matchId?: string | null,
  ) {
    if (action === "pass") {
      return;
    }

    const { error } = await supabase.functions.invoke("send-match-event-push", {
      body: {
        targetUserId,
        action,
        matchId: matchId ?? null,
      },
    });

    if (error && __DEV__) {
      console.info("Match bildirimi gönderilemedi", error.message);
    }
  }

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

    // Gelişmiş behavioral scoring
    const user1Activity = createMockActivityProfile(user1);
    const user2Activity = createMockActivityProfile(user2);
    
    const compatibility = calculateBehavioralMatchScore(
      user1,
      user2,
      user1Activity,
      user2Activity
    );

    return {
      id: row.id,
      users: [user1, user2],
      compatibility,
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
    const recordSwipe = () =>
      supabase
        .rpc("record_swipe", {
          target_user_id: targetUserId,
          next_action: action,
        })
        .maybeSingle();
    const { data, error } = await supabase
      .rpc("record_swipe", {
        target_user_id: targetUserId,
        next_action: action,
      })
      .maybeSingle();
    let result = data as RecordSwipeRow | null;
    let swipeError = error;

    if (
      swipeError &&
      /Requester profile is not eligible/i.test(swipeError.message) &&
      (await this.repairRequesterDiscoverReadiness(userId))
    ) {
      const retry = await recordSwipe();
      result = retry.data as RecordSwipeRow | null;
      swipeError = retry.error;
    }

    if (swipeError || !result) {
      if (
        swipeError &&
        __DEV__ &&
        !/Requester profile is not eligible/i.test(swipeError.message)
      ) {
        console.info("record_swipe hatası", swipeError.message);
      }

      const message = swipeError?.message ?? "";

      if (/Swipe target unavailable|Swipe target not found/i.test(message)) {
        throw new Error("Bu profil artık görüntülenemiyor.");
      }

      if (/Requester profile is not eligible/i.test(message)) {
        throw new Error("Profilini tamamlayıp Keşfet'e tekrar gir.");
      }

      if (/Requester profile is inactive/i.test(message)) {
        throw new Error("Hesabın Keşfet işlemleri için aktif değil.");
      }

      if (/Requester profile not found/i.test(message)) {
        throw new Error("Oturum profilin yenilenemedi. Çıkış yapıp tekrar gir.");
      }

      throw new Error("Swipe kaydedilemedi. Lütfen tekrar dene.");
    }

    void this.notifyMatchEvent(targetUserId, result.action, result.match_id);

    if (result.match_id) {
      return {
        action: result.action,
        match: await this.getMatchById(result.match_id),
        conversationId: result.conversation_id ?? undefined,
      };
    }

    return {
      action: result.action,
      conversationId: result.conversation_id ?? undefined,
    };
  }

  async undoLastSwipe(_userId: string): Promise<UndoSwipeResult> {
    const { data, error } = await supabase
      .rpc("undo_last_swipe")
      .maybeSingle();
    const result = data as UndoSwipeRow | null;

    if (error || !result) {
      throw new Error(
        error?.message === "Premium required"
          ? "Geri al Premium ile kullanılabilir."
          : "Son işlem geri alınamadı.",
      );
    }

    return {
      targetUserId: result.target_user_id,
      action: result.action,
      matchRemoved: Boolean(result.match_removed),
    };
  }

  async listLikedMe(_userId: string): Promise<LikedMeProfile[]> {
    const { data, error } = await supabase.rpc("list_liked_me_profiles", {
      limit_count: 24,
    });

    if (error) {
      throw new Error(
        error.message === "Premium required"
          ? "Seni beğenenleri görmek Premium ile kullanılabilir."
          : "Seni beğenenler yüklenemedi.",
      );
    }

    return ((data ?? []) as LikedMeRow[]).flatMap((row) => {
      if (row.likeAction !== "like" && row.likeAction !== "super_like") {
        return [];
      }

      return [
        {
          user: mapSupabaseUser(row),
          action: row.likeAction,
          likedAt: row.likedAt ?? new Date(0).toISOString(),
        },
      ];
    });
  }

  async listMatches(userId: string, filters?: AdvancedMatchFilters): Promise<Match[]> {
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

    const resolvedMatches = matches.flatMap((match) =>
      match.status === "fulfilled" ? [match.value] : [],
    );

    // Advanced filtreleme
    if (filters) {
      const filteredMatches = [];
      
      for (const match of resolvedMatches) {
        const otherUser = match.users.find(u => u.id !== userId);
        if (!otherUser) continue;
        
        const activityProfile = createMockActivityProfile(otherUser);
        
        if (filterByAdvancedCriteria(otherUser, activityProfile, filters)) {
          filteredMatches.push(match);
        }
      }
      
      return filteredMatches;
    }

    return resolvedMatches;
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
