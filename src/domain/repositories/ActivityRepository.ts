import type { UserActivity } from "@/domain/entities/Activity";

export interface ActivityPageOptions {
  offset?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface ActivityPage {
  activities: UserActivity[];
  nextOffset: number;
  hasMore: boolean;
}

export interface ActivityRepository {
  listActivities(
    userId: string,
    options?: ActivityPageOptions,
  ): Promise<ActivityPage>;
  getUnreadCount(userId: string): Promise<number>;
  markRead(userId: string, activityId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  subscribe(userId: string, onChange: () => void): () => void;
}
