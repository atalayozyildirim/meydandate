import { createClient } from "npm:@supabase/supabase-js@2";

const FEED_IMAGE_BUCKET = "feed-post-images";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB guard

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

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseSecretKey = getSupabaseSecretKey();

    if (!supabaseUrl || !supabaseSecretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!url || !/^https?:\/\//i.test(url)) {
      return json(400, { error: "Invalid URL" });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false },
    });

    try {
      const res = await fetch(url, { method: "GET" });

      if (!res.ok) return json(400, { error: "Failed to download GIF" });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      if (!contentType.startsWith("image/")) {
        return json(400, { error: "URL is not an image" });
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        return json(400, { error: "Image too large" });
      }

      const ext = contentType.includes("gif") ? "gif" : contentType.split("/").pop() ?? "jpg";
      const key = `${crypto.randomUUID()}.${ext}`;
      const path = `gifs/${key}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(FEED_IMAGE_BUCKET)
        .upload(path, new Uint8Array(buffer), {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return json(500, { error: "Upload failed", details: uploadError.message });
      }

      const publicUrl = supabaseAdmin.storage.from(FEED_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;

      return json(200, { publicUrl });
    } catch (e) {
      return json(500, { error: "Unexpected error", details: String(e) });
    }
  },
};
