import "@supabase/functions-js/edge-runtime.d.ts";
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

    const { title, body } = await req.json().catch(() => ({}));
    const safeTitle = typeof title === "string" ? title.trim().slice(0, 80) : "";
    const safeBody = typeof body === "string" ? body.trim().slice(0, 180) : "";

    if (!safeTitle || !safeBody) {
      return json(400, { error: "title and body are required" });
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

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("userId", requesterId)
      .maybeSingle();

    if (role?.role !== "admin") {
      return json(403, { error: "Admin role required" });
    }

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("is_active", true);

    await sendExpoPush(
      (tokens ?? []).map((row: { token: string }) => ({
        to: row.token,
        sound: "default",
        channelId: "social",
        title: safeTitle,
        body: safeBody,
        data: { type: "admin_event" },
      })),
    );

    return json(200, { ok: true, delivered: tokens?.length ?? 0 });
  },
};
