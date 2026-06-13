import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type CulturalIdentity = "alevi" | "close_to_alevi_culture" | "prefer_not_to_say";
type CultureImportance = "very_important" | "important" | "somewhat_important" | "not_important";
type Interest =
  | "baglama"
  | "turkish_folk_music"
  | "folk_poets"
  | "cem_culture"
  | "solidarity"
  | "art"
  | "literature"
  | "travel"
  | "sports"
  | "nature";

interface GeneratedProfile {
  name: string;
  age: number;
  city: string;
  occupation: string;
  bio: string;
  hometown: string;
  favoriteSong: string;
  favoritePoet: string;
  culturalIdentity: CulturalIdentity;
  cultureImportance: CultureImportance;
  interests: Interest[];
}

interface RequestBody {
  limit?: number;
}

const allowedInterests = new Set<Interest>([
  "baglama",
  "turkish_folk_music",
  "folk_poets",
  "cem_culture",
  "solidarity",
  "art",
  "literature",
  "travel",
  "sports",
  "nature",
]);

const profilePhotos = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
];

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const sanitize = (value: unknown, maxLength: number) =>
  String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

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

const extractOutputText = (payload: Record<string, unknown>) => {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
};

const normalizeProfile = (profile: Partial<GeneratedProfile>): GeneratedProfile => ({
  name: sanitize(profile.name, 80) || "Ehlibyte Rehberi",
  age: clamp(Number(profile.age) || 30, 24, 45),
  city: sanitize(profile.city, 80) || "İstanbul",
  occupation: sanitize(profile.occupation, 120) || "Topluluk rehberi",
  bio:
    sanitize(profile.bio, 260) ||
    "Kültür, müzik ve sakin sohbetler etrafında tanışmayı seven bir rehber öneriyim.",
  hometown: sanitize(profile.hometown, 80) || "Sivas",
  favoriteSong: sanitize(profile.favoriteSong, 120) || "Dostum Dostum",
  favoritePoet: sanitize(profile.favoritePoet, 120) || "Aşık Veysel",
  culturalIdentity:
    profile.culturalIdentity === "alevi" ||
    profile.culturalIdentity === "close_to_alevi_culture" ||
    profile.culturalIdentity === "prefer_not_to_say"
      ? profile.culturalIdentity
      : "close_to_alevi_culture",
  cultureImportance:
    profile.cultureImportance === "very_important" ||
    profile.cultureImportance === "important" ||
    profile.cultureImportance === "somewhat_important" ||
    profile.cultureImportance === "not_important"
      ? profile.cultureImportance
      : "important",
  interests: Array.isArray(profile.interests)
    ? profile.interests.filter((interest): interest is Interest =>
        allowedInterests.has(interest as Interest),
      ).slice(0, 5)
    : ["turkish_folk_music", "cem_culture", "literature"],
});

const generateProfiles = async (currentProfile: Record<string, unknown>, limit: number) => {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();

  if (!apiKey) {
    return [];
  }

  const model = Deno.env.get("OPENAI_MATCH_MODEL")?.trim() || "gpt-5.5";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "starter_profiles",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["profiles"],
            properties: {
              profiles: {
                type: "array",
                minItems: limit,
                maxItems: limit,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "name",
                    "age",
                    "city",
                    "occupation",
                    "bio",
                    "hometown",
                    "favoriteSong",
                    "favoritePoet",
                    "culturalIdentity",
                    "cultureImportance",
                    "interests",
                  ],
                  properties: {
                    name: { type: "string" },
                    age: { type: "integer", minimum: 24, maximum: 45 },
                    city: { type: "string" },
                    occupation: { type: "string" },
                    bio: { type: "string", maxLength: 260 },
                    hometown: { type: "string" },
                    favoriteSong: { type: "string" },
                    favoritePoet: { type: "string" },
                    culturalIdentity: {
                      type: "string",
                      enum: ["alevi", "close_to_alevi_culture", "prefer_not_to_say"],
                    },
                    cultureImportance: {
                      type: "string",
                      enum: ["very_important", "important", "somewhat_important", "not_important"],
                    },
                    interests: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: {
                        type: "string",
                        enum: Array.from(allowedInterests),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "Ehlibyte için güvenli, saygılı, kültür odaklı starter öneri profilleri üret. Profil metinleri flört uygulamasına uygun, kısa ve doğal olsun. Gerçek kişi iddiası, iletişim bilgisi, cinsel içerik veya manipülatif ifade kullanma.",
        },
        {
          role: "user",
          content: JSON.stringify({
            currentUser: {
              city: currentProfile.city,
              hometown: currentProfile.hometown,
              culturalIdentity: currentProfile.culturalIdentity,
              cultureImportance: currentProfile.cultureImportance,
              interests: currentProfile.interests,
            },
            count: limit,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);
  const parsed = JSON.parse(outputText) as { profiles?: Partial<GeneratedProfile>[] };

  return (parsed.profiles ?? []).slice(0, limit).map(normalizeProfile);
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const userId = authData.user?.id;

    if (userError || !userId) {
      return json(401, { error: "Invalid session" });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const limit = clamp(Number(body.limit) || 3, 1, 3);

    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id,city,hometown,culturalIdentity,cultureImportance,interests")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return json(404, { error: "Profile not found" });
    }

    const { data: swipes } = await supabaseAdmin
      .from("swipes")
      .select("targetUserId")
      .eq("userId", userId);
    const actedIds = (swipes ?? [])
      .map((swipe) => swipe.targetUserId)
      .filter((id): id is string => typeof id === "string");

    let starterQuery = supabaseAdmin
      .from("users")
      .select("id")
      .neq("id", userId)
      .in("profileKind", ["starter", "ai_starter"])
      .eq("hasPassedEntryTest", true)
      .eq("hasCompletedOnboarding", true)
      .eq("isActive", true)
      .eq("isDiscoverable", true);

    if (actedIds.length > 0) {
      starterQuery = starterQuery.not("id", "in", `(${actedIds.map((id) => `"${id}"`).join(",")})`);
    }

    const { data: availableStarters } = await starterQuery.limit(limit);

    if ((availableStarters ?? []).length >= limit) {
      return json(200, { ok: true, generated: 0, reason: "starter_pool_available" });
    }

    const { count: existingAiCount } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("profileKind", "ai_starter");

    if ((existingAiCount ?? 0) >= 24) {
      return json(200, { ok: true, generated: 0, reason: "ai_pool_limit" });
    }

    const needed = Math.min(limit - (availableStarters ?? []).length, 3);
    const generatedProfiles = await generateProfiles(currentProfile, needed);

    for (const [index, profile] of generatedProfiles.entries()) {
      const email = `ai-starter-${crypto.randomUUID()}@ehlibyte.app`;
      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: crypto.randomUUID() + crypto.randomUUID(),
          email_confirm: true,
          app_metadata: { starter_guide: true, ai_starter: true },
          user_metadata: { name: profile.name, full_name: profile.name },
        });

      if (createUserError || !createdUser.user?.id) {
        throw new Error(createUserError?.message ?? "AI starter user could not be created");
      }

      const id = createdUser.user.id;
      const photoUri = profilePhotos[(Date.now() + index) % profilePhotos.length] ?? profilePhotos[0];

      const { error: insertError } = await supabaseAdmin.from("users").insert({
        id,
        email,
        name: profile.name,
        age: profile.age,
        city: profile.city,
        occupation: profile.occupation,
        bio: profile.bio,
        hometown: profile.hometown,
        favoriteSong: profile.favoriteSong,
        favoritePoet: profile.favoritePoet,
        culturalIdentity: profile.culturalIdentity,
        cultureImportance: profile.cultureImportance,
        interests: profile.interests,
        photos: [{ id: `ai-starter-photo-${id}`, uri: photoUri, isPrimary: true }],
        badges: ["community_member"],
        profileKind: "ai_starter",
        isPremium: false,
        isDiscoverable: true,
        hasPassedEntryTest: true,
        hasCompletedOnboarding: true,
        isActive: true,
      });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(id, true).catch(() => undefined);
        throw new Error(insertError.message);
      }
    }

    return json(200, { ok: true, generated: generatedProfiles.length });
  },
};
