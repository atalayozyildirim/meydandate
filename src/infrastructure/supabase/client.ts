import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/infrastructure/config/env";

let client: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
};

// Mock servislerle calisan dev build'lerde import aninda Supabase key zorunlu olmasin.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = (getSupabaseClient() as any)[property];
    return typeof value === "function" ? value.bind(getSupabaseClient()) : value;
  },
});
