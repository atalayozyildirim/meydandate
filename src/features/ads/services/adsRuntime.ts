import { AdsController } from "../domain/AdsController";
import { env } from "@/infrastructure/config/env";
import { googleAdsAdapter } from "./googleAdsAdapter";

// One SDK/CMP coordinator for every placement, including retained legacy screens.
export const adsRuntime = new AdsController(googleAdsAdapter, {
  enabled: env.enableAds,
  requestTracking: env.adsRequestTracking,
});
