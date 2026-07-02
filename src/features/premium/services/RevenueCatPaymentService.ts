import { LogBox, Platform } from "react-native";
import { createId } from "@/shared/utils/id";
import { env } from "@/infrastructure/config/env";
import {
  paidBadgeProducts,
  paidBadgeProductByBadge,
  type PaidBadgeProduct,
} from "@/shared/constants/badges";
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

const isRevenueCatTestStoreRuntime = () =>
  __DEV__ &&
  !env.isProduction &&
  env.useRevenueCatTestStore &&
  env.revenueCatTestApiKey.startsWith("test_");

const getRevenueCatApiKey = () => {
  if (!env.useRevenueCatPayments || isExpoGo) {
    return "";
  }

  if (isRevenueCatTestStoreRuntime()) {
    return env.revenueCatTestApiKey;
  }

  if (__DEV__) {
    return "";
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
type PremiumPlan = Exclude<SubscriptionPlan, "lifetime">;

const appStorePremiumProductByPlan: Record<PremiumPlan, string> = {
  monthly: "ehlibyte.premium.monthly",
  yearly: "ehlibyte.premium.year",
};

const testStorePremiumProductByPlan: Record<PremiumPlan, string> = {
  monthly: "monthly_premium",
  yearly: "yearly",
};

const fireProductByAmount: Record<FirePackageAmount, string> = {
  100: "ehlibyte.fire.100",
  500: "ehlibyte.fire.500",
  1500: "ehlibyte.fire.1500",
};

const uniqueProductIds = (productIds: string[]) =>
  Array.from(new Set(productIds.filter(Boolean)));

const preferStoreProductIds = (
  testStoreProductIds: string[],
  appStoreProductIds: string[],
) =>
  isRevenueCatTestStoreRuntime()
    ? uniqueProductIds([...testStoreProductIds, ...appStoreProductIds])
    : uniqueProductIds([...appStoreProductIds, ...testStoreProductIds]);

const getPremiumProductIds = (plan: PremiumPlan) =>
  preferStoreProductIds(
    [testStorePremiumProductByPlan[plan]],
    [appStorePremiumProductByPlan[plan]],
  );

const getBadgeProductIds = (product: PaidBadgeProduct) =>
  preferStoreProductIds(
    product.revenueCatProductAliases ?? [],
    [product.revenueCatProductId],
  );

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
  setLogHandler?: (
    handler: (
      level: "VERBOSE" | "DEBUG" | "INFO" | "WARN" | "ERROR",
      message: string,
    ) => void,
  ) => void;
  logIn(userId: string): Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  getCustomerInfo(): Promise<RevenueCatCustomerInfo>;
  getProducts?: (productIdentifiers: string[]) => Promise<RevenueCatStoreProduct[]>;
  restorePurchases(): Promise<RevenueCatCustomerInfo>;
  purchaseStoreProduct?: (product: RevenueCatStoreProduct) => Promise<{
    customerInfo: RevenueCatCustomerInfo;
    productIdentifier: string;
  }>;
}

interface RevenueCatPurchaseError {
  code?: string | number;
  message?: string;
  userCancelled?: boolean | null;
}

if (__DEV__) {
  LogBox.ignoreLogs(["Purchase was cancelled."]);
}

export const isPurchaseCancelledError = (error: unknown) => {
  const purchaseError = error as RevenueCatPurchaseError | null | undefined;

  return (
    purchaseError?.userCancelled === true ||
    String(purchaseError?.code ?? "") === "1" ||
    /purchase was cancelle?d/i.test(purchaseError?.message ?? "")
  );
};

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
  private initializationQueue: Promise<void> = Promise.resolve();
  private hasCustomLogHandler = false;
  private Purchases: RevenueCatApi | null = null;
  private currentUserId: string | null = null;

  private initialize(userId?: string) {
    const initialization = this.initializationQueue.then(() =>
      this.initializeOnce(userId),
    );

    this.initializationQueue = initialization.catch(() => undefined);
    return initialization;
  }

  private async initializeOnce(userId?: string) {
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

    if (
      __DEV__ &&
      !this.hasCustomLogHandler &&
      this.Purchases.setLogHandler
    ) {
      this.Purchases.setLogHandler((level, message) => {
        const formattedMessage = `[RevenueCat] ${message}`;

        if (/purchase was cancelle?d/i.test(message)) {
          return;
        }

        if (level === "ERROR") {
          console.error(formattedMessage);
        } else if (level === "WARN") {
          console.warn(formattedMessage);
        } else if (level === "DEBUG" || level === "VERBOSE") {
          console.debug(formattedMessage);
        } else {
          console.info(formattedMessage);
        }
      });
      this.hasCustomLogHandler = true;
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
      ? uniqueProductIds(productIds)
      : [productIds];

    if (acceptedProductIds.length === 0) {
      return undefined;
    }

    try {
      const products = await this.Purchases.getProducts(acceptedProductIds);
      const productById = new Map(
        products
          .filter((product) => Boolean(product?.identifier))
          .map((product) => [product.identifier ?? "", product]),
      );

      return acceptedProductIds
        .map((productId) => productById.get(productId))
        .find(Boolean);
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
      this.selectStoreProduct(getPremiumProductIds("monthly")),
      this.selectStoreProduct(getPremiumProductIds("yearly")),
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

  async getBadgePrices(): Promise<Partial<Record<Badge, string>>> {
    if (!getRevenueCatApiKey() || Platform.OS === "web") {
      return __DEV__
        ? new MockPaymentService().getBadgePrices()
        : {};
    }

    await this.initialize();

    if (!this.Purchases) {
      return __DEV__
        ? new MockPaymentService().getBadgePrices()
        : {};
    }

    const products = await Promise.all(
      paidBadgeProducts.map(async (product) => ({
        badge: product.badge,
        storeProduct: await this.selectStoreProduct(
          getBadgeProductIds(product),
        ),
      })),
    );

    return Object.fromEntries(
      products.flatMap(({ badge, storeProduct }) =>
        storeProduct?.priceString
          ? [[badge, storeProduct.priceString] as const]
          : [],
      ),
    );
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

    const productItem = await this.selectStoreProduct(
      getPremiumProductIds(plan),
    );

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
      getBadgeProductIds(product),
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

    const productItem = await this.selectStoreProduct(
      fireProductByAmount[amount],
    );

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
    return this.mapCustomerInfoToSubscription(customerInfo, userId);
  }
}
