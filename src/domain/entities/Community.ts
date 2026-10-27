export type CommunityRole = "organizer" | "moderator" | "member";
export type CommunityMembershipStatus = "pending" | "active" | "rejected";

export interface CommunityMembership {
  communityId: string;
  userId: string;
  role: CommunityRole;
  status: CommunityMembershipStatus;
  joinedAt: string;
}

export interface Community {
  id: string;
  name: string;
  topic: string;
  description: string;
  city: string;
  isPrivate: boolean;
  creatorId: string;
  memberCount: number;
  icon?: string;
  imageUrl?: string;
  myMembership?: CommunityMembership | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorPhotoUri?: string | null;
  body: string;
  imagePaths: string[];
  imageUrls: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityJoinRequest {
  communityId: string;
  userId: string;
  userName: string;
  userPhotoUri?: string | null;
  status: CommunityMembershipStatus;
  createdAt: string;
}
