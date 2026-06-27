import type {
  ActivityPage,
  ActivityPageOptions,
  ActivityRepository,
} from "@/domain/repositories/ActivityRepository";

export class MockActivityRepository implements ActivityRepository {
  async listActivities(
    _userId: string,
    options: ActivityPageOptions = {},
  ): Promise<ActivityPage> {
    return {
      activities: [],
      nextOffset: options.offset ?? 0,
      hasMore: false,
    };
  }

  async getUnreadCount(): Promise<number> {
    return 0;
  }

  async markRead(): Promise<void> {}

  async markAllRead(): Promise<void> {}

  subscribe(): () => void {
    return () => undefined;
  }
}
