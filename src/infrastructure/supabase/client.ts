import { createClient } from "@supabase/supabase-js";
import { env } from "@/infrastructure/config/env";

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
