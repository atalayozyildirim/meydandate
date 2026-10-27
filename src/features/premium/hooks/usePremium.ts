// Premium abonelik durumunu ve satin alma akisini yonetir.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Badge } from "@/domain/entities/User";
import type { SubscriptionPlan } from "@/domain/entities/Subscription";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";
import { isProfileBoostActive } from "@/shared/utils/profileBoost";

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
  const badgePricesQuery = useQuery({
    queryKey: [queryKeys.subscription, "badge-prices"],
    queryFn: () => container.paymentService.getBadgePrices()
  });
  const isPremiumActive =
    query.data?.status === "active" || Boolean(currentUser?.isPremium);
  const isBoostActive = isProfileBoostActive(currentUser?.boostedUntil);

  const purchaseMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => {
      if (!currentUser) {
        throw new Error("Premium satin almak icin oturum gerekli.");
      }

      return container.paymentService.purchase(currentUser.id, plan);
    },
    onSuccess: async (result) => {
      if (currentUser && result.subscription.status === "active") {
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
        const updatedUser = {
          ...currentUser,
          badges: Array.from(new Set([...currentUser.badges, result.badge]))
        };

        setCurrentUser(updatedUser);
        queryClient.setQueryData([queryKeys.profile, currentUser.id], updatedUser);
      }
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
      if (currentUser) {
        const premiumBadges: Badge[] =
          subscription.status === "active"
            ? Array.from(new Set<Badge>([...currentUser.badges, "premium_member"]))
            : currentUser.badges.filter((badge) => badge !== "premium_member");

        setCurrentUser({
          ...currentUser,
          isPremium: subscription.status === "active",
          badges: premiumBadges
        });
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.subscription] });
    }
  });

  const activateBoostMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error("Boost için oturum gerekli.");
      }

      if (!isPremiumActive) {
        throw new Error("Boost sadece aktif Premium abonelikle kullanılabilir.");
      }

      if (isBoostActive) {
        throw new Error("Boost zaten aktif.");
      }

      return container.userRepository.activatePremiumBoost(currentUser.id);
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);
    }
  });

  return {
    subscription: query.data,
    planPrices: planPricesQuery.data,
    badgePrices: badgePricesQuery.data,
    isPremiumActive,
    isBoostActive,
    boostExpiresAt: currentUser?.boostedUntil,
    isLoading: query.isLoading,
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    purchaseBadge: purchaseBadgeMutation.mutateAsync,
    isPurchasingBadge: purchaseBadgeMutation.isPending,
    restorePurchases: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    activateBoost: activateBoostMutation.mutateAsync,
    isActivatingBoost: activateBoostMutation.isPending
  };
};
