import { LogBox, Platform } from "react-native";
import { createId } from "@/shared/utils/id";
import { env } from "@/infrastructure/config/env";
import {
  paidBadgeProducts,
  paidBadgeProductByBadge,
} from "@/shared/constants/badges";
import type { Badge } from "@/domain/entities/User";
import type {
  BadgePurchaseResult,
  FirePackageAmount,
  FirePackagePurchaseResult,
  PaymentResult,
  Subscription,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";
import type { PaymentService } from "@/domain/repositories/PaymentService";
import {
  getRevenueCatApiKey,
  STORE_PRICE_LABEL,
  fireProductByAmount,
  getPremiumProductIds,
  getBadgeProductIds,
  isPurchaseCancelledError,
  type PremiumPlan,
  type RevenueCatStoreProduct,
  type RevenueCatCustomerInfo,
  type RevenueCatApi,
} from "./revenueCatTypes";

export { isPurchaseCancelledError };

if (__DEV__) {
  LogBox.ignoreLogs(["Purchase was cancelled."]);
}

const resolvePurchasesApi = (module: unknown): RevenueCatApi | null => {
  const candidates = [
    module,
    (module as { default?: unknown } | null | undefined)?.default,
    (module as { Purchases?: unknown } | null | undefined)?.Purchases,
    (module as { default?: { default?: unknown } } | null | undefined)?.default
      ?.default,
  ];

  return (
    (candidates.find(
      (candidate) =>
        (typeof candidate === "object" || typeof candidate === "function") &&
        candidate !== null &&
        typeof (candidate as RevenueCatApi).configure === "function",
    ) as RevenueCatApi | undefined) ?? null
  );
};

const loadPurchasesModule = (): unknown => {
  try {
    // Metro bundles static require calls more reliably than dynamic import in
    // release/Hermes builds, while still letting Expo Go fail gracefully here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    return require("react-native-purchases");
  } catch {
    return null;
  }
};

export class RevenueCatPaymentService implements PaymentService {
  private Purchases: RevenueCatApi | null = null;
  private configured = false;
  private currentUserId: string | null = null;

  constructor() {
    this.Purchases = resolvePurchasesApi(loadPurchasesModule());
  }

  private isConfiguredForUser(userId: string): boolean {
    return this.configured && this.currentUserId === userId;
  }

  private async initialize(userId: string): Promise<void> {
    if (this.isConfiguredForUser(userId)) {
      return;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey || !this.Purchases) {
      return;
    }

    try {
      if (!this.configured) {
        if (
          __DEV__ &&
          env.useRevenueCatTestStore &&
          this.Purchases.setLogHandler
        ) {
          this.Purchases.setLogHandler((level, message) => {
            if (level === "WARN" || level === "ERROR") {
              // eslint-disable-next-line no-console
              console.warn(`[RevenueCat][${level}] ${message}`);
            }
          });
        }
        await this.Purchases.configure({ apiKey, appUserID: userId });
        this.configured = true;
        this.currentUserId = userId;
        return;
      }

      await this.Purchases.logIn(userId);
      this.currentUserId = userId;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("RevenueCat baslatilamadi:", error);
    }
  }

  private mapCustomerInfoToSubscription(
    customerInfo: RevenueCatCustomerInfo | null | undefined,
    userId: string,
  ): Subscription {
    const entitlementId = env.revenueCatEntitlementId || "premium";
    const entitlement = customerInfo?.entitlements?.active?.[entitlementId];

    if (!entitlement?.isActive) {
      return this.createInactiveSubscription(userId);
    }

    const rawPlan = entitlement.productIdentifier?.toLowerCase() ?? "";
    const plan: SubscriptionPlan = rawPlan.includes("year")
      ? "yearly"
      : "monthly";

    const renewsAt = entitlement.expirationDateMillis
      ? new Date(entitlement.expirationDateMillis).toISOString()
      : undefined;

    return {
      id: customerInfo?.originalAppUserId ?? createId("sub"),
      userId,
      plan,
      status: "active",
      renewsAt,
    };
  }

  private createInactiveSubscription(userId: string): Subscription {
    return {
      id: createId("sub_inactive"),
      userId,
      plan: "monthly",
      status: "inactive",
    };
  }

  private async selectStoreProduct(
    productIds: string | string[],
  ): Promise<RevenueCatStoreProduct | undefined> {
    if (!this.Purchases?.getProducts) {
      return undefined;
    }

    const acceptedProductIds = Array.isArray(productIds)
      ? Array.from(new Set(productIds.filter(Boolean)))
      : [productIds];

    if (acceptedProductIds.length === 0) {
      return undefined;
    }

    try {
      const products = await this.Purchases.getProducts(acceptedProductIds);
      const productById = new Map(
        products
          .filter((item): item is RevenueCatStoreProduct & { identifier: string } =>
            Boolean(item?.identifier),
          )
          .map((item) => [item.identifier, item]),
      );

      for (const id of acceptedProductIds) {
        const found = productById.get(id);
        if (found) {
          return found;
        }
      }

      return products[0];
    } catch {
      return undefined;
    }
  }

  async getSubscription(userId: string): Promise<Subscription> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return this.createInactiveSubscription(userId);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return this.createInactiveSubscription(userId);
    }

    try {
      const customerInfo = await this.Purchases.getCustomerInfo();
      return this.mapCustomerInfoToSubscription(customerInfo, userId);
    } catch {
      return this.createInactiveSubscription(userId);
    }
  }

  async getPlanPrices(): Promise<Record<SubscriptionPlan, string>> {
    const defaultPrices: Record<SubscriptionPlan, string> = {
      monthly: STORE_PRICE_LABEL,
      yearly: STORE_PRICE_LABEL,
      lifetime: STORE_PRICE_LABEL,
    };

    if (!getRevenueCatApiKey() || Platform.OS === "web" || !this.Purchases) {
      return defaultPrices;
    }

    try {
      const plans: PremiumPlan[] = ["monthly", "yearly"];
      await Promise.all(
        plans.map(async (plan) => {
          const product = await this.selectStoreProduct(
            getPremiumProductIds(plan),
          );
          if (product?.priceString) {
            defaultPrices[plan] = product.priceString;
          }
        }),
      );
    } catch {}

    return defaultPrices;
  }

  async getBadgePrices(): Promise<Partial<Record<Badge, string>>> {
    const prices: Partial<Record<Badge, string>> = {};
    if (!getRevenueCatApiKey() || Platform.OS === "web" || !this.Purchases) {
      return prices;
    }

    try {
      await Promise.all(
        paidBadgeProducts.map(async (product) => {
          const item = await this.selectStoreProduct(
            getBadgeProductIds(product),
          );
          if (item?.priceString) {
            prices[product.badge] = item.priceString;
          }
        }),
      );
    } catch {}

    return prices;
  }

  async purchase(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<PaymentResult> {
    if (plan === "lifetime") {
      throw new Error("Ömür boyu üyelik şu anda mobil mağazada sunulmamaktadır.");
    }

    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const product = await this.selectStoreProduct(getPremiumProductIds(plan));
    if (!product || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat paketi bulunamadı. Lütfen mağaza ayarlarını kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(product);
    const subscription = this.mapCustomerInfoToSubscription(
      customerInfo,
      userId,
    );

    return {
      subscription,
      receiptId: customerInfo?.originalAppUserId ?? createId("rc_receipt"),
    };
  }

  async purchaseBadge(
    userId: string,
    badge: Badge,
  ): Promise<BadgePurchaseResult> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const product = paidBadgeProductByBadge[badge];
    if (!product) {
      throw new Error("Rozet ürünü bulunamadı.");
    }

    const productItem = await this.selectStoreProduct(
      getBadgeProductIds(product),
    );

    if (!productItem || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat rozet ürünü bulunamadı. Lütfen mağaza ayarlarını kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(
      productItem,
    );
    const receiptId =
      customerInfo?.originalAppUserId ?? createId("badge_receipt");

    return { badge, receiptId };
  }

  async purchaseFirePackage(
    userId: string,
    amount: FirePackageAmount,
  ): Promise<FirePackagePurchaseResult> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const productItem = await this.selectStoreProduct(
      fireProductByAmount[amount],
    );

    if (!productItem || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat Fire ürünü bulunamadı. Lütfen mağaza ayarlarını kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(
      productItem,
    );

    return {
      amount,
      receiptId: customerInfo?.originalAppUserId ?? createId("fire_receipt"),
    };
  }

  async restorePurchases(userId: string): Promise<Subscription> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return this.createInactiveSubscription(userId);
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      return this.createInactiveSubscription(userId);
    }

    const customerInfo = await this.Purchases.restorePurchases();
    return this.mapCustomerInfoToSubscription(customerInfo, userId);
  }
}
