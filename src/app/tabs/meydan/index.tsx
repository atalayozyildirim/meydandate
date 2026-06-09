// Sanal Cem odası için backend destekli live katılım ekranını sunar.
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { ResizeMode, Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLiveRoom } from "@/features/live/hooks/useLiveRoom";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";

const roomId = "meydan-erkani";

const ceremonySteps = [
  {
    title: "Duyuru",
    description:
      "Yönetici canlı erkân, sohbet veya deyiş etkinliğini takvime alır.",
  },
  {
    title: "Canlı yayın",
    description:
      "Yayın açıldığında video bu ekranda başlar; katılan canlar listede görünür.",
  },
  {
    title: "Saygılı katılım",
    description:
      "Oda sadece izleme ve topluluk katılımı içindir; uygunsuz mesaj/sohbet banlanır.",
  },
];

export default function MeydanRoomScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const {
    room,
    isLoading,
    isError,
    isJoined,
    joinRoom,
    leaveRoom,
    sendMessage,
    startRoom,
    stopRoom,
    isJoining,
    isSendingMessage,
    isManagingRoom,
  } = useLiveRoom(roomId);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const participants = room?.participants ?? [];
  const participantCount = room?.participantCount ?? participants.length;
  const messages = room?.messages ?? [];
  const isLive = room?.status === "live";
  const hasStream = Boolean(room?.streamUrl);
  const canManageRoom = Boolean(room?.canManage);
  const roomStatusLabel = isLive
    ? "Canlı"
    : room?.status === "offline"
      ? "Kapalı"
      : "Planlandı";
  const stageTitle = isLive
    ? "Yayın bağlantısı hazırlanıyor"
    : room?.status === "offline"
      ? "Yayın sona erdi"
      : "Yayın yakında başlayacak";
  const stageDescription = isLive
    ? "Canlı görüntü birkaç saniye içinde burada görünür. Sohbet ve katılımcılar açık."
    : room?.status === "offline"
      ? "Bir sonraki buluşma duyurulduğunda bu oda yeniden açılır."
      : "Yayın saati geldiğinde görüntü otomatik olarak burada başlar.";
  const syncedPositionMillis = useMemo(() => {
    if (!room?.startedAt) {
      return 0;
    }

    return Math.max(0, Date.now() - new Date(room.startedAt).getTime());
  }, [room?.startedAt]);

  useEffect(() => {
    if (!room) {
      return;
    }

    setAdminTitle((current) => current || room.title);
    setAdminDescription((current) => current || room.description);
    setStreamUrl((current) => current || room.streamUrl || "");
  }, [room]);

  const toggleRoom = async () => {
    try {
      if (isJoined) {
        await leaveRoom();
        return;
      }

      await joinRoom();
    } catch (error) {
      Alert.alert(
        "Canlı oda hatası",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleStartRoom = async () => {
    const nextStreamUrl = streamUrl.trim();

    if (!nextStreamUrl) {
      Alert.alert("Yayın URL'i gerekli", "Canlı yayını başlatmak için HTTPS stream URL gir.");
      return;
    }

    try {
      await startRoom({
        title: adminTitle.trim() || "Meydan",
        description:
          adminDescription.trim() ||
          "Admin yayını açtığında herkes aynı canlı akışı ve sohbeti burada görür.",
        streamUrl: nextStreamUrl,
      });
    } catch (error) {
      Alert.alert(
        "Yayın başlatılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleStopRoom = async () => {
    try {
      await stopRoom();
    } catch (error) {
      Alert.alert(
        "Yayın durdurulamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleSendMessage = async () => {
    const body = chatDraft.trim();

    if (!body) {
      return;
    }

    if (!isJoined) {
      Alert.alert("Odaya katıl", "Sohbete yazmak için önce odaya katıl.");
      return;
    }

    try {
      await sendMessage(body);
      setChatDraft("");
    } catch (error) {
      if (isPermanentBanError(error)) {
        Alert.alert(
          "Kalıcı ban",
          error instanceof Error
            ? error.message
            : "Ağır güvenlik ihlali nedeniyle hesap kalıcı olarak banlandı.",
          [
            {
              text: "Tamam",
              style: "destructive",
              onPress: () => void applyPermanentBan(),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      Alert.alert(
        "Mesaj gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (isLoading) {
    return <Loading label="Meydan yükleniyor" />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, !isLive && styles.liveDotIdle]} />
            <Text style={styles.liveText}>{roomStatusLabel}</Text>
          </View>
          <View style={styles.countBadge}>
            <Ionicons name="people-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.countText}>{participantCount}</Text>
          </View>
        </View>
        <Text style={styles.title}>{room?.title ?? "Sanal Cem odası"}</Text>
        <Text style={styles.description}>
          {room?.description ??
            "Canlı erkân, deyiş ve topluluk sohbetleri için planlı yayın odası."}
        </Text>
      </View>

      <View style={styles.stage}>
        {hasStream && room?.streamUrl ? (
          <Video
            key={`${room?.id}-${room?.startedAt ?? "idle"}`}
            source={{ uri: room.streamUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isLive}
            status={{
              shouldPlay: isLive,
              positionMillis: syncedPositionMillis,
            }}
            useNativeControls
          />
        ) : (
          <View style={styles.emptyStage}>
            <View style={styles.stageIcon}>
              <Ionicons name="radio-outline" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.stageTitle}>{stageTitle}</Text>
            <Text style={styles.stageDescription}>{stageDescription}</Text>
          </View>
        )}
        <View style={styles.stageMeta}>
          <Text style={styles.stageMetaText}>{participantCount} katılımcı</Text>
          <Text style={styles.stageMetaText}>
            {isJoined ? "Odasındasın" : "Dışarıdasın"}
          </Text>
        </View>
      </View>

      <Button
        label={isJoined ? "Odadan ayrıl" : "Odaya katıl"}
        variant={isJoined ? "ghost" : "primary"}
        loading={isJoining}
        onPress={() => void toggleRoom()}
      />

      {isError ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="warning-outline"
            size={20}
            color={theme.colors.warning}
          />
          <Text style={styles.errorText}>
            Oda bilgileri şu an yenilenemiyor. Bağlantı düzelince ekran otomatik güncellenir.
          </Text>
        </View>
      ) : null}

      {canManageRoom ? (
        <View style={styles.adminPanel}>
          <View style={styles.adminPanelHeader}>
            <Ionicons name="shield-checkmark" size={19} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Admin yayını</Text>
          </View>
          <Input
            label="Başlık"
            value={adminTitle}
            onChangeText={setAdminTitle}
            placeholder="Meydan"
          />
          <Input
            label="HTTPS stream URL"
            value={streamUrl}
            onChangeText={setStreamUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://..."
          />
          <TextInput
            value={adminDescription}
            onChangeText={setAdminDescription}
            placeholder="Yayın açıklaması"
            placeholderTextColor={theme.colors.muted}
            multiline
            style={styles.adminDescriptionInput}
            selectionColor={theme.colors.primary}
          />
          <View style={styles.adminActions}>
            <Button
              label="Yayını bitir"
              variant="ghost"
              disabled={!isLive || isManagingRoom}
              style={styles.adminActionButton}
              onPress={() => void handleStopRoom()}
            />
            <Button
              label={isLive ? "Yayını güncelle" : "Yayını başlat"}
              loading={isManagingRoom}
              style={styles.adminActionButton}
              icon={<Ionicons name="radio" size={18} color="#FFFFFF" />}
              onPress={() => void handleStartRoom()}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.chatHeader}>
          <Text style={styles.sectionTitle}>Sohbet</Text>
          <Text style={styles.chatCount}>{messages.length}</Text>
        </View>
        <View style={styles.chatList}>
          {messages.length === 0 ? (
            <Text style={styles.emptyChatText}>İlk mesajı oda açıldığında yazabilirsin.</Text>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.chatBubble,
                  message.isCurrentUser && styles.chatBubbleCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.chatSender,
                    message.isCurrentUser && styles.chatBubbleCurrentSender,
                  ]}
                >
                  {message.senderName}
                </Text>
                <Text
                  style={[
                    styles.chatBody,
                    message.isCurrentUser && styles.chatBubbleCurrentBody,
                  ]}
                >
                  {message.body}
                </Text>
              </View>
            ))
          )}
        </View>
        <View style={styles.chatComposer}>
          <TextInput
            value={chatDraft}
            onChangeText={setChatDraft}
            placeholder="Mesaj yaz"
            placeholderTextColor={theme.colors.muted}
            style={styles.chatInput}
            selectionColor={theme.colors.primary}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            disabled={isSendingMessage}
            onPress={() => void handleSendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              isSendingMessage && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Katılanlar</Text>
        <View style={styles.participantGrid}>
          {participants.map((participant) => (
            <Pressable key={participant.id} style={styles.participant}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {participant.name.slice(0, 1)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.participantName}>
                {participant.name}
              </Text>
              <Text numberOfLines={1} style={styles.participantRole}>
                {participant.role}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.purposePanel}>
        <Text style={styles.sectionTitle}>Bu odanın amacı</Text>
        <Text style={styles.purposeText}>
          Planlı erkân, deyiş, soru-cevap ve topluluk buluşmalarını tek ekranda
          izlemek ve saygılı bir sohbet alanı açmak.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Erkân akışı</Text>
        {ceremonySteps.map((step, index) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 104,
    },
    header: {
      gap: theme.spacing.xs,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    liveBadge: {
      alignSelf: "flex-start",
      minHeight: 32,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: "#FFF0F3",
    },
    liveDot: {
      width: 9,
      height: 9,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    liveDotIdle: {
      backgroundColor: theme.colors.warning,
    },
    liveText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    countBadge: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
    },
    countText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    purposePanel: {
      gap: theme.spacing.xs,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.12)",
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    purposeText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    stage: {
      minHeight: 198,
      borderRadius: 24,
      overflow: "hidden",
      justifyContent: "space-between",
      backgroundColor: "#171923",
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
    },
    video: {
      width: "100%",
      minHeight: 198,
      backgroundColor: "#000000",
    },
    emptyStage: {
      flex: 1,
      minHeight: 150,
      justifyContent: "center",
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    stageIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    stageTitle: {
      fontSize: 23,
      lineHeight: 28,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    stageDescription: {
      ...theme.typography.body,
      color: "rgba(255, 255, 255, 0.76)",
    },
    stageMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    stageMetaText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
    errorBox: {
      borderRadius: 18,
      padding: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
      backgroundColor: "#FFFBEB",
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.28)",
    },
    errorText: {
      flex: 1,
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    adminPanel: {
      gap: theme.spacing.sm,
      borderRadius: 22,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.16)",
    },
    adminPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    adminDescriptionInput: {
      minHeight: 84,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      borderRadius: 18,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
      ...theme.typography.body,
    },
    adminActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    adminActionButton: {
      flex: 1,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    participantGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    participant: {
      width: "31.8%",
      minHeight: 88,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      ...theme.typography.subheading,
      color: "#FFFFFF",
    },
    participantName: {
      ...theme.typography.caption,
      color: theme.colors.text,
      textAlign: "center",
    },
    participantRole: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600",
      color: theme.colors.muted,
      textAlign: "center",
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    chatCount: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      backgroundColor: theme.isDark ? theme.colors.elevated : "#FFF0F3",
    },
    chatList: {
      gap: theme.spacing.xs,
      minHeight: 82,
      borderRadius: 16,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyChatText: {
      ...theme.typography.body,
      color: theme.colors.muted,
      padding: theme.spacing.sm,
    },
    chatBubble: {
      alignSelf: "flex-start",
      maxWidth: "88%",
      gap: theme.spacing.xxs,
      borderRadius: 18,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.background,
    },
    chatBubbleCurrent: {
      alignSelf: "flex-end",
      backgroundColor: theme.isDark ? theme.colors.primary : "#FFF0F3",
    },
    chatSender: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    chatBubbleCurrentSender: {
      color: theme.isDark ? "rgba(255, 255, 255, 0.82)" : theme.colors.primary,
    },
    chatBody: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    chatBubbleCurrentBody: {
      color: theme.isDark ? "#FFFFFF" : theme.colors.text,
    },
    chatComposer: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.xs,
    },
    chatInput: {
      flex: 1,
      minHeight: 54,
      maxHeight: 112,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
      ...theme.typography.body,
    },
    sendButton: {
      width: 54,
      height: 54,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    sendButtonPressed: {
      opacity: 0.82,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    stepRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    stepNumberText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    stepText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    stepTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    stepDescription: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
  });
