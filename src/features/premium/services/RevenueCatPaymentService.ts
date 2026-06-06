import { Platform } from "react-native";
import { createId } from "@/shared/utils/id";
import { env } from "@/infrastructure/config/env";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { paidBadgeProductByBadge } from "@/shared/constants/badges";
import type { Badge } from "@/domain/entities/User";
import type {
  BadgePurchaseResult,
  PaymentResult,
  Subscription,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";
import type { PaymentService } from "./MockPaymentService";
import { MockPaymentService } from "./MockPaymentService";

const isRevenueCatEnabled = Boolean(env.revenueCatApiKey);

interface RevenueCatPackage {
  packageType?: string;
  product?: { identifier?: string };
}

interface RevenueCatEntitlement {
  identifier?: string;
  productIdentifier?: string;
  latestPurchaseDate?: string;
  expirationDate?: string;
  isActive?: boolean;
}

interface RevenueCatCustomerInfo {
  entitlements?: {
    active?: Record<string, RevenueCatEntitlement>;
  };
  originalAppUserId?: string;
}

interface RevenueCatApi {
  configure(config: { apiKey: string }): void;
  logIn(userId: string): Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  getCustomerInfo(): Promise<RevenueCatCustomerInfo>;
  getOfferings(): Promise<any>;
  purchasePackage(pkg: RevenueCatPackage): Promise<{
    customerInfo: RevenueCatCustomerInfo;
    productIdentifier: string;
  }>;
}

export class RevenueCatPaymentService implements PaymentService {
  private isConfigured = false;
  private Purchases: RevenueCatApi | null = null;
  private currentUserId: string | null = null;

  private async initialize(userId?: string) {
    if (!isRevenueCatEnabled || Platform.OS === "web") {
      return;
    }

    if (!this.Purchases) {
      const purchasesModule = await import("react-native-purchases");
      this.Purchases = (purchasesModule.default ??
        purchasesModule) as unknown as RevenueCatApi;
    }

    if (!this.isConfigured && this.Purchases) {
      await this.Purchases.configure({ apiKey: env.revenueCatApiKey });
      this.isConfigured = true;
    }

    if (userId && this.currentUserId !== userId && this.Purchases) {
      await this.Purchases.logIn(userId);
      this.currentUserId = userId;
    }
  }

  private createInactiveSubscription(userId: string): Subscription {
    return {
      id: createId("subscription"),
      userId,
      plan: "monthly",
      status: "inactive",
    };
  }

  private mapCustomerInfoToSubscription(
    customerInfo: RevenueCatCustomerInfo,
    userId: string,
  ): Subscription {
    const entitlement =
      customerInfo?.entitlements?.active?.[env.revenueCatEntitlementId];

    if (!entitlement) {
      return this.createInactiveSubscription(userId);
    }

    const productId = entitlement.productIdentifier ?? "monthly";
    const plan: SubscriptionPlan = /year|annual/i.test(productId)
      ? "yearly"
      : "monthly";
    const status = entitlement.isActive ? "active" : "inactive";

    return {
      id: entitlement.identifier ?? createId("subscription"),
      userId,
      plan,
      status,
      startedAt: entitlement.latestPurchaseDate,
      renewsAt: entitlement.expirationDate,
    };
  }

  private async selectPackage(
    plan: SubscriptionPlan,
  ): Promise<RevenueCatPackage> {
    if (!this.Purchases) {
      throw new Error("RevenueCat modulu yuklenemedi.");
    }

    const offerings = await this.Purchases.getOfferings();
    const current = offerings?.current;
    const availablePackages: RevenueCatPackage[] =
      current?.availablePackages ?? [];

    const packageForPlan =
      plan === "monthly"
        ? current?.monthly
        : plan === "yearly"
          ? current?.annual
          : undefined;

    return (
      packageForPlan ||
      availablePackages.find((pkg) => {
        const type = String(pkg?.packageType ?? "").toLowerCase();
        return plan === "monthly"
          ? type.includes("monthly")
          : type.includes("annual") || type.includes("yearly");
      }) ||
      availablePackages[0]
    );
  }

  private async selectProductPackage(
    productId: string,
  ): Promise<RevenueCatPackage> {
    if (!this.Purchases) {
      throw new Error("RevenueCat modulu yuklenemedi.");
    }

    const offerings = await this.Purchases.getOfferings();
    const current = offerings?.current;
    const availablePackages: RevenueCatPackage[] =
      current?.availablePackages ?? [];

    return availablePackages.find((pkg) => pkg?.product?.identifier === productId);
  }

  async getSubscription(userId: string): Promise<Subscription> {
    if (!isRevenueCatEnabled || Platform.OS === "web") {
      return new MockPaymentService().getSubscription(userId);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return new MockPaymentService().getSubscription(userId);
    }

    const customerInfo = await this.Purchases.getCustomerInfo();
    return this.mapCustomerInfoToSubscription(customerInfo, userId);
  }

  async purchase(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<PaymentResult> {
    if (!isRevenueCatEnabled || Platform.OS === "web") {
      return new MockPaymentService().purchase(userId, plan);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return new MockPaymentService().purchase(userId, plan);
    }

    const packageItem = await this.selectPackage(plan);

    if (!packageItem) {
      throw new Error("RevenueCat paketleri yuklenemedi.");
    }

    const { customerInfo } = await this.Purchases.purchasePackage(packageItem);
    const subscription = this.mapCustomerInfoToSubscription(
      customerInfo,
      userId,
    );
    const receiptId = customerInfo?.originalAppUserId ?? createId("receipt");

    const existingIndex = mockDatabase.subscriptions.findIndex(
      (candidate) => candidate.userId === userId,
    );
    if (existingIndex >= 0) {
      mockDatabase.subscriptions[existingIndex] = subscription;
    } else {
      mockDatabase.subscriptions.push(subscription);
    }

    const user = mockDatabase.users.find(
      (candidate) => candidate.id === userId,
    );
    if (user) {
      user.isPremium = true;
      user.badges = Array.from(new Set([...user.badges, "premium_member"]));
    }

    return { subscription, receiptId };
  }

  async purchaseBadge(userId: string, badge: Badge): Promise<BadgePurchaseResult> {
    if (!isRevenueCatEnabled || Platform.OS === "web") {
      return new MockPaymentService().purchaseBadge(userId, badge);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return new MockPaymentService().purchaseBadge(userId, badge);
    }

    const product = paidBadgeProductByBadge[badge];

    if (!product) {
      throw new Error("Rozet urunu bulunamadi.");
    }

    const packageItem = await this.selectProductPackage(product.revenueCatProductId);

    if (!packageItem) {
      throw new Error("RevenueCat rozet paketi bulunamadi.");
    }

    const { customerInfo } = await this.Purchases.purchasePackage(packageItem);
    const receiptId = customerInfo?.originalAppUserId ?? createId("badge_receipt");
    const user = mockDatabase.users.find(
      (candidate) => candidate.id === userId,
    );

    if (user) {
      user.badges = Array.from(new Set([...user.badges, badge]));
    }

    return { badge, receiptId };
  }
}
