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
const fireProductByAmount: Record<FirePackageAmount, string> = {
  100: "ehlibyte.fire.100",
  500: "ehlibyte.fire.500",
  1500: "ehlibyte.fire.1500",
};
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
      ? { monthly: "₺79,99", yearly: "₺599,99", lifetime: "₺899,99" }
      : {
          monthly: STORE_PRICE_LABEL,
          yearly: STORE_PRICE_LABEL,
          lifetime: STORE_PRICE_LABEL,
        };
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
          : offering?.lifetime;

    return (
      packageForPlan ||
      availablePackages.find((pkg) => {
        const type = String(pkg?.packageType ?? "").toLowerCase();
        const productId = String(pkg?.product?.identifier ?? "").toLowerCase();

        return plan === "monthly"
          ? type.includes("monthly") || productId.includes("monthly")
          : plan === "yearly"
            ? type.includes("annual") ||
              type.includes("yearly") ||
              productId.includes("annual") ||
              productId.includes("yearly")
            : type.includes("lifetime") || productId.includes("lifetime");
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

  private async selectPackage(
    plan: SubscriptionPlan,
  ): Promise<RevenueCatPackage | undefined> {
    const current = await this.getCurrentOffering({ required: true });
    return this.pickPackageFromOffering(current, plan);
  }

  private async selectProductPackage(
    productIds: string | string[],
  ): Promise<RevenueCatPackage | undefined> {
    const current = await this.getCurrentOffering({ required: true });
    const availablePackages = current?.availablePackages ?? [];
    const acceptedProductIds = Array.isArray(productIds)
      ? productIds
      : [productIds];

    return availablePackages.find(
      (pkg) =>
        Boolean(pkg?.product?.identifier) &&
        acceptedProductIds.includes(pkg?.product?.identifier ?? ""),
    );
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
    const lifetime = this.pickPackageFromOffering(current, "lifetime");

    return {
      monthly: monthly?.product?.priceString ?? STORE_PRICE_LABEL,
      yearly: yearly?.product?.priceString ?? STORE_PRICE_LABEL,
      lifetime: lifetime?.product?.priceString ?? STORE_PRICE_LABEL,
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
      throw new Error(
        "RevenueCat paketleri yüklenemedi. Current offering içinde aylık ve yıllık paketleri kontrol edin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchasePackage(packageItem);
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

    const packageItem = await this.selectProductPackage([
      product.revenueCatProductId,
      ...(product.revenueCatProductAliases ?? []),
    ]);

    if (!packageItem) {
      throw new Error(
        "RevenueCat rozet paketi bulunamadı. Rozet ürününü current offering içine ekleyin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchasePackage(packageItem);
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

    const packageItem = await this.selectProductPackage(
      fireProductByAmount[amount],
    );

    if (!packageItem) {
      throw new Error(
        "RevenueCat Fire paketi bulunamadı. Fire ürünlerini current offering içine ekleyin.",
      );
    }

    const { customerInfo } = await this.Purchases.purchasePackage(packageItem);

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
