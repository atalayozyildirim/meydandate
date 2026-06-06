// Topluluk akışı için post, yorum, yanıt ve etiket modellerini tanımlar.
import type { User } from "@/domain/entities/User";

export const feedTagValues = [
  "cem",
  "muharrem",
  "deyis",
  "soru",
  "lokma",
  "gundem",
] as const;

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
  tags: FeedTag[];
  likedByUserIds: string[];
  comments: FeedComment[];
  reportCount: number;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}
