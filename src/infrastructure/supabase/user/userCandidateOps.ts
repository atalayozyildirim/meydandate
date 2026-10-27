import type { User } from "@/domain/entities/User";
import { env } from "@/infrastructure/config/env";
import { supabase } from "../client";
import { createSupabaseRepositoryError, isMissingRpcError } from "../errors";
import { mapSupabaseUser, publicUserColumns } from "../userMapper";
import {
  getDiscoveryRank,
  hasStoredLocation,
  type PrivateProfile,
  type SpotifyPresenceRow,
} from "./userCandidateScoring";

export const hydrateSpotifyPresence = async (
  candidates: User[],
): Promise<User[]> => {
  if (candidates.length === 0) {
    return candidates;
  }

  const { data, error } = await supabase
    .from("spotify_live_presence")
    .select("user_id,spotify_track_id,track_name,artist_names,expires_at")
    .in("user_id", candidates.map((candidate) => candidate.id))
    .eq("is_playing", true)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    if (__DEV__) console.info("Spotify canlı sinyalleri yüklenemedi", error.message);
    return candidates;
  }

  const presenceByUser = new Map(
    ((data ?? []) as SpotifyPresenceRow[]).map((presence) => [
      presence.user_id,
      presence,
    ]),
  );

  return candidates.map((candidate) => {
    const presence = presenceByUser.get(candidate.id);

    if (!presence) {
      return candidate;
    }

    return {
      ...candidate,
      spotifyTrackId: presence.spotify_track_id,
      spotifyTrackName: presence.track_name,
      spotifyArtistNames: presence.artist_names ?? [],
      spotifyPresenceExpiresAt: presence.expires_at,
    };
  });
};

export const listStarterMatchProfiles = async (
  userId: string,
  excludedUserIds: string[],
): Promise<User[]> => {
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
};

export const ensureAiStarterProfiles = async (userId: string): Promise<void> => {
  if (!env.enableAiStarterProfiles) {
    return;
  }

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
};

export const listDiscoverCandidates = async (
  userId: string,
): Promise<User[]> => {
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
        return listStarterMatchProfiles(userId, excludedUserIds);
      }

      throw createSupabaseRepositoryError(
        "Yakındaki adaylar yüklenemedi",
        error,
      );
    }

    const locationCandidates = (data || []).map((row) =>
      mapSupabaseUser(row as Partial<User>),
    );
    const sortedLocationCandidates = rankCandidates(
      await hydrateSpotifyPresence(locationCandidates),
    );
    const memberCandidates = sortedLocationCandidates.filter(
      (candidate) => (candidate.profileKind ?? "member") === "member",
    );

    if (memberCandidates.length > 0) {
      return memberCandidates;
    }

    await ensureAiStarterProfiles(userId);
    return listStarterMatchProfiles(userId, excludedUserIds);
  }

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
    await hydrateSpotifyPresence(
      (memberData || []).map((row) =>
        mapSupabaseUser(row as unknown as Partial<User>),
      ),
    ),
  );

  if (memberCandidates.length >= 3) {
    return memberCandidates;
  }

  if (memberCandidates.length > 0) {
    await ensureAiStarterProfiles(userId);
    const botCandidates = await listStarterMatchProfiles(userId, excludedUserIds);
    const combinedCandidates = [...memberCandidates];
    const shuffledBots = botCandidates.sort(() => Math.random() - 0.5);
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

  await ensureAiStarterProfiles(userId);
  return listStarterMatchProfiles(userId, excludedUserIds);
};
