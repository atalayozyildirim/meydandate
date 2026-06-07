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

const getRevenueCatApiKey = () => {
  if (__DEV__ && env.revenueCatTestApiKey.startsWith("test_")) {
    return env.revenueCatTestApiKey;
  }

  if (Platform.OS === "ios" && env.revenueCatIosApiKey.startsWith("appl_")) {
    return env.revenueCatIosApiKey;
  }

  if (Platform.OS === "android" && env.revenueCatAndroidApiKey.startsWith("goog_")) {
    return env.revenueCatAndroidApiKey;
  }

  return "";
};

const STORE_PRICE_LABEL = "Mağaza fiyatı";
const REVENUECAT_CONFIGURATION_ERROR =
  "RevenueCat ürünleri mağazadan alınamadı. RevenueCat product identifier değerleri App Store Connect veya StoreKit Configuration ürünleriyle birebir aynı olmalı ve current offering içinde yalnızca mağazada mevcut ürünler bulunmalı.";

interface RevenueCatPackage {
  packageType?: string;
  product?: { identifier?: string; priceString?: string };
}

interface RevenueCatOffering {
  monthly?: RevenueCatPackage;
  annual?: RevenueCatPackage;
  lifetime?: RevenueCatPackage;
  availablePackages?: RevenueCatPackage[];
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
  getOfferings(): Promise<{ current?: RevenueCatOffering | null }>;
  restorePurchases(): Promise<RevenueCatCustomerInfo>;
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
    const apiKey = getRevenueCatApiKey();

    if (!apiKey || Platform.OS === "web") {
      return;
    }

    if (!this.Purchases) {
      const purchasesModule = await import("react-native-purchases");
      this.Purchases = (purchasesModule.default ??
        purchasesModule) as unknown as RevenueCatApi;
    }

    if (!this.isConfigured && this.Purchases) {
      await this.Purchases.configure({ apiKey });
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

  private createStoreConfigurationError(error?: unknown) {
    if (__DEV__ && error instanceof Error) {
      return new Error(`${REVENUECAT_CONFIGURATION_ERROR} (${error.message})`);
    }

    return new Error(REVENUECAT_CONFIGURATION_ERROR);
  }

  private getFallbackPlanPrices(): Record<SubscriptionPlan, string> {
    return __DEV__
      ? { monthly: "₺149", yearly: "₺999" }
      : { monthly: STORE_PRICE_LABEL, yearly: STORE_PRICE_LABEL };
  }

  private async getCurrentOffering(options?: {
    required?: boolean;
  }): Promise<RevenueCatOffering | null> {
    if (!this.Purchases) {
      throw new Error("RevenueCat modulu yuklenemedi.");
    }

    try {
      const offerings = await this.Purchases.getOfferings();
      return offerings?.current ?? null;
    } catch (error) {
      if (options?.required) {
        throw this.createStoreConfigurationError(error);
      }

      if (__DEV__) {
        console.warn(REVENUECAT_CONFIGURATION_ERROR, error);
      }

      return null;
    }
  }

  private pickPackageFromOffering(
    offering: RevenueCatOffering | null,
    plan: SubscriptionPlan,
  ): RevenueCatPackage | undefined {
    const availablePackages = offering?.availablePackages ?? [];
    const packageForPlan =
      plan === "monthly"
        ? offering?.monthly
        : plan === "yearly"
          ? offering?.annual
          : undefined;

    return (
      packageForPlan ||
      availablePackages.find((pkg) => {
        const type = String(pkg?.packageType ?? "").toLowerCase();
        const productId = String(pkg?.product?.identifier ?? "").toLowerCase();

        return plan === "monthly"
          ? type.includes("monthly") || productId.includes("monthly")
          : type.includes("annual") ||
              type.includes("yearly") ||
              productId.includes("annual") ||
              productId.includes("yearly");
      })
    );
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
  ): Promise<RevenueCatPackage | undefined> {
    const current = await this.getCurrentOffering({ required: true });
    return this.pickPackageFromOffering(current, plan);
  }

  private async selectProductPackage(
    productId: string,
  ): Promise<RevenueCatPackage | undefined> {
    const current = await this.getCurrentOffering({ required: true });
    const availablePackages = current?.availablePackages ?? [];

    return availablePackages.find((pkg) => pkg?.product?.identifier === productId);
  }

  async getSubscription(userId: string): Promise<Subscription> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return __DEV__
        ? new MockPaymentService().getSubscription(userId)
        : this.createInactiveSubscription(userId);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return __DEV__
        ? new MockPaymentService().getSubscription(userId)
        : this.createInactiveSubscription(userId);
    }

    const customerInfo = await this.Purchases.getCustomerInfo();
    return this.mapCustomerInfoToSubscription(customerInfo, userId);
  }

  async getPlanPrices(): Promise<Record<SubscriptionPlan, string>> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return __DEV__
        ? new MockPaymentService().getPlanPrices()
        : this.getFallbackPlanPrices();
    }

    await this.initialize();

    if (!this.Purchases) {
      return __DEV__
        ? new MockPaymentService().getPlanPrices()
        : this.getFallbackPlanPrices();
    }

    const current = await this.getCurrentOffering();
    const monthly = this.pickPackageFromOffering(current, "monthly");
    const yearly = this.pickPackageFromOffering(current, "yearly");

    return {
      monthly: monthly?.product?.priceString ?? STORE_PRICE_LABEL,
      yearly: yearly?.product?.priceString ?? STORE_PRICE_LABEL,
    };
  }

  async purchase(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<PaymentResult> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      if (__DEV__) {
        return new MockPaymentService().purchase(userId, plan);
      }

      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      if (__DEV__) {
        return new MockPaymentService().purchase(userId, plan);
      }

      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const packageItem = await this.selectPackage(plan);

    if (!packageItem) {
      throw new Error("RevenueCat paketleri yüklenemedi. Current offering içinde aylık ve yıllık paketleri kontrol edin.");
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
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      if (__DEV__) {
        return new MockPaymentService().purchaseBadge(userId, badge);
      }

      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      if (__DEV__) {
        return new MockPaymentService().purchaseBadge(userId, badge);
      }

      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const product = paidBadgeProductByBadge[badge];

    if (!product) {
      throw new Error("Rozet urunu bulunamadi.");
    }

    const packageItem = await this.selectProductPackage(product.revenueCatProductId);

    if (!packageItem) {
      throw new Error("RevenueCat rozet paketi bulunamadı. Rozet ürününü current offering içine ekleyin.");
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

  async restorePurchases(userId: string): Promise<Subscription> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return __DEV__
        ? new MockPaymentService().restorePurchases(userId)
        : this.createInactiveSubscription(userId);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return __DEV__
        ? new MockPaymentService().restorePurchases(userId)
        : this.createInactiveSubscription(userId);
    }

    const customerInfo = await this.Purchases.restorePurchases();
    return this.mapCustomerInfoToSubscription(customerInfo, userId);
  }
}
