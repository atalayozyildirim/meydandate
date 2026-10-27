import type {
  Community,
  CommunityJoinRequest,
  CommunityMembership,
  CommunityPost,
} from "@/domain/entities/Community";
import type {
  CommunityRepository,
  CreateCommunityInput,
} from "@/domain/repositories/CommunityRepository";
import { supabase } from "./client";
import { createSupabaseRepositoryError } from "./errors";

type CommunityRow = {
  id: string;
  name: string;
  topic: string;
  description: string;
  city: string;
  is_private: boolean;
  creator_id: string;
  member_count: number;
  icon: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  community_id: string;
  user_id: string;
  role: "organizer" | "moderator" | "member";
  status: "pending" | "active" | "rejected";
  created_at: string;
};

type PostRow = {
  id: string;
  community_id: string;
  author_id: string;
  body: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string | null;
    avatar_url?: string | null;
    photos?: string[] | null;
  } | null;
};

type RequestRow = {
  community_id: string;
  user_id: string;
  status: "pending" | "active" | "rejected";
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    avatar_url?: string | null;
    photos?: string[] | null;
  } | null;
};

export class SupabaseCommunityRepository implements CommunityRepository {
  private async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }

  async getCommunities(city?: string): Promise<Community[]> {
    let query = supabase
      .from("communities")
      .select(
        "id, name, topic, description, city, is_private, creator_id, member_count, icon, cover_image_url, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (city && city !== "Tüm şehirler") {
      query = query.or(`city.eq.${city},city.eq.Tüm şehirler`);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw createSupabaseRepositoryError("Topluluklar yüklenemedi.", error);
    }

    const currentUserId = await this.getCurrentUserId();
    let userMemberships: Record<string, CommunityMembership> = {};

    if (currentUserId && rows && rows.length > 0) {
      const commIds = (rows as unknown as CommunityRow[]).map((r) => r.id);
      const { data: memRows } = await supabase
        .from("community_memberships")
        .select("community_id, user_id, role, status, created_at")
        .eq("user_id", currentUserId)
        .in("community_id", commIds);

      if (memRows) {
        for (const m of memRows as unknown as MembershipRow[]) {
          userMemberships[m.community_id] = {
            communityId: m.community_id,
            userId: m.user_id,
            role: m.role,
            status: m.status,
            joinedAt: m.created_at,
          };
        }
      }
    }

    return ((rows as unknown as CommunityRow[]) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      topic: row.topic,
      description: row.description,
      city: row.city,
      isPrivate: row.is_private,
      creatorId: row.creator_id,
      memberCount: row.member_count,
      icon: row.icon,
      imageUrl: row.cover_image_url ?? undefined,
      myMembership: userMemberships[row.id] ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getCommunityById(id: string): Promise<Community | null> {
    const { data: row, error } = await supabase
      .from("communities")
      .select(
        "id, name, topic, description, city, is_private, creator_id, member_count, icon, cover_image_url, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw createSupabaseRepositoryError("Topluluk yüklenemedi.", error);
    }
    if (!row) return null;

    const r = row as unknown as CommunityRow;
    const currentUserId = await this.getCurrentUserId();
    let myMembership: CommunityMembership | null = null;

    if (currentUserId) {
      const { data: memRow } = await supabase
        .from("community_memberships")
        .select("community_id, user_id, role, status, created_at")
        .eq("community_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (memRow) {
        const m = memRow as unknown as MembershipRow;
        myMembership = {
          communityId: m.community_id,
          userId: m.user_id,
          role: m.role,
          status: m.status,
          joinedAt: m.created_at,
        };
      }
    }

    return {
      id: r.id,
      name: r.name,
      topic: r.topic,
      description: r.description,
      city: r.city,
      isPrivate: r.is_private,
      creatorId: r.creator_id,
      memberCount: r.member_count,
      icon: r.icon,
      imageUrl: r.cover_image_url ?? undefined,
      myMembership,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async createCommunity(input: CreateCommunityInput): Promise<Community> {
    const currentUserId = await this.getCurrentUserId();
    if (!currentUserId) {
      throw new Error("Giriş yapmanız gerekmektedir.");
    }

    const { data: created, error } = await supabase
      .from("communities")
      .insert({
        name: input.name,
        topic: input.topic,
        description: input.description,
        city: input.city,
        is_private: input.isPrivate,
        icon: input.icon ?? "people-outline",
        cover_image_url: input.imageUrl ?? null,
        creator_id: currentUserId,
      })
      .select()
      .single();

    if (error || !created) {
      throw createSupabaseRepositoryError("Topluluk oluşturulamadı.", error);
    }

    const row = created as unknown as CommunityRow;

    // Automatically assign organizer membership
    await supabase.from("community_memberships").insert({
      community_id: row.id,
      user_id: currentUserId,
      role: "organizer",
      status: "active",
    });

    return {
      id: row.id,
      name: row.name,
      topic: row.topic,
      description: row.description,
      city: row.city,
      isPrivate: row.is_private,
      creatorId: row.creator_id,
      memberCount: 1,
      icon: row.icon,
      imageUrl: row.cover_image_url ?? undefined,
      myMembership: {
        communityId: row.id,
        userId: currentUserId,
        role: "organizer",
        status: "active",
        joinedAt: row.created_at,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateCommunity(
    id: string,
    input: Partial<CreateCommunityInput>,
  ): Promise<Community> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.name = input.name;
    if (input.topic !== undefined) payload.topic = input.topic;
    if (input.description !== undefined) payload.description = input.description;
    if (input.city !== undefined) payload.city = input.city;
    if (input.isPrivate !== undefined) payload.is_private = input.isPrivate;
    if (input.icon !== undefined) payload.icon = input.icon;
    if (input.imageUrl !== undefined) payload.cover_image_url = input.imageUrl;

    const { data: updated, error } = await supabase
      .from("communities")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !updated) {
      throw createSupabaseRepositoryError("Topluluk güncellenemedi.", error);
    }

    const comm = await this.getCommunityById(id);
    if (!comm) throw new Error("Topluluk bulunamadı.");
    return comm;
  }

  async deleteCommunity(id: string): Promise<void> {
    const { error } = await supabase.from("communities").delete().eq("id", id);
    if (error) {
      throw createSupabaseRepositoryError("Topluluk silinemedi.", error);
    }
  }

  async joinCommunity(
    id: string,
  ): Promise<{ status: "active" | "pending"; isPrivate: boolean }> {
    const { data, error } = await supabase.rpc("join_community", {
      target_community_id: id,
    });

    if (error) {
      throw createSupabaseRepositoryError("Topluluğa katılma başarısız oldu.", error);
    }

    const res = data as { status: "active" | "pending"; isPrivate: boolean };
    return {
      status: res.status,
      isPrivate: Boolean(res.isPrivate),
    };
  }

  async leaveCommunity(id: string): Promise<void> {
    const { error } = await supabase.rpc("leave_community", {
      target_community_id: id,
    });

    if (error) {
      throw createSupabaseRepositoryError("Topluluktan ayrılma başarısız oldu.", error);
    }
  }

  async getJoinRequests(communityId: string): Promise<CommunityJoinRequest[]> {
    const { data, error } = await supabase
      .from("community_memberships")
      .select(`
        community_id,
        user_id,
        status,
        created_at,
        user:users!community_memberships_user_id_fkey(id, name, avatar_url, photos)
      `)
      .eq("community_id", communityId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw createSupabaseRepositoryError("Katılım istekleri alınamadı.", error);
    }

    return ((data as unknown as RequestRow[]) ?? []).map((row) => ({
      communityId: row.community_id,
      userId: row.user_id,
      userName: row.user?.name ?? "Kullanıcı",
      userPhotoUri: row.user?.avatar_url ?? row.user?.photos?.[0] ?? null,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  async respondJoinRequest(
    communityId: string,
    userId: string,
    accept: boolean,
  ): Promise<void> {
    const { error } = await supabase.rpc("respond_community_join_request", {
      target_community_id: communityId,
      target_user_id: userId,
      accept,
    });

    if (error) {
      throw createSupabaseRepositoryError("Katılım isteği yanıtlanamadı.", error);
    }
  }

  async getCommunityPosts(communityId: string): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from("community_posts")
      .select(`
        id,
        community_id,
        author_id,
        body,
        image_urls,
        created_at,
        updated_at,
        author:users!community_posts_author_id_fkey(id, name, avatar_url, photos)
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) {
      throw createSupabaseRepositoryError("Topluluk paylaşımları alınamadı.", error);
    }

    return ((data as unknown as PostRow[]) ?? []).map((row) => ({
      id: row.id,
      communityId: row.community_id,
      authorId: row.author_id,
      authorName: row.author?.name ?? "Üye",
      authorPhotoUri: row.author?.avatar_url ?? row.author?.photos?.[0] ?? null,
      body: row.body,
      imagePaths: [],
      imageUrls: row.image_urls ?? [],
      isPinned: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createCommunityPost(
    communityId: string,
    body: string,
    imagePaths?: string[],
  ): Promise<CommunityPost> {
    const currentUserId = await this.getCurrentUserId();
    if (!currentUserId) throw new Error("Giriş yapmanız gerekmektedir.");

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        community_id: communityId,
        author_id: currentUserId,
        body,
        image_urls: imagePaths ?? [],
      })
      .select(`
        id,
        community_id,
        author_id,
        body,
        image_urls,
        created_at,
        updated_at,
        author:users!community_posts_author_id_fkey(id, name, avatar_url, photos)
      `)
      .single();

    if (error || !data) {
      throw createSupabaseRepositoryError("Paylaşım oluşturulamadı.", error);
    }

    const row = data as unknown as PostRow;
    return {
      id: row.id,
      communityId: row.community_id,
      authorId: row.author_id,
      authorName: row.author?.name ?? "Ben",
      authorPhotoUri: row.author?.avatar_url ?? null,
      body: row.body,
      imagePaths: [],
      imageUrls: row.image_urls ?? [],
      isPinned: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
