import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type FeedEventType = "like" | "comment";

type PushTokenRow = {
  token: string;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  details?: {
    error?: string;
  };
};

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

const isFeedEventType = (value: unknown): value is FeedEventType =>
  value === "like" || value === "comment";

const sendExpoPush = async (
  tokens: PushTokenRow[],
  payload: Record<string, unknown>,
) => {
  if (tokens.length === 0) {
    return [] as string[];
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      tokens.map(({ token }) => ({
        to: token,
        sound: "default",
        channelId: "social",
        ...payload,
      })),
    ),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API failed with ${response.status}`);
  }

  const result = (await response.json().catch(() => ({}))) as {
    data?: ExpoPushTicket[];
  };
  const tickets = Array.isArray(result.data) ? result.data : [];

  return tokens
    .filter(
      (_, index) =>
        tickets[index]?.status === "error" &&
        tickets[index]?.details?.error === "DeviceNotRegistered",
    )
    .map(({ token }) => token);
};

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();
    const bearerToken = getBearerToken(req);

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    if (!bearerToken) {
      return json(401, { error: "Authentication required" });
    }

    const { type, postId, commentId } = await req.json().catch(() => ({}));

    if (!isFeedEventType(type) || typeof postId !== "string") {
      return json(400, { error: "type and postId are required" });
    }

    if (type === "comment" && typeof commentId !== "string") {
      return json(400, { error: "commentId is required for comment events" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(bearerToken);
    const requesterId = authData.user?.id;

    if (authError || !requesterId) {
      return json(401, { error: "Invalid session" });
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from("feed_posts")
      .select("id,author_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return json(404, { error: "Post not found" });
    }

    if (post.author_id === requesterId) {
      return json(200, { ok: true, delivered: 0, reason: "self_event" });
    }

    let eventKey = "";
    let preview = "";

    if (type === "like") {
      const { data: like, error: likeError } = await supabaseAdmin
        .from("feed_post_likes")
        .select("created_at")
        .eq("post_id", postId)
        .eq("user_id", requesterId)
        .maybeSingle();

      if (likeError || !like) {
        return json(403, { error: "Like event was not found" });
      }

      eventKey = `feed-like:${postId}:${requesterId}:${like.created_at}`;
    } else {
      const { data: comment, error: commentError } = await supabaseAdmin
        .from("feed_comments")
        .select("id,body")
        .eq("id", commentId)
        .eq("post_id", postId)
        .eq("author_id", requesterId)
        .maybeSingle();

      if (commentError || !comment) {
        return json(403, { error: "Comment event was not found" });
      }

      eventKey = `feed-comment:${comment.id}`;
      preview = String(comment.body ?? "").trim().slice(0, 120);
    }

    const recipientId = String(post.author_id);
    const [{ data: actor }, { data: recipient }, { data: tokens }] =
      await Promise.all([
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

    const blockedUsers = Array.isArray(recipient?.blockedUsers)
      ? recipient.blockedUsers
      : [];
    const mutedUsers = Array.isArray(recipient?.mutedUsers)
      ? recipient.mutedUsers
      : [];

    if (blockedUsers.includes(requesterId) || mutedUsers.includes(requesterId)) {
      return json(200, { ok: true, delivered: 0, reason: "blocked" });
    }

    const { error: eventError } = await supabaseAdmin
      .from("push_notification_events")
      .insert({
        event_key: eventKey,
        event_type: type === "like" ? "feed_like" : "feed_comment",
        recipient_id: recipientId,
      });

    if (eventError?.code === "23505") {
      return json(200, { ok: true, delivered: 0, reason: "duplicate" });
    }

    if (eventError) {
      return json(500, { error: "Notification event could not be recorded" });
    }

    const actorName =
      typeof actor?.name === "string" && actor.name.trim()
        ? actor.name.trim().slice(0, 80)
        : "Biri";
    const title = type === "like" ? "Yeni beğeni" : "Yeni yorum";
    const body =
      type === "like"
        ? `${actorName} paylaşımını beğendi.`
        : preview
          ? `${actorName}: ${preview}`
          : `${actorName} paylaşımına fotoğraflı yorum yaptı.`;

    try {
      const invalidTokens = await sendExpoPush(tokens ?? [], {
        title,
        body,
        data: {
          type: type === "like" ? "feed_like" : "feed_comment",
          postId,
          commentId: type === "comment" ? commentId : null,
          actorId: requesterId,
        },
      });

      if (invalidTokens.length > 0) {
        await supabaseAdmin
          .from("push_tokens")
          .update({ is_active: false })
          .in("token", invalidTokens);
      }
    } catch (error) {
      await supabaseAdmin
        .from("push_notification_events")
        .delete()
        .eq("event_key", eventKey);

      return json(502, {
        error: error instanceof Error ? error.message : "Push delivery failed",
      });
    }

    return json(200, { ok: true, delivered: tokens?.length ?? 0 });
  },
};
