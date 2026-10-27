export type AdPlacement = "appOpen" | "banner" | "interstitial" | "native" | "rewarded";
export const isAdUnitId = (value: string) => /^ca-app-pub-\d{16}\/\d{10}$/.test(value);
export const isAdAppId = (value: string) => /^ca-app-pub-\d{16}~\d{10}$/.test(value);
export const isGoogleTestId = (value: string) => value.includes("3940256099942544");

export function selectAdUnit({ production, configured, testId }: { production: boolean; configured: string; testId: string }) {
  if (!production) return testId;
  return isAdUnitId(configured) && !isGoogleTestId(configured) ? configured : "";
}

/** Stable positions between content items; never in a composer, chat or room. */
export function shouldInsertFeedAd(index: number, total: number) {
  return Number.isInteger(index) && index >= 3 && (index - 3) % 8 === 0 && index < total - 1;
}
