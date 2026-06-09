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

type PrivateProfile = Partial<User> & {
  blockedUsers?: string[];
  mutedUsers?: string[];
};

const hasStoredLocation = (profile: Partial<User>) =>
  typeof profile.locationLatitude === "number" &&
  typeof profile.locationLongitude === "number";

export class SupabaseUserRepository implements UserRepository {
  async getCurrentUser(userId: string): Promise<User> {
    const { data, error } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    return mapSupabaseUser(profile);
  }

  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .eq("id", userId)
      .eq("isDiscoverable", true)
      .eq("hasCompletedOnboarding", true)
      .single();

    if (error || !data) {
      throw new Error("Kullanıcı bulunamadı");
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
      throw new Error("Profil güncellenemedi");
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
      throw new Error("Onboarding tamamlanamadı");
    }

    return this.getCurrentUser(userId);
  }

  async activatePremiumBoost(userId: string): Promise<User> {
    const { data, error } = await supabase
      .rpc("activate_premium_boost")
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw new Error("Boost etkinleştirilemedi");
    }

    return mapSupabaseUser(profile);
  }

  async setProfileDiscoverability(userId: string, isDiscoverable: boolean): Promise<User> {
    const { data, error } = await supabase
      .rpc("set_profile_discoverability", {
        next_is_discoverable: isDiscoverable,
      })
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw new Error("Profil gizlilik tercihi güncellenemedi");
    }

    return mapSupabaseUser(profile);
  }

  async setLocationMatching(userId: string, update: LocationMatchingUpdate): Promise<User> {
    const { data, error } = await supabase
      .rpc("set_location_matching", {
        next_match_by_location: update.enabled,
        next_radius_km: clampMatchRadiusKm(update.radiusKm),
        next_latitude: update.latitude ?? null,
        next_longitude: update.longitude ?? null,
      })
      .maybeSingle();
    const profile = data as Partial<User> | null;

    if (error || !profile || profile.id !== userId) {
      throw new Error("Konum eşleşme tercihi güncellenemedi");
    }

    return mapSupabaseUser(profile);
  }

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    // Get current user to check blocks/mutes
    const { data: currentUser, error: userError } = await supabase
      .rpc("get_my_profile")
      .maybeSingle();
    const currentProfile = currentUser as (PrivateProfile & { id?: string }) | null;

    if (userError || !currentProfile || currentProfile.id !== userId) {
      throw new Error("Kullanıcı bulunamadı");
    }

    const blockedUserIds = currentProfile.blockedUsers || [];
    const mutedUserIds = currentProfile.mutedUsers || [];

    if (currentProfile.matchByLocation && hasStoredLocation(currentProfile)) {
      const { data, error } = await supabase
        .rpc("list_location_discover_candidates");

      if (error) {
        throw new Error("Yakındaki adaylar yüklenemedi");
      }

      return (data || []).map((row) => mapSupabaseUser(row as Partial<User>));
    }

    const { data: swipes, error: swipesError } = await supabase
      .from("swipes")
      .select("targetUserId")
      .eq("userId", userId);

    if (swipesError) {
      throw new Error("Adaylar yüklenemedi");
    }

    // Get all users except current user and blocked/muted users
    let query = supabase
      .from("users")
      .select(publicUserColumns)
      .neq("id", userId)
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true);

    const actedUserIds = (swipes || [])
      .map((swipe) => swipe.targetUserId)
      .filter((targetUserId): targetUserId is string => typeof targetUserId === "string");
    const excludedUserIds = Array.from(new Set([...blockedUserIds, ...mutedUserIds, ...actedUserIds]));

    if (excludedUserIds.length > 0) {
      query = query.not("id", "in", `(${excludedUserIds.join(",")})`);
    }

    const { data, error } = await query
      .order("boostedUntil", { ascending: false, nullsFirst: false })
      .order("createdAt", { ascending: false });

    if (error) {
      throw new Error("Adaylar yüklenemedi");
    }

    const nowMs = Date.now();

    return (data || [])
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
  }

  async reportUser(userId: string, payload: ReportPayload): Promise<void> {
    const { error } = await supabase.from("reports").insert({
      reporterId: userId,
      reportedUserId: payload.reportedUserId,
      category: payload.category,
      description: payload.description,
    });

    if (error) {
      throw new Error("Rapor gönderilemedi");
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
