// Premium abonelik durumunu ve mock satin alma akisini yonetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Badge } from "@/domain/entities/User";
import type { SubscriptionPlan } from "@/domain/entities/Subscription";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const usePremium = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const query = useQuery({
    queryKey: [queryKeys.subscription, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.paymentService.getSubscription(currentUser?.id ?? "")
  });
  const planPricesQuery = useQuery({
    queryKey: [queryKeys.subscription, "plan-prices"],
    queryFn: () => container.paymentService.getPlanPrices()
  });

  const purchaseMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => {
      if (!currentUser) {
        throw new Error("Premium satin almak icin oturum gerekli.");
      }

      return container.paymentService.purchase(currentUser.id, plan);
    },
    onSuccess: async () => {
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          isPremium: true,
          badges: Array.from(new Set([...currentUser.badges, "premium_member"]))
        });
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.subscription] });
    }
  });

  const purchaseBadgeMutation = useMutation({
    mutationFn: (badge: Badge) => {
      if (!currentUser) {
        throw new Error("Rozet satin almak icin oturum gerekli.");
      }

      return container.paymentService.purchaseBadge(currentUser.id, badge);
    },
    onSuccess: async (result) => {
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          badges: Array.from(new Set([...currentUser.badges, result.badge]))
        });
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.profile] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!currentUser) {
        throw new Error("Satın alımları geri yüklemek için oturum gerekli.");
      }

      return container.paymentService.restorePurchases(currentUser.id);
    },
    onSuccess: async (subscription) => {
      if (currentUser && subscription.status === "active") {
        setCurrentUser({
          ...currentUser,
          isPremium: true,
          badges: Array.from(new Set([...currentUser.badges, "premium_member"]))
        });
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.subscription] });
    }
  });

  return {
    subscription: query.data,
    planPrices: planPricesQuery.data,
    isLoading: query.isLoading,
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    purchaseBadge: purchaseBadgeMutation.mutateAsync,
    isPurchasingBadge: purchaseBadgeMutation.isPending,
    restorePurchases: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending
  };
};
