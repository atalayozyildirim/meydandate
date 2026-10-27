import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { LiveParticipant, LiveRoom } from "@/domain/entities/LiveRoom";
import { SupabaseLiveRoomRepository } from "@/infrastructure/supabase/SupabaseLiveRoomRepository";
import { supabase } from "@/infrastructure/supabase/client";
import {
  Button,
  Copy,
  Empty,
  Heading,
  Icon,
  IconButton,
  colors,
} from "../ui";
import { spaceStyles as styles } from "./components/spaceStyles";
import { SpaceStageGrid } from "./components/SpaceStageGrid";
import { SpaceListenersGrid } from "./components/SpaceListenersGrid";
import { SpaceAdminEditModal } from "./components/SpaceAdminEditModal";
import { SpaceHandRaiseQueue } from "./components/SpaceHandRaiseQueue";

const liveRepo = new SupabaseLiveRoomRepository();

interface SpaceScreenProps {
  roomId?: string;
  currentUserId?: string;
  onLeave: () => void;
  notify?: (message: string) => void;
}

export function SpaceScreen({
  roomId = "meydan-space-main",
  currentUserId: propUserId,
  onLeave,
  notify,
}: SpaceScreenProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    propUserId ?? null,
  );
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Admin edit title modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Resolve user id & admin role
  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (uid) {
        setCurrentUserId(uid);
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("userId", uid)
          .maybeSingle();

        if (roleRow?.role === "admin" || roleRow?.role === "moderator") {
          setIsAdmin(true);
        }
      }
    });
  }, []);

  const loadRoom = useCallback(async () => {
    try {
      const r = await liveRepo.getRoom(roomId);
      setRoom(r);
      if (r) {
        setEditTitle(r.title);
        setEditDesc(r.description ?? "");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Oda bilgisi alınamadı.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
    const interval = setInterval(loadRoom, 4000);
    return () => clearInterval(interval);
  }, [loadRoom]);

  const currentParticipant = room?.participants.find(
    (p) => p.id === currentUserId || p.isCurrentUser,
  );
  const isSpeaker =
    currentParticipant?.stageStatus === "speaker" ||
    currentParticipant?.role === "Yonetici";
  const isMuted = currentParticipant?.isMuted ?? true;
  const isHandRaised = Boolean(currentParticipant?.handRaisedAt);

  const speakers =
    room?.participants.filter(
      (p) => p.stageStatus === "speaker" || p.role === "Yonetici",
    ) ?? [];
  const listeners =
    room?.participants.filter(
      (p) => p.stageStatus !== "speaker" && p.role !== "Yonetici",
    ) ?? [];
  const handRaisers = listeners.filter((p) => Boolean(p.handRaisedAt));

  const handleToggleMute = async () => {
    if (!currentParticipant) return;
    setActionLoading(true);
    try {
      setErrorNotice(null);
      await liveRepo.setParticipantMuted(roomId, currentParticipant.id, !isMuted);
      void loadRoom();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Mikrofon durumu güncellenemedi.";
      setErrorNotice(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleHandRaise = async () => {
    if (!currentParticipant) return;
    setActionLoading(true);
    try {
      setErrorNotice(null);
      if (isHandRaised) {
        await liveRepo.setHandRaised(roomId, currentParticipant.id, false);
        notify?.("El kaldırma isteği iptal edildi.");
      } else {
        await liveRepo.setHandRaised(roomId, currentParticipant.id, true);
        notify?.("Söz hakkı istendi.");
      }
      void loadRoom();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "İşlem başarısız.";
      setErrorNotice(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteToSpeaker = async (userId: string) => {
    try {
      setErrorNotice(null);
      await liveRepo.setParticipantStage(roomId, userId, "speaker");
      void loadRoom();
      notify?.("Kullanıcı sahneye davet edildi.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sahneye alma başarısız.";
      setErrorNotice(message);
    }
  };

  const handleDemoteToListener = async (userId: string) => {
    try {
      setErrorNotice(null);
      await liveRepo.setParticipantStage(roomId, userId, "listener");
      void loadRoom();
      notify?.("Kullanıcı dinleyiciye alındı.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Dinleyiciye alma başarısız.";
      setErrorNotice(message);
    }
  };

  const handleMuteSpeaker = async (userId: string) => {
    try {
      setErrorNotice(null);
      await liveRepo.setParticipantMuted(roomId, userId, true);
      void loadRoom();
      notify?.("Konuşmacı susturuldu.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Susturma başarısız.";
      setErrorNotice(message);
    }
  };

  const handleKickParticipant = async (userId: string) => {
    try {
      setErrorNotice(null);
      await liveRepo.removeParticipant(roomId, userId);
      void loadRoom();
      notify?.("Kullanıcı odadan çıkarıldı.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Kullanıcı çıkarılamadı.";
      setErrorNotice(message);
    }
  };

  const handleUpdateTitle = async () => {
    try {
      setErrorNotice(null);
      await supabase.rpc("admin_update_live_room_title", {
        target_room_id: roomId,
        target_title: editTitle.trim(),
        target_description: editDesc.trim(),
      });
      setShowEditModal(false);
      void loadRoom();
      notify?.("Oda bilgileri güncellendi.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Güncelleme başarısız.";
      setErrorNotice(message);
    }
  };

  const handleStopRoom = async () => {
    try {
      setErrorNotice(null);
      await liveRepo.stopRoom(roomId);
      void loadRoom();
      notify?.("Canlı yayın sonlandırıldı.");
      setTimeout(onLeave, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Oda sonlandırılamadı.";
      setErrorNotice(message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.wine} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.centerContainer}>
        <Empty
          title="Oda bulunamadı"
          description="Canlı yayın odası mevcut değil."
          action="Geri Dön"
          onPress={onLeave}
        />
      </View>
    );
  }

  const isRoomLive = room.status === "live";

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <IconButton name="close" label="Ayrıl" onPress={onLeave} />

        <View style={styles.navCenter}>
          <View style={styles.liveIndicatorRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isRoomLive ? "#E53935" : colors.muted },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                { color: isRoomLive ? "#E53935" : colors.muted },
              ]}
            >
              {isRoomLive ? "MEYDAN CANLI" : "YAYIN KAPALI"}
            </Text>
          </View>
          <Text style={styles.navTitle} numberOfLines={1}>
            {room.title}
          </Text>
        </View>

        {isAdmin ? (
          <IconButton
            name="settings-outline"
            label="Ayarlar"
            onPress={() => setShowEditModal(true)}
          />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Error banner */}
      {errorNotice && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={18} color={colors.wine} />
          <Copy small style={{ color: colors.wine, flex: 1 }}>
            {errorNotice}
          </Copy>
          <IconButton
            name="close"
            label="Kapat"
            onPress={() => setErrorNotice(null)}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Room Header Card */}
        <View style={styles.roomCard}>
          <Heading large style={styles.roomHeading}>
            {room.title}
          </Heading>
          {Boolean(room.description) && (
            <Copy muted style={styles.roomDesc}>
              {room.description}
            </Copy>
          )}

          <View style={styles.participantCountRow}>
            <Icon name="people" size={16} color={colors.wine} />
            <Text style={styles.participantCountText}>
              {room.participants.length} kişi meydanda
            </Text>
          </View>
        </View>

        {/* Admin hand-raise approval queue */}
        {isAdmin && (
          <SpaceHandRaiseQueue
            handRaisers={handRaisers}
            onPromoteToSpeaker={handlePromoteToSpeaker}
          />
        )}

        {/* Section: Speakers (Sahne) */}
        <SpaceStageGrid
          speakers={speakers}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onMuteSpeaker={handleMuteSpeaker}
          onDemoteToListener={handleDemoteToListener}
        />

        {/* Section: Listeners (Dinleyiciler) */}
        <SpaceListenersGrid
          listeners={listeners}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onKickParticipant={handleKickParticipant}
        />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {isSpeaker ? (
          <View style={styles.speakerControlsRow}>
            <Button
              onPress={handleToggleMute}
              disabled={actionLoading}
              icon={isMuted ? "mic-off" : "mic"}
              style={[
                styles.micToggleBtn,
                isMuted ? styles.micBtnMuted : styles.micBtnOpen,
              ]}
            >
              {isMuted ? "Mikrofonu Aç" : "Sustur"}
            </Button>

            {isAdmin && (
              <Button
                secondary
                onPress={handleStopRoom}
                style={styles.endRoomBtn}
              >
                Odayı Kapat
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.listenerControlsRow}>
            <View style={{ flex: 1 }}>
              <Copy small muted>
                {isHandRaised
                  ? "Söz hakkı bekliyorsun..."
                  : "Dinleyici olarak katıldın."}
              </Copy>
            </View>

            <Button
              secondary={isHandRaised}
              onPress={handleToggleHandRaise}
              disabled={actionLoading}
              icon={isHandRaised ? "hand-right" : "hand-right-outline"}
            >
              {isHandRaised ? "İsteği İndir" : "Söz İste"}
            </Button>
          </View>
        )}
      </View>

      {/* Admin Edit Modal */}
      <SpaceAdminEditModal
        visible={showEditModal}
        title={editTitle}
        description={editDesc}
        onChangeTitle={setEditTitle}
        onChangeDescription={setEditDesc}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateTitle}
      />
    </View>
  );
}
