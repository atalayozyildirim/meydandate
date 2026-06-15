// Topluluk akışı için post, yorum, yanıt, anket ve etiket modellerini tanımlar.
import type { User } from "@/domain/entities/User";

export interface FeedPollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface FeedPoll {
  id: string;
  postId: string;
  question: string;
  options: FeedPollOption[];
  totalVotes: number;
  votedOptionId?: string | null; // mevcut kullanıcının oy verdiği seçenek
  endsAt?: string | null;
}

export interface FeedLinkPreview {
  url: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  siteName?: string | null;
}

export interface FeedQuotedPost {
  id?: string | null;
  authorId?: string | null;
  authorName: string;
  authorPhotoUrl?: string | null;
  body: string;
  imageUrl?: string | null;
  createdAt?: string | null;
}

export const feedTagValues = ["muharrem", "deyis", "soru", "gundem"] as const;

export type FeedTag = (typeof feedTagValues)[number];

export interface FeedReply {
  id: string;
  postId: string;
  commentId: string;
  authorId: string;
  author: User;
  body: string;
  likedByUserIds: string[];
  createdAt: string;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  body: string;
  likedByUserIds: string[];
  replies: FeedReply[];
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  author: User;
  body: string;
  imageUrl?: string;
  tags: FeedTag[];
  likedByUserIds: string[];
  comments: FeedComment[];
  reportCount: number;
  isPinned?: boolean;
  isSponsored?: boolean;
  sponsorLabel?: string;
  ctaLabel?: string;
  showAdMob?: boolean;
  botPostId?: string;
  isActive?: boolean;
  poll?: FeedPoll | null;
  quotedPost?: FeedQuotedPost | null;
  linkPreview?: FeedLinkPreview | null;
  createdAt: string;
  updatedAt: string;
}
