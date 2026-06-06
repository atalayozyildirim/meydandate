// Mock odeme servisi ileride gercek store/payment entegrasyonu icin kontrat saglar.
import type { Badge } from "@/domain/entities/User";
import type { BadgePurchaseResult, PaymentResult, Subscription, SubscriptionPlan } from "@/domain/entities/Subscription";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

export interface PaymentService {
  getSubscription(userId: string): Promise<Subscription>;
  purchase(userId: string, plan: SubscriptionPlan): Promise<PaymentResult>;
  purchaseBadge(userId: string, badge: Badge): Promise<BadgePurchaseResult>;
}

const renewalByPlanDays: Record<SubscriptionPlan, number> = {
  monthly: 30,
  yearly: 365
};

export class MockPaymentService implements PaymentService {
  async getSubscription(userId: string): Promise<Subscription> {
    return (
      mockDatabase.subscriptions.find((subscription) => subscription.userId === userId) ?? {
        id: createId("subscription"),
        userId,
        plan: "monthly",
        status: "inactive"
      }
    );
  }

  async purchase(userId: string, plan: SubscriptionPlan): Promise<PaymentResult> {
    const startedAt = new Date();
    const renewsAt = new Date(startedAt);
    renewsAt.setDate(renewsAt.getDate() + renewalByPlanDays[plan]);

    const subscription: Subscription = {
      id: createId("subscription"),
      userId,
      plan,
      status: "active",
      startedAt: startedAt.toISOString(),
      renewsAt: renewsAt.toISOString()
    };

    const existingIndex = mockDatabase.subscriptions.findIndex((candidate) => candidate.userId === userId);

    if (existingIndex >= 0) {
      mockDatabase.subscriptions[existingIndex] = subscription;
    } else {
      mockDatabase.subscriptions.push(subscription);
    }

    const user = mockDatabase.users.find((candidate) => candidate.id === userId);

    if (user) {
      user.isPremium = true;
      user.badges = Array.from(new Set([...user.badges, "premium_member"]));
    }

    return {
      subscription,
      receiptId: createId("receipt")
    };
  }

  async purchaseBadge(userId: string, badge: Badge): Promise<BadgePurchaseResult> {
    const user = mockDatabase.users.find((candidate) => candidate.id === userId);

    if (user) {
      user.badges = Array.from(new Set([...user.badges, badge]));
    }

    return {
      badge,
      receiptId: createId("badge_receipt")
    };
  }
}
