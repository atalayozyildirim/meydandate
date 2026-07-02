// Sanal Cem odası için backend destekli live katılım ekranını sunar.
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import type {
  LiveChatMessage,
  LiveParticipant,
  LiveVideoPlaybackStatus,
} from "@/domain/entities/LiveRoom";
import type { LiveKitJoinInfo } from "@/domain/repositories/LiveRoomRepository";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { BottomSheet } from "@/shared/components/BottomSheet";
import { Input } from "@/shared/components/Input";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLiveRoom } from "@/features/live/hooks/useLiveRoom";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";
import { isExpoGo } from "@/shared/utils/expoRuntime";
import { shouldShowVerifiedBadgeForParticipant } from "@/shared/utils/userRole";
import { resolveProfilePhotoUri } from "@/shared/utils/resolveProfilePhotoUri";

type LiveKitRoomProps = {
  serverUrl: string;
  token: string;
  connect: boolean;
  audio: boolean;
  video: boolean;
  children?: ReactNode;
  onError?: (error: Error) => void;
  onConnected?: () => void;
};

type LiveKitAudioSignal = {
  audioLevel: number;
  isSpeaking: boolean;
};

type LiveKitAudioMonitorProps = {
  onSignalChange: (signal: LiveKitAudioSignal) => void;
};

type LiveKitComponents = {
  Room?: ComponentType<LiveKitRoomProps>;
  AudioMonitor?: ComponentType<LiveKitAudioMonitorProps>;
};

const resolveLiveKitComponents = (): LiveKitComponents => {
  if (isExpoGo) {
    return {};
  }

  try {
    const liveKitModule = require("@livekit/react-native") as {
      LiveKitRoom?: ComponentType<LiveKitRoomProps>;
      registerGlobals?: () => void;
      useLocalParticipant: () => {
        localParticipant?: {
          audioLevel?: number;
          isSpeaking?: boolean;
          on?: (eventName: string, listener: () => void) => void;
          off?: (eventName: string, listener: () => void) => void;
        };
      };
    };
    liveKitModule.registerGlobals?.();
    const { useLocalParticipant } = liveKitModule;
    const { ParticipantEvent } = require("livekit-client") as {
      ParticipantEvent: { IsSpeakingChanged: string };
    };

    const LiveKitAudioMonitor = ({ onSignalChange }: LiveKitAudioMonitorProps) => {
      const { localParticipant } = useLocalParticipant();

      useEffect(() => {
        if (!localParticipant) {
          onSignalChange({ audioLevel: 0, isSpeaking: false });
          return undefined;
        }

        let lastLevel = -1;
        let lastSpeaking = false;
        const emitSignal = () => {
          const audioLevel = Math.max(0, Math.min(1, localParticipant.audioLevel ?? 0));
          const isSpeaking = Boolean(localParticipant.isSpeaking);
          const roundedLevel = Math.round(audioLevel * 100) / 100;

          if (roundedLevel === lastLevel && isSpeaking === lastSpeaking) {
            return;
          }

          lastLevel = roundedLevel;
          lastSpeaking = isSpeaking;
          onSignalChange({ audioLevel: roundedLevel, isSpeaking });
        };

        emitSignal();
        const intervalId = setInterval(emitSignal, 250);
        localParticipant.on?.(ParticipantEvent.IsSpeakingChanged, emitSignal);

        return () => {
          clearInterval(intervalId);
          localParticipant.off?.(ParticipantEvent.IsSpeakingChanged, emitSignal);
          onSignalChange({ audioLevel: 0, isSpeaking: false });
        };
      }, [localParticipant, onSignalChange]);

      return null;
    };

    return {
      Room: liveKitModule.LiveKitRoom,
      AudioMonitor: LiveKitAudioMonitor as ComponentType<LiveKitAudioMonitorProps>,
    };
  } catch {
    return {};
  }
};

const DirectVideoStage = ({
  isLive,
  playbackUrl,
  shouldSyncPlayback,
  syncedPositionMillis,
  style,
}: {
  isLive: boolean;
  playbackUrl: string;
  shouldSyncPlayback: boolean;
  syncedPositionMillis: number;
  style: StyleProp<ViewStyle>;
}) => {
  const startAt = shouldSyncPlayback ? Math.max(0, syncedPositionMillis / 1000) : 0;
  const videoHtml = useMemo(
    () => `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #05070d; overflow: hidden; }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              background: #05070d;
              pointer-events: none;
              user-select: none;
              -webkit-user-select: none;
            }
          </style>
        </head>
        <body>
          <video id="stage" ${isLive ? "autoplay" : ""} playsinline webkit-playsinline ${isLive ? "" : "muted"} src="${playbackUrl.replaceAll('"', "&quot;")}"></video>
          <script>
            const video = document.getElementById('stage');
            const shouldPlay = ${isLive ? "true" : "false"};
            const shouldSync = ${shouldSyncPlayback ? "true" : "false"};
            const anchorSeconds = ${startAt};
            const anchorTime = Date.now();

            function expectedTime() {
              return anchorSeconds + (shouldPlay ? (Date.now() - anchorTime) / 1000 : 0);
            }

            function enforceSharedPlayback() {
              if (shouldSync) {
                const target = expectedTime();
                if (Math.abs(video.currentTime - target) > 1.5) {
                  video.currentTime = target;
                }
              }

              if (video.playbackRate !== 1) video.playbackRate = 1;
              if (shouldPlay && video.paused) {
                video.play().catch(() => undefined);
              } else if (!shouldPlay && !video.paused) {
                video.pause();
              }
            }

            enforceSharedPlayback();
            ['play', 'pause', 'seeking', 'ratechange'].forEach((eventName) => {
              video.addEventListener(eventName, () => setTimeout(enforceSharedPlayback, 0));
            });
            setInterval(enforceSharedPlayback, 750);
          </script>
        </body>
      </html>
    `,
    [isLive, playbackUrl, startAt],
  );

  return (
    <WebView
      pointerEvents="none"
      source={{ html: videoHtml }}
      style={style}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      allowsPictureInPictureMediaPlayback={false}
      allowsAirPlayForMediaPlayback={false}
      automaticallyAdjustContentInsets={false}
      scrollEnabled={false}
    />
  );
};

const roomId = "meydan-erkani";
const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

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
        pointer-events: none;
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

const buildYoutubeEmbedHtml = (
  videoId: string,
  startSeconds = 0,
  shouldPlay = true,
) => {
  const embedParams = new URLSearchParams({
    autoplay: shouldPlay ? "1" : "0",
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
        pointer-events: none;
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

      function syncPlayback() {
        sendCommand("mute");
        if (!didSeekToSharedPosition && startSeconds > 0) {
          sendCommand("seekTo", [startSeconds, true]);
          didSeekToSharedPosition = true;
        }
        sendCommand("${shouldPlay ? "playVideo" : "pauseVideo"}");
      }

      window.addEventListener("load", () => {
        setTimeout(syncPlayback, 350);
        setTimeout(syncPlayback, 1200);
        ${
          shouldPlay
            ? 'setInterval(() => sendCommand("playVideo"), 5000);'
            : ""
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) syncPlayback();
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
  shouldPlay = true,
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
        shouldPlay,
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
  const embedWebViewRef = useRef<WebView>(null);
  const chatListRef = useRef<FlatList<LiveChatMessage>>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const {
    room,
    isLoading,
    isError,
    isJoined,
    joinRoom,
    leaveRoom,
    sendMessage,
    reportMessage,
    startRoom,
    stopRoom,
    controlVideo,
    getLiveKitToken,
    setParticipantStage,
    setParticipantMuted,
    setHandRaised,
    removeParticipant,
    isJoining,
    isSendingMessage,
    isReportingMessage,
    isManagingRoom,
    isManagingStage,
  } = useLiveRoom(roomId);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [isEmbedMuted, setIsEmbedMuted] = useState(true);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [liveKitInfo, setLiveKitInfo] = useState<LiveKitJoinInfo | null>(null);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [liveKitComponents, setLiveKitComponents] =
    useState<LiveKitComponents>({});
  const [localAudioSignal, setLocalAudioSignal] = useState<LiveKitAudioSignal>({
    audioLevel: 0,
    isSpeaking: false,
  });
  const [isParticipantsSheetOpen, setIsParticipantsSheetOpen] = useState(false);
  const previousMessageCountRef = useRef<number | null>(null);
  const pendingChatAutoScrollRef = useRef(false);
  const livePulse = useRef(new Animated.Value(0)).current;
  const participants = room?.participants ?? [];
  const participantPreview = participants.slice(0, 20);
  const speakers = participants.filter(
    (participant) => participant.stageStatus === "speaker",
  );
  const listeners = participants.filter(
    (participant) => participant.stageStatus !== "speaker",
  );
  const raisedListeners = listeners.filter((participant) =>
    Boolean(participant.handRaisedAt),
  );
  const currentParticipant = participants.find(
    (participant) => participant.isCurrentUser,
  );
  const participantCount = room?.participantCount ?? participants.length;
  const messages = room?.messages ?? [];
  const isLive = room?.status === "live";
  const hasStream = Boolean(room?.streamUrl);
  const isLiveKitRoom = room?.voiceProvider !== "stream" || hasStream;
  const LiveKitRoomComponent = liveKitComponents.Room;
  const LiveKitAudioMonitorComponent = liveKitComponents.AudioMonitor;
  const videoSync = room?.videoSync;
  const isVideoPlaying = videoSync?.status === "playing";
  const hasRaisedHand = Boolean(currentParticipant?.handRaisedAt);
  const isCurrentSpeaker = currentParticipant?.stageStatus === "speaker";
  const canManageRoom = Boolean(room?.canManage);
  const canPublishToLiveKit = Boolean(
    liveKitInfo?.canPublish ||
      canManageRoom ||
      currentParticipant?.stageStatus === "speaker",
  );
  const isMicReady = Boolean(
    isJoined &&
      isLive &&
      isLiveKitRoom &&
      liveKitInfo &&
      LiveKitRoomComponent &&
      isCurrentSpeaker &&
      !currentParticipant?.isMuted,
  );
  const isSpeaking = isMicReady && (localAudioSignal.isSpeaking || localAudioSignal.audioLevel > 0.03);
  const micSignalLabel = currentParticipant?.isMuted
    ? "Kapalı"
    : isMicReady
      ? isSpeaking
        ? "Ses gidiyor"
        : "Konuş"
      : liveKitError
        ? "Bağlantı yok"
        : "Hazırlanıyor";
  const micSignalLevel = isMicReady ? localAudioSignal.audioLevel : 0;
  const roomStatusLabel = isLive
    ? "Canlı"
    : room?.status === "offline"
      ? "Kapalı"
      : "Planlandı";
  const stageTitle = isLive
    ? isLiveKitRoom
      ? "Meydan odası açık"
      : "Yayın bağlantısı hazırlanıyor"
    : room?.status === "offline"
      ? "Yayın sona erdi"
      : "Yayın yakında başlayacak";
  const stageDescription = isLive
    ? isLiveKitRoom
      ? "Dinleyici olarak katıl; admin veya moderatör seni sahneye aldığında mikrofon açılır."
      : "Canlı görüntü birkaç saniye içinde burada görünür. Sohbet ve katılımcılar açık."
    : room?.status === "offline"
      ? "Bir sonraki buluşma duyurulduğunda bu oda yeniden açılır."
      : "Yayın saati geldiğinde görüntü otomatik olarak burada başlar.";
  const syncedPositionMillis = useMemo(() => {
    const basePosition = Math.max(0, videoSync?.positionMillis ?? 0);

    if (!videoSync?.updatedAt || videoSync.status !== "playing") {
      return basePosition;
    }

    return Math.max(
      0,
      basePosition + Date.now() - new Date(videoSync.updatedAt).getTime(),
    );
  }, [videoSync?.positionMillis, videoSync?.status, videoSync?.updatedAt]);
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
    () =>
      resolveStreamSource(
        room?.streamUrl,
        syncedPositionMillis,
        kickMuted,
        isVideoPlaying,
      ),
    [isVideoPlaying, kickMuted, room?.streamUrl, syncedPositionMillis],
  );
  const shouldSyncDirectPlayback =
    streamSource?.kind === "direct" &&
    !isRealtimeDirectStream(streamSource.playbackUrl);

  useEffect(() => {
    if (!isLive) {
      livePulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [isLive, livePulse]);

  useEffect(() => {
    if (!room) {
      return;
    }

    setAdminTitle((current) => current || room.title);
    setAdminDescription((current) => current || room.description);
    setStreamUrl((current) => current || room.streamUrl || "");
  }, [room]);

  useEffect(() => {
    if (!isJoined || !isLive || !isLiveKitRoom) {
      setLiveKitInfo(null);
      setLiveKitError(null);
      return;
    }

    let isActive = true;

    void getLiveKitToken()
      .then((info) => {
        if (!isActive) {
          return;
        }

        setLiveKitComponents(resolveLiveKitComponents());
        setLiveKitInfo(info);
        setLiveKitError(null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setLiveKitInfo(null);
        setLiveKitError(
          error instanceof Error ? error.message : "LiveKit bağlantısı kurulamadı.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [
    currentParticipant?.stageStatus,
    getLiveKitToken,
    isJoined,
    isLive,
    isLiveKitRoom,
  ]);

  useEffect(() => {
    setIsEmbedMuted(true);
  }, [
    room?.startedAt,
    streamSource?.kind,
    streamSource?.kind === "youtube" ? streamSource.videoId : undefined,
    streamSource?.kind === "kick" ? streamSource.channel : undefined,
  ]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (previousCount === null || messages.length <= previousCount) {
      return;
    }

    pendingChatAutoScrollRef.current = true;
  }, [messages.length]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isJoined) {
          void leaveRoom();
        }
      };
    }, [isJoined, leaveRoom]),
  );

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

    if (nextStreamUrl && !resolveStreamSource(nextStreamUrl)) {
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
          "Admin veya moderatör başlattığında herkes canlı ses odasında buluşur.",
        streamUrl: nextStreamUrl || undefined,
      });
    } catch (error) {
      Alert.alert(
        "Yayın başlatılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleSetParticipantStage = async (
    targetUserId: string,
    stageStatus: "listener" | "speaker",
  ) => {
    try {
      await setParticipantStage({ targetUserId, stageStatus });
    } catch (error) {
      Alert.alert(
        "Sahne güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleSetMuted = async (participant: LiveParticipant, isMuted: boolean) => {
    try {
      await setParticipantMuted({ targetUserId: participant.id, isMuted });
    } catch (error) {
      Alert.alert(
        "Mikrofon güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleToggleHandRaised = async () => {
    if (!isJoined) {
      Alert.alert("Odaya katıl", "El kaldırmak için önce odaya katıl.");
      return;
    }

    try {
      await setHandRaised(!hasRaisedHand);
    } catch (error) {
      Alert.alert(
        "El kaldırma güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const handleRemoveParticipant = (participant: LiveParticipant) => {
    Alert.alert(
      "Odadan çıkarılsın mı?",
      `${participant.name} bu canlı odadan çıkarılacak.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Çıkar",
          style: "destructive",
          onPress: () => {
            void removeParticipant(participant.id).catch((error) => {
              Alert.alert(
                "Katılımcı çıkarılamadı",
                error instanceof Error ? error.message : "Tekrar deneyin.",
              );
            });
          },
        },
      ],
    );
  };

  const handleControlVideo = async (
    status: LiveVideoPlaybackStatus,
    positionMillis = syncedPositionMillis,
  ) => {
    const nextStreamUrl = streamUrl.trim() || room?.streamUrl?.trim() || "";

    if (status !== "idle" && !nextStreamUrl) {
      Alert.alert(
        "Video linki gerekli",
        "Ortak izleme başlatmak için önce video veya canlı yayın linki gir.",
      );
      return;
    }

    if (nextStreamUrl && !resolveStreamSource(nextStreamUrl, 0, true, status === "playing")) {
      Alert.alert(
        "Yayın linki desteklenmiyor",
        "YouTube video/canlı linki, Kick kanal linki veya direkt MP4/HLS URL gir.",
      );
      return;
    }

    try {
      await controlVideo({
        positionMillis: status === "idle" ? 0 : Math.max(0, positionMillis),
        status,
        streamUrl: status === "idle" ? undefined : nextStreamUrl,
      });
      if (status === "idle") {
        setStreamUrl("");
      }
    } catch (error) {
      Alert.alert(
        "Video kontrolü güncellenemedi",
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

  const confirmReportMessage = (message: LiveChatMessage) => {
    if (message.isCurrentUser) {
      return;
    }

    Alert.alert(
      "Mesaj bildirilsin mi?",
      "Bu oda mesajı moderasyon kuyruğuna gönderilecek.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Bildir",
          style: "destructive",
          onPress: () => {
            void reportMessage(message.id)
              .then(() => {
                Alert.alert("Bildirildi", "Mesaj moderasyon ekibine gönderildi.");
              })
              .catch((error) => {
                Alert.alert(
                  "Bildirim gönderilemedi",
                  error instanceof Error ? error.message : "Tekrar deneyin.",
                );
              });
          },
        },
      ],
    );
  };

  const openParticipantProfile = (participantId: string) => {
    router.push({
      pathname: "/tabs/profile/[userId]",
      params: { userId: participantId },
    });
  };

  const renderParticipantCard = (
    participant: LiveParticipant,
    variant: "preview" | "sheet" = "preview",
  ) => (
    <Pressable
      key={participant.id}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.participantCard,
        variant === "sheet" && styles.participantCardSheet,
        pressed && styles.participantCardPressed,
        participant.stageStatus === "speaker" && styles.participantCardSpeaker,
      ]}
      onPress={() => openParticipantProfile(participant.id)}
    >
      <View style={styles.participantCardAvatarWrap}>
        <Avatar
          name={participant.name}
          uri={participant.photoUri}
          size={variant === "sheet" ? 42 : 48}
        />
        {participant.stageStatus === "speaker" ? (
          <View style={styles.speakerBadge}>
            <Ionicons name="mic" size={12} color="#FFFFFF" />
          </View>
        ) : null}
        {shouldShowVerifiedBadgeForParticipant(
          participant.badges,
          participant.isPremium,
        ) ? (
          <View style={styles.premiumBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={variant === "sheet" && styles.participantCardCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.participantCardName,
            variant === "sheet" && styles.participantCardNameSheet,
          ]}
        >
          {participant.isCurrentUser ? "Sen" : participant.name}
        </Text>
        {variant === "sheet" ? (
          <Text numberOfLines={1} style={styles.participantCardRole}>
            {participant.stageStatus === "speaker" ? "Sahnede" : "Dinleyici"}
            {participant.handRaisedAt ? " · el kaldırdı" : ""}
          </Text>
        ) : participant.handRaisedAt ? (
          <View style={styles.handRaisedBadge}>
            <Ionicons name="hand-left" size={10} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      {canManageRoom && !participant.isCurrentUser ? (
        <View style={styles.participantCardAdminActions}>
          {participant.stageStatus === "speaker" ? (
            <Pressable
              disabled={isManagingStage}
              onPress={(event) => {
                event.stopPropagation();
                void handleSetMuted(participant, !participant.isMuted);
              }}
              style={styles.participantCardAdminButton}
            >
              <Ionicons
                name={participant.isMuted ? "mic-off" : "mic"}
                size={11}
                color={theme.colors.text}
              />
            </Pressable>
          ) : (
            <Pressable
              disabled={isManagingStage}
              onPress={(event) => {
                event.stopPropagation();
                void handleSetParticipantStage(participant.id, "speaker");
              }}
              style={styles.participantCardAdminButton}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={11}
                color={theme.colors.text}
              />
            </Pressable>
          )}
          <Pressable
            disabled={isManagingStage}
            onPress={(event) => {
              event.stopPropagation();
              handleRemoveParticipant(participant);
            }}
            style={[
              styles.participantCardAdminButton,
              styles.participantCardAdminDanger,
            ]}
          >
            <Ionicons name="close" size={11} color={theme.colors.danger} />
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );

  const renderParticipantListItem: ListRenderItem<LiveParticipant> = ({
    item,
  }) => renderParticipantCard(item, "sheet");

  const renderChatMessage: ListRenderItem<LiveChatMessage> = ({ item: message }) => (
    <View
      style={[
        styles.messageRow,
        message.isCurrentUser && styles.messageRowOwn,
      ]}
    >
      <Pressable
        onPress={() => openParticipantProfile(message.senderId)}
      >
        <Avatar
          name={message.isCurrentUser ? "Sen" : message.senderName}
          uri={
            message.isCurrentUser
              ? resolveProfilePhotoUri(currentUser?.photos[0]?.uri)
              : message.senderPhotoUri
          }
          size={message.isCurrentUser ? 28 : 32}
        />
      </Pressable>

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
              onPress={() => openParticipantProfile(message.senderId)}
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
        <View
          style={[
            styles.messageFooter,
            message.isCurrentUser && styles.messageFooterOwn,
          ]}
        >
          <Text
            style={[
              styles.messageTime,
              message.isCurrentUser && styles.messageTimeOwn,
            ]}
          >
            {formatMessageTime(message.createdAt)}
          </Text>
          {!message.isCurrentUser ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı bildir"
              disabled={isReportingMessage}
              onPress={() => confirmReportMessage(message)}
              style={({ pressed }) => [
                styles.messageReportButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="flag-outline"
                size={12}
                color={theme.colors.muted}
              />
              <Text style={styles.messageReportText}>Bildir</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return <Loading label="Meydan yükleniyor" />;
  }

  return (
    <Screen scroll={false} style={styles.screenRoot}>
      {isLiveKitRoom && liveKitInfo && LiveKitRoomComponent ? (
        <LiveKitRoomComponent
          serverUrl={liveKitInfo.serverUrl}
          token={liveKitInfo.token}
          connect
          audio={canPublishToLiveKit && !currentParticipant?.isMuted}
          video={false}
          onError={(error) => setLiveKitError(error.message)}
          onConnected={() => setLiveKitError(null)}
        >
          {LiveKitAudioMonitorComponent ? (
            <LiveKitAudioMonitorComponent onSignalChange={setLocalAudioSignal} />
          ) : null}
        </LiveKitRoomComponent>
      ) : null}
      <FlatList
        ref={chatListRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={renderChatMessage}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.screen}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (!pendingChatAutoScrollRef.current) {
            return;
          }

          pendingChatAutoScrollRef.current = false;
          chatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListHeaderComponent={
          <View style={styles.pageSections}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerStatusRow}>
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
          {canManageRoom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Meydan ayarları"
              onPress={() => setIsAdminSettingsOpen(true)}
              style={({ pressed }) => [
                styles.adminSettingsButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={19}
                color={theme.colors.text}
              />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title}>{room?.title ?? "Sanal Cem odası"}</Text>
        <Text style={styles.description}>
          {room?.description ??
            "Canlı erkân, deyiş ve topluluk sohbetleri için planlı yayın odası."}
        </Text>
      </View>

      <View style={styles.stage}>
        {isLiveKitRoom ? (
          <View style={styles.spaceStage}>
            <View style={styles.spaceHeader}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.spacePulseRing,
                  {
                    opacity: livePulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.16, 0.46],
                    }),
                    transform: [
                      {
                        scale: livePulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.86, 1.18],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.spaceIcon}>
                <Ionicons
                  name="mic"
                  size={22}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View style={styles.spaceHeaderText}>
                <View style={styles.spaceTitleRow}>
                  <Text numberOfLines={1} style={styles.stageTitle}>
                    {stageTitle}
                  </Text>
                  <View style={styles.waveBars}>
                    <View style={[styles.waveBar, styles.waveBarSmall]} />
                    <View style={styles.waveBar} />
                    <View style={[styles.waveBar, styles.waveBarTall]} />
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.stageDescription}>
                  {stageDescription}
                </Text>
              </View>
            </View>

            <View style={styles.spaceStatsRow}>
              <View style={styles.spaceStatPill}>
                <Ionicons name="mic-outline" size={14} color="#FFFFFF" />
                <Text style={styles.spaceStatText}>{speakers.length} sahnede</Text>
              </View>
              <View style={styles.spaceStatPill}>
                <Ionicons name="ear-outline" size={14} color="#FFFFFF" />
                <Text style={styles.spaceStatText}>{listeners.length} dinliyor</Text>
              </View>
              {raisedListeners.length > 0 ? (
                <View style={styles.spaceStatPill}>
                  <Ionicons name="hand-left-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.spaceStatText}>
                    {raisedListeners.length} el
                  </Text>
                </View>
              ) : null}
              {hasStream ? (
                <View style={styles.spaceStatPill}>
                  <Ionicons name="desktop-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.spaceStatText}>Paylaşım</Text>
                </View>
              ) : null}
            </View>

            {hasStream && streamSource ? (
              <View style={styles.spaceShareFrame}>
                <View style={styles.spaceShareHeader}>
                  <View style={styles.spaceShareTitleRow}>
                    <Ionicons
                      name="desktop-outline"
                      size={15}
                      color="rgba(255, 255, 255, 0.78)"
                    />
                  <Text style={styles.spaceShareTitle}>Ekran paylaşımı</Text>
                  <View style={styles.videoSyncPill}>
                    <Ionicons
                      name={isVideoPlaying ? "play" : "pause"}
                      size={10}
                      color="#FFFFFF"
                    />
                    <Text style={styles.videoSyncText}>
                      {isVideoPlaying ? "Ortak izleme" : "Duraklatıldı"}
                    </Text>
                  </View>
                </View>
                  {streamSource.kind === "youtube" ||
                  streamSource.kind === "kick" ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isEmbedMuted ? "Paylaşım sesini aç" : "Paylaşım sesini kapat"
                      }
                      onPress={toggleEmbedSound}
                      style={styles.spaceShareSoundButton}
                    >
                      <Ionicons
                        name={isEmbedMuted ? "volume-mute" : "volume-high"}
                        size={15}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  ) : null}
                </View>
                {streamSource.kind === "youtube" || streamSource.kind === "kick" ? (
                  <WebView
                    ref={embedWebViewRef}
                    pointerEvents="none"
                    key={`space-share-${room?.id}-${room?.startedAt ?? "idle"}-${streamSource.kind}-${
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
                    style={styles.spaceShareVideo}
                    containerStyle={styles.spaceShareContainer}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    scrollEnabled={false}
                    bounces={false}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    allowsFullscreenVideo={false}
                    allowsPictureInPictureMediaPlayback={false}
                    allowsAirPlayForMediaPlayback={false}
                    automaticallyAdjustContentInsets={false}
                  />
                ) : (
                  <DirectVideoStage
                    key={`space-share-${room?.id}-${room?.startedAt ?? "idle"}-${streamSource.playbackUrl}`}
                    playbackUrl={streamSource.playbackUrl}
                    style={styles.spaceShareVideo}
                    isLive={isLive && isVideoPlaying}
                    shouldSyncPlayback={shouldSyncDirectPlayback}
                    syncedPositionMillis={syncedPositionMillis}
                  />
                )}
              </View>
            ) : null}

            <View style={styles.speakerStrip}>
              {(speakers.length > 0 ? speakers : participants.slice(0, 2)).map(
                (participant) => (
                  <Pressable
                    key={participant.id}
                    style={styles.speakerCard}
                    onPress={() =>
                      router.push({
                        pathname: "/tabs/profile/[userId]",
                        params: { userId: participant.id },
                      })
                    }
                  >
                    <View style={styles.speakerAvatarWrap}>
                      <Avatar
                        name={participant.isCurrentUser ? "Sen" : participant.name}
                        uri={participant.photoUri}
                        size={54}
                      />
                      <View style={styles.micStateDot}>
                        <Ionicons
                          name={participant.isMuted ? "mic-off" : "mic"}
                          size={12}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.speakerName}>
                      {participant.isCurrentUser ? "Sen" : participant.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.speakerRole}>
                      {participant.stageStatus === "speaker"
                        ? "Sahnede"
                        : "Dinleyici"}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            {canManageRoom && listeners.length > 0 ? (
              <View style={styles.stageControlPanel}>
                <View style={styles.stageControlHeader}>
                  <Text style={styles.stageControlTitle}>
                    {raisedListeners.length > 0 ? "El kaldıranlar" : "Sahneye al"}
                  </Text>
                  <Text style={styles.stageControlHint}>
                    {raisedListeners.length > 0
                      ? `${raisedListeners.length} kişi bekliyor`
                      : "Admin/mod hızlı kontrol"}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stageControlList}
                >
                  {(raisedListeners.length > 0 ? raisedListeners : listeners)
                    .slice(0, 12)
                    .map((participant) => (
                    <Pressable
                      key={participant.id}
                      disabled={isManagingStage}
                      style={styles.stageControlChip}
                      onPress={() =>
                        void handleSetParticipantStage(participant.id, "speaker")
                      }
                    >
                      <Avatar
                        name={participant.name}
                        uri={participant.photoUri}
                        size={28}
                      />
                      <Text numberOfLines={1} style={styles.stageControlText}>
                        {participant.isCurrentUser ? "Sen" : participant.name}
                      </Text>
                      <Ionicons
                        name="arrow-up-circle"
                        size={17}
                        color={theme.colors.primary}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {canManageRoom && speakers.length > 0 ? (
              <View style={styles.stageControlPanel}>
                <Text style={styles.stageControlTitle}>Sahnede</Text>
                <View style={styles.liveSpeakerActions}>
                  {speakers.map((participant) => (
                    <View
                      key={participant.id}
                      style={styles.liveSpeakerAction}
                    >
                      <Text numberOfLines={1} style={styles.liveSpeakerActionText}>
                        {participant.isCurrentUser ? "Sen" : participant.name}
                      </Text>
                      <Pressable
                        disabled={isManagingStage || participant.isCurrentUser}
                        onPress={() =>
                          void handleSetMuted(participant, !participant.isMuted)
                        }
                        style={styles.liveSpeakerMiniButton}
                      >
                        <Ionicons
                          name={participant.isMuted ? "mic-off" : "mic"}
                          size={15}
                          color="#FFFFFF"
                        />
                      </Pressable>
                      <Pressable
                        disabled={isManagingStage || participant.isCurrentUser}
                        onPress={() =>
                          void handleSetParticipantStage(participant.id, "listener")
                        }
                        style={styles.liveSpeakerMiniButton}
                      >
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={15}
                          color="#FFFFFF"
                        />
                      </Pressable>
                      <Pressable
                        disabled={isManagingStage || participant.isCurrentUser}
                        onPress={() => handleRemoveParticipant(participant)}
                        style={[styles.liveSpeakerMiniButton, styles.liveSpeakerKickButton]}
                      >
                        <Ionicons
                          name="close"
                          size={15}
                          color="#FFFFFF"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {liveKitError ? (
              <View style={styles.liveKitErrorBox}>
                <Ionicons name="warning-outline" size={15} color="#FFD166" />
                <Text style={styles.liveKitErrorText}>{liveKitError}</Text>
              </View>
            ) : null}
            {isExpoGo ? (
              <View style={styles.liveKitErrorBox}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={15}
                  color="#FFD166"
                />
                <Text style={styles.liveKitErrorText}>
                  Canlı ses Expo Go'da açılmaz. Test için development build veya
                  EAS build kullan.
                </Text>
              </View>
            ) : null}
          </View>
        ) : hasStream && room?.streamUrl && streamSource ? (
          streamSource.kind === "youtube" || streamSource.kind === "kick" ? (
            <View style={styles.embedStage}>
              <WebView
                ref={embedWebViewRef}
                pointerEvents="none"
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
                allowsPictureInPictureMediaPlayback={false}
                allowsAirPlayForMediaPlayback={false}
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
              <DirectVideoStage
                key={`${room?.id}-${room?.startedAt ?? "idle"}-${streamSource.playbackUrl}`}
                playbackUrl={streamSource.playbackUrl}
                style={styles.video}
                isLive={isLive && isVideoPlaying}
                shouldSyncPlayback={shouldSyncDirectPlayback}
                syncedPositionMillis={syncedPositionMillis}
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
        <View style={styles.stageActionArea}>
          <View style={styles.roomActionDock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isJoined ? "Odadan ayrıl" : "Odaya katıl"}
              disabled={isJoining}
              onPress={() => void toggleRoom()}
              style={({ pressed }) => [
                styles.roomActionButton,
                styles.roomActionButtonPrimary,
                isJoined && styles.roomActionButtonDanger,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isJoined ? "exit-outline" : "enter-outline"}
                size={22}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.roomActionLabel}>
                {isJoined ? "Ayrıl" : "Katıl"}
              </Text>
            </Pressable>

            {isJoined && isCurrentSpeaker ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  currentParticipant?.isMuted ? "Mikrofonu aç" : "Mikrofonu kapat"
                }
                disabled={isManagingStage}
                onPress={() =>
                  currentParticipant
                    ? void handleSetMuted(
                        currentParticipant,
                        !currentParticipant.isMuted,
                      )
                    : undefined
                }
                style={({ pressed }) => [
                  styles.roomActionButton,
                  currentParticipant?.isMuted && styles.roomActionButtonMuted,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.micButtonContainer}>
                  <Ionicons
                    name={currentParticipant?.isMuted ? "mic-off" : "mic"}
                    size={22}
                    color={currentParticipant?.isMuted ? "#FF3B30" : "#34C759"}
                  />
                  {!currentParticipant?.isMuted ? (
                    <>
                      <View
                        style={[
                          styles.speakingIndicator,
                          isSpeaking && styles.speakingIndicatorActive,
                        ]}
                      />
                      <View style={styles.micLevelBars} pointerEvents="none">
                        {[0.12, 0.32, 0.56].map((threshold, index) => (
                          <View
                            key={threshold}
                            style={[
                              styles.micLevelBar,
                              { height: 5 + index * 3 },
                              micSignalLevel >= threshold && styles.micLevelBarActive,
                            ]}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.roomActionLabelSecondary,
                    currentParticipant?.isMuted && styles.roomActionLabelMuted,
                    isSpeaking && styles.roomActionLabelSpeaking,
                  ]}
                >
                  {micSignalLabel}
                </Text>
              </Pressable>
            ) : null}

            {isJoined && !isCurrentSpeaker ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasRaisedHand ? "Eli indir" : "El kaldır"}
                disabled={isManagingStage}
                onPress={() => void handleToggleHandRaised()}
                style={({ pressed }) => [
                  styles.roomActionButton,
                  hasRaisedHand && styles.roomActionButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={hasRaisedHand ? "hand-left" : "hand-left-outline"}
                  size={22}
                  color={hasRaisedHand ? "#FF9500" : theme.colors.text}
                />
                <Text
                  style={[
                    styles.roomActionLabelSecondary,
                    hasRaisedHand && styles.roomActionLabelActive,
                  ]}
                >
                  {hasRaisedHand ? "Sahne isteği" : "Sahne iste"}
                </Text>
              </Pressable>
            ) : null}

            {canManageRoom ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Meydan yönetimi"
                onPress={() => setIsAdminSettingsOpen(true)}
                style={({ pressed }) => [
                  styles.roomActionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <Text style={styles.roomActionLabelSecondary}>Ayarlar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.participantsSection}>
        <View style={styles.participantsHeader}>
          <Text style={styles.participantsTitle}>Katılanlar</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsParticipantsSheetOpen(true)}
            style={({ pressed }) => [
              styles.participantsCountButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.participantsCount}>{participantCount} kişi</Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={theme.colors.muted}
            />
          </Pressable>
        </View>
        <FlatList
          horizontal
          data={participantPreview}
          keyExtractor={(participant) => participant.id}
          renderItem={({ item }) => renderParticipantCard(item)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.participantsHorizontalList}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            participantCount > participantPreview.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsParticipantsSheetOpen(true)}
                style={({ pressed }) => [
                  styles.moreParticipantsCard,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreParticipantsText}>
                  +{participantCount - participantPreview.length}
                </Text>
                <Text style={styles.moreParticipantsLabel}>Tümü</Text>
              </Pressable>
            ) : null
          }
        />
      </View>

      <BottomSheet
        visible={isParticipantsSheetOpen}
        onClose={() => setIsParticipantsSheetOpen(false)}
      >
        <View style={styles.participantsSheet}>
          <View style={styles.participantsSheetHeader}>
            <View>
              <Text style={styles.participantsSheetTitle}>Katılımcılar</Text>
              <Text style={styles.participantsSheetSubtitle}>
                {participantCount} kişi · {speakers.length} sahnede ·{" "}
                {raisedListeners.length} el kaldırdı
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Katılımcı listesini kapat"
              onPress={() => setIsParticipantsSheetOpen(false)}
              style={styles.sheetCloseButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={participants}
            keyExtractor={(participant) => participant.id}
            renderItem={renderParticipantListItem}
            contentContainerStyle={styles.participantsSheetList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={16}
            maxToRenderPerBatch={16}
            updateCellsBatchingPeriod={50}
            windowSize={8}
            removeClippedSubviews
          />
        </View>
      </BottomSheet>

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
        <BottomSheet
          visible={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
        >
          <View style={styles.adminPanel}>
          <View style={styles.adminPanelHeader}>
            <Ionicons
              name="shield-checkmark"
              size={19}
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Meydan yönetimi</Text>
          </View>
          <Input
            label="Başlık"
            value={adminTitle}
            onChangeText={setAdminTitle}
            placeholder="Meydan"
          />
          <Input
            label="Ekran paylaşımı / video URL'i"
            value={streamUrl}
            onChangeText={setStreamUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="Boş bırak: sadece ses"
          />
          <View style={styles.videoControlPanel}>
            <View style={styles.videoControlHeader}>
              <View>
                <Text style={styles.videoControlTitle}>Ortak video</Text>
                <Text style={styles.videoControlHint}>
                  Sadece yönetici ilerletir; herkes aynı zamana hizalanır.
                </Text>
              </View>
              <View style={styles.videoControlStatus}>
                <Ionicons
                  name={isVideoPlaying ? "play" : "pause"}
                  size={12}
                  color={theme.colors.text}
                />
                <Text style={styles.videoControlStatusText}>
                  {videoSync?.status === "playing"
                    ? "Oynuyor"
                    : videoSync?.status === "paused"
                      ? "Durakladı"
                      : "Kapalı"}
                </Text>
              </View>
            </View>
            <View style={styles.videoControlGrid}>
              <Pressable
                disabled={isManagingRoom}
                onPress={() => void handleControlVideo("playing")}
                style={({ pressed }) => [
                  styles.videoControlButton,
                  styles.videoControlButtonPrimary,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={styles.videoControlButtonPrimaryText}>Oynat</Text>
              </Pressable>
              <Pressable
                disabled={isManagingRoom || !room?.streamUrl}
                onPress={() => void handleControlVideo("paused")}
                style={({ pressed }) => [
                  styles.videoControlButton,
                  pressed && styles.pressed,
                  (!room?.streamUrl || isManagingRoom) && styles.controlDisabled,
                ]}
              >
                <Ionicons name="pause" size={16} color={theme.colors.text} />
                <Text style={styles.videoControlButtonText}>Duraklat</Text>
              </Pressable>
              <Pressable
                disabled={isManagingRoom || !room?.streamUrl}
                onPress={() =>
                  void handleControlVideo(
                    videoSync?.status === "paused" ? "paused" : "playing",
                    syncedPositionMillis - 15000,
                  )
                }
                style={({ pressed }) => [
                  styles.videoControlButton,
                  pressed && styles.pressed,
                  (!room?.streamUrl || isManagingRoom) && styles.controlDisabled,
                ]}
              >
                <Ionicons name="play-back" size={16} color={theme.colors.text} />
                <Text style={styles.videoControlButtonText}>15 sn</Text>
              </Pressable>
              <Pressable
                disabled={isManagingRoom || !room?.streamUrl}
                onPress={() =>
                  void handleControlVideo(
                    videoSync?.status === "paused" ? "paused" : "playing",
                    syncedPositionMillis + 15000,
                  )
                }
                style={({ pressed }) => [
                  styles.videoControlButton,
                  pressed && styles.pressed,
                  (!room?.streamUrl || isManagingRoom) && styles.controlDisabled,
                ]}
              >
                <Ionicons
                  name="play-forward"
                  size={16}
                  color={theme.colors.text}
                />
                <Text style={styles.videoControlButtonText}>15 sn</Text>
              </Pressable>
              <Pressable
                disabled={isManagingRoom || !room?.streamUrl}
                onPress={() => void handleControlVideo("idle", 0)}
                style={({ pressed }) => [
                  styles.videoControlButton,
                  styles.videoControlButtonDanger,
                  pressed && styles.pressed,
                  (!room?.streamUrl || isManagingRoom) && styles.controlDisabled,
                ]}
              >
                <Ionicons name="close" size={16} color={theme.colors.danger} />
                <Text style={styles.videoControlButtonDangerText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
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
              label={isLive ? "Odayı güncelle" : "Odayı başlat"}
              loading={isManagingRoom}
              style={styles.adminActionButton}
              icon={<Ionicons name="radio" size={18} color={theme.colors.onPrimary} />}
              onPress={() => void handleStartRoom()}
            />
          </View>
          </View>
        </BottomSheet>
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
      </View>
          </View>
        }
        ListEmptyComponent={
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
        }
        ListFooterComponent={
          <View style={styles.chatFooter}>
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
        }
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screenRoot: {
      flex: 1,
      padding: 0,
      paddingBottom: 0,
    },
    screen: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: 132,
    },
    pageSections: {
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    header: {
      gap: theme.spacing.xs,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    adminSettingsButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(128, 128, 128, 0.14)",
    },
    pressed: {
      opacity: 0.78,
    },
    liveBadge: {
      alignSelf: "flex-start",
      minHeight: 32,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.isDark ? theme.colors.elevated : "#F5F5F5",
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
      borderColor: "rgba(128, 128, 128, 0.14)",
    },
    countText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    stage: {
      minHeight: 0,
      borderRadius: 30,
      overflow: "hidden",
      justifyContent: "space-between",
      backgroundColor: theme.isDark ? "#10131B" : "#171923",
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
    spaceStage: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.isDark ? "#10131B" : "#11131B",
    },
    spaceHeader: {
      position: "relative",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
    },
    spacePulseRing: {
      position: "absolute",
      left: -5,
      top: -5,
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: theme.colors.primary,
    },
    spaceIcon: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)",
    },
    spaceHeaderText: {
      flex: 1,
      gap: 2,
    },
    spaceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    waveBars: {
      width: 38,
      height: 18,
      borderRadius: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    waveBar: {
      width: 3,
      height: 10,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    waveBarSmall: {
      height: 6,
      opacity: 0.72,
    },
    waveBarTall: {
      height: 14,
      opacity: 0.86,
    },
    spaceStatsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      paddingLeft: 0,
    },
    spaceStatPill: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.09)",
    },
    spaceStatText: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: "800",
      color: "rgba(255, 255, 255, 0.82)",
    },
    spaceShareFrame: {
      overflow: "hidden",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      backgroundColor: "#07080D",
    },
    spaceShareHeader: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    spaceShareTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
    },
    spaceShareTitle: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "900",
      color: "rgba(255, 255, 255, 0.78)",
    },
    videoSyncPill: {
      minHeight: 22,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
    },
    videoSyncText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    spaceShareSoundButton: {
      width: 30,
      height: 30,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    spaceShareVideo: {
      width: "100%",
      height: 170,
      backgroundColor: "#000000",
    },
    spaceShareContainer: {
      backgroundColor: "#000000",
    },
    speakerStrip: {
      flexDirection: "row",
      flexWrap: "nowrap",
      gap: theme.spacing.xs,
    },
    speakerCard: {
      width: 126,
      minHeight: 128,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.sm,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.14)",
    },
    speakerAvatarWrap: {
      position: "relative",
    },
    micStateDot: {
      position: "absolute",
      right: -3,
      bottom: -3,
      width: 24,
      height: 24,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(128, 128, 128, 0.96)",
      borderWidth: 2,
      borderColor: "#11131B",
    },
    speakerName: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      textAlign: "center",
      maxWidth: 102,
    },
    speakerRole: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.62)",
      textAlign: "center",
    },
    stageControlPanel: {
      gap: theme.spacing.xs,
      paddingTop: 2,
    },
    stageControlHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    stageControlTitle: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "800",
      color: "rgba(255, 255, 255, 0.66)",
      textTransform: "uppercase",
    },
    stageControlHint: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.44)",
    },
    stageControlList: {
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.md,
    },
    stageControlChip: {
      minHeight: 40,
      maxWidth: 160,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingLeft: 6,
      paddingRight: theme.spacing.sm,
      backgroundColor: "rgba(255, 255, 255, 0.09)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.10)",
    },
    stageControlText: {
      maxWidth: 82,
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    liveSpeakerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    liveSpeakerAction: {
      minHeight: 34,
      maxWidth: "100%",
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.10)",
    },
    liveSpeakerActionText: {
      minWidth: 58,
      flexShrink: 1,
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    liveSpeakerMiniButton: {
      width: 28,
      height: 28,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    liveSpeakerKickButton: {
      backgroundColor: "rgba(239, 68, 68, 0.72)",
    },
    liveKitErrorBox: {
      borderRadius: 14,
      padding: theme.spacing.sm,
      flexDirection: "row",
      gap: theme.spacing.xs,
      backgroundColor: "rgba(255, 209, 102, 0.10)",
      borderWidth: 1,
      borderColor: "rgba(255, 209, 102, 0.24)",
    },
    liveKitErrorText: {
      flex: 1,
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.78)",
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
      flex: 1,
      fontSize: 20,
      lineHeight: 25,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    stageDescription: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.76)",
    },
    stageActionArea: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    roomActionDock: {
      minHeight: 58,
      borderRadius: 24,
      padding: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    roomActionButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    roomActionButtonPrimary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    roomActionButtonDanger: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    roomActionButtonMuted: {
      opacity: 0.72,
    },
    roomActionButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    micButtonContainer: {
      position: "relative",
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    speakingIndicator: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "rgba(128, 128, 128, 0.8)",
      borderWidth: 2,
      borderColor: theme.colors.elevated,
    },
    speakingIndicatorActive: {
      backgroundColor: "#4CAF50",
    },
    micLevelBars: {
      position: "absolute",
      left: 25,
      bottom: 1,
      width: 14,
      height: 14,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 2,
    },
    micLevelBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: "rgba(128, 128, 128, 0.45)",
    },
    micLevelBarActive: {
      backgroundColor: "#34C759",
    },
    roomActionLabel: {
      ...theme.typography.caption,
      color: theme.colors.onPrimary,
      fontWeight: "900",
    },
    roomActionLabelSecondary: {
      flexShrink: 1,
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
    },
    roomActionLabelSpeaking: {
      color: "#34C759",
    },
    roomActionLabelActive: {
      color: theme.colors.onPrimary,
    },
    roomActionLabelMuted: {
      color: "#FF3B30",
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
      borderColor: "rgba(128, 128, 128, 0.16)",
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
    videoControlPanel: {
      gap: theme.spacing.sm,
      borderRadius: 18,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    videoControlHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    videoControlTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
    },
    videoControlHint: {
      ...theme.typography.caption,
      maxWidth: 230,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    videoControlStatus: {
      minHeight: 28,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    videoControlStatusText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "800",
      color: theme.colors.text,
    },
    videoControlGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    videoControlButton: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    videoControlButtonPrimary: {
      backgroundColor: theme.colors.text,
      borderColor: theme.colors.text,
    },
    videoControlButtonDanger: {
      backgroundColor: theme.colors.surface,
      borderColor: "rgba(239, 68, 68, 0.28)",
    },
    videoControlButtonText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
    },
    videoControlButtonPrimaryText: {
      ...theme.typography.caption,
      color: theme.colors.background,
      fontWeight: "900",
    },
    videoControlButtonDangerText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
      fontWeight: "900",
    },
    controlDisabled: {
      opacity: 0.42,
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
    participantsSection: {
      gap: theme.spacing.sm,
    },
    participantsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    participantsTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    participantsCount: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    participantsCountButton: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingLeft: theme.spacing.sm,
      paddingRight: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantsHorizontalList: {
      gap: theme.spacing.sm,
      paddingHorizontal: 0,
      paddingRight: theme.spacing.lg,
    },
    participantCard: {
      width: 104,
      minHeight: 118,
      alignItems: "center",
      gap: theme.spacing.xxs,
      padding: theme.spacing.sm,
      borderRadius: 22,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantCardPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    participantCardSpeaker: {
      backgroundColor: "rgba(76, 175, 80, 0.1)",
      borderColor: "rgba(76, 175, 80, 0.3)",
    },
    participantCardAvatarWrap: {
      position: "relative",
    },
    speakerBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#4CAF50",
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    premiumBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    participantCardName: {
      ...theme.typography.caption,
      color: theme.colors.text,
      textAlign: "center",
      fontWeight: "800",
      maxWidth: 84,
    },
    participantCardSheet: {
      width: "100%",
      minHeight: 72,
      flexDirection: "row",
      justifyContent: "flex-start",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    participantCardCopy: {
      flex: 1,
      minWidth: 0,
    },
    participantCardNameSheet: {
      maxWidth: "100%",
      textAlign: "left",
    },
    participantCardRole: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
      marginTop: 2,
    },
    moreParticipantsCard: {
      width: 104,
      minHeight: 118,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    moreParticipantsText: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontVariant: ["tabular-nums"],
    },
    moreParticipantsLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
    },
    participantsSheet: {
      maxHeight: 560,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    participantsSheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    participantsSheetTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 22,
    },
    participantsSheetSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      marginTop: 2,
    },
    sheetCloseButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantsSheetList: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
    },
    handRaisedBadge: {
      minHeight: 18,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      backgroundColor: theme.colors.primary,
    },
    participantCardAdminActions: {
      flexDirection: "row",
      gap: 4,
      marginTop: 4,
    },
    participantCardAdminButton: {
      width: 22,
      height: 22,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantCardAdminDanger: {
      borderColor: "rgba(239, 68, 68, 0.30)",
    },
    participantGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    participant: {
      width: "31.8%",
      minHeight: 116,
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
    handRaisedPill: {
      minHeight: 20,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      backgroundColor: theme.colors.primary,
    },
    handRaisedText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    participantAdminActions: {
      flexDirection: "row",
      gap: 5,
      marginTop: 2,
    },
    participantAdminButton: {
      width: 26,
      height: 26,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    participantAdminDanger: {
      borderColor: "rgba(239, 68, 68, 0.30)",
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
      backgroundColor: theme.isDark ? theme.colors.elevated : "#F5F5F5",
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
      minHeight: 190,
      borderRadius: 26,
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
      borderColor: "rgba(128, 128, 128, 0.35)",
      backgroundColor: theme.isDark
        ? "rgba(128, 128, 128, 0.22)"
        : "rgba(128, 128, 128, 0.12)",
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
    messageFooter: {
      minHeight: 22,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: 2,
    },
    messageFooterOwn: {
      justifyContent: "flex-end",
    },
    messageReportButton: {
      minHeight: 22,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      backgroundColor: theme.colors.elevated,
    },
    messageReportText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    chatFooter: {
      paddingTop: theme.spacing.sm,
    },
    chatComposer: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: 26,
      padding: theme.spacing.xxs,
      paddingLeft: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
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
