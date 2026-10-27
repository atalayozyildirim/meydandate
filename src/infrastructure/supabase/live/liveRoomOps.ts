import type {
  LiveChatMessage,
  LiveParticipant,
  LiveRoom,
} from "@/domain/entities/LiveRoom";
import type {
  ControlLiveVideoPayload,
  LiveKitJoinInfo,
  StartLiveRoomPayload,
} from "@/domain/repositories/LiveRoomRepository";
import type { User } from "@/domain/entities/User";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { supabase } from "../client";
import { createSupabaseRepositoryError } from "../errors";
import { mapSupabaseUser, publicUserColumns } from "../userMapper";
import {
  isMissingLiveVideoColumnError,
  legacyLiveRoomSelect,
  liveRoomSelect,
  type LiveMessageRow,
  type LiveParticipantRow,
  type LiveRoomRow,
} from "./liveRoomTypes";

export const notifyLiveRoomStarted = async (
  room: LiveRoom,
  accessToken?: string | null,
): Promise<void> => {
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
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export const getUsersById = async (
  userIds: string[],
): Promise<Map<string, User>> => {
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
};

export const fetchLiveRoom = async (roomId: string): Promise<LiveRoom> => {
  let { data: roomData, error: roomError } = await supabase
    .from("live_rooms")
    .select(liveRoomSelect)
    .eq("id", roomId)
    .maybeSingle();

  if (roomError && isMissingLiveVideoColumnError(roomError)) {
    const legacyResult = await supabase
      .from("live_rooms")
      .select(legacyLiveRoomSelect)
      .eq("id", roomId)
      .maybeSingle();

    roomData = legacyResult.data;
    roomError = legacyResult.error;
  }

  if (roomError) {
    throw createSupabaseRepositoryError("Canlı oda yüklenemedi", roomError);
  }

  const room = roomData as unknown as LiveRoomRow | null;

  if (!room) {
    throw new Error("Canlı oda bulunamadı");
  }

  const [
    initialParticipantResult,
    { data: messageData, error: messageError },
    { data: canManageData },
    currentUserId,
  ] = await Promise.all([
    supabase
      .from("live_room_participants")
      .select("room_id,user_id,role,stage_status,is_muted,hand_raised_at,joined_at")
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
    getCurrentUserId(),
  ]);

  let participantResult: {
    data: unknown[] | null;
    error: unknown;
  } = initialParticipantResult;

  if (
    participantResult.error &&
    isMissingLiveVideoColumnError(participantResult.error)
  ) {
    participantResult = await supabase
      .from("live_room_participants")
      .select("room_id,user_id,role,stage_status,is_muted,joined_at")
      .eq("room_id", roomId)
      .order("stage_status", { ascending: false })
      .order("joined_at", { ascending: false });
  }

  const { data: participantData, error: participantError } = participantResult;

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
  const usersById = await getUsersById([
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
        handRaisedAt: participant.hand_raised_at ?? null,
        photoUri: user?.photos?.[0]?.uri,
        isPremium: user?.isPremium ?? false,
        badges: user?.badges ?? [],
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
    videoSync: {
      status:
        room.video_playback_status ??
        (room.stream_url && room.status === "live" ? "playing" : "idle"),
      positionMillis: Math.max(0, room.video_position_millis ?? 0),
      updatedAt: room.video_updated_at ?? room.started_at,
      controlledBy: room.video_controlled_by ?? null,
    },
    participantCount: participants.length,
    speakerCount: participants.filter(
      (participant) => participant.stageStatus === "speaker",
    ).length,
    participants,
    messages,
    canManage: Boolean(canManageData),
    ...(room.started_at ? { startedAt: room.started_at } : {}),
  };
};

export const sendChatMessage = async (
  roomId: string,
  userId: string,
  body: string,
): Promise<void> => {
  const { error } = await supabase.from("live_room_messages").insert({
    room_id: roomId,
    sender_id: userId,
    body: body.trim(),
  });

  if (error) {
    throw createSupabaseRepositoryError("Sohbet mesajı gönderilemedi", error);
  }
};

export const reportChatMessage = async (
  roomId: string,
  messageId: string,
  reporterId: string,
): Promise<void> => {
  const { data: message, error: messageError } = await supabase
    .from("live_room_messages")
    .select("id,room_id,sender_id,body,created_at")
    .eq("room_id", roomId)
    .eq("id", messageId)
    .maybeSingle();

  if (messageError || !message) {
    throw createSupabaseRepositoryError(
      "Şikayet edilecek mesaj bulunamadı",
      messageError,
    );
  }

  const row = message as LiveMessageRow;

  if (row.sender_id === reporterId) {
    throw new Error("Kendi mesajını şikayet edemezsin.");
  }

  const safeBody = sanitizePlainText(row.body, 900);
  const { error } = await supabase.from("reports").insert({
    reporterId,
    reportedUserId: row.sender_id,
    category: "inappropriate_content",
    description: sanitizePlainText(
      `Meydan oda sohbeti şikayeti. Mesaj: ${safeBody}`,
      1500,
    ),
    evidence: [
      "type:live_room_message",
      `roomId:${roomId}`,
      `messageId:${row.id}`,
      `createdAt:${row.created_at}`,
      `message:${safeBody}`,
    ],
  });

  if (error) {
    throw createSupabaseRepositoryError("Mesaj şikayeti gönderilemedi", error);
  }
};

export const startRoomLive = async (
  roomId: string,
  payload: StartLiveRoomPayload,
  accessToken?: string | null,
): Promise<LiveRoom> => {
  const previousRoom = await fetchLiveRoom(roomId).catch(() => null);
  const { data, error } = await supabase.rpc("admin_start_live_room", {
    target_description: payload.description,
    target_room_id: roomId,
    target_stream_url: payload.streamUrl?.trim() ?? "",
    target_title: payload.title,
  });

  if (error || !data) {
    throw createSupabaseRepositoryError("Canlı yayın başlatılamadı", error);
  }

  const room = await fetchLiveRoom((data as LiveRoomRow).id);

  if (previousRoom?.status !== "live" && room.status === "live") {
    await notifyLiveRoomStarted(room, accessToken);
  }

  return room;
};

export const stopRoomLive = async (roomId: string): Promise<LiveRoom> => {
  const { data, error } = await supabase.rpc("admin_stop_live_room", {
    target_room_id: roomId,
  });

  if (error || !data) {
    throw createSupabaseRepositoryError("Canlı yayın durdurulamadı", error);
  }

  return fetchLiveRoom((data as LiveRoomRow).id);
};

export const controlPlayback = async (
  roomId: string,
  payload: ControlLiveVideoPayload,
): Promise<LiveRoom> => {
  const { data, error } = await supabase.rpc(
    "moderator_control_live_room_video",
    {
      target_position_millis: Math.max(
        0,
        Math.floor(payload.positionMillis),
      ),
      target_room_id: roomId,
      target_status: payload.status,
      target_stream_url: payload.streamUrl?.trim() ?? "",
    },
  );

  if (error || !data) {
    throw createSupabaseRepositoryError("Video kontrolü güncellenemedi", error);
  }

  return fetchLiveRoom((data as LiveRoomRow).id);
};

export const getLiveKitJoinInfo = async (
  roomId: string,
  accessToken?: string | null,
): Promise<LiveKitJoinInfo> => {
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
};
