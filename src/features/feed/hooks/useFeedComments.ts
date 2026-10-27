import { useInfiniteQuery } from "@tanstack/react-query";
import type { FeedCommentsPage } from "@/domain/repositories/FeedRepository";
import { queryKeys } from "@/shared/constants/queryKeys";
import { container } from "@/infrastructure/config/Container";

export const COMMENT_PAGE_SIZE = 4;

export const useFeedComments = (postId: string, enabled: boolean) => {
  const query = useInfiniteQuery<FeedCommentsPage, Error>({
    queryKey: [queryKeys.feed, "comments", postId],
    enabled,
    retry: false,
    queryFn: ({ pageParam = 0 }) =>
      container.feedRepository.listComments(postId, {
        offset: Number(pageParam),
        limit: COMMENT_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
  });

  return {
    comments: query.data?.pages.flatMap((page) => page.comments) ?? [],
    isLoadingComments: query.isLoading,
    fetchMoreComments: query.fetchNextPage,
    hasMoreComments: Boolean(query.hasNextPage),
    isFetchingMoreComments: query.isFetchingNextPage,
  };
};
