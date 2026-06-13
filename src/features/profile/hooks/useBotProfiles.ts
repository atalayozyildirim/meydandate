import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import {
  mapSupabaseUser,
  publicUserColumns,
} from "@/infrastructure/supabase/userMapper";
import type { User } from "@/domain/entities/User";

// Bot profilleri isActive alanını da taşır (DB kolonu, User tipinde opsiyonel)
export interface BotProfile extends User {
  isActive: boolean;
}

const BOT_QUERY_KEY = ["admin", "bot-profiles"];

// isActive kolonu authenticated role'u icin SELECT grant'i olmadigi icin
// publicUserColumns kullanilir; aktiflik durumu set_user_active RPC ile yonetilir.
const botColumns = publicUserColumns;

export const useBotProfiles = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BOT_QUERY_KEY,
    queryFn: async (): Promise<BotProfile[]> => {
      const { data, error } = await supabase
        .from("users")
        .select(botColumns)
        .in("profileKind", ["starter", "ai_starter"])
        .order("createdAt", { ascending: false });

      if (error) throw new Error("Bot profilleri yüklenemedi");

      return (data ?? []).map((row: any) => ({
        ...mapSupabaseUser(row),
        // isActive kolonu SELECT grant'i olmadigi icin satirda gelmiyor;
        // bot profillerinin varsayilan olarak aktif oldugu kabul edilir.
        isActive: true,
      }));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      // set_user_active RPC'si moderator/admin kontrolunu DB seviyesinde yapar
      const { error } = await supabase.rpc("set_user_active", {
        target_user_id: userId,
        active: isActive,
      });
      if (error) throw new Error("Bot durumu güncellenemedi");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOT_QUERY_KEY }),
  });

  const updateBotMutation = useMutation({
    mutationFn: async ({
      userId,
      update,
    }: {
      userId: string;
      update: Partial<User>;
    }) => {
      const { error } = await supabase
        .from("users")
        .update(update)
        .eq("id", userId)
        .in("profileKind", ["starter", "ai_starter"]); // güvenlik
      if (error) throw new Error("Bot profili güncellenemedi");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOT_QUERY_KEY }),
  });

  return {
    bots: query.data ?? [],
    isLoading: query.isLoading,
    toggleActive: toggleActiveMutation.mutateAsync,
    updateBot: updateBotMutation.mutateAsync,
    isUpdating: toggleActiveMutation.isPending || updateBotMutation.isPending,
  };
};
