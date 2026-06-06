import type {
  UserRepository,
  OnboardingProfile,
  ReportPayload,
} from "@/domain/repositories/UserRepository";
import type { User, UserProfileUpdate } from "@/domain/entities/User";
import { supabase } from "./client";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";

type PrivateProfile = Partial<User> & {
  blockedUsers?: string[];
  mutedUsers?: string[];
};

export class SupabaseUserRepository implements UserRepository {
  async getCurrentUser(userId: string): Promise<User> {
    const { data, error } = await supabase
      .rpc("get_my_profile")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    return mapSupabaseUser(data as unknown as Partial<User>);
  }

  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .eq("id", userId)
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

  async listDiscoverCandidates(userId: string): Promise<User[]> {
    // Get current user to check blocks/mutes
    const { data: currentUser, error: userError } = await supabase
      .rpc("get_my_profile")
      .eq("id", userId)
      .single();

    if (userError || !currentUser) {
      throw new Error("Kullanıcı bulunamadı");
    }

    const privateProfile = currentUser as unknown as PrivateProfile;
    const blockedUserIds = privateProfile.blockedUsers || [];
    const mutedUserIds = privateProfile.mutedUsers || [];

    // Get all users except current user and blocked/muted users
    let query = supabase
      .from("users")
      .select(publicUserColumns)
      .neq("id", userId)
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true);

    if (blockedUserIds.length > 0) {
      query = query.not("id", "in", `(${blockedUserIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Adaylar yüklenemedi");
    }

    return (data || []).map((row) => mapSupabaseUser(row as unknown as Partial<User>));
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
      .eq("id", userId)
      .single();

    if (fetchError) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    const blockedUsers = (user as unknown as PrivateProfile | null)?.blockedUsers || [];
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
      .eq("id", userId)
      .single();

    if (fetchError) {
      throw new Error("Kullanıcı yüklenemedi");
    }

    const mutedUsers = (user as unknown as PrivateProfile | null)?.mutedUsers || [];
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
