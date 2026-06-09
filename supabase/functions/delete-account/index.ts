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

export default {
  async fetch(req: Request) {
    if (req.method !== "DELETE") {
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
    const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
    const userId = data.user?.id;

    if (userError || !userId) {
      return json(401, { error: "Invalid session" });
    }

    const { error: profileError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (profileError) {
      return json(500, { error: profileError.message });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, true);

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, { ok: true });
  },
};
