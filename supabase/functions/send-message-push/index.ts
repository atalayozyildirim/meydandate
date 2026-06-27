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

const sendExpoPush = async (
  messages: Array<Record<string, unknown>>,
) => {
  if (messages.length === 0) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
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

    const { conversationId, messageId } = await req.json().catch(() => ({}));

    if (typeof conversationId !== "string" || typeof messageId !== "string") {
      return json(400, { error: "conversationId and messageId are required" });
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

    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .select("id, conversationId, senderId, body, createdAt")
      .eq("id", messageId)
      .eq("conversationId", conversationId)
      .maybeSingle();

    if (messageError || !message) {
      return json(404, { error: "Message not found" });
    }

    if (message.senderId !== requesterId) {
      return json(403, { error: "Only sender can trigger message push" });
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("participant1Id, participant2Id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return json(404, { error: "Conversation not found" });
    }

    const recipientId =
      conversation.participant1Id === requesterId
        ? conversation.participant2Id
        : conversation.participant1Id;

    const [{ data: sender }, { data: recipient }, { data: tokens }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("name")
        .eq("id", requesterId)
        .maybeSingle(),
      supabaseAdmin
        .from("users")
        .select("blockedUsers,mutedUsers")
        .eq("id", recipientId)
        .maybeSingle(),
      supabaseAdmin
        .from("push_tokens")
        .select("token")
        .eq("user_id", recipientId)
        .eq("is_active", true),
    ]);

    const preview =
      typeof message.body === "string" && message.body.trim() === "❤️"
        ? "Kalp gönderdi"
        : String(message.body ?? "").slice(0, 120);
    const blockedUsers = Array.isArray(recipient?.blockedUsers)
      ? recipient.blockedUsers
      : [];
    const mutedUsers = Array.isArray(recipient?.mutedUsers)
      ? recipient.mutedUsers
      : [];

    if (blockedUsers.includes(requesterId) || mutedUsers.includes(requesterId)) {
      return json(200, { ok: true, delivered: 0 });
    }

    await sendExpoPush(
      (tokens ?? []).map((row: { token: string }) => ({
        to: row.token,
        sound: "default",
        channelId: "messages",
        title: sender?.name ? `${sender.name} mesaj gönderdi` : "Yeni mesaj",
        body: preview,
        data: { type: "message", conversationId, messageId },
      })),
    );

    return json(200, { ok: true, delivered: tokens?.length ?? 0 });
  },
};
