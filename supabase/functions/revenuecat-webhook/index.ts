import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type RevenueCatEventType =
  | "TEST"
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_PAUSED"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "SUBSCRIPTION_EXTENDED"
  | "TEMPORARY_ENTITLEMENT_GRANT"
  | "REFUND_REVERSED"
  | "TRANSFER";

interface RevenueCatEvent {
  id?: string;
  type?: RevenueCatEventType | string;
  app_user_id?: string;
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
}

interface RevenueCatWebhookPayload {
  event?: RevenueCatEvent;
}

type Badge =
  | "community_member"
  | "verified_profile"
  | "active_user"
  | "premium_member"
  | "muharrem_follower"
  | "cem_room_supporter"
  | "culture_guardian";

const premiumEntitlementId =
  Deno.env.get("REVENUECAT_ENTITLEMENT_ID")?.trim() || "premium";

const activeSubscriptionEvents = new Set<string>([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
  "REFUND_REVERSED",
]);

const badgeProductById: Record<string, Badge> = {
  "ehlibyte.badge.muharrem_follower": "muharrem_follower",
  "ehlibyte.badge.cem_room_supporter": "cem_room_supporter",
  "ehlibyte.badge.culture_guardian": "culture_guardian",
};

const userIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

const normalizeExpectedAuthorization = (value: string) =>
  value.toLowerCase().startsWith("bearer ") ? value : `Bearer ${value}`;

const isAuthorized = (req: Request) => {
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN")?.trim();

  if (!expected) {
    return false;
  }

  const actual = req.headers.get("authorization")?.trim() ?? "";
  return actual === expected || actual === normalizeExpectedAuthorization(expected);
};

const getSupabaseSecretKey = () => {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      return parsed.default ?? Object.values(parsed)[0] ?? "";
    } catch {
      return "";
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
};

const getPremiumUpdate = (event: RevenueCatEvent) => {
  const entitlementIds = [
    event.entitlement_id ?? undefined,
    ...(event.entitlement_ids ?? []),
  ].filter(Boolean);

  if (!entitlementIds.includes(premiumEntitlementId)) {
    return undefined;
  }

  if (event.type === "EXPIRATION") {
    return false;
  }

  if (event.type === "CANCELLATION") {
    return event.expiration_at_ms ? event.expiration_at_ms <= Date.now() : undefined;
  }

  if (!activeSubscriptionEvents.has(String(event.type))) {
    return undefined;
  }

  return event.expiration_at_ms ? event.expiration_at_ms > Date.now() : true;
};

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    if (!isAuthorized(req)) {
      return json(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    const payload = (await req.json().catch(() => null)) as RevenueCatWebhookPayload | null;
    const event = payload?.event;

    if (!event?.type || !event.app_user_id) {
      return json(400, { error: "Invalid RevenueCat payload" });
    }

    if (event.type === "TEST") {
      return json(200, { ok: true, eventId: event.id ?? null, ignored: "test_event" });
    }

    if (event.app_user_id.startsWith("$RCAnonymousID")) {
      return json(200, { ok: true, eventId: event.id ?? null, ignored: "anonymous_user" });
    }

    if (!userIdPattern.test(event.app_user_id)) {
      return json(400, { error: "RevenueCat app_user_id must be the Supabase user id" });
    }

    const premiumUpdate = getPremiumUpdate(event);
    const purchasedBadge = event.product_id ? badgeProductById[event.product_id] : undefined;

    if (premiumUpdate === undefined && !purchasedBadge) {
      return json(200, { ok: true, eventId: event.id ?? null, ignored: "no_supported_update" });
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("badges")
      .eq("id", event.app_user_id)
      .maybeSingle();

    if (profileError) {
      return json(500, { error: profileError.message });
    }

    if (!profile) {
      return json(404, { error: "Profile not found" });
    }

    const currentBadges = Array.isArray(profile.badges)
      ? (profile.badges as Badge[])
      : [];
    const nextBadges = new Set(currentBadges);
    const update: Record<string, unknown> = {};

    if (premiumUpdate !== undefined) {
      update.isPremium = premiumUpdate;

      if (premiumUpdate) {
        nextBadges.add("premium_member");
      } else {
        nextBadges.delete("premium_member");
        update.boostedUntil = null;
      }
    }

    if (purchasedBadge) {
      nextBadges.add(purchasedBadge);
    }

    update.badges = Array.from(nextBadges);

    const { error } = await supabase
      .from("users")
      .update(update)
      .eq("id", event.app_user_id);

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, {
      ok: true,
      eventId: event.id ?? null,
      premiumUpdated: premiumUpdate ?? null,
      badgeUpdated: purchasedBadge ?? null,
    });
  },
};
