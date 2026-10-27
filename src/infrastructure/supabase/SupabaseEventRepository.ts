import type { CommunityEvent, EventCategory } from "@/domain/entities/Event";
import type {
  CreateEventInput,
  EventFilter,
  EventRepository,
} from "@/domain/repositories/EventRepository";
import { supabase } from "./client";
import { createSupabaseRepositoryError } from "./errors";

type EventRow = {
  id: string;
  community_id: string | null;
  organizer_id: string;
  title: string;
  category: EventCategory;
  city: string;
  district: string;
  place: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  current_participants: number;
  image_url: string | null;
  description: string;
  accessibility: string;
  bring: string;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  organizer?: {
    id: string;
    name: string | null;
    avatar_url?: string | null;
    photos?: string[] | null;
  } | null;
};

export class SupabaseEventRepository implements EventRepository {
  private async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }

  async getEvents(filter?: EventFilter): Promise<CommunityEvent[]> {
    let query = supabase
      .from("community_events")
      .select(`
        id,
        community_id,
        organizer_id,
        title,
        category,
        city,
        district,
        place,
        starts_at,
        ends_at,
        capacity,
        current_participants,
        image_url,
        description,
        accessibility,
        bring,
        is_cancelled,
        created_at,
        updated_at,
        organizer:users!community_events_organizer_id_fkey(id, name, avatar_url, photos)
      `)
      .order("starts_at", { ascending: true });

    if (filter?.city && filter.city !== "Tüm şehirler") {
      query = query.or(`city.eq.${filter.city},city.eq.Tüm şehirler`);
    }

    if (filter?.category && filter.category !== "Tümü") {
      query = query.eq("category", filter.category);
    }

    if (filter?.upcomingOnly !== false) {
      query = query.gte("ends_at", new Date().toISOString());
    }

    const { data: rows, error } = await query;
    if (error) {
      throw createSupabaseRepositoryError("Etkinlikler yüklenemedi.", error);
    }

    const currentUserId = await this.getCurrentUserId();
    const joinedSet = new Set<string>();

    if (currentUserId && rows && rows.length > 0) {
      const eventIds = (rows as unknown as EventRow[]).map((r) => r.id);
      const { data: partRows } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("user_id", currentUserId)
        .eq("status", "confirmed")
        .in("event_id", eventIds);

      if (partRows) {
        for (const p of partRows as { event_id: string }[]) {
          joinedSet.add(p.event_id);
        }
      }
    }

    return ((rows as unknown as EventRow[]) ?? []).map((row) => ({
      id: row.id,
      communityId: row.community_id,
      organizerId: row.organizer_id,
      organizerName: row.organizer?.name ?? "Organizatör",
      title: row.title,
      category: row.category,
      city: row.city,
      district: row.district,
      place: row.place,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      capacity: row.capacity,
      currentParticipants: row.current_participants,
      imageUrl: row.image_url ?? undefined,
      description: row.description,
      accessibility: row.accessibility,
      bring: row.bring,
      isCancelled: row.is_cancelled,
      isJoinedByMe: joinedSet.has(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getEventById(id: string): Promise<CommunityEvent | null> {
    const { data: row, error } = await supabase
      .from("community_events")
      .select(`
        id,
        community_id,
        organizer_id,
        title,
        category,
        city,
        district,
        place,
        starts_at,
        ends_at,
        capacity,
        current_participants,
        image_url,
        description,
        accessibility,
        bring,
        is_cancelled,
        created_at,
        updated_at,
        organizer:users!community_events_organizer_id_fkey(id, name, avatar_url, photos)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw createSupabaseRepositoryError("Etkinlik yüklenemedi.", error);
    }
    if (!row) return null;

    const r = row as unknown as EventRow;
    const currentUserId = await this.getCurrentUserId();
    let isJoinedByMe = false;

    if (currentUserId) {
      const { data: part } = await supabase
        .from("event_participants")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", currentUserId)
        .eq("status", "confirmed")
        .maybeSingle();

      isJoinedByMe = Boolean(part);
    }

    return {
      id: r.id,
      communityId: r.community_id,
      organizerId: r.organizer_id,
      organizerName: r.organizer?.name ?? "Organizatör",
      title: r.title,
      category: r.category,
      city: r.city,
      district: r.district,
      place: r.place,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      capacity: r.capacity,
      currentParticipants: r.current_participants,
      imageUrl: r.image_url ?? undefined,
      description: r.description,
      accessibility: r.accessibility,
      bring: r.bring,
      isCancelled: r.is_cancelled,
      isJoinedByMe,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async createEvent(input: CreateEventInput): Promise<CommunityEvent> {
    const currentUserId = await this.getCurrentUserId();
    if (!currentUserId) throw new Error("Giriş yapmanız gerekmektedir.");

    const { data, error } = await supabase
      .from("community_events")
      .insert({
        community_id: input.communityId ?? null,
        organizer_id: currentUserId,
        title: input.title,
        category: input.category,
        city: input.city,
        district: input.district ?? "",
        place: input.place ?? "",
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        capacity: input.capacity,
        description: input.description ?? "",
        accessibility: input.accessibility ?? "",
        bring: input.bring ?? "",
      })
      .select(`
        id,
        community_id,
        organizer_id,
        title,
        category,
        city,
        district,
        place,
        starts_at,
        ends_at,
        capacity,
        current_participants,
        image_url,
        description,
        accessibility,
        bring,
        is_cancelled,
        created_at,
        updated_at
      `)
      .single();

    if (error || !data) {
      throw createSupabaseRepositoryError("Etkinlik oluşturulamadı.", error);
    }

    const r = data as unknown as EventRow;
    return {
      id: r.id,
      communityId: r.community_id,
      organizerId: r.organizer_id,
      organizerName: "Ben",
      title: r.title,
      category: r.category,
      city: r.city,
      district: r.district,
      place: r.place,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      capacity: r.capacity,
      currentParticipants: 0,
      imageUrl: r.image_url ?? undefined,
      description: r.description,
      accessibility: r.accessibility,
      bring: r.bring,
      isCancelled: r.is_cancelled,
      isJoinedByMe: false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async cancelEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from("community_events")
      .update({ is_cancelled: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw createSupabaseRepositoryError("Etkinlik iptal edilemedi.", error);
    }
  }

  async joinEvent(
    id: string,
  ): Promise<{ status: "confirmed"; participantsCount: number; capacity: number }> {
    const { data, error } = await supabase.rpc("join_community_event", {
      target_event_id: id,
    });

    if (error) {
      throw createSupabaseRepositoryError("Etkinliğe katılım başarısız oldu.", error);
    }

    const res = data as {
      status: "confirmed";
      participantsCount: number;
      capacity: number;
    };
    return {
      status: res.status,
      participantsCount: res.participantsCount,
      capacity: res.capacity,
    };
  }

  async cancelParticipation(
    id: string,
  ): Promise<{ status: "cancelled"; participantsCount: number }> {
    const { data, error } = await supabase.rpc("cancel_event_participation", {
      target_event_id: id,
    });

    if (error) {
      throw createSupabaseRepositoryError("Etkinlik katılımı iptal edilemedi.", error);
    }

    const res = data as {
      status: "cancelled";
      participantsCount: number;
    };
    return {
      status: res.status,
      participantsCount: res.participantsCount,
    };
  }
}
