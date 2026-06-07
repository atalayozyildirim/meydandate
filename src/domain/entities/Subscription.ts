// Premium abonelik ve odeme sonucunu UI'dan bagimsiz sekilde tanimlar.
export type SubscriptionPlan = "monthly" | "yearly" | "lifetime";
export type SubscriptionStatus = "inactive" | "trial" | "active" | "cancelled";

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt?: string;
  renewsAt?: string;
}

export interface PaymentResult {
  subscription: Subscription;
  receiptId: string;
}

export interface BadgePurchaseResult {
  badge: import("./User").Badge;
  receiptId: string;
}
