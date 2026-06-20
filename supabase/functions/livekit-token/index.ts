import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const base64UrlEncode = (input: Uint8Array | string) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const signLiveKitToken = async ({
  apiKey,
  apiSecret,
  identity,
  name,
  roomName,
  canPublish,
}: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  roomName: string;
  canPublish: boolean;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: identity,
    name,
    nbf: now - 10,
    exp: now + 60 * 60,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    },
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsignedToken)),
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
};

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const token = getBearerToken(req);

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return json(500, { error: "LiveKit credentials are not configured" });
    }

    if (!token) {
      return json(401, { error: "Authentication required" });
    }

    const { roomId } = await req.json().catch(() => ({}));
    const safeRoomId = typeof roomId === "string" ? roomId.trim() : "";

    if (!safeRoomId) {
      return json(400, { error: "roomId is required" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    const user = authData.user;

    if (authError || !user?.id) {
      return json(401, { error: "Invalid session" });
    }

    const { data: room, error: roomError } = await supabaseAdmin
      .from("live_rooms")
      .select("id,status,livekit_room_name")
      .eq("id", safeRoomId)
      .maybeSingle();

    if (roomError || !room) {
      return json(404, { error: "Live room not found" });
    }

    if (room.status !== "live") {
      return json(409, { error: "Live room is not active" });
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("userId", user.id)
      .maybeSingle();

    await supabaseAdmin.from("live_room_participants").upsert(
      {
        room_id: safeRoomId,
        user_id: user.id,
        role: "Dinleyici",
        stage_status: "listener",
        is_muted: true,
      },
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    );

    const { data: participant } = await supabaseAdmin
      .from("live_room_participants")
      .select("stage_status")
      .eq("room_id", safeRoomId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleRow?.role as string | undefined;
    const canManage = role === "admin" || role === "moderator";
    const canPublish = canManage || participant?.stage_status === "speaker";
    const roomName = room.livekit_room_name || `ehlibyte-${safeRoomId}`;
    const livekitToken = await signLiveKitToken({
      apiKey: livekitApiKey,
      apiSecret: livekitApiSecret,
      identity: user.id,
      name: (profile?.name as string | undefined) || user.email || "Uye",
      roomName,
      canPublish,
    });

    return json(200, {
      serverUrl: livekitUrl,
      token: livekitToken,
      roomName,
      identity: user.id,
      canPublish,
    });
  },
};
