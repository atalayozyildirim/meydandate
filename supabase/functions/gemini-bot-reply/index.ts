import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const json = (status: number, body: JsonObject) =>
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

const sanitizeReply = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 700);

const sendExpoPush = async (messages: Array<Record<string, unknown>>) => {
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

const callGemini = async (input: {
  apiKey: string;
  model: string;
  botName: string;
  userName: string;
  userMessage: string;
  recentContext: string;
}) => {
  const modelName = input.model.replace(/^models\//, "");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.82,
          topP: 0.9,
          maxOutputTokens: 140,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Ehlibyte uygulamasında sıcak, saygılı, kısa bir Türkçe sohbet partnerisin.",
                  "Doğal bir insan gibi konuş, samimi ve authentic ol.",
                  "Telefon, sosyal medya, dış iletişim isteme.",
                  "Romantik/ısrarcı/uygunsuz konuşma yapma; sohbeti kültür, müzik, şehir, kitap, topluluk gibi güvenli konularda ilerlet.",
                  "Cevap 1-3 cümle olsun, günlük hayattan gibi doğal konuş.",
                  `Adın: ${input.botName}`,
                  `Karşındaki: ${input.userName}`,
                  `Son bağlam: ${input.recentContext}`,
                  `Mesaj: ${input.userMessage}`,
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Gemini request failed: ${response.status} ${errorBody.slice(0, 240)}`,
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join(" ");

  return sanitizeReply(text);
};

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();
    const geminiKey =
      Deno.env.get("GEMINI_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
    const geminiModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
    const token = getBearerToken(req);

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, {
        error: "Supabase admin credentials are not configured",
      });
    }

    if (!geminiKey) {
      return json(200, { ok: true, skipped: "gemini_key_missing" });
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

    const [{ data: message }, { data: conversation }] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id, conversationId, senderId, body, createdAt")
        .eq("id", messageId)
        .eq("conversationId", conversationId)
        .maybeSingle(),
      supabaseAdmin
        .from("conversations")
        .select("id, participant1Id, participant2Id")
        .eq("id", conversationId)
        .maybeSingle(),
    ]);

    if (!message || !conversation) {
      return json(404, { error: "Message or conversation not found" });
    }

    if (message.senderId !== requesterId) {
      return json(403, { error: "Only sender can trigger bot reply" });
    }

    const participantIds = [
      conversation.participant1Id,
      conversation.participant2Id,
    ];
    if (!participantIds.includes(requesterId)) {
      return json(403, { error: "Requester is not a participant" });
    }

    const { data: participants } = await supabaseAdmin
      .from("users")
      .select("id, name, profileKind")
      .in("id", participantIds);

    const bot = (participants ?? []).find(
      (participant: { id: string; profileKind?: string | null }) =>
        participant.id !== requesterId &&
        ["starter", "ai_starter"].includes(participant.profileKind ?? ""),
    );
    const user = (participants ?? []).find(
      (participant: { id: string }) => participant.id === requesterId,
    );

    if (!bot) {
      return json(200, { ok: true, skipped: "no_bot_participant" });
    }

    const { data: newerBotMessage } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("conversationId", conversationId)
      .eq("senderId", bot.id)
      .gt("createdAt", message.createdAt)
      .limit(1)
      .maybeSingle();

    if (newerBotMessage) {
      return json(200, { ok: true, skipped: "bot_already_replied" });
    }

    const { data: recentMessages } = await supabaseAdmin
      .from("messages")
      .select("senderId, body")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: false })
      .limit(8);

    const recentContext = (recentMessages ?? [])
      .reverse()
      .map(
        (item: { senderId: string; body?: string | null }) =>
          `${item.senderId === bot.id ? "Bot" : "Kullanıcı"}: ${sanitizeReply(item.body)}`,
      )
      .join("\n")
      .slice(-1200);

    const reply =
      (await callGemini({
        apiKey: geminiKey,
        model: geminiModel,
        botName:
          sanitizeReply((bot as { name?: string }).name) || "Ehlibyte Rehberi",
        userName:
          sanitizeReply((user as { name?: string } | undefined)?.name) ||
          "Kullanıcı",
        userMessage: sanitizeReply(message.body),
        recentContext,
      }).catch((error) => {
        console.error(
          "Gemini bot reply generation failed",
          error instanceof Error ? error.message : String(error),
        );
        return "";
      })) || "Selam, nasılsın? Güzel bir sohbet edelim.";

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversationId,
        senderId: bot.id,
        body: reply,
        status: "sent",
      })
      .select("id")
      .single();

    if (insertError) {
      return json(500, { error: "Bot reply could not be inserted" });
    }

    await supabaseAdmin
      .from("conversations")
      .update({ lastMessageAt: new Date().toISOString() })
      .eq("id", conversationId);

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("user_id", requesterId)
      .eq("is_active", true);

    await sendExpoPush(
      (tokens ?? []).map((row: { token: string }) => ({
        to: row.token,
        sound: "default",
        title:
          sanitizeReply((bot as { name?: string }).name) || "Ehlibyte Rehberi",
        body: reply.slice(0, 120),
        data: { type: "message", conversationId, messageId: inserted.id },
      })),
    ).catch(() => undefined);

    return json(200, { ok: true, messageId: inserted.id });
  },
};
