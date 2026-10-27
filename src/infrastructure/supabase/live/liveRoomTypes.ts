import type {
  LiveParticipantStageStatus,
  LiveRoomStatus,
  LiveVideoPlaybackStatus,
} from "@/domain/entities/LiveRoom";

export type LiveRoomRow = {
  id: string;
  title: string;
  description: string;
  status: LiveRoomStatus;
  voice_provider: "livekit" | "stream" | null;
  livekit_room_name: string | null;
  stream_url: string | null;
  video_playback_status?: LiveVideoPlaybackStatus | null;
  video_position_millis?: number | null;
  video_updated_at?: string | null;
  video_controlled_by?: string | null;
  started_at: string | null;
};

export type LiveParticipantRow = {
  room_id: string;
  user_id: string;
  role: string;
  stage_status: LiveParticipantStageStatus | null;
  is_muted: boolean | null;
  hand_raised_at?: string | null;
  joined_at: string;
};

export type LiveMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const liveRoomSelect = [
  "id",
  "title",
  "description",
  "status",
  "voice_provider",
  "livekit_room_name",
  "stream_url",
  "video_playback_status",
  "video_position_millis",
  "video_updated_at",
  "video_controlled_by",
  "started_at",
].join(",");

export const legacyLiveRoomSelect = [
  "id",
  "title",
  "description",
  "status",
  "voice_provider",
  "livekit_room_name",
  "stream_url",
  "started_at",
].join(",");

export const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  return ["code", "message", "details", "hint"]
    .map((field) => {
      const value = (error as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    })
    .join(" ");
};

export const isMissingLiveVideoColumnError = (error: unknown) =>
  /PGRST204|42703|schema cache|column/i.test(getErrorText(error)) &&
  /video_playback_status|video_position_millis|video_updated_at|video_controlled_by|hand_raised_at/i.test(
    getErrorText(error),
  );
