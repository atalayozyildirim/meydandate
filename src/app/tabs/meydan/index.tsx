// Sanal Cem odası için backend destekli live katılım ekranını sunar.
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResizeMode, Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLiveRoom } from "@/features/live/hooks/useLiveRoom";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";

const roomId = "meydan-erkani";
const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

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

type StreamSource =
  | {
      kind: "youtube";
      videoId: string;
      embedHtml: string;
    }
  | {
      kind: "kick";
      channel: string;
      embedHtml: string;
    }
  | {
      kind: "direct";
      playbackUrl: string;
};

const buildEmbedDocument = (iframeUrl: string) => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000;
      }
      iframe {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${iframeUrl}"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen="false"
      webkit-playsinline
      playsinline
    ></iframe>
  </body>
</html>`;

const buildYoutubeEmbedHtml = (videoId: string, startSeconds = 0) => {
  const embedParams = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    mute: "1",
    modestbranding: "1",
    origin: "https://www.youtube-nocookie.com",
    playsinline: "1",
    rel: "0",
  });
  const safeStartSeconds = Math.max(0, Math.floor(startSeconds));

  if (safeStartSeconds > 0) {
    embedParams.set("start", String(safeStartSeconds));
  }

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #player {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000;
      }
      iframe {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
    </style>
  </head>
  <body>
    <iframe
      id="player"
      src="https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen="false"
      webkit-playsinline
      playsinline
    ></iframe>
    <script>
      const player = document.getElementById("player");
      const startSeconds = ${safeStartSeconds};
      let didSeekToSharedPosition = false;

      function sendCommand(func, args = []) {
        if (!player || !player.contentWindow) return;
        player.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }

      function startMuted() {
        sendCommand("mute");
        if (!didSeekToSharedPosition && startSeconds > 0) {
          sendCommand("seekTo", [startSeconds, true]);
          didSeekToSharedPosition = true;
        }
        sendCommand("playVideo");
      }

      window.addEventListener("load", () => {
        setTimeout(startMuted, 350);
        setTimeout(startMuted, 1200);
        setInterval(() => sendCommand("playVideo"), 5000);
      });

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) startMuted();
      });
    </script>
  </body>
</html>`;
};

const buildKickEmbedHtml = (channel: string, isMuted: boolean) => {
  const embedParams = new URLSearchParams({
    allowfullscreen: "false",
    autoplay: "true",
    muted: isMuted ? "true" : "false",
  });

  return buildEmbedDocument(
    `https://player.kick.com/${encodeURIComponent(channel)}?${embedParams.toString()}`,
  );
};

const getYoutubeVideoId = (streamUrl: string) => {
  try {
    const url = new URL(streamUrl.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const segments = url.pathname.split("/").filter(Boolean);

      if (["embed", "live", "shorts"].includes(segments[0] ?? "")) {
        return segments[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getKickChannel = (streamUrl: string) => {
  try {
    const url = new URL(streamUrl.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (host === "player.kick.com") {
      return segments[0] ?? null;
    }

    if (host === "kick.com" || host === "m.kick.com") {
      const channel = segments[0];
      const reservedPaths = new Set([
        "about",
        "browse",
        "categories",
        "dashboard",
        "following",
        "search",
        "settings",
        "terms",
        "video",
        "videos",
      ]);

      if (channel && !reservedPaths.has(channel.toLowerCase())) {
        return channel;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const resolveStreamSource = (
  streamUrl?: string | null,
  syncedPositionMillis = 0,
  isEmbedMuted = true,
): StreamSource | null => {
  if (!streamUrl?.trim()) {
    return null;
  }

  const safeUrl = streamUrl.trim();
  const youtubeVideoId = getYoutubeVideoId(safeUrl);

  if (youtubeVideoId) {
    return {
      kind: "youtube",
      videoId: youtubeVideoId,
      embedHtml: buildYoutubeEmbedHtml(
        youtubeVideoId,
        syncedPositionMillis / 1000,
      ),
    };
  }

  const kickChannel = getKickChannel(safeUrl);

  if (kickChannel) {
    return {
      kind: "kick",
      channel: kickChannel,
      embedHtml: buildKickEmbedHtml(kickChannel, isEmbedMuted),
    };
  }

  return {
    kind: "direct",
    playbackUrl: safeUrl,
  };
};

const isRealtimeDirectStream = (playbackUrl: string) =>
  /\.(m3u8|m3u|mpd)(\?|#|$)/i.test(playbackUrl) ||
  playbackUrl.toLowerCase().includes(".m3u8");

export default function MeydanRoomScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const videoRef = useRef<Video>(null);
  const embedWebViewRef = useRef<WebView>(null);
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
  const [isEmbedMuted, setIsEmbedMuted] = useState(true);
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
  const currentStreamProvider = useMemo(() => {
    const currentStreamUrl = room?.streamUrl;

    if (!currentStreamUrl) {
      return null;
    }

    if (getYoutubeVideoId(currentStreamUrl)) {
      return "youtube";
    }

    if (getKickChannel(currentStreamUrl)) {
      return "kick";
    }

    return "direct";
  }, [room?.streamUrl]);
  const kickMuted = currentStreamProvider === "kick" ? isEmbedMuted : true;
  const streamSource = useMemo(
    () => resolveStreamSource(room?.streamUrl, syncedPositionMillis, kickMuted),
    [kickMuted, room?.streamUrl, syncedPositionMillis],
  );
  const shouldSyncDirectPlayback =
    streamSource?.kind === "direct" &&
    !isRealtimeDirectStream(streamSource.playbackUrl);

  useEffect(() => {
    if (!room) {
      return;
    }

    setAdminTitle((current) => current || room.title);
    setAdminDescription((current) => current || room.description);
    setStreamUrl((current) => current || room.streamUrl || "");
  }, [room]);

  useEffect(() => {
    setIsEmbedMuted(true);
  }, [
    room?.startedAt,
    streamSource?.kind,
    streamSource?.kind === "youtube" ? streamSource.videoId : undefined,
    streamSource?.kind === "kick" ? streamSource.channel : undefined,
  ]);

  useEffect(() => {
    if (streamSource?.kind !== "direct") {
      return;
    }

    void videoRef.current
      ?.setStatusAsync({
        shouldPlay: isLive,
        ...(shouldSyncDirectPlayback
          ? { positionMillis: syncedPositionMillis }
          : {}),
      })
      .catch(() => undefined);
  }, [
    isLive,
    room?.startedAt,
    shouldSyncDirectPlayback,
    streamSource?.kind,
    streamSource?.kind === "direct" ? streamSource.playbackUrl : undefined,
    syncedPositionMillis,
  ]);

  const toggleEmbedSound = () => {
    const nextMuted = !isEmbedMuted;
    setIsEmbedMuted(nextMuted);

    if (streamSource?.kind !== "youtube") {
      return;
    }

    const command = nextMuted ? "mute" : "unMute";
    embedWebViewRef.current?.injectJavaScript(`
      (function () {
        var player = document.getElementById("player");
        if (!player || !player.contentWindow) return true;
        player.contentWindow.postMessage(JSON.stringify({ event: "command", func: "${command}", args: [] }), "*");
        player.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        return true;
      })();
      true;
    `);
  };

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
      Alert.alert(
        "Yayın URL'i gerekli",
        "Canlı yayını başlatmak için HTTPS stream URL gir.",
      );
      return;
    }

    if (!resolveStreamSource(nextStreamUrl)) {
      Alert.alert(
        "Yayın linki desteklenmiyor",
        "YouTube video/canlı linki, Kick kanal linki veya direkt MP4/HLS URL gir.",
      );
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
            <Ionicons
              name="people-outline"
              size={15}
              color={theme.colors.primary}
            />
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
        {hasStream && room?.streamUrl && streamSource ? (
          streamSource.kind === "youtube" || streamSource.kind === "kick" ? (
            <View style={styles.embedStage}>
              <WebView
                ref={embedWebViewRef}
                key={`${room?.id}-${room?.startedAt ?? "idle"}-${streamSource.kind}-${
                  streamSource.kind === "youtube"
                    ? streamSource.videoId
                    : `${streamSource.channel}-${isEmbedMuted ? "muted" : "sound"}`
                }`}
                source={{
                  html: streamSource.embedHtml,
                  baseUrl:
                    streamSource.kind === "youtube"
                      ? "https://www.youtube-nocookie.com"
                      : "https://player.kick.com",
                }}
                style={styles.video}
                containerStyle={styles.embedContainer}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                bounces={false}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo={false}
                automaticallyAdjustContentInsets={false}
              />
              <View pointerEvents="box-none" style={styles.videoOverlay}>
                {isLive ? (
                  <View style={styles.livePill}>
                    <View style={styles.livePillDot} />
                    <Text style={styles.livePillText}>CANLI</Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isEmbedMuted ? "Yayın sesini aç" : "Yayın sesini kapat"
                  }
                  onPress={toggleEmbedSound}
                  style={styles.embedSoundButton}
                >
                  <Ionicons
                    name={isEmbedMuted ? "volume-mute" : "volume-high"}
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.videoFrame}>
              <Video
                ref={videoRef}
                key={`${room?.id}-${room?.startedAt ?? "idle"}-${streamSource.playbackUrl}`}
                source={{ uri: streamSource.playbackUrl }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isLive}
                isMuted={false}
                isLooping={false}
                progressUpdateIntervalMillis={1000}
                status={{
                  shouldPlay: isLive,
                  isMuted: false,
                  isLooping: false,
                  ...(shouldSyncDirectPlayback
                    ? { positionMillis: syncedPositionMillis }
                    : {}),
                }}
              />
              <View pointerEvents="none" style={styles.videoOverlay}>
                {isLive ? (
                  <View style={styles.livePill}>
                    <View style={styles.livePillDot} />
                    <Text style={styles.livePillText}>CANLI</Text>
                  </View>
                ) : null}
                </View>
            </View>
          )
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
            Oda bilgileri şu an yenilenemiyor. Bağlantı düzelince ekran otomatik
            güncellenir.
          </Text>
        </View>
      ) : null}

      {canManageRoom ? (
        <View style={styles.adminPanel}>
          <View style={styles.adminPanelHeader}>
            <Ionicons
              name="shield-checkmark"
              size={19}
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Admin yayını</Text>
          </View>
          <Input
            label="Başlık"
            value={adminTitle}
            onChangeText={setAdminTitle}
            placeholder="Meydan"
          />
          <Input
            label="HTTPS yayın URL'i, YouTube veya Kick linki"
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
          <View>
            <Text style={styles.sectionTitle}>Oda sohbeti</Text>
            <Text style={styles.chatSubtitle}>
              Meydandaki canlarla aynı anda konuş.
            </Text>
          </View>
          <View style={styles.chatCount}>
            <Ionicons
              name="chatbubble-ellipses"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.chatCountText}>{messages.length}</Text>
          </View>
        </View>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
          style={styles.chatViewport}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={23}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.emptyChatTitle}>Sohbet henüz sessiz</Text>
              <Text style={styles.emptyChatText}>
                Odaya katıl ve ilk selamı sen ver.
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.isCurrentUser && styles.messageRowOwn,
                ]}
              >
                {/* Avatar — flex row reverse ile sag/sol otomatik */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/tabs/profile/[userId]",
                      params: { userId: message.senderId },
                    })
                  }
                >
                  <Avatar
                    name={message.isCurrentUser ? "Sen" : message.senderName}
                    uri={
                      message.isCurrentUser ? undefined : message.senderPhotoUri
                    }
                    size={message.isCurrentUser ? 28 : 32}
                  />
                </Pressable>

                {/* Balon alani — flex:1 ile genisler, icerik hizalanir */}
                <View
                  style={[
                    styles.messageBubbleArea,
                    message.isCurrentUser && styles.messageBubbleAreaOwn,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.isCurrentUser
                        ? styles.messageBubbleOwn
                        : styles.messageBubbleOther,
                    ]}
                  >
                    {!message.isCurrentUser ? (
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/tabs/profile/[userId]",
                            params: { userId: message.senderId },
                          })
                        }
                        style={styles.chatMessageMeta}
                      >
                        <Text style={styles.chatSender} numberOfLines={1}>
                          {message.senderName}
                        </Text>
                        {message.senderIsPremium ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    ) : null}
                    <Text style={styles.chatBody}>{message.body}</Text>
                  </View>
                  <Text
                    style={[
                      styles.messageTime,
                      message.isCurrentUser && styles.messageTimeOwn,
                    ]}
                  >
                    {formatMessageTime(message.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.chatComposer}>
          <View style={styles.chatInputFrame}>
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={theme.colors.muted}
            />
            <TextInput
              value={chatDraft}
              onChangeText={setChatDraft}
              placeholder={
                isJoined
                  ? "Meydana bir mesaj yaz..."
                  : "Mesaj için önce odaya katıl"
              }
              placeholderTextColor={theme.colors.muted}
              editable={isJoined}
              style={styles.chatInput}
              selectionColor={theme.colors.primary}
              multiline
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mesajı gönder"
            disabled={isSendingMessage || !isJoined || !chatDraft.trim()}
            onPress={() => void handleSendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              (isSendingMessage || !isJoined || !chatDraft.trim()) &&
                styles.sendButtonDisabled,
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Katılanlar</Text>
        <View style={styles.participantGrid}>
          {participants.map((participant) => (
            <Pressable
              key={participant.id}
              style={({ pressed }) => [
                styles.participant,
                pressed && styles.participantPressed,
              ]}
              onPress={() => {
                router.push({
                  pathname: "/tabs/profile/[userId]",
                  params: { userId: participant.id },
                });
              }}
            >
              <View style={styles.participantAvatarWrap}>
                <Avatar
                  name={participant.name}
                  uri={participant.photoUri}
                  size={42}
                />
                {participant.isPremium ? (
                  <View style={styles.premiumDot}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#FFFFFF"
                    />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.participantName}>
                {participant.isCurrentUser ? "Sen" : participant.name}
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
      backgroundColor: theme.isDark ? theme.colors.elevated : "#FFF0F3",
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
      height: 198,
      backgroundColor: "#000000",
    },
    videoFrame: {
      position: "relative",
      minHeight: 198,
      backgroundColor: "#000000",
    },
    embedStage: {
      position: "relative",
      minHeight: 198,
      backgroundColor: "#000000",
    },
    embedContainer: {
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
      minHeight: 96,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    participantAvatarWrap: {
      position: "relative",
    },
    premiumDot: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
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
      minHeight: 32,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.isDark ? theme.colors.elevated : "#FFF0F3",
    },
    chatCountText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    chatSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    chatViewport: {
      maxHeight: 360,
      minHeight: 150,
      borderRadius: 24,
      backgroundColor: theme.isDark ? "#0D0F14" : "#F8F9FB",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chatList: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      flexGrow: 1,
    },
    emptyChat: {
      minHeight: 126,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
    },
    emptyChatIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.xxs,
      backgroundColor: theme.colors.elevated,
    },
    emptyChatTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    emptyChatText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: "center",
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    // row-reverse ile avatar sagda, balon sola hizalanir
    messageRowOwn: {
      flexDirection: "row-reverse",
    },
    // flex:1 ile kalan alani doldurur; bubble hizalamasi burada yonetilir
    messageBubbleArea: {
      flex: 1,
      alignItems: "flex-start",
    },
    messageBubbleAreaOwn: {
      alignItems: "flex-end",
    },
    messageBubble: {
      // Yuzde maxWidth artik flex:1 parent ile dogru hesaplanir
      maxWidth: "82%",
      borderRadius: 18,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
    },
    messageBubbleOwn: {
      borderBottomRightRadius: 4,
      borderColor: "rgba(233, 64, 87, 0.35)",
      backgroundColor: theme.isDark
        ? "rgba(233, 64, 87, 0.22)"
        : "rgba(233, 64, 87, 0.12)",
    },
    messageBubbleOther: {
      borderBottomLeftRadius: 4,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chatMessageMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    chatSender: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "700",
      color: theme.colors.text,
    },
    messageTime: {
      fontSize: 10,
      lineHeight: 14,
      color: theme.colors.muted,
    },
    messageTimeOwn: {
      textAlign: "right",
    },
    chatBody: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    chatComposer: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: 24,
      padding: theme.spacing.xxs,
      paddingLeft: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chatInputFrame: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    chatInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 100,
      color: theme.colors.text,
      paddingVertical: theme.spacing.xs,
      textAlignVertical: "top",
      ...theme.typography.body,
    },
    sendButton: {
      width: 48,
      height: 48,
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
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-start",
      alignItems: "flex-end",
      padding: 10,
      gap: 8,
    },
    embedSoundButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(15, 23, 42, 0.76)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)",
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: "rgba(220, 38, 38, 0.92)",
    },
    livePillDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#FFFFFF",
    },
    livePillText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 1,
    },
  });
