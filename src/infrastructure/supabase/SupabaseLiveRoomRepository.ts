import type {
  LiveChatMessage,
  LiveParticipantStageStatus,
  LiveParticipant,
  LiveRoom,
  LiveRoomStatus,
} from "@/domain/entities/LiveRoom";
import type {
  LiveKitJoinInfo,
  LiveRoomRepository,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import type { User } from "@/domain/entities/User";
import { supabase } from "./client";
import { createSupabaseRepositoryError } from "./errors";
import { mapSupabaseUser, publicUserColumns } from "./userMapper";

type LiveRoomRow = {
  id: string;
  title: string;
  description: string;
  status: LiveRoomStatus;
  voice_provider: "livekit" | "stream" | null;
  livekit_room_name: string | null;
  stream_url: string | null;
  started_at: string | null;
};

type LiveParticipantRow = {
  room_id: string;
  user_id: string;
  role: string;
  stage_status: LiveParticipantStageStatus | null;
  is_muted: boolean | null;
  joined_at: string;
};

type LiveMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export class SupabaseLiveRoomRepository implements LiveRoomRepository {
  private async notifyLiveRoomStarted(
    room: LiveRoom,
    accessToken?: string | null,
  ): Promise<void> {
    if (!accessToken) {
      return;
    }

    await supabase.functions
      .invoke("send-admin-event-push", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          title: `${room.title} canli basladi`.slice(0, 80),
          body: (
            room.description.trim() ||
            "Meydanda yeni canli yayin basladi. Katilmak icin uygulamayi ac."
          ).slice(0, 180),
        },
      })
      .catch(() => undefined);
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  private async getUsersById(userIds: string[]): Promise<Map<string, User>> {
    const uniqueIds = Array.from(new Set(userIds));

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from("users")
      .select(publicUserColumns)
      .in("id", uniqueIds);

    if (error) {
      if (__DEV__) {
        console.info(
          createSupabaseRepositoryError(
            "Canlı oda kullanıcıları yüklenemedi",
            error,
          ).message,
        );
      }

      return new Map();
    }

    return new Map(
      (data || []).map((row) => {
        const user = mapSupabaseUser(row as unknown as Partial<User>);
        return [user.id, user];
      }),
    );
  }

  async getRoom(roomId: string): Promise<LiveRoom> {
    const { data: roomData, error: roomError } = await supabase
      .from("live_rooms")
      .select("id,title,description,status,voice_provider,livekit_room_name,stream_url,started_at")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) {
      throw createSupabaseRepositoryError("Canlı oda yüklenemedi", roomError);
    }

    const room = roomData as LiveRoomRow | null;

    if (!room) {
      throw new Error("Canlı oda bulunamadı");
    }

    const [
      { data: participantData, error: participantError },
      { data: messageData, error: messageError },
      { data: canManageData },
      currentUserId,
    ] = await Promise.all([
      supabase
        .from("live_room_participants")
        .select("room_id,user_id,role,stage_status,is_muted,joined_at")
        .eq("room_id", roomId)
        .order("stage_status", { ascending: false })
        .order("joined_at", { ascending: false }),
      supabase
        .from("live_room_messages")
        .select("id,room_id,sender_id,body,created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.rpc("is_moderator"),
      this.getCurrentUserId(),
    ]);

    if (participantError || messageError) {
      throw createSupabaseRepositoryError(
        "Canlı oda detayları yüklenemedi",
        participantError ?? messageError,
      );
    }

    const participantRows = (participantData || []) as LiveParticipantRow[];
    const messageRows = ((messageData || []) as LiveMessageRow[])
      .slice()
      .reverse();
    const usersById = await this.getUsersById([
      ...participantRows.map((participant) => participant.user_id),
      ...messageRows.map((message) => message.sender_id),
    ]);

    const participants: LiveParticipant[] = participantRows.map(
      (participant) => {
        const user = usersById.get(participant.user_id);

        return {
          id: participant.user_id,
          name: user?.name ?? "Üye",
          role: participant.role,
          stageStatus: participant.stage_status ?? "listener",
          isMuted: participant.is_muted ?? true,
          photoUri: user?.photos?.[0]?.uri,
          isPremium: user?.isPremium ?? false,
          isCurrentUser: participant.user_id === currentUserId,
        };
      },
    );

    const messages: LiveChatMessage[] = messageRows.map((message) => {
      const sender = usersById.get(message.sender_id);

      return {
        id: message.id,
        roomId: message.room_id,
        senderId: message.sender_id,
        senderName: sender?.name ?? "Üye",
        senderPhotoUri: sender?.photos?.[0]?.uri,
        senderIsPremium: sender?.isPremium ?? false,
        body: message.body,
        createdAt: message.created_at,
        isCurrentUser: message.sender_id === currentUserId,
      };
    });

    return {
      id: room.id,
      title: room.title,
      description: room.description,
      status: room.status,
      voiceProvider: room.voice_provider ?? (room.stream_url ? "stream" : "livekit"),
      ...(room.livekit_room_name ? { livekitRoomName: room.livekit_room_name } : {}),
      ...(room.stream_url ? { streamUrl: room.stream_url } : {}),
      participantCount: participants.length,
      speakerCount: participants.filter(
        (participant) => participant.stageStatus === "speaker",
      ).length,
      participants,
      messages,
      canManage: Boolean(canManageData),
      ...(room.started_at ? { startedAt: room.started_at } : {}),
    };
  }

  async joinRoom(roomId: string, userId: string): Promise<LiveRoom> {
    const { error } = await supabase.from("live_room_participants").upsert(
      {
        room_id: roomId,
        user_id: userId,
        role: "Dinleyici",
        stage_status: "listener",
        is_muted: true,
      },
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    );

    if (error) {
      throw createSupabaseRepositoryError("Canlı odaya katılınamadı", error);
    }

    return this.getRoom(roomId);
  }

  async leaveRoom(roomId: string, userId: string): Promise<LiveRoom> {
    const { error } = await supabase
      .from("live_room_participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      throw createSupabaseRepositoryError("Canlı odadan çıkılamadı", error);
    }

    return this.getRoom(roomId);
  }

  async sendMessage(
    roomId: string,
    userId: string,
    body: string,
  ): Promise<LiveRoom> {
    const { error } = await supabase.from("live_room_messages").insert({
      room_id: roomId,
      sender_id: userId,
      body: body.trim(),
    });

    if (error) {
      throw createSupabaseRepositoryError("Sohbet mesajı gönderilemedi", error);
    }

    return this.getRoom(roomId);
  }

  async startRoom(
    roomId: string,
    _userId: string,
    payload: StartLiveRoomPayload,
    accessToken?: string | null,
  ): Promise<LiveRoom> {
    const previousRoom = await this.getRoom(roomId).catch(() => null);
    const { data, error } = await supabase.rpc("admin_start_live_room", {
      target_description: payload.description,
      target_room_id: roomId,
      target_stream_url: payload.streamUrl?.trim() ?? "",
      target_title: payload.title,
    });

    if (error || !data) {
      throw createSupabaseRepositoryError("Canlı yayın başlatılamadı", error);
    }

    const room = await this.getRoom((data as LiveRoomRow).id);

    if (previousRoom?.status !== "live" && room.status === "live") {
      await this.notifyLiveRoomStarted(room, accessToken);
    }

    return room;
  }

  async stopRoom(roomId: string): Promise<LiveRoom> {
    const { data, error } = await supabase.rpc("admin_stop_live_room", {
      target_room_id: roomId,
    });

    if (error || !data) {
      throw createSupabaseRepositoryError("Canlı yayın durdurulamadı", error);
    }

    return this.getRoom((data as LiveRoomRow).id);
  }

  async getLiveKitToken(
    roomId: string,
    accessToken?: string | null,
  ): Promise<LiveKitJoinInfo> {
    const { data, error } = await supabase.functions.invoke("livekit-token", {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
      body: { roomId },
    });

    if (error || !data) {
      throw createSupabaseRepositoryError("LiveKit token alınamadı", error);
    }

    return data as LiveKitJoinInfo;
  }

  async setParticipantStage(
    roomId: string,
    targetUserId: string,
    stageStatus: LiveParticipantStageStatus,
  ): Promise<LiveRoom> {
    const { error } = await supabase.rpc("moderator_set_live_participant_stage", {
      target_room_id: roomId,
      target_stage_status: stageStatus,
      target_user_id: targetUserId,
    });

    if (error) {
      throw createSupabaseRepositoryError("Sahne durumu güncellenemedi", error);
    }

    return this.getRoom(roomId);
  }
}
