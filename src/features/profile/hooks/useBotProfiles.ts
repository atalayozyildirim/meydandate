import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import {
  mapSupabaseUser,
  publicUserColumns,
} from "@/infrastructure/supabase/userMapper";
import type {
  CulturalIdentity,
  CultureImportance,
  Interest,
  ProfileKind,
  User,
} from "@/domain/entities/User";

// Bot profilleri isActive alanını da taşır (DB kolonu, User tipinde opsiyonel)
export interface BotProfile extends User {
  isActive: boolean;
}

export interface CreateBotProfilePayload {
  name: string;
  age: number;
  city: string;
  bio: string;
  photoUri?: string;
  occupation?: string;
  hometown?: string;
  favoriteSong?: string;
  favoritePoet?: string;
  culturalIdentity: CulturalIdentity;
  cultureImportance: CultureImportance;
  interests: Interest[];
  profileKind: Exclude<ProfileKind, "member">;
  isActive: boolean;
}

const BOT_QUERY_KEY = ["admin", "bot-profiles"];

const botColumns = `${publicUserColumns},isActive`;

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
        isActive: row.isActive === true,
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

  const createBotMutation = useMutation({
    mutationFn: async (payload: CreateBotProfilePayload) => {
      const { data, error } = await supabase
        .rpc("admin_create_bot_profile", {
          bot_name: payload.name,
          bot_age: payload.age,
          bot_city: payload.city,
          bot_bio: payload.bio,
          bot_photo_uri: payload.photoUri ?? null,
          bot_occupation: payload.occupation ?? null,
          bot_hometown: payload.hometown ?? null,
          bot_favorite_song: payload.favoriteSong ?? null,
          bot_favorite_poet: payload.favoritePoet ?? null,
          bot_cultural_identity: payload.culturalIdentity,
          bot_culture_importance: payload.cultureImportance,
          bot_interests: payload.interests,
          bot_profile_kind: payload.profileKind,
          bot_is_active: payload.isActive,
        })
        .maybeSingle();

      if (error) {
        throw new Error(`Bot profili oluşturulamadı: ${error.message}`);
      }

      if (!data) throw new Error("Bot profili oluşturulamadı: kayıt dönmedi");

      return {
        ...mapSupabaseUser(data as Partial<User>),
        isActive: payload.isActive,
      };
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
    createBot: createBotMutation.mutateAsync,
    updateBot: updateBotMutation.mutateAsync,
    isUpdating: toggleActiveMutation.isPending || updateBotMutation.isPending,
    isCreatingBot: createBotMutation.isPending,
  };
};
