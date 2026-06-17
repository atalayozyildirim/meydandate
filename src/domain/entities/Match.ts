// Begeni, eslesme ve guvenlik aksiyonlarini domain modeli olarak tutar.
import type { User } from "./User";

export const likeActionValues = ["like", "pass", "super_like"] as const;
export const reportCategoryValues = [
  "fake_profile",
  "spam",
  "harassment",
  "inappropriate_content",
  "other"
] as const;

export type LikeAction = (typeof likeActionValues)[number];
export type ReportCategory = (typeof reportCategoryValues)[number];

export interface Like {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: LikeAction;
  createdAt: string;
}

export interface CulturalCompatibility {
  cultural: number;
  interests: number;
  lifestyle: number;
}

export interface Match {
  id: string;
  users: [User, User];
  compatibility: CulturalCompatibility;
  createdAt: string;
  lastMessagePreview?: string;
}

export interface LikedMeProfile {
  user: User;
  action: Extract<LikeAction, "like" | "super_like">;
  likedAt: string;
}

export interface UndoSwipeResult {
  targetUserId: string;
  action: LikeAction;
  matchRemoved: boolean;
}

export type SpecialMatchInviteStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface SpecialMatchInvite {
  id: string;
  inviter: User;
  targetName: string;
  status: SpecialMatchInviteStatus;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description?: string;
  evidence?: string[];
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}
