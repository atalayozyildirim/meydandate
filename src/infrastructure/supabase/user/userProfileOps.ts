import type { User, UserProfileUpdate } from "@/domain/entities/User";
import type {
  LocationMatchingUpdate,
  OnboardingProfile,
} from "@/domain/repositories/UserRepository";
import { clampMatchRadiusKm } from "@/shared/utils/location";
import { supabase } from "../client";
import { createSupabaseRepositoryError, isMissingRpcError } from "../errors";
import { mapSupabaseUser, publicUserColumns } from "../userMapper";
import { hydrateSpotifyPresence } from "./userCandidateOps";

export const fetchCurrentUser = async (userId: string): Promise<User> => {
  const { data, error } = await supabase.rpc("get_my_profile").maybeSingle();
  const profile = data as Partial<User> | null;

  if (error || !profile || profile.id !== userId) {
    throw createSupabaseRepositoryError("Kullanıcı yüklenemedi", error);
  }

  const mappedProfile = mapSupabaseUser(profile);
  return (await hydrateSpotifyPresence([mappedProfile]))[0] ?? mappedProfile;
};

export const fetchUserById = async (userId: string): Promise<User> => {
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
};

export const updateUserProfile = async (
  userId: string,
  update: UserProfileUpdate,
): Promise<User> => {
  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", userId);

  if (error) {
    throw createSupabaseRepositoryError("Profil güncellenemedi", error);
  }

  return fetchCurrentUser(userId);
};

export const finishOnboarding = async (
  userId: string,
  profile: OnboardingProfile,
): Promise<User> => {
  const updateData: Record<string, unknown> = {
    name: profile.name,
    age: profile.age,
    city: profile.city,
    bio: profile.bio,
    culturalIdentity: profile.culturalIdentity,
    cultureImportance: profile.cultureImportance,
    interests: profile.interests,
    hasCompletedOnboarding: true,
  };

  if (profile.occupation) updateData.occupation = profile.occupation;
  if (profile.hometown) updateData.hometown = profile.hometown;
  if (profile.favoriteSong) updateData.favoriteSong = profile.favoriteSong;
  if (profile.favoritePoet) updateData.favoritePoet = profile.favoritePoet;
  if (profile.photos) updateData.photos = profile.photos;

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    throw createSupabaseRepositoryError("Onboarding tamamlanamadı", error);
  }

  return fetchCurrentUser(userId);
};

export const changeProfileDiscoverability = async (
  userId: string,
  isDiscoverable: boolean,
): Promise<User> => {
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
};

export const updateLocationMatchingDirectly = async (
  userId: string,
  update: LocationMatchingUpdate,
): Promise<User> => {
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

  return fetchCurrentUser(userId);
};

export const changeLocationMatching = async (
  userId: string,
  update: LocationMatchingUpdate,
): Promise<User> => {
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
    return updateLocationMatchingDirectly(userId, update);
  }

  if (error || !profile || profile.id !== userId) {
    throw createSupabaseRepositoryError(
      "Konum eşleşme tercihi güncellenemedi",
      error,
    );
  }

  return mapSupabaseUser(profile);
};
