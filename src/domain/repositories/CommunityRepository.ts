import type {
  Community,
  CommunityJoinRequest,
  CommunityPost,
} from "../entities/Community";

export interface CreateCommunityInput {
  name: string;
  topic: string;
  description: string;
  city: string;
  isPrivate: boolean;
  icon?: string;
  imageUrl?: string;
}

export interface CommunityRepository {
  getCommunities(city?: string): Promise<Community[]>;
  getCommunityById(id: string): Promise<Community | null>;
  createCommunity(input: CreateCommunityInput): Promise<Community>;
  updateCommunity(
    id: string,
    input: Partial<CreateCommunityInput>,
  ): Promise<Community>;
  deleteCommunity(id: string): Promise<void>;
  joinCommunity(
    id: string,
  ): Promise<{ status: "active" | "pending"; isPrivate: boolean }>;
  leaveCommunity(id: string): Promise<void>;
  getJoinRequests(communityId: string): Promise<CommunityJoinRequest[]>;
  respondJoinRequest(
    communityId: string,
    userId: string,
    accept: boolean,
  ): Promise<void>;
  getCommunityPosts(communityId: string): Promise<CommunityPost[]>;
  createCommunityPost(
    communityId: string,
    body: string,
    imagePaths?: string[],
  ): Promise<CommunityPost>;
}
