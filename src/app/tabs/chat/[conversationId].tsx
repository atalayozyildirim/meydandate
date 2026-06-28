// Tekil conversation ekraninda mesajlari ve mesaj gonderme formunu yonetir.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Message } from "@/domain/entities/Message";
import { Avatar } from "@/shared/components/Avatar";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { conversationStarters } from "@/shared/constants/options";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { useConversation } from "@/features/chat/hooks/useConversations";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useSafetyActions } from "@/features/profile/hooks/useSafetyActions";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";

const HEART_MESSAGE = "❤️";
const MESSAGE_REPORT_CONTEXT_LIMIT = 20;
// eslint-disable-next-line global-require
const loveJson = require("../../../../assets/lottie/love.json");

interface FloatingHeart {
  id: string;
  animated: Animated.Value;
  xOffset: number; // rastgele yatay konum (sag alt)
  drift: number; // yukari cikis sirasindaki yatay sapma
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const safetyActions = useSafetyActions();
  const [message, setMessage] = useState("");
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const lastAnimatedHeartIdRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const previousMessageCountRef = useRef(0);
  const {
    conversation,
    currentUser,
    isLoading,
    sendMessage,
    isSending,
    deleteMessage,
    isDeletingMessage,
  } = useConversation(conversationId);

  // spawnHeart - X canli yayin efekti: alt sagdan yukari yukseliyor
  const spawnHeart = useCallback((_isOwn: boolean) => {
    const id = `heart-${Date.now()}-${Math.random()}`;
    const animated = new Animated.Value(0);
    // Sagda biraz rastgele konum: 8px - 80px sag kenardan
    const xOffset = Math.floor(Math.random() * 72) + 8;
    // Yukari cikista hafif sola/saga sapma: -20 ile +20
    const drift = Math.floor(Math.random() * 40) - 20;
    setFloatingHearts((current) => [
      ...current,
      { id, animated, xOffset, drift },
    ]);

    Animated.timing(animated, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setFloatingHearts((current) =>
        current.filter((heart) => heart.id !== id),
      );
    });
  }, []);

  // Erken return'den ONCE — hook kurali
  useEffect(() => {
    const lastMessage = conversation?.messages.at(-1);

    if (
      !lastMessage ||
      !currentUser ||
      lastMessage.id === lastAnimatedHeartIdRef.current ||
      lastMessage.body.trim() !== HEART_MESSAGE ||
      lastMessage.senderId === currentUser.id
    ) {
      return;
    }

    lastAnimatedHeartIdRef.current = lastMessage.id;
    spawnHeart(false);
  }, [conversation?.messages, currentUser, spawnHeart]);

  // Otomatik scroll - yeni mesaj geldiğinde aşağı kaydır
  useEffect(() => {
    const currentMessageCount = conversation?.messages.length ?? 0;
    
    // İlk yükleme veya mesaj sayısı arttıysa scroll yap
    if (currentMessageCount > 0 && currentMessageCount > previousMessageCountRef.current) {
      // Bir sonraki render'da scroll yap
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    previousMessageCountRef.current = currentMessageCount;
  }, [conversation?.messages]);

  // İlk yükleme sırasında en son mesaja scroll
  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 300);
    }
  }, [conversation?.id]);

  if (isLoading || !currentUser) {
    return <Loading label="Sohbet aciliyor" />;
  }

  if (!conversation) {
    return (
      <Screen scroll={false} style={styles.screen}>
        <View style={styles.missingState}>
          <View style={styles.missingIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={34}
              color={theme.colors.muted}
            />
          </View>
          <Text style={styles.missingTitle}>Konuşma bulunamadı</Text>
          <Text style={styles.missingDescription}>
            Bu sohbet silinmiş veya artık erişimin yok.
          </Text>
          <Pressable
            onPress={() => router.replace("/tabs/chat")}
            style={({ pressed }) => [
              styles.missingButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.missingButtonText}>Sohbetlere dön</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const partner =
    conversation.participants.find((user) => user.id !== currentUser.id) ??
    conversation.participants[1];

  const submitMessage = async (body: string) => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    try {
      await sendMessage(trimmedBody);
      setMessage("");
      // Mesaj gönderildikten sonra aşağı scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
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
        "Mesaj gonderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const sendHeart = async () => {
    try {
      await sendMessage(HEART_MESSAGE);
      spawnHeart(true);
      // Kalp gönderildikten sonra aşağı scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      Alert.alert(
        "Kalp gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const removeMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      Alert.alert(
        "Mesaj silinemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const reportMessage = (reportedMessage: Message) => {
    if (reportedMessage.senderId === currentUser.id) {
      Alert.alert("Bu mesaj sana ait", "Kendi mesajını şikayet edemezsin.");
      return;
    }

    const contextMessages = conversation.messages.slice(
      -MESSAGE_REPORT_CONTEXT_LIMIT,
    );
    const reportedBody = reportedMessage.body.trim();
    const contextEvidence = contextMessages.map((item) => {
      const senderLabel =
        item.senderId === currentUser.id
          ? "şikayet eden"
          : item.senderId === reportedMessage.senderId
            ? "şikayet edilen"
            : item.senderId;

      return `context:${new Date(item.createdAt).toISOString()} | ${senderLabel} | ${item.body.trim().slice(0, 280)}`;
    });
    const description = [
      "Mesaj şikayeti",
      `Konuşma: ${conversation.id}`,
      `Mesaj: ${reportedMessage.id}`,
      `İçerik: ${reportedBody.slice(0, 900)}`,
    ].join("\n");

    Alert.alert(
      "Mesaj şikayet edilsin mi?",
      "Bu mesaj ve son konuşma bağlamı moderasyon paneline düşecek.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Şikayet et",
          style: "destructive",
          onPress: () => {
            void safetyActions
              .reportUser({
                reportedUserId: reportedMessage.senderId,
                category: "harassment",
                description,
                evidence: [
                  "type:message",
                  `conversationId:${conversation.id}`,
                  `messageId:${reportedMessage.id}`,
                  `reportedMessage:${reportedBody.slice(0, 900)}`,
                  ...contextEvidence,
                ],
              })
              .then(() => {
                Alert.alert(
                  "Şikayet alındı",
                  "Mesaj moderasyon ekibine gönderildi.",
                );
              })
              .catch((error) => {
                Alert.alert(
                  "Şikayet gönderilemedi",
                  error instanceof Error ? error.message : "Tekrar deneyin.",
                );
              });
          },
        },
      ],
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/tabs/profile/[userId]",
                params: { userId: partner.id },
              })
            }
            style={({ pressed }) => [
              styles.partnerButton,
              pressed && styles.partnerButtonPressed,
            ]}
          >
            <Avatar
              name={partner.name}
              uri={partner.photos[0]?.uri}
              size={42}
            />
            <View style={styles.headerBody}>
              <Text style={styles.name}>{partner.name}</Text>
              <Text style={styles.status}>
                {conversation.typingState?.isTyping
                  ? "Yaziyor..."
                  : conversation.matchId
                    ? "Eşleşme"
                    : "Beğeni sonrası sohbet"}
              </Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.encryptionNotice}>
          <Ionicons name="lock-closed" size={13} color={theme.colors.muted} />
          <Text style={styles.encryptionNoticeText}>
            Mesajlar güvenli bağlantı üzerinden aktarılır
          </Text>
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {conversation.messages.map((item) => (
            <MessageBubble
              key={item.id}
              message={item}
              isOwn={item.senderId === currentUser.id}
              disabled={isDeletingMessage}
              onDelete={(messageId) => void removeMessage(messageId)}
              onReport={reportMessage}
            />
          ))}
          {conversation.messages.length === 0 ? (
            <View style={styles.starters}>
              <Text style={styles.starterTitle}>Sohbet baslat</Text>
              {conversationStarters.map((starter) => (
                <Pressable
                  key={starter}
                  onPress={() => void submitMessage(starter)}
                  style={styles.starterChip}
                >
                  <Text style={styles.starterText}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Mesaj yaz"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            disabled={isSending}
            onPress={() => void sendHeart()}
            style={({ pressed }) => [
              styles.heartButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="heart" size={22} color={theme.colors.primary} />
          </Pressable>
          <Pressable
            disabled={isSending}
            onPress={() => void submitMessage(message)}
            style={styles.sendButton}
          >
            <Ionicons name="send" size={20} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
        <View pointerEvents="none" style={styles.heartLayer}>
          {floatingHearts.map((heart) => {
            const opacity = heart.animated.interpolate({
              inputRange: [0, 0.08, 0.75, 1],
              outputRange: [0, 1, 1, 0],
            });

            const translateY = heart.animated.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -340],
            });

            const translateX = heart.animated.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, heart.drift * 0.5, heart.drift],
            });

            const scale = heart.animated.interpolate({
              inputRange: [0, 0.12, 0.4, 1],
              outputRange: [0.6, 1.9, 1.55, 1],
            });

            return (
              <Animated.View
                key={heart.id}
                style={[
                  styles.lottieWrapper,
                  { right: heart.xOffset },
                  {
                    opacity,
                    transform: [{ translateY }, { translateX }, { scale }],
                  },
                ]}
              >
                <LottieView
                  source={loveJson}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                />
              </Animated.View>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>, bottomInset: number) =>
  StyleSheet.create({
    screen: {
      paddingBottom: 0,
    },
    keyboard: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    encryptionNotice: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    encryptionNoticeText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontSize: 11,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    partnerButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    partnerButtonPressed: {
      opacity: 0.75,
    },
    headerBody: {
      flex: 1,
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    status: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    messages: {
      flexGrow: 1,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    messageList: {
      flex: 1,
    },
    starters: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xl,
    },
    starterTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      textAlign: "center",
    },
    starterChip: {
      borderRadius: theme.radius.pill,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
    },
    starterText: {
      ...theme.typography.body,
      color: theme.colors.text,
      textAlign: "center",
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      marginBottom:
        Platform.OS === "ios"
          ? Math.max(bottomInset, 12) + 16
          : Math.max(bottomInset, theme.spacing.sm),
      backgroundColor: theme.colors.background,
    },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 110,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    heartButton: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendButton: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    buttonPressed: {
      opacity: 0.82,
    },
    missingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    missingIcon: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    missingTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
      textAlign: "center",
    },
    missingDescription: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: "center",
    },
    missingButton: {
      minHeight: 48,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
    },
    missingButtonText: {
      ...theme.typography.subheading,
      color: theme.colors.onPrimary,
    },
    heartLayer: {
      ...StyleSheet.absoluteFillObject,
      // Kullanici etkilesimini engelleme - sadece gorsel katman
      pointerEvents: "none",
    },
    lottieWrapper: {
      position: "absolute",
      // composer'in uzerinde, ekranin sag alt kosesinde spawn olur
      bottom: 90,
      width: 154,
      height: 154,
    },
    lottie: {
      width: 154,
      height: 154,
    },
  });
