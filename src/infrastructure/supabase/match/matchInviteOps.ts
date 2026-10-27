import type { Match, SpecialMatchInvite } from "@/domain/entities/Match";
import { supabase } from "../client";
import { mapSupabaseUser } from "../userMapper";
import type { PendingSpecialInviteRow } from "./matchTypes";

export const claimSpecialInviteRpc = async (_userId: string): Promise<void> => {
  const { error } = await supabase.rpc("claim_zeynep_cisem_invite");

  if (error) {
    throw new Error("Özel davet kontrol edilemedi");
  }
};

export const getPendingSpecialInviteRpc = async (
  _userId: string,
): Promise<SpecialMatchInvite | null> => {
  const { data, error } = await supabase
    .rpc("get_pending_special_match_invite")
    .maybeSingle();

  if (error) {
    throw new Error("Özel davet yüklenemedi");
  }

  if (!data) {
    return null;
  }

  const invite = data as PendingSpecialInviteRow;
  const inviter = mapSupabaseUser({
    id: invite.inviter_id,
    name: invite.inviter_name,
    city: invite.inviter_city ?? "",
    photos: invite.inviter_photo_uri
      ? [
          {
            id: `special-invite-${invite.inviter_id}`,
            uri: invite.inviter_photo_uri,
            isPrimary: true,
          },
        ]
      : [],
    hasCompletedOnboarding: true,
    hasPassedEntryTest: true,
  });

  return {
    id: invite.id,
    inviter,
    targetName: invite.target_name,
    status: invite.status,
    createdAt: invite.created_at,
  };
};

export const acceptSpecialInviteRpc = async (
  _userId: string,
  inviteId: string,
  getMatchById: (matchId: string) => Promise<Match>,
): Promise<Match> => {
  const { data, error } = await supabase.rpc("accept_special_match_invite", {
    invite_id: inviteId,
  });

  if (error || !data) {
    throw new Error("Özel davet kabul edilemedi");
  }

  return getMatchById(data as string);
};

export const declineSpecialInviteRpc = async (
  _userId: string,
  inviteId: string,
): Promise<void> => {
  const { error } = await supabase.rpc("decline_special_match_invite", {
    invite_id: inviteId,
  });

  if (error) {
    throw new Error("Özel davet reddedilemedi");
  }
};
