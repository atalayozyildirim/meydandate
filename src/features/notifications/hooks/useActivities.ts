import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ActivityPage } from "@/domain/repositories/ActivityRepository";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

const ACTIVITY_PAGE_SIZE = 20;
const EMPTY_ACTIVITY_PAGE: ActivityPage = {
  activities: [],
  nextOffset: 0,
  hasMore: false,
};

const useActivityRealtime = (enabled = true) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  useEffect(() => {
    if (!currentUser || !enabled) {
      return;
    }

    return container.activityRepository.subscribe(currentUser.id, () => {
      void queryClient.invalidateQueries({ queryKey: [queryKeys.activities] });
      void queryClient.invalidateQueries({
        queryKey: [queryKeys.unreadActivities],
      });
    });
  }, [currentUser?.id, enabled, queryClient]);
};

export const useUnreadActivityCount = (subscribeToChanges = true) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  useActivityRealtime(subscribeToChanges);

  const query = useQuery({
    queryKey: [queryKeys.unreadActivities, currentUser?.id],
    enabled: Boolean(currentUser),
    retry: false,
    queryFn: () =>
      currentUser
        ? container.activityRepository.getUnreadCount(currentUser.id)
        : Promise.resolve(0),
  });

  return {
    unreadCount: query.data ?? 0,
    isLoadingUnreadCount: query.isLoading,
  };
};

export const useActivities = (unreadOnly: boolean) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  useActivityRealtime();

  const query = useInfiniteQuery<ActivityPage, Error>({
    queryKey: [queryKeys.activities, currentUser?.id, unreadOnly],
    enabled: Boolean(currentUser),
    retry: false,
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUser) {
        return EMPTY_ACTIVITY_PAGE;
      }

      return container.activityRepository.listActivities(currentUser.id, {
        offset: Number(pageParam),
        limit: ACTIVITY_PAGE_SIZE,
        unreadOnly,
      });
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
  });

  const invalidateActivities = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [queryKeys.activities] }),
      queryClient.invalidateQueries({
        queryKey: [queryKeys.unreadActivities],
      }),
    ]);
  };

  const markReadMutation = useMutation({
    mutationFn: (activityId: string) => {
      if (!currentUser) {
        throw new Error("Hareketi güncellemek için oturum gerekli.");
      }

      return container.activityRepository.markRead(currentUser.id, activityId);
    },
    onSuccess: invalidateActivities,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Hareketleri güncellemek için oturum gerekli.");
      }

      return container.activityRepository.markAllRead(currentUser.id);
    },
    onSuccess: invalidateActivities,
  });

  return {
    activities: query.data?.pages.flatMap((page) => page.activities) ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    refresh: query.refetch,
    fetchMore: query.fetchNextPage,
    hasMore: Boolean(query.hasNextPage),
    isFetchingMore: query.isFetchingNextPage,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    isMarkingRead:
      markReadMutation.isPending || markAllReadMutation.isPending,
  };
};
