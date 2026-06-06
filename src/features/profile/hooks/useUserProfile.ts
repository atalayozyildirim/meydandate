import { useQuery } from "@tanstack/react-query";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useUserProfile = (userId?: string) => {
  const query = useQuery({
    queryKey: [queryKeys.publicProfile, userId],
    enabled: Boolean(userId),
    queryFn: () => container.userRepository.getUserById(userId ?? ""),
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

