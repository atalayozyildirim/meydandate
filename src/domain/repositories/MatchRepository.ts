// Swipe ve eslesme islemleri icin repository sozlesmesi.
import type { LikeAction, Match, SpecialMatchInvite } from "../entities/Match";

export interface SwipeResult {
  action: LikeAction;
  match?: Match;
}

export interface MatchRepository {
  swipe(userId: string, targetUserId: string, action: LikeAction): Promise<SwipeResult>;
  listMatches(userId: string): Promise<Match[]>;
  claimSpecialInvite(userId: string): Promise<void>;
  getPendingSpecialInvite(userId: string): Promise<SpecialMatchInvite | null>;
  acceptSpecialInvite(userId: string, inviteId: string): Promise<Match>;
  declineSpecialInvite(userId: string, inviteId: string): Promise<void>;
}
