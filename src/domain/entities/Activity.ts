export type ActivityType =
  | "feed_like"
  | "feed_comment"
  | "message"
  | "match"
  | "profile_like"
  | "super_like";

export interface ActivityActor {
  id: string;
  name: string;
  photoUri?: string;
}

export interface UserActivity {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  actor: ActivityActor | null;
  postId: string | null;
  commentId: string | null;
  conversationId: string | null;
  messageId: string | null;
  matchId: string | null;
  readAt: string | null;
  createdAt: string;
}
