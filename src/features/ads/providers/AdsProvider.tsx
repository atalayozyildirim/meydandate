import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { AdsController } from "../domain/AdsController";
import { adsRuntime } from "../services/adsRuntime";

const AdsContext = createContext<AdsController>(adsRuntime);
export function AdsProvider({ children, controller = adsRuntime, isAdFree = false }: PropsWithChildren<{ controller?: AdsController; isAdFree?: boolean }>) {
  useEffect(() => {
    if (isAdFree) return;
    // Passive startup never interrupts onboarding with a native consent dialog.
    void controller.prepare();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void controller.prepare(); });
    return () => subscription.remove();
  }, [controller, isAdFree]);
  return <AdsContext.Provider value={controller}>{children}</AdsContext.Provider>;
}
export function useAds() {
  const controller = useContext(AdsContext);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { ...snapshot, prepare: controller.prepare, managePrivacy: controller.managePrivacy };
}
