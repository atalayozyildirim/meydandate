import type {
  LikeAction,
  LikedMeProfile,
  Match,
  UndoSwipeResult,
} from "@/domain/entities/Match";
import type { SwipeResult } from "@/domain/repositories/MatchRepository";
import { supabase } from "../client";
import { mapSupabaseUser } from "../userMapper";
import type {
  LikedMeRow,
  RecordSwipeRow,
  UndoSwipeRow,
} from "./matchTypes";

export const notifyMatchEvent = async (
  targetUserId: string,
  action: LikeAction,
  matchId?: string | null,
) => {
  if (action === "pass") {
    return;
  }

  const { error } = await supabase.functions.invoke("send-match-event-push", {
    body: {
      targetUserId,
      action,
      matchId: matchId ?? null,
    },
  });

  if (error && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("Match bildirimi gönderilemedi", error.message);
  }
};

export const performSwipe = async (
  _userId: string,
  targetUserId: string,
  action: LikeAction,
  getMatchById: (matchId: string) => Promise<Match>,
): Promise<SwipeResult> => {
  const { data, error: swipeError } = await supabase
    .rpc("record_swipe", {
      target_user_id: targetUserId,
      next_action: action,
    })
    .maybeSingle();

  const result = data as RecordSwipeRow | null;

  if (swipeError || !result) {
    if (
      swipeError &&
      __DEV__ &&
      !/Requester profile is not eligible/i.test(swipeError.message)
    ) {
      // eslint-disable-next-line no-console
      console.info("record_swipe hatası", swipeError.message);
    }

    const message = swipeError?.message ?? "";

    if (/Swipe target unavailable|Swipe target not found/i.test(message)) {
      throw new Error("Bu profil artık görüntülenemiyor.");
    }

    if (/Requester profile is not eligible/i.test(message)) {
      throw new Error("Profilini tamamlayıp Keşfet'e tekrar gir.");
    }

    if (/Requester profile is inactive/i.test(message)) {
      throw new Error("Hesabın Keşfet işlemleri için aktif değil.");
    }

    if (/Requester profile not found/i.test(message)) {
      throw new Error("Oturum profilin yenilenemedi. Çıkış yapıp tekrar gir.");
    }

    throw new Error("Swipe kaydedilemedi. Lütfen tekrar dene.");
  }

  void notifyMatchEvent(targetUserId, result.action, result.match_id);

  if (result.match_id) {
    return {
      action: result.action,
      match: await getMatchById(result.match_id),
      conversationId: result.conversation_id ?? undefined,
    };
  }

  return {
    action: result.action,
    conversationId: result.conversation_id ?? undefined,
  };
};

export const undoSwipe = async (
  _userId: string,
): Promise<UndoSwipeResult> => {
  const { data, error } = await supabase
    .rpc("undo_last_swipe")
    .maybeSingle();
  const result = data as UndoSwipeRow | null;

  if (error || !result) {
    throw new Error(
      error?.message === "Premium required"
        ? "Geri al Premium ile kullanılabilir."
        : "Son işlem geri alınamadı.",
    );
  }

  return {
    targetUserId: result.target_user_id,
    action: result.action,
    matchRemoved: Boolean(result.match_removed),
  };
};

export const fetchLikedMeProfiles = async (
  _userId: string,
): Promise<LikedMeProfile[]> => {
  const { data, error } = await supabase.rpc("list_liked_me_profiles", {
    limit_count: 24,
  });

  if (error) {
    throw new Error(
      error.message === "Premium required"
        ? "Seni beğenenleri görmek Premium ile kullanılabilir."
        : "Seni beğenenler yüklenemedi.",
    );
  }

  return ((data ?? []) as LikedMeRow[]).flatMap((row) => {
    if (row.likeAction !== "like" && row.likeAction !== "super_like") {
      return [];
    }

    return [
      {
        user: mapSupabaseUser(row),
        action: row.likeAction,
        likedAt: row.likedAt ?? new Date(0).toISOString(),
      },
    ];
  });
};
