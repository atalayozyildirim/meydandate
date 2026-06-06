// Swipe ve eslesme islemleri icin repository sozlesmesi.
import type { LikeAction, Match } from "../entities/Match";

export interface SwipeResult {
  action: LikeAction;
  match?: Match;
}

export interface MatchRepository {
  swipe(userId: string, targetUserId: string, action: LikeAction): Promise<SwipeResult>;
  listMatches(userId: string): Promise<Match[]>;
}
