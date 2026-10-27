import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/infrastructure/config/env";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";

let client: SupabaseClient | null = null;
const authStorage = new SecureStorageService();

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
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        storageKey: "ehlibyte-supabase-auth-v2",
        storage: {
          getItem: (key) => authStorage.getItem(key),
          setItem: (key, value) => authStorage.setItem(key, value),
          removeItem: (key) => authStorage.deleteItem(key),
        },
      },
    });
  }

  return client;
};

// İstemci tarafında Supabase istemcisine tembel (lazy) erişim sağlar.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = (getSupabaseClient() as any)[property];
    return typeof value === "function" ? value.bind(getSupabaseClient()) : value;
  },
});
