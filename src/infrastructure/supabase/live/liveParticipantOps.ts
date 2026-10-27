import type { LiveParticipantStageStatus } from "@/domain/entities/LiveRoom";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";

export const joinLiveRoom = async (
  roomId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabase.from("live_room_participants").upsert(
    {
      room_id: roomId,
      user_id: userId,
      role: "Dinleyici",
      stage_status: "listener",
      is_muted: true,
    },
    { onConflict: "room_id,user_id", ignoreDuplicates: true },
  );

  if (error) {
    throw createSupabaseRepositoryError("Canlı odaya katılınamadı", error);
  }
};

export const leaveLiveRoom = async (
  roomId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("live_room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    throw createSupabaseRepositoryError("Canlı odadan çıkılamadı", error);
  }
};

export const setStageStatus = async (
  roomId: string,
  targetUserId: string,
  stageStatus: LiveParticipantStageStatus,
): Promise<void> => {
  const { error } = await supabase.rpc("moderator_set_live_participant_stage", {
    target_room_id: roomId,
    target_stage_status: stageStatus,
    target_user_id: targetUserId,
  });

  if (error) {
    throw createSupabaseRepositoryError("Sahne durumu güncellenemedi", error);
  }
};

export const setMutedStatus = async (
  roomId: string,
  targetUserId: string,
  isMuted: boolean,
): Promise<void> => {
  const { error } = await supabase.rpc("set_live_participant_muted", {
    target_is_muted: isMuted,
    target_room_id: roomId,
    target_user_id: targetUserId,
  });

  if (error) {
    throw createSupabaseRepositoryError("Mikrofon durumu güncellenemedi", error);
  }
};

export const setHandRaisedStatus = async (
  roomId: string,
  userId: string,
  isRaised: boolean,
): Promise<void> => {
  const { error } = await supabase.rpc("set_live_participant_hand_raised", {
    target_is_raised: isRaised,
    target_room_id: roomId,
    target_user_id: userId,
  });

  if (error) {
    throw createSupabaseRepositoryError("El kaldırma durumu güncellenemedi", error);
  }
};

export const kickLiveParticipant = async (
  roomId: string,
  targetUserId: string,
): Promise<void> => {
  const { error } = await supabase.rpc("moderator_remove_live_participant", {
    target_room_id: roomId,
    target_user_id: targetUserId,
  });

  if (error) {
    throw createSupabaseRepositoryError("Katılımcı odadan çıkarılamadı", error);
  }
};
