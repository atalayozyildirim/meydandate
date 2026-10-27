import type {
  MatchRepository,
  SwipeResult,
} from "@/domain/repositories/MatchRepository";
import type {
  LikedMeProfile,
  Match,
  LikeAction,
  SpecialMatchInvite,
  UndoSwipeResult,
} from "@/domain/entities/Match";
import type { AdvancedMatchFilters } from "@/domain/services/BehavioralMatchScoring";
import {
  performSwipe,
  undoSwipe,
  fetchLikedMeProfiles,
} from "./match/matchSwipeOps";
import {
  getMatchById,
  listUserMatches,
} from "./match/matchListOps";
import {
  claimSpecialInviteRpc,
  getPendingSpecialInviteRpc,
  acceptSpecialInviteRpc,
  declineSpecialInviteRpc,
} from "./match/matchInviteOps";

export class SupabaseMatchRepository implements MatchRepository {
  async swipe(
    userId: string,
    targetUserId: string,
    action: LikeAction,
  ): Promise<SwipeResult> {
    return performSwipe(userId, targetUserId, action, (id) =>
      getMatchById(id),
    );
  }

  async undoLastSwipe(userId: string): Promise<UndoSwipeResult> {
    return undoSwipe(userId);
  }

  async listLikedMe(userId: string): Promise<LikedMeProfile[]> {
    return fetchLikedMeProfiles(userId);
  }

  async listMatches(
    userId: string,
    filters?: AdvancedMatchFilters,
  ): Promise<Match[]> {
    return listUserMatches(userId, filters);
  }

  async claimSpecialInvite(userId: string): Promise<void> {
    return claimSpecialInviteRpc(userId);
  }

  async getPendingSpecialInvite(
    userId: string,
  ): Promise<SpecialMatchInvite | null> {
    return getPendingSpecialInviteRpc(userId);
  }

  async acceptSpecialInvite(
    userId: string,
    inviteId: string,
  ): Promise<Match> {
    return acceptSpecialInviteRpc(userId, inviteId, (id) => getMatchById(id));
  }

  async declineSpecialInvite(
    userId: string,
    inviteId: string,
  ): Promise<void> {
    return declineSpecialInviteRpc(userId, inviteId);
  }
}
