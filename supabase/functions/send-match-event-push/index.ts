import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type MatchEventAction = "like" | "super_like";

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

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

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
};

const isMatchEventAction = (value: unknown): value is MatchEventAction =>
  value === "like" || value === "super_like";

const sendExpoPush = async (messages: Array<Record<string, unknown>>) => {
  const chunkSize = 100;

  for (let index = 0; index < messages.length; index += chunkSize) {
    const chunk = messages.slice(index, index + chunkSize);

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(chunk),
    });
  }
};

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();
    const token = getBearerToken(req);

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    if (!token) {
      return json(401, { error: "Authentication required" });
    }

    const { targetUserId, action, matchId } = await req.json().catch(() => ({}));
    const safeMatchId =
      typeof matchId === "string" && matchId.trim() ? matchId.trim() : null;

    if (typeof targetUserId !== "string" || !isMatchEventAction(action)) {
      return json(400, { error: "targetUserId and action are required" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    const requesterId = authData.user?.id;

    if (authError || !requesterId) {
      return json(401, { error: "Invalid session" });
    }

    if (requesterId === targetUserId) {
      return json(400, { error: "Invalid target" });
    }

    const { data: swipe, error: swipeError } = await supabaseAdmin
      .from("swipes")
      .select("userId,targetUserId,action")
      .eq("userId", requesterId)
      .eq("targetUserId", targetUserId)
      .eq("action", action)
      .maybeSingle();

    if (swipeError || !swipe) {
      return json(403, { error: "Swipe event was not found" });
    }

    let validMatchId: string | null = null;

    if (safeMatchId) {
      const { data: match } = await supabaseAdmin
        .from("matches")
        .select("id,user1Id,user2Id")
        .eq("id", safeMatchId)
        .maybeSingle();

      const matchBelongsToPair =
        match &&
        ((match.user1Id === requesterId && match.user2Id === targetUserId) ||
          (match.user1Id === targetUserId && match.user2Id === requesterId));

      if (matchBelongsToPair) {
        validMatchId = safeMatchId;
      }
    }

    const [{ data: sender }, { data: target }, { data: tokens }] =
      await Promise.all([
        supabaseAdmin
          .from("users")
          .select("name")
          .eq("id", requesterId)
          .maybeSingle(),
        supabaseAdmin
          .from("users")
          .select("blockedUsers,mutedUsers")
          .eq("id", targetUserId)
          .maybeSingle(),
        supabaseAdmin
          .from("push_tokens")
          .select("token")
          .eq("user_id", targetUserId)
          .eq("is_active", true),
      ]);

    const blockedUsers = Array.isArray(target?.blockedUsers)
      ? target.blockedUsers
      : [];
    const mutedUsers = Array.isArray(target?.mutedUsers) ? target.mutedUsers : [];

    if (blockedUsers.includes(requesterId) || mutedUsers.includes(requesterId)) {
      return json(200, { ok: true, delivered: 0 });
    }

    const senderName =
      typeof sender?.name === "string" && sender.name.trim()
        ? sender.name.trim().slice(0, 80)
        : "Biri";
    const title = validMatchId
      ? "Yeni eşleşme"
      : action === "super_like"
        ? "Super Like aldın"
        : "Yeni beğeni";
    const body = validMatchId
      ? `${senderName} ile eşleştin. Sohbeti başlat.`
      : action === "super_like"
        ? `${senderName} sana Super Like gönderdi.`
        : `${senderName} seni beğendi.`;
    const eventType = validMatchId
      ? "match"
      : action === "super_like"
        ? "super_like"
        : "like";

    await sendExpoPush(
      (tokens ?? []).map((row: { token: string }) => ({
        to: row.token,
        sound: "default",
        channelId: "matches",
        title,
        body,
        data: {
          type: eventType,
          userId: requesterId,
          targetUserId,
          matchId: validMatchId,
        },
      })),
    );

    return json(200, { ok: true, delivered: tokens?.length ?? 0 });
  },
};
