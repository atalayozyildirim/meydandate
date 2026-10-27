import { Platform } from "react-native";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";
import type { PaidBadgeProduct } from "@/shared/constants/badges";
import type {
  FirePackageAmount,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";

export type PremiumPlan = Exclude<SubscriptionPlan, "lifetime">;

export interface RevenueCatEntitlement {
  isActive?: boolean;
  willRenew?: boolean;
  expirationDateMillis?: number | null;
  productIdentifier?: string;
}

export interface RevenueCatCustomerInfo {
  entitlements?: {
    active?: Record<string, RevenueCatEntitlement>;
  };
  originalAppUserId?: string;
}

export interface RevenueCatStoreProduct {
  identifier?: string;
  priceString?: string;
}

export interface RevenueCatApi {
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

export interface RevenueCatPurchaseError {
  code?: string | number;
  message?: string;
  userCancelled?: boolean | null;
}

export const isPurchaseCancelledError = (error: unknown): boolean => {
  const purchaseError = error as RevenueCatPurchaseError | null | undefined;
  return (
    purchaseError?.userCancelled === true ||
    String(purchaseError?.code ?? "") === "1" ||
    /purchase was cancelle?d/i.test(purchaseError?.message ?? "")
  );
};

export const isRevenueCatTestStoreRuntime = () =>
  __DEV__ &&
  !env.isProduction &&
  env.useRevenueCatTestStore &&
  env.revenueCatTestApiKey.startsWith("test_");

export const getRevenueCatApiKey = () => {
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

export const STORE_PRICE_LABEL = "Mağaza fiyatı";

export const appStorePremiumProductByPlan: Record<PremiumPlan, string> = {
  monthly: "ehlibyte.premium.monthly",
  yearly: "ehlibyte.premium.year",
};

export const testStorePremiumProductByPlan: Record<PremiumPlan, string> = {
  monthly: "monthly_premium",
  yearly: "yearly",
};

export const fireProductByAmount: Record<FirePackageAmount, string> = {
  100: "ehlibyte.fire.100",
  500: "ehlibyte.fire.500",
  1500: "ehlibyte.fire.1500",
};

export const uniqueProductIds = (productIds: string[]) =>
  Array.from(new Set(productIds.filter(Boolean)));

export const preferStoreProductIds = (
  testStoreProductIds: string[],
  appStoreProductIds: string[],
) =>
  isRevenueCatTestStoreRuntime()
    ? uniqueProductIds([...testStoreProductIds, ...appStoreProductIds])
    : uniqueProductIds([...appStoreProductIds, ...testStoreProductIds]);

export const getPremiumProductIds = (plan: PremiumPlan) =>
  preferStoreProductIds(
    [testStorePremiumProductByPlan[plan]],
    [appStorePremiumProductByPlan[plan]],
  );

export const getBadgeProductIds = (product: PaidBadgeProduct) =>
  preferStoreProductIds(
    product.revenueCatProductAliases ?? [],
    [product.revenueCatProductId],
  );
