export type TrackingStatus = "undetermined" | "granted" | "denied" | "unavailable";
export type AdsPhase = "disabled" | "unavailable" | "idle" | "checking" | "consent-required" | "tracking-required" | "blocked" | "ready" | "error";
export interface ConsentInfo {
  canRequestAds: boolean;
  requiresConsent: boolean;
  requiresPrivacyOptions: boolean;
  permitsTrackingRequest: boolean;
}
export interface AdsSnapshot {
  phase: AdsPhase;
  tracking: TrackingStatus;
  requiresPrivacyOptions: boolean;
  revision: number;
}
export interface AdsAdapter {
  available: boolean;
  updateConsent(): Promise<ConsentInfo>;
  collectConsent(): Promise<ConsentInfo>;
  privacyOptions(): Promise<ConsentInfo>;
  trackingPermission(request: boolean): Promise<TrackingStatus>;
  initialize(): Promise<void>;
}

/** UMP is the consent authority. No consent verdict is persisted by this class. */
export class AdsController {
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private initialized = false;
  private generation = 0;
  private enabled: boolean;
  private snapshot: AdsSnapshot;

  constructor(private adapter: AdsAdapter, private configuration: { enabled: boolean; requestTracking: boolean }) {
    this.enabled = configuration.enabled;
    this.snapshot = { phase: !this.enabled ? "disabled" : adapter.available ? "idle" : "unavailable", tracking: "unavailable", requiresPrivacyOptions: false, revision: 0 };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(update: Partial<AdsSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update, revision: this.snapshot.revision + 1 };
    this.listeners.forEach((listener) => listener());
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.generation++;
    this.publish({ phase: !enabled ? "disabled" : this.adapter.available ? "idle" : "unavailable" });
  }
  prepare = (interactive = false) => this.enqueue(interactive ? "consent" : "refresh");
  managePrivacy = () => this.enqueue("privacy");

  private enqueue(action: "refresh" | "consent" | "privacy") {
    // Refreshes, privacy forms and ATT never compete to present native UI.
    const generation = this.generation;
    const operation = this.queue.then(() => this.run(action, generation));
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  private async run(action: "refresh" | "consent" | "privacy", generation: number): Promise<boolean> {
    const current = () => this.enabled && generation === this.generation;
    if (!current()) return false;
    if (!this.adapter.available) { this.publish({ phase: "unavailable" }); return false; }
    // Hide/destroy existing ad views before consent or OS permissions change.
    this.publish({ phase: "checking" });
    try {
      let consent = await this.adapter.updateConsent();
      if (!current()) return false;
      if (action === "privacy" && consent.requiresPrivacyOptions) consent = await this.adapter.privacyOptions();
      else if (action !== "refresh" && consent.requiresConsent) consent = await this.adapter.collectConsent();
      if (!current()) return false;
      this.publish({ requiresPrivacyOptions: consent.requiresPrivacyOptions });
      if (consent.requiresConsent) { this.publish({ phase: "consent-required" }); return false; }
      if (!consent.canRequestAds) { this.publish({ phase: "blocked" }); return false; }
      const wantsTracking = this.configuration.requestTracking && consent.permitsTrackingRequest;
      let tracking = await this.adapter.trackingPermission(false);
      if (!current()) return false;
      if (wantsTracking && tracking === "undetermined") {
        if (action === "refresh") { this.publish({ phase: "tracking-required", tracking }); return false; }
        tracking = await this.adapter.trackingPermission(true);
      }
      if (!current()) return false;
      this.publish({ tracking });
      if (wantsTracking && tracking === "undetermined") { this.publish({ phase: "tracking-required" }); return false; }
      if (!this.initialized) {
        await this.adapter.initialize();
        this.initialized = true;
      }
      if (!current()) return false;
      this.publish({ phase: "ready" });
      return true;
    } catch {
      // An unavailable CMP/SDK is never an authorization to serve an ad.
      if (current()) this.publish({ phase: "error" });
      return false;
    }
  }
}
