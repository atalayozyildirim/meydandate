import type { Badge } from "@/domain/entities/User";
import type {
  BadgePurchaseResult,
  FirePackageAmount,
  FirePackagePurchaseResult,
  PaymentResult,
  Subscription,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";

export interface PaymentService {
  getSubscription(userId: string): Promise<Subscription>;
  getPlanPrices(): Promise<Record<SubscriptionPlan, string>>;
  getBadgePrices(): Promise<Partial<Record<Badge, string>>>;
  purchase(userId: string, plan: SubscriptionPlan): Promise<PaymentResult>;
  purchaseBadge(userId: string, badge: Badge): Promise<BadgePurchaseResult>;
  purchaseFirePackage(
    userId: string,
    amount: FirePackageAmount,
  ): Promise<FirePackagePurchaseResult>;
  restorePurchases(userId: string): Promise<Subscription>;
}
