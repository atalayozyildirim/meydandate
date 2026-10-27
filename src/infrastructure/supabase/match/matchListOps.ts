import type { Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import {
  calculateBehavioralMatchScore,
  createUserActivityProfile,
  filterByAdvancedCriteria,
  type AdvancedMatchFilters,
} from "@/domain/services/BehavioralMatchScoring";
import { supabase } from "../client";
import { mapSupabaseUser, publicUserColumns } from "../userMapper";
import {
  createMissingMatchUser,
  minimalPublicUserColumns,
  type SupabaseMatchRow,
} from "./matchTypes";

export const getMatchUsers = async (row: SupabaseMatchRow): Promise<User[]> => {
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
};

export const buildMatch = async (row: SupabaseMatchRow): Promise<Match> => {
  const users = await getMatchUsers(row);
  const user1 =
    users.find((user) => user.id === row.user1Id) ??
    createMissingMatchUser(row.user1Id, row.matchedAt);
  const user2 =
    users.find((user) => user.id === row.user2Id) ??
    createMissingMatchUser(row.user2Id, row.matchedAt);

  const user1Activity = createUserActivityProfile(user1);
  const user2Activity = createUserActivityProfile(user2);

  const compatibility = calculateBehavioralMatchScore(
    user1,
    user2,
    user1Activity,
    user2Activity,
  );

  return {
    id: row.id,
    users: [user1, user2],
    compatibility,
    createdAt: row.matchedAt,
  };
};

export const getExistingMatchBetween = async (
  userId: string,
  targetUserId: string,
): Promise<Match | null> => {
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

  return existing ? buildMatch(existing as unknown as SupabaseMatchRow) : null;
};

export const ensureConversationBetween = async (
  userId: string,
  targetUserId: string,
  matchId: string,
): Promise<void> => {
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
      (conversation.participant1Id === userId &&
        conversation.participant2Id === targetUserId) ||
      (conversation.participant1Id === targetUserId &&
        conversation.participant2Id === userId)
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
};

export const createMatchBetween = async (
  userId: string,
  targetUserId: string,
): Promise<Match> => {
  const existingMatch = await getExistingMatchBetween(userId, targetUserId);

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
    const duplicateMatch = await getExistingMatchBetween(userId, targetUserId);

    if (duplicateMatch) {
      return duplicateMatch;
    }
  }

  if (matchError || !match) {
    throw new Error("Eşleşme oluşturulamadı");
  }

  await ensureConversationBetween(userId, targetUserId, match.id);

  return buildMatch(match as unknown as SupabaseMatchRow);
};

export const getMatchById = async (matchId: string): Promise<Match> => {
  const { data, error } = await supabase
    .from("matches")
    .select("id,user1Id,user2Id,matchedAt")
    .eq("id", matchId)
    .single();

  if (error || !data) {
    throw new Error("Eşleşme yüklenemedi");
  }

  return buildMatch(data as unknown as SupabaseMatchRow);
};

export const listUserMatches = async (
  userId: string,
  filters?: AdvancedMatchFilters,
): Promise<Match[]> => {
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
      buildMatch(match as unknown as SupabaseMatchRow),
    ),
  );

  const resolvedMatches = matches.flatMap((match) =>
    match.status === "fulfilled" ? [match.value] : [],
  );

  if (filters) {
    const filteredMatches = [];

    for (const match of resolvedMatches) {
      const otherUser = match.users.find((u) => u.id !== userId);
      if (!otherUser) continue;

      const activityProfile = createUserActivityProfile(otherUser);

      if (filterByAdvancedCriteria(otherUser, activityProfile, filters)) {
        filteredMatches.push(match);
      }
    }

    return filteredMatches;
  }

  return resolvedMatches;
};
