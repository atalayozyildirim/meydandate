import type { LikeAction, SpecialMatchInvite } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";

export type SupabaseMatchRow = {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: string;
};

export type PendingSpecialInviteRow = {
  id: string;
  inviter_id: string;
  inviter_name: string;
  inviter_city: string | null;
  inviter_photo_uri: string | null;
  target_name: string;
  status: SpecialMatchInvite["status"];
  created_at: string;
};

export type RecordSwipeRow = {
  action: LikeAction;
  match_id?: string | null;
  matched?: boolean | null;
  conversation_id?: string | null;
};

export type UndoSwipeRow = {
  target_user_id: string;
  action: LikeAction;
  match_removed?: boolean | null;
};

export type LikedMeRow = Partial<User> & {
  likeAction?: LikeAction;
  likedAt?: string;
};

export type PrivateProfileReadinessRow = {
  id?: string;
  isActive?: boolean | null;
  hasCompletedOnboarding?: boolean | null;
};

export const minimalPublicUserColumns = [
  "id",
  "name",
  "age",
  "city",
  "bio",
  "culturalIdentity",
  "cultureImportance",
  "interests",
  "photos",
  "profilePrompts",
  "badges",
  "isPremium",
  "hasPassedEntryTest",
  "hasCompletedOnboarding",
  "createdAt",
  "updatedAt",
].join(",");

export const createMissingMatchUser = (id: string, createdAt: string): User => ({
  id,
  name: "Kullanıcı",
  email: "",
  age: 18,
  city: "",
  bio: "",
  culturalIdentity: "prefer_not_to_say",
  cultureImportance: "not_important",
  interests: [],
  photos: [],
  profilePrompts: [],
  badges: [],
  isPremium: false,
  hasPassedEntryTest: true,
  hasCompletedOnboarding: true,
  createdAt,
  updatedAt: createdAt,
});
