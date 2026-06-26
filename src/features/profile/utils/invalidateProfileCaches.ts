import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";

export const invalidateProfileCaches = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.publicProfile] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.feed] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.conversation] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.liveRoom] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.matches] }),
    queryClient.invalidateQueries({ queryKey: [queryKeys.likedMe] }),
  ]);
};
