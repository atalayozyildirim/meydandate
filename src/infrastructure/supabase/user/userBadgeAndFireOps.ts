import type { Badge, User } from "@/domain/entities/User";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import { mapSupabaseUser, publicUserColumns } from "../userMapper";

export const claimMuharremBadge = async (userId: string): Promise<User> => {
  const { data, error } = await supabase
    .rpc("claim_muharrem_2026_badge")
    .maybeSingle();
  const profile = data as Partial<User> | null;

  if (error || !profile || profile.id !== userId) {
    throw createSupabaseRepositoryError("Muharrem rozeti eklenemedi", error);
  }

  return mapSupabaseUser(profile);
};

export const claimBadge = async (
  userId: string,
  badge: Badge,
): Promise<User> => {
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
};

export const activateBoost = async (userId: string): Promise<User> => {
  const { data, error } = await supabase
    .rpc("activate_premium_boost")
    .maybeSingle();
  const profile = data as Partial<User> | null;

  if (error || !profile || profile.id !== userId) {
    throw createSupabaseRepositoryError("Boost etkinleştirilemedi", error);
  }

  return mapSupabaseUser(profile);
};

export const readFireBalance = async (_userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc("get_fire_balance");

  if (error) {
    throw createSupabaseRepositoryError("Fire bakiyesi yüklenemedi", error);
  }

  return Number(data ?? 0);
};

export const transferProfileFire = async (
  _userId: string,
  targetUserId: string,
  amount = 1,
): Promise<{ balance: number; targetFireScore: number }> => {
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
};

export const fetchFireLeaderboard = async (limit = 5): Promise<User[]> => {
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
};
