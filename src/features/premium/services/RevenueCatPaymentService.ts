import { Platform } from "react-native";
import { createId } from "@/shared/utils/id";
import { env } from "@/infrastructure/config/env";
import { supabase } from "@/infrastructure/supabase/client";
import { paidBadgeProductByBadge } from "@/shared/constants/badges";
import { isExpoGo } from "@/shared/utils/expoRuntime";
import type { Badge } from "@/domain/entities/User";
import type {
  BadgePurchaseResult,
  FirePackageAmount,
  FirePackagePurchaseResult,
  PaymentResult,
  Subscription,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";
import type { PaymentService } from "./MockPaymentService";
import { MockPaymentService } from "./MockPaymentService";

const getRevenueCatApiKey = () => {
  if (!env.useRevenueCatPayments || isExpoGo) {
    return "";
  }

  if (
    !env.isProduction &&
    env.useRevenueCatTestStore &&
    env.revenueCatTestApiKey.startsWith("test_")
  ) {
    return env.revenueCatTestApiKey;
  }

  if (Platform.OS === "ios" && env.revenueCatIosApiKey.startsWith("appl_")) {
    return env.revenueCatIosApiKey;
  }

  if (
    Platform.OS === "android" &&
    env.revenueCatAndroidApiKey.startsWith("goog_")
  ) {
    return env.revenueCatAndroidApiKey;
  }

  return "";
};

const STORE_PRICE_LABEL = "Mağaza fiyatı";
const premiumProductByPlan: Record<Exclude<SubscriptionPlan, "lifetime">, string> = {
  monthly: "ehlibyte.premium.monthly",
  yearly: "ehlibyte.premium.year",
};
const fireProductByAmount: Record<FirePackageAmount, string> = {
  100: "ehlibyte.fire.100",
  500: "ehlibyte.fire.500",
  1500: "ehlibyte.fire.1500",
};

interface RevenueCatStoreProduct {
  identifier?: string;
  priceString?: string;
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
  configure(config: { apiKey: string; appUserID?: string }): void;
  logIn(userId: string): Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  getCustomerInfo(): Promise<RevenueCatCustomerInfo>;
  getProducts?: (productIdentifiers: string[]) => Promise<RevenueCatStoreProduct[]>;
  restorePurchases(): Promise<RevenueCatCustomerInfo>;
  purchaseStoreProduct?: (product: RevenueCatStoreProduct) => Promise<{
    customerInfo: RevenueCatCustomerInfo;
    productIdentifier: string;
  }>;
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
  } catch (error) {
    if (__DEV__) {
      console.warn("RevenueCat native modülü yüklenemedi:", error);
    }

    return null;
  }
};

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
      const purchasesModule = loadPurchasesModule();
      this.Purchases = purchasesModule
        ? resolvePurchasesApi(purchasesModule)
        : null;
    }

    if (!this.Purchases) {
      return;
    }

    if (!this.isConfigured && this.Purchases) {
      await this.Purchases.configure({
        apiKey,
        ...(userId ? { appUserID: userId } : {}),
      });
      this.isConfigured = true;
      this.currentUserId = userId ?? null;
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

  private getFallbackPlanPrices(): Record<SubscriptionPlan, string> {
    return __DEV__
      ? { monthly: "₺79,99", yearly: "₺599,99", lifetime: "₺899,99" }
      : {
          monthly: STORE_PRICE_LABEL,
          yearly: STORE_PRICE_LABEL,
          lifetime: STORE_PRICE_LABEL,
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
    const plan: SubscriptionPlan = /lifetime/i.test(productId)
      ? "lifetime"
      : /year|annual/i.test(productId)
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

  private async selectStoreProduct(
    productIds: string | string[],
  ): Promise<RevenueCatStoreProduct | undefined> {
    if (!this.Purchases?.getProducts) {
      return undefined;
    }

    const acceptedProductIds = Array.isArray(productIds)
      ? productIds
      : [productIds];

    try {
      const products = await this.Purchases.getProducts(acceptedProductIds);

      return products.find(
        (product) =>
          Boolean(product?.identifier) &&
          acceptedProductIds.includes(product.identifier ?? ""),
      );
    } catch (error) {
      if (__DEV__) {
        console.warn("RevenueCat ürünleri doğrudan alınamadı:", error);
      }

      return undefined;
    }
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

    const [monthlyProduct, yearlyProduct] = await Promise.all([
      this.selectStoreProduct(premiumProductByPlan.monthly),
      this.selectStoreProduct(premiumProductByPlan.yearly),
    ]);

    return {
      monthly:
        monthlyProduct?.priceString ??
        STORE_PRICE_LABEL,
      yearly:
        yearlyProduct?.priceString ??
        STORE_PRICE_LABEL,
      lifetime: STORE_PRICE_LABEL,
    };
  }

  async purchase(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<PaymentResult> {
    if (plan === "lifetime") {
      throw new Error("Ömür boyu Premium şu anda satışta değil.");
    }

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

    const productItem = await this.selectStoreProduct(premiumProductByPlan[plan]);

    if (!productItem || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat Premium ürünü bulunamadı. Product ID değerini App Store Connect ve RevenueCat içinde kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(
      productItem as RevenueCatStoreProduct,
    );
    const subscription = this.mapCustomerInfoToSubscription(
      customerInfo,
      userId,
    );
    const receiptId = customerInfo?.originalAppUserId ?? createId("receipt");

    try {
      // isPremium güncelle
      const { error: premiumUpdateError } = await supabase
        .from("users")
        .update({ isPremium: true })
        .eq("id", userId);

      if (premiumUpdateError && __DEV__) {
        console.warn("Premium sync hatası:", premiumUpdateError.message);
      }

      // Mevcut badge'leri al ve premium_member ekle
      const { data: userData } = await supabase
        .from("users")
        .select("badges")
        .eq("id", userId)
        .single();

      if (userData) {
        const updatedBadges = Array.from(
          new Set([...(userData.badges ?? []), "premium_member"]),
        );
        await supabase
          .from("users")
          .update({ badges: updatedBadges })
          .eq("id", userId);
      }
    } catch (syncError) {
      if (__DEV__) {
        console.warn("RevenueCat purchase Supabase sync hatası:", syncError);
      }
    }

    return { subscription, receiptId };
  }

  async purchaseBadge(
    userId: string,
    badge: Badge,
  ): Promise<BadgePurchaseResult> {
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

    const productItem = await this.selectStoreProduct(
      product.revenueCatProductId,
    );

    if (!productItem || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat rozet ürünü bulunamadı. Product ID değerini App Store Connect ve RevenueCat içinde kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(
      productItem as RevenueCatStoreProduct,
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
      if (__DEV__) {
        return new MockPaymentService().purchaseFirePackage(userId, amount);
      }

      throw new Error("Satın alma servisi yapılandırılmamış.");
    }

    await this.initialize(userId);

    if (!this.Purchases) {
      if (__DEV__) {
        return new MockPaymentService().purchaseFirePackage(userId, amount);
      }

      throw new Error("Satın alma modülü yüklenemedi.");
    }

    const productItem = await this.selectStoreProduct(fireProductByAmount[amount]);

    if (!productItem || !this.Purchases.purchaseStoreProduct) {
      throw new Error(
        "RevenueCat Fire ürünü bulunamadı. Product ID değerini App Store Connect ve RevenueCat içinde kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchaseStoreProduct(
      productItem as RevenueCatStoreProduct,
    );

    return {
      amount,
      receiptId: customerInfo?.originalAppUserId ?? createId("fire_receipt"),
    };
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
    const restored = this.mapCustomerInfoToSubscription(customerInfo, userId);

    if (restored.status === "active") {
      try {
        const { error: syncError } = await supabase
          .from("users")
          .update({ isPremium: true })
          .eq("id", userId);

        if (syncError && __DEV__) {
          console.warn("Restore premium sync hatası:", syncError.message);
        }
      } catch (syncError) {
        if (__DEV__) {
          console.warn(
            "RevenueCat restorePurchases Supabase sync hatası:",
            syncError,
          );
        }
      }
    }

    return restored;
  }
}
