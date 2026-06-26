import type {
  UserRepository,
  LocationMatchingUpdate,
  OnboardingProfile,
  ReportPayload,
} from "@/domain/repositories/UserRepository";
import type { Badge, User, UserProfileUpdate } from "@/domain/entities/User";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";
import { getProfileBoostRank } from "@/shared/utils/profileBoost";
import { clampMatchRadiusKm } from "@/shared/utils/location";
import { createSupabaseRepositoryError, isMissingRpcError } from "./errors";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";

type PrivateProfile = Partial<User> & {
  blockedUsers?: string[];
  mutedUsers?: string[];
};

const hasStoredLocation = (profile: Partial<User>) =>
  typeof profile.locationLatitude === "number" &&
  typeof profile.locationLongitude === "number";

const getDailyCandidateJitter = (userId: string, candidateId: string) => {
  const dayKey = Math.floor(Date.now() / 86_400_000);
  const value = `${userId}:${candidateId}:${dayKey}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }

  return hash / 9973;
};

const getDiscoveryRank = (
  currentUser: User,
  candidate: User,
  nowMs: number,
  candidateLikedCurrentUser = false,
) => {
  const compatibility = calculateCulturalMatchScore(currentUser, candidate);
  const compatibilityScore =
    compatibility.cultural * 0.42 +
    compatibility.interests * 0.36 +
    compatibility.lifestyle * 0.22;
  const reciprocalIntentScore = candidateLikedCurrentUser ? 46 : 0;
  const boostScore = getProfileBoostRank(candidate.boostedUntil, nowMs) * 34;
  const fireScore = Math.min(28, Math.log1p(candidate.fireScore ?? 0) * 5.5);
  const premiumScore = candidate.isPremium ? 8 : 0;
  const distanceScore =
    typeof candidate.distanceKm === "number"
      ? Math.max(0, 14 - Math.min(candidate.distanceKm, 70) / 5)
      : 0;
  const freshScore = Math.max(
    0,
    10 -
      (nowMs - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 14),
  );
  const jitter = getDailyCandidateJitter(currentUser.id, candidate.id) * 4;

  return (
    reciprocalIntentScore +
    compatibilityScore +
    boostScore +
    fireScore +
    premiumScore +
    distanceScore +
    freshScore +
    jitter
  );
};

export class SupabaseUserRepository implements UserRepository {
  async getCurrentUser(userId: string): Promise<User> {
    const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError("Kullanıcı yüklenemedi", error);
    }

    return mapSupabaseUser(profile);
  }

  async getUserById(userId: string): Promise<User> {
    // isDiscoverable / hasCompletedOnboarding filtreleri burada kullanilmaz:
    // Bu metod profil sayfasini acmak icin cagrilir; RLS zaten
    // "hasCompletedOnboarding AND isActive" kosulunu DB seviyesinde saglar.
    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw createSupabaseRepositoryError("Kullanıcı bulunamadı", error);
    }

    if (!data) {
      throw new Error("Kullanıcı bulunamadı veya profili görüntülenemiyor.");
    }

    return mapSupabaseUser(data as unknown as Partial<User>);
  }

  async updateProfile(
    userId: string,
    update: UserProfileUpdate,
  ): Promise<User> {
    const { error } = await supabase
      .from("users")
      .update(update)
      .eq("id", userId);

    if (error) {
      throw createSupabaseRepositoryError("Profil güncellenemedi", error);
    }

    return this.getCurrentUser(userId);
  }

  async completeOnboarding(
    userId: string,
    profile: OnboardingProfile,
  ): Promise<User> {
    const updateData: any = {
      name: profile.name,
      age: profile.age,
      city: profile.city,
      bio: profile.bio,
      culturalIdentity: profile.culturalIdentity,
      cultureImportance: profile.cultureImportance,
      interests: profile.interests,
      hasCompletedOnboarding: true,
    };

    if (profile.occupation) {
      updateData.occupation = profile.occupation;
    }

    if (profile.hometown) {
      updateData.hometown = profile.hometown;
    }

    if (profile.favoriteSong) {
      updateData.favoriteSong = profile.favoriteSong;
    }

    if (profile.favoritePoet) {
      updateData.favoritePoet = profile.favoritePoet;
    }

    if (profile.photos) {
      updateData.photos = profile.photos;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      throw createSupabaseRepositoryError("Onboarding tamamlanamadı", error);
    }

    return this.getCurrentUser(userId);
  }

  async claimMuharrem2026Badge(userId: string): Promise<User> {
    const { data, error } = await supabase
      .rpc("claim_muharrem_2026_badge")
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError("Muharrem rozeti eklenemedi", error);
    }

    return mapSupabaseUser(profile);
  }

  async claimTaskBadge(userId: string, badge: Badge): Promise<User> {
    const { data, error } = await supabase
      .rpc("claim_task_badge", {
        next_badge: badge,
      })
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError("Görev rozeti eklenemedi", error);
    }

    return mapSupabaseUser(profile);
  }

  async activatePremiumBoost(userId: string): Promise<User> {
    const { data, error } = await supabase
      .rpc("activate_premium_boost")
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError("Boost etkinleştirilemedi", error);
    }

    return mapSupabaseUser(profile);
  }

  async setProfileDiscoverability(
    userId: string,
    isDiscoverable: boolean,
  ): Promise<User> {
    const { data, error } = await supabase
      .rpc("set_profile_discoverability", {
        next_is_discoverable: isDiscoverable,
      })
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError(
        "Profil gizlilik tercihi güncellenemedi",
        error,
      );
    }

    return mapSupabaseUser(profile);
  }

  async setLocationMatching(
    userId: string,
    update: LocationMatchingUpdate,
  ): Promise<User> {
    const { data, error } = await supabase
      .rpc("set_location_matching", {
        next_match_by_location: update.enabled,
        next_radius_km: clampMatchRadiusKm(update.radiusKm),
        next_latitude: update.latitude ?? null,
        next_longitude: update.longitude ?? null,
      })
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error && isMissingRpcError(error, "set_location_matching")) {
      return this.updateLocationMatchingDirectly(userId, update);
    }

    if (error || !profile || profile.id !== userId) {
      throw createSupabaseRepositoryError(
        "Konum eşleşme tercihi güncellenemedi",
        error,
      );
    }

    return mapSupabaseUser(profile);
  }

  private async updateLocationMatchingDirectly(
    userId: string,
    update: LocationMatchingUpdate,
  ): Promise<User> {
    const nextUpdate: Record<string, boolean | number | string> = {
      matchByLocation: update.enabled,
      matchRadiusKm: clampMatchRadiusKm(update.radiusKm),
    };

    if (
      typeof update.latitude === "number" &&
      Number.isFinite(update.latitude) &&
      typeof update.longitude === "number" &&
      Number.isFinite(update.longitude)
    ) {
      nextUpdate.locationLatitude = update.latitude;
      nextUpdate.locationLongitude = update.longitude;
      nextUpdate.locationUpdatedAt = new Date().toISOString();
    }

    const { error } = await supabase
      .from("users")
      .update(nextUpdate)
      .eq("id", userId);

    if (error) {
      throw createSupabaseRepositoryError(
        "Konum eşleşme tercihi güncellenemedi",
        error,
      );
    }

    return this.getCurrentUser(userId);
  }

  async getFireBalance(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc("get_fire_balance");

    if (error) {
      throw createSupabaseRepositoryError("Fire bakiyesi yüklenemedi", error);
    }

    return Number(data ?? 0);
  }

  async sendProfileFire(
    _userId: string,
    targetUserId: string,
    amount = 1,
  ): Promise<{ balance: number; targetFireScore: number }> {
    const { data, error } = await supabase
      .rpc("send_profile_fire", {
        target_user_id: targetUserId,
        fire_amount: amount,
      })
      .maybeSingle();

    const result = data as
      | { balance?: number; target_fire_score?: number }
      | null;

    if (error || !result) {
      throw createSupabaseRepositoryError("Fire gönderilemedi", error);
    }

    return {
      balance: Number(result.balance ?? 0),
      targetFireScore: Number(result.target_fire_score ?? 0),
    };
  }

  async listFireLeaderboard(limit = 5): Promise<User[]> {
    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true)
      .eq("profileKind", "member")
      .gt("fireScore", 0)
      .order("fireScore", { ascending: false })
      .order("isPremium", { ascending: false })
      .order("updatedAt", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 20)));

    if (error) {
      throw createSupabaseRepositoryError("Fire liderleri yüklenemedi", error);
    }

    return (data || []).map((row) =>
      mapSupabaseUser(row as unknown as Partial<User>),
    );
  }

  private async listStarterMatchProfiles(
    userId: string,
    excludedUserIds: string[],
  ): Promise<User[]> {
    let query = supabase
      .from("users")
      .select(publicUserColumns)
      .neq("id", userId)
      .in("profileKind", ["starter", "ai_starter"])
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true)
      .order("createdAt", { ascending: false });

    if (excludedUserIds.length > 0) {
      query = query.not(
        "id",
        "in",
        `(${excludedUserIds.map((id) => `"${id}"`).join(",")})`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw createSupabaseRepositoryError("Adaylar yüklenemedi", error);
    }

    return (data || []).map((row) =>
      mapSupabaseUser(row as unknown as Partial<User>),
    );
  }

  private async ensureAiStarterProfiles(userId: string): Promise<void> {
    const { error } = await supabase.functions.invoke(
      "generate-starter-profiles",
      {
        body: { userId, limit: 3 },
      },
    );

    if (error && __DEV__) {
      console.info(
        createSupabaseRepositoryError(
          "AI starter profilleri hazırlanamadı",
          error,
        ).message,
      );
    }
  }

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    // Get current user to check blocks/mutes
    const { data: currentUser, error: userError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const currentProfile = currentUser as
      | (PrivateProfile & { id?: string })
      | null;

    if (userError || !currentProfile || currentProfile.id !== userId) {
      throw createSupabaseRepositoryError("Kullanıcı bulunamadı", userError);
    }

    const blockedUserIds = currentProfile.blockedUsers || [];
    const mutedUserIds = currentProfile.mutedUsers || [];

    const [{ data: swipes, error: swipesError }, { data: inboundSwipes, error: inboundSwipesError }] =
      await Promise.all([
        supabase.from("swipes").select("targetUserId").eq("userId", userId),
        supabase
          .from("swipes")
          .select("userId")
          .eq("targetUserId", userId)
          .neq("action", "pass"),
      ]);

    if (swipesError || inboundSwipesError) {
      throw createSupabaseRepositoryError(
        "Adaylar yüklenemedi",
        swipesError ?? inboundSwipesError,
      );
    }

    const actedUserIds = (swipes || [])
      .map((swipe) => swipe.targetUserId)
      .filter(
        (targetUserId): targetUserId is string =>
          typeof targetUserId === "string",
      );
    const excludedUserIds = Array.from(
      new Set([...blockedUserIds, ...mutedUserIds, ...actedUserIds]),
    );
    const likedYouUserIds = new Set(
      (inboundSwipes || [])
        .map((swipe) => swipe.userId)
        .filter((candidateUserId): candidateUserId is string => typeof candidateUserId === "string"),
    );

    const mappedCurrentUser = mapSupabaseUser(currentProfile);
    const nowMs = Date.now();

    // Function to rank candidates
    const rankCandidates = (candidates: User[]): User[] => {
      return candidates.sort((first, second) => {
        return (
          getDiscoveryRank(
            mappedCurrentUser,
            second,
            nowMs,
            likedYouUserIds.has(second.id),
          ) -
          getDiscoveryRank(
            mappedCurrentUser,
            first,
            nowMs,
            likedYouUserIds.has(first.id),
          )
        );
      });
    };

    if (currentProfile.matchByLocation && hasStoredLocation(currentProfile)) {
      const { data, error } = await supabase.rpc(
        "list_location_discover_candidates",
      );

      if (error) {
        if (isMissingRpcError(error, "list_location_discover_candidates")) {
          return this.listStarterMatchProfiles(userId, excludedUserIds);
        }

        throw createSupabaseRepositoryError(
          "Yakındaki adaylar yüklenemedi",
          error,
        );
      }

      const locationCandidates = (data || []).map((row) =>
        mapSupabaseUser(row as Partial<User>),
      );
      const sortedLocationCandidates = rankCandidates(locationCandidates);
      const memberCandidates = sortedLocationCandidates.filter(
        (candidate) => (candidate.profileKind ?? "member") === "member",
      );

      if (memberCandidates.length > 0) {
        return memberCandidates;
      }

      await this.ensureAiStarterProfiles(userId);
      return this.listStarterMatchProfiles(userId, excludedUserIds);
    }

    // Get all real users (member profileKind) except current user and blocked/muted users
    let memberQuery = supabase
      .from("users")
      .select(publicUserColumns)
      .neq("id", userId)
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true)
      .eq("profileKind", "member");

    if (excludedUserIds.length > 0) {
      memberQuery = memberQuery.not(
        "id",
        "in",
        `(${excludedUserIds.map((id) => `"${id}"`).join(",")})`,
      );
    }

    const { data: memberData, error: memberError } = await memberQuery
      .order("fireScore", { ascending: false })
      .order("boostedUntil", { ascending: false, nullsFirst: false })
      .order("createdAt", { ascending: false });

    if (memberError) {
      throw createSupabaseRepositoryError("Gerçek üyeler yüklenemedi", memberError);
    }

    const memberCandidates = rankCandidates(
      (memberData || []).map((row) => mapSupabaseUser(row as unknown as Partial<User>))
    );

    // If we have enough real members, return them
    if (memberCandidates.length >= 3) {
      return memberCandidates;
    }

    // If we have some real members but not enough, add bot profiles
    if (memberCandidates.length > 0) {
      await this.ensureAiStarterProfiles(userId);
      const botCandidates = await this.listStarterMatchProfiles(userId, excludedUserIds);
      // Interleave bots with real members to show real users more prominently
      const combinedCandidates = [...memberCandidates];
      const shuffledBots = botCandidates.sort(() => Math.random() - 0.5);
      // Add bots after every 2 real members
      shuffledBots.forEach((bot, index) => {
        const insertPosition = (index + 1) * 2;
        if (insertPosition < combinedCandidates.length) {
          combinedCandidates.splice(insertPosition, 0, bot);
        } else {
          combinedCandidates.push(bot);
        }
      });
      return combinedCandidates;
    }

    // No real members, show bot profiles
    await this.ensureAiStarterProfiles(userId);
    return this.listStarterMatchProfiles(userId, excludedUserIds);
  }

  async reportUser(userId: string, payload: ReportPayload): Promise<void> {
    const { error } = await supabase.from("reports").insert({
      reporterId: userId,
      reportedUserId: payload.reportedUserId,
      category: payload.category,
      description: payload.description ?? "",
      evidence: payload.evidence ?? [],
    });

    if (error) {
      throw createSupabaseRepositoryError("Rapor gönderilemedi", error);
    }
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    // Add to blockedUsers array
    const { data: user, error: fetchError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const profile = user as (PrivateProfile & { id?: string }) | null;

    if (fetchError || !profile || profile.id !== userId) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    const blockedUsers = profile.blockedUsers || [];
    if (!blockedUsers.includes(blockedUserId)) {
      blockedUsers.push(blockedUserId);
    }

    const { error } = await supabase
      .from("users")
      .update({ blockedUsers })
      .eq("id", userId);

    if (error) {
      throw new Error("Kullanıcı engellenemedi");
    }
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const { data: user, error: fetchError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const profile = user as (PrivateProfile & { id?: string }) | null;

    if (fetchError || !profile || profile.id !== userId) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    const blockedUsers = (profile.blockedUsers || []).filter(
      (candidateId) => candidateId !== blockedUserId,
    );

    const { error } = await supabase
      .from("users")
      .update({ blockedUsers })
      .eq("id", userId);

    if (error) {
      throw new Error("Engel kaldırılamadı");
    }
  }

  async muteUser(userId: string, mutedUserId: string): Promise<void> {
    // Add to mutedUsers array
    const { data: user, error: fetchError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const profile = user as (PrivateProfile & { id?: string }) | null;

    if (fetchError || !profile || profile.id !== userId) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    const mutedUsers = profile.mutedUsers || [];
    if (!mutedUsers.includes(mutedUserId)) {
      mutedUsers.push(mutedUserId);
    }

    const { error } = await supabase
      .from("users")
      .update({ mutedUsers })
      .eq("id", userId);

    if (error) {
      throw new Error("Kullanıcı sessize alınamadı");
    }
  }
}
