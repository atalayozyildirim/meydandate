// Sanal Cem odasi icin backend destekli live katilim ekranini sunar.
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useLiveRoom } from "@/features/live/hooks/useLiveRoom";
import { useTheme } from "@/shared/theme";

const roomId = "cem-erkani";

const ceremonySteps = [
  { title: "Duyuru", description: "Yonetici canli erkan, sohbet veya deyis etkinligini takvime alir." },
  { title: "Canli yayin", description: "streamUrl geldiginde video acilir; katilan canlar listede gorunur." },
  { title: "Saygili katilim", description: "Oda sadece izleme ve topluluk katilimi icindir; uygunsuz mesaj/sohbet banlanir." },
];

export default function CemRoomScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const {
    room,
    isLoading,
    isError,
    isJoined,
    joinRoom,
    leaveRoom,
    isJoining,
  } = useLiveRoom(roomId);
  const participants = room?.participants ?? [];
  const participantCount = room?.participantCount ?? participants.length;
  const isLive = room?.status === "live";
  const hasStream = Boolean(room?.streamUrl);

  const toggleRoom = async () => {
    try {
      if (isJoined) {
        await leaveRoom();
        return;
      }

      await joinRoom();
    } catch (error) {
      Alert.alert(
        "Canli oda hatasi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (isLoading) {
    return <Loading label="Cem odasi yukleniyor" />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, !isLive && styles.liveDotIdle]} />
          <Text style={styles.liveText}>{isLive ? "Canli" : "Hazir"}</Text>
        </View>
        <Text style={styles.kicker}>Ehlibyte</Text>
        <Text style={styles.title}>{room?.title ?? "Sanal Cem odasi"}</Text>
        <Text style={styles.description}>
          {room?.description ?? "Canli erkan, deyis ve topluluk sohbetleri icin planli yayin odasi."}
        </Text>
      </View>

      <View style={styles.purposePanel}>
        <Text style={styles.sectionTitle}>Bu odanin amaci</Text>
        <Text style={styles.purposeText}>
          Ehlibyte icinde planli Alevi kultur etkinliklerini canli izletmek: erkan yayini, deyis/nefes, soru-cevap ve topluluk bulusmasi. Odaya katilanlar gorunur; yayin acildiginda video burada oynar.
        </Text>
      </View>

      <View style={styles.stage}>
        {hasStream && room?.streamUrl ? (
          <Video
            source={{ uri: room.streamUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isLive}
            useNativeControls
          />
        ) : (
          <View style={styles.emptyStage}>
            <Ionicons name="radio-outline" size={32} color="#FFFFFF" />
            <Text style={styles.stageTitle}>{isLive ? "Canli yayin bekleniyor" : "Yayin hazir degil"}</Text>
            <Text style={styles.stageDescription}>
              Backend `streamUrl` dondurdugunde bu alan gercek canli video oynatir.
            </Text>
          </View>
        )}
        <View style={styles.stageMeta}>
          <Text style={styles.stageMetaText}>{participantCount} katilimci</Text>
          <Text style={styles.stageMetaText}>{isJoined ? "Odasindasin" : "Disaridasin"}</Text>
        </View>
      </View>

      {isError ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
          <Text style={styles.errorText}>Canli endpoint'e baglanilamadi. API acilinca oda otomatik yenilenir.</Text>
        </View>
      ) : null}

      <Button
        label={isJoined ? "Odadan ayril" : "Odaya katil"}
        variant={isJoined ? "ghost" : "primary"}
        loading={isJoining}
        onPress={() => void toggleRoom()}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Katilanlar</Text>
        <View style={styles.participantGrid}>
          {participants.map((participant) => (
            <Pressable key={participant.id} style={styles.participant}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{participant.name.slice(0, 1)}</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Erkan akisi</Text>
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
      gap: theme.spacing.lg,
      paddingBottom: 104,
    },
    header: {
      gap: theme.spacing.xs,
    },
    liveBadge: {
      alignSelf: "flex-start",
      minHeight: 34,
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
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    purposePanel: {
      gap: theme.spacing.xs,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.12)",
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    purposeText: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    stage: {
      minHeight: 260,
      borderRadius: 30,
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
      minHeight: 260,
      backgroundColor: "#000000",
    },
    emptyStage: {
      flex: 1,
      minHeight: 218,
      justifyContent: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    stageTitle: {
      fontSize: 30,
      lineHeight: 35,
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
      padding: theme.spacing.md,
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
      width: "23.5%",
      minHeight: 106,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: 42,
      height: 42,
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
    stepRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: 20,
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
