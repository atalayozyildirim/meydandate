// Fire bakiyesi, paket alımı ve profil boost gönderimini yönetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const firePackageValues = [100, 500, 1500] as const;
export type FirePackageAmount = (typeof firePackageValues)[number];

export const useFire = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const balanceQuery = useQuery({
    queryKey: [queryKeys.fireBalance, currentUser?.id],
    enabled: Boolean(currentUser),
    retry: false,
    queryFn: () => container.userRepository.getFireBalance(currentUser?.id ?? ""),
  });

  const invalidateFire = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [queryKeys.fireBalance] }),
      queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
      queryClient.invalidateQueries({ queryKey: [queryKeys.publicProfile] }),
    ]);
  };

  const purchaseMutation = useMutation({
    mutationFn: (amount: FirePackageAmount) => {
      if (!currentUser) {
        throw new Error("Fire almak için oturum gerekli.");
      }

      return container.userRepository.purchaseFirePackage(currentUser.id, amount);
    },
    onSuccess: invalidateFire,
  });

  const sendMutation = useMutation({
    mutationFn: ({
      targetUserId,
      amount = 1,
    }: {
      targetUserId: string;
      amount?: number;
    }) => {
      if (!currentUser) {
        throw new Error("Fire göndermek için oturum gerekli.");
      }

      return container.userRepository.sendProfileFire(
        currentUser.id,
        targetUserId,
        amount,
      );
    },
    onSuccess: invalidateFire,
  });

  return {
    fireBalance: balanceQuery.data ?? 0,
    isLoadingFireBalance: balanceQuery.isLoading,
    purchaseFirePackage: purchaseMutation.mutateAsync,
    isPurchasingFirePackage: purchaseMutation.isPending,
    sendFire: sendMutation.mutateAsync,
    isSendingFire: sendMutation.isPending,
    refreshFireBalance: balanceQuery.refetch,
  };
};
