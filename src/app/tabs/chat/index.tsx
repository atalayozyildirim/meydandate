// Sohbet listesini conversation kartlariyla gosterir.
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const { conversations, isLoading } = useConversations();

  if (isLoading) {
    return <Loading label="Sohbetler yukleniyor" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Chat</Text>
        <Text style={styles.title}>Sohbetler</Text>
      </View>
      {conversations.length === 0 ? (
        <EmptyState title="Sohbet yok" description="Bir match sonrasi mesajlasma burada baslayacak." />
      ) : (
        <View style={styles.list}>
          {conversations.map((conversation) => {
            const partner = conversation.participants.find((user) => user.id !== currentUser?.id) ?? conversation.participants[1];
            const lastMessage = conversation.messages.at(-1);

            return (
              <Pressable
                key={conversation.id}
                onPress={() =>
                  router.push({
                    pathname: "/tabs/chat/[conversationId]",
                    params: { conversationId: conversation.id }
                  })
                }
              >
                <Card style={styles.conversationCard}>
                  <Avatar name={partner.name} uri={partner.photos[0]?.uri} size={58} />
                  <View style={styles.body}>
                    <View style={styles.row}>
                      <Text style={styles.name}>{partner.name}</Text>
                      <Text style={styles.time}>{formatDateTime(conversation.updatedAt)}</Text>
                    </View>
                    <Text style={styles.preview}>{lastMessage?.body ?? "Henuz mesaj yok. Ilk mesaj senden gelsin."}</Text>
                    {conversation.typingState?.isTyping ? <Text style={styles.typing}>Yaziyor...</Text> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text
    },
    list: {
      gap: theme.spacing.md
    },
    conversationCard: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "center"
    },
    body: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    time: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    preview: {
      ...theme.typography.body,
      color: theme.colors.muted
    },
    typing: {
      ...theme.typography.caption,
      color: theme.colors.primary
    }
  });
