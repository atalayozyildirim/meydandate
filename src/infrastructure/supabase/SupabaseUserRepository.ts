import type {
  UserRepository,
  LocationMatchingUpdate,
  OnboardingProfile,
  ReportPayload,
} from "@/domain/repositories/UserRepository";
import type { User, UserProfileUpdate } from "@/domain/entities/User";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";
import { getProfileBoostRank } from "@/shared/utils/profileBoost";
import { clampMatchRadiusKm } from "@/shared/utils/location";
import { createSupabaseRepositoryError } from "./errors";

type PrivateProfile = Partial<User> & {
  blockedUsers?: string[];
  mutedUsers?: string[];
};

const hasStoredLocation = (profile: Partial<User>) =>
  typeof profile.locationLatitude === "number" &&
  typeof profile.locationLongitude === "number";

const getErrorField = (
  error: unknown,
  field: "code" | "message" | "details" | "hint",
) => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
};

const isMissingRpcError = (error: unknown, rpcName: string) => {
  const code = getErrorField(error, "code");
  const text = [
    getErrorField(error, "message"),
    getErrorField(error, "details"),
    getErrorField(error, "hint"),
  ].join(" ");

  return (
    code === "PGRST202" ||
    (text.includes(rpcName) && /schema cache|function/i.test(text))
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
    const { error } = await supabase
      .from("users")
      .update({
        name: profile.name,
        age: profile.age,
        city: profile.city,
        bio: profile.bio,
        culturalIdentity: profile.culturalIdentity,
        cultureImportance: profile.cultureImportance,
        interests: profile.interests,
        hasCompletedOnboarding: true,
      })
      .eq("id", userId);

    if (error) {
      throw createSupabaseRepositoryError("Onboarding tamamlanamadı", error);
    }

    return this.getCurrentUser(userId);
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

    const { data: swipes, error: swipesError } = await supabase
      .from("swipes")
      .select("targetUserId")
      .eq("userId", userId);

    if (swipesError) {
      throw createSupabaseRepositoryError("Adaylar yüklenemedi", swipesError);
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
      const memberCandidates = locationCandidates.filter(
        (candidate) => (candidate.profileKind ?? "member") === "member",
      );

      if (memberCandidates.length > 0) {
        return memberCandidates;
      }

      await this.ensureAiStarterProfiles(userId);
      return this.listStarterMatchProfiles(userId, excludedUserIds);
    }

    // Get all users except current user and blocked/muted users
    let query = supabase
      .from("users")
      .select(publicUserColumns)
      .neq("id", userId)
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true)
      .eq("profileKind", "member");

    if (excludedUserIds.length > 0) {
      query = query.not(
        "id",
        "in",
        `(${excludedUserIds.map((id) => `"${id}"`).join(",")})`,
      );
    }

    const { data, error } = await query
      .order("boostedUntil", { ascending: false, nullsFirst: false })
      .order("createdAt", { ascending: false });

    if (error) {
      throw createSupabaseRepositoryError("Adaylar yüklenemedi", error);
    }

    const nowMs = Date.now();

    const candidates = (data || [])
      .map((row) => mapSupabaseUser(row as unknown as Partial<User>))
      .sort((first, second) => {
        const boostRank =
          getProfileBoostRank(second.boostedUntil, nowMs) -
          getProfileBoostRank(first.boostedUntil, nowMs);

        if (boostRank !== 0) {
          return boostRank;
        }

        if (first.isPremium !== second.isPremium) {
          return second.isPremium ? 1 : -1;
        }

        return (
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
        );
      });

    if (candidates.length > 0) {
      return candidates;
    }

    await this.ensureAiStarterProfiles(userId);
    return this.listStarterMatchProfiles(userId, excludedUserIds);
  }

  async reportUser(userId: string, payload: ReportPayload): Promise<void> {
    const { error } = await supabase.from("reports").insert({
      reporterId: userId,
      reportedUserId: payload.reportedUserId,
      category: payload.category,
      description: payload.description,
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
