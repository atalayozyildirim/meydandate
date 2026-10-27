import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAds } from "../providers/AdsProvider";
import { adUnitId, loadGoogleAds, type GoogleAdsModule } from "../services/googleAdsAdapter";

type Kind = "interstitial" | "appOpen";
type Instance = ReturnType<GoogleAdsModule["InterstitialAd"]["createForAdRequest"]>;
const lastShownAt: Partial<Record<Kind, number>> = {};
export function useFullscreenAd(kind: Kind, { enabled = false }: { enabled?: boolean } = {}) {
  const { phase, revision } = useAds();
  const [isLoaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const instance = useRef<Instance | null>(null);
  const presenting = useRef(false);
  const eligibility = useRef({ enabled, phase });
  eligibility.current = { enabled, phase };
  useEffect(() => {
    let disposed = false;
    const cleanup: Array<() => void> = [];
    instance.current = null;
    setLoaded(false);
    if (!enabled || phase !== "ready") return;
    void (async () => {
      const module = await loadGoogleAds();
      if (disposed || !module) return;
      const unit = adUnitId(module, kind);
      if (!unit) return;
      const factory = kind === "appOpen" ? module.AppOpenAd : module.InterstitialAd;
      const ad = factory.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true });
      instance.current = ad;
      cleanup.push(ad.addAdEventListener(module.AdEventType.LOADED, () => { if (!disposed) setLoaded(true); }));
      cleanup.push(ad.addAdEventListener(module.AdEventType.ERROR, () => { if (!disposed) setLoaded(false); }));
      cleanup.push(ad.addAdEventListener(module.AdEventType.CLOSED, () => { if (!disposed) { setLoaded(false); presenting.current = false; } }));
      ad.load();
    })().catch(() => { if (!disposed) setLoaded(false); });
    return () => { disposed = true; cleanup.forEach((unsubscribe) => unsubscribe()); instance.current = null; };
  }, [enabled, phase, revision, kind, reloadKey]);
  const load = useCallback(async () => { setReloadKey((key) => key + 1); }, []);
  const show = useCallback(async () => {
    const interval = kind === "appOpen" ? 4 * 60 * 60 * 1000 : 10 * 60 * 1000;
    if (!eligibility.current.enabled || eligibility.current.phase !== "ready" || !isLoaded || !instance.current || presenting.current || AppState.currentState !== "active") return false;
    if (Date.now() - (lastShownAt[kind] ?? 0) < interval) return false;
    presenting.current = true;
    try { await instance.current.show(); lastShownAt[kind] = Date.now(); setLoaded(false); return true; }
    catch { presenting.current = false; setLoaded(false); return false; }
  }, [isLoaded, kind]);
  return { isLoaded, load, show };
}
