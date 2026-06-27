import type {
  ActivityPage,
  ActivityPageOptions,
  ActivityRepository,
} from "@/domain/repositories/ActivityRepository";
import type {
  ActivityActor,
  ActivityType,
  UserActivity,
} from "@/domain/entities/Activity";
import { resolveProfilePhotoUri } from "@/shared/utils/resolveProfilePhotoUri";
import { supabase } from "./client";
import { createSupabaseRepositoryError } from "./errors";

type ActivityRow = {
  id: string;
  activity_type: ActivityType;
  title: string;
  body: string;
  post_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  match_id: string | null;
  read_at: string | null;
  created_at: string;
  actor:
    | {
        id: string;
        name: string;
        photos?: Array<{ uri?: string }> | null;
      }
    | Array<{
        id: string;
        name: string;
        photos?: Array<{ uri?: string }> | null;
      }>
    | null;
};

const activitySelect = `
  id,
  activity_type,
  title,
  body,
  post_id,
  comment_id,
  conversation_id,
  message_id,
  match_id,
  read_at,
  created_at,
  actor:users!user_activities_actor_id_fkey(id,name,photos)
`;

const mapActivity = (row: ActivityRow): UserActivity => {
  const actorRow = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const actor: ActivityActor | null = actorRow
    ? {
        id: actorRow.id,
        name: actorRow.name || "Kullanıcı",
        photoUri: resolveProfilePhotoUri(actorRow.photos?.[0]?.uri),
      }
    : null;

  return {
    id: row.id,
    type: row.activity_type,
    title: row.title,
    body: row.body,
    actor,
    postId: row.post_id,
    commentId: row.comment_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    matchId: row.match_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
};

export class SupabaseActivityRepository implements ActivityRepository {
  async listActivities(
    userId: string,
    options: ActivityPageOptions = {},
  ): Promise<ActivityPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    let query = supabase
      .from("user_activities")
      .select(activitySelect)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (options.unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      throw createSupabaseRepositoryError("Hareketler yüklenemedi.", error);
    }

    const rows = (data ?? []).slice(0, limit) as unknown as ActivityRow[];

    return {
      activities: rows.map(mapActivity),
      nextOffset: offset + rows.length,
      hasMore: (data ?? []).length > limit,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("user_activities")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (error) {
      throw createSupabaseRepositoryError(
        "Okunmamış hareket sayısı alınamadı.",
        error,
      );
    }

    return count ?? 0;
  }

  async markRead(userId: string, activityId: string): Promise<void> {
    const { error } = await supabase
      .from("user_activities")
      .update({ read_at: new Date().toISOString() })
      .eq("id", activityId)
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (error) {
      throw createSupabaseRepositoryError("Hareket güncellenemedi.", error);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_activities")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (error) {
      throw createSupabaseRepositoryError("Hareketler güncellenemedi.", error);
    }
  }

  subscribe(userId: string, onChange: () => void) {
    const channel = supabase
      .channel(`user-activities:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_activities",
          filter: `recipient_id=eq.${userId}`,
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }
}
