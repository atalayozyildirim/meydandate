import type { ReportPayload } from "@/domain/repositories/UserRepository";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import type { PrivateProfile } from "./userCandidateScoring";

export const submitUserReport = async (
  userId: string,
  payload: ReportPayload,
): Promise<void> => {
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
};

export const blockTargetUser = async (
  userId: string,
  blockedUserId: string,
): Promise<void> => {
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
};

export const unblockTargetUser = async (
  userId: string,
  blockedUserId: string,
): Promise<void> => {
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
};

export const muteTargetUser = async (
  userId: string,
  mutedUserId: string,
): Promise<void> => {
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
};
