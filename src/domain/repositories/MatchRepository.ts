// Swipe ve eslesme islemleri icin repository sozlesmesi.
import type {
  LikeAction,
  LikedMeProfile,
  Match,
  SpecialMatchInvite,
  UndoSwipeResult,
} from "../entities/Match";
import type { AdvancedMatchFilters } from "../services/BehavioralMatchScoring";

export interface SwipeResult {
  action: LikeAction;
  match?: Match;
  conversationId?: string;
}

export interface MatchRepository {
  swipe(userId: string, targetUserId: string, action: LikeAction): Promise<SwipeResult>;
  undoLastSwipe(userId: string): Promise<UndoSwipeResult>;
  listLikedMe(userId: string): Promise<LikedMeProfile[]>;
  listMatches(userId: string, filters?: AdvancedMatchFilters): Promise<Match[]>;
  claimSpecialInvite(userId: string): Promise<void>;
  getPendingSpecialInvite(userId: string): Promise<SpecialMatchInvite | null>;
  acceptSpecialInvite(userId: string, inviteId: string): Promise<Match>;
  declineSpecialInvite(userId: string, inviteId: string): Promise<void>;
}
