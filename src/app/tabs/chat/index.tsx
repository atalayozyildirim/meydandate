// Sohbet listesini conversation kartlariyla gosterir.
import { useRef } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useConversations } from "@/features/chat/hooks/useConversations";
import { formatDateTime } from "@/shared/utils/date";
import { useTheme } from "@/shared/theme";

export default function ChatListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { conversations, isLoading, deleteConversation } = useConversations();
  const swipeableRefs = useRef<Record<string, Swipeable>>({});
  const deletingConversationIds = useRef<Set<string>>(new Set());

  if (isLoading) {
    return <Loading label="Sohbetler yukleniyor" />;
  }

  const activeConversationCount = conversations.filter(
    (conversation) => conversation.messages.length > 0,
  ).length;

  const handleDelete = async (conversationId: string) => {
    if (deletingConversationIds.current.has(conversationId)) {
      return;
    }

    deletingConversationIds.current.add(conversationId);

    try {
      await deleteConversation(conversationId);
    } catch (error) {
      Alert.alert(
        "Sohbet silinemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
      swipeableRefs.current[conversationId]?.close();
    } finally {
      deletingConversationIds.current.delete(conversationId);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Mesajlar</Text>
          <Text style={styles.title}>Sohbetlerin</Text>
          <Text style={styles.subtitle}>
            Beğendiklerin ve eşleşmelerinle konuşmalarına tek yerden ulaş.
          </Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryValue}>{conversations.length}</Text>
          <Text style={styles.summaryLabel}>Toplam</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroStat}>
          <Text style={styles.heroValue}>{activeConversationCount}</Text>
          <Text style={styles.heroLabel}>Aktif sohbet</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroValue}>
            {Math.max(conversations.length - activeConversationCount, 0)}
          </Text>
          <Text style={styles.heroLabel}>Yeni sohbet</Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          title="Sohbet yok"
          description="Birini beğendiğinde eşleşmeyi beklemeden mesaj gönderebilirsin."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {conversations.map((conversation) => {
            const partner =
              conversation.participants.find(
                (user) => user.id !== currentUser?.id,
              ) ?? conversation.participants[1];
            const lastMessage = conversation.messages.at(-1);
            const preview =
              lastMessage?.body ?? "Henüz mesaj yok. Ilk mesaj senden gelsin.";

            return (
              <Swipeable
                key={conversation.id}
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current[conversation.id] = ref;
                  }
                }}
                renderRightActions={() => (
                  <Pressable
                    onPress={() => void handleDelete(conversation.id)}
                    style={styles.deleteAction}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FFF" />
                    <Text style={styles.deleteActionText}>Sil</Text>
                  </Pressable>
                )}
                onSwipeableRightOpen={() => void handleDelete(conversation.id)}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/tabs/chat/[conversationId]",
                      params: { conversationId: conversation.id },
                    })
                  }
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Card style={styles.conversationCard}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: "/tabs/profile/[userId]",
                          params: { userId: partner.id },
                        });
                      }}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <View style={styles.avatarWrap}>
                        <Avatar
                          name={partner.name}
                          uri={partner.photos[0]?.uri}
                          size={58}
                        />
                        {conversation.typingState?.isTyping ? (
                          <View style={styles.onlineDot} />
                        ) : null}
                      </View>
                    </Pressable>
                    <View style={styles.body}>
                      <View style={styles.row}>
                        <Text numberOfLines={1} style={styles.name}>
                          {partner.name}
                        </Text>
                        <Text style={styles.time}>
                          {formatDateTime(conversation.updatedAt)}
                        </Text>
                      </View>
                      <Text numberOfLines={2} style={styles.preview}>
                        {preview}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>
                            {conversation.matchId
                              ? "Eşleşme"
                              : conversation.initiatedById === currentUser?.id
                                ? "Beğendin"
                                : "Seni beğendi"}
                          </Text>
                        </View>
                        {conversation.typingState?.isTyping ? (
                          <Text style={styles.typing}>Yaziyor...</Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Swipeable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
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
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.muted,
      marginTop: theme.spacing.xs,
      maxWidth: 260,
    },
    summaryBadge: {
      minWidth: 72,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.elevated,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryValue: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    summaryLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroStat: {
      flex: 1,
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    heroValue: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    heroLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    heroDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.985 }],
    },
    conversationCard: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "center",
      paddingVertical: theme.spacing.md,
    },
    avatarWrap: {
      position: "relative",
    },
    onlineDot: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 12,
      height: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    body: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    time: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    preview: {
      ...theme.typography.body,
      color: theme.colors.muted,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    pill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.isDark
        ? theme.colors.background
        : theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pillText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    typing: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    deleteAction: {
      backgroundColor: theme.colors.danger,
      justifyContent: "center",
      alignItems: "center",
      width: 76,
      height: "100%",
      borderRadius: theme.radius.lg,
      flexDirection: "column",
      gap: 4,
    },
    deleteActionText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
  });
