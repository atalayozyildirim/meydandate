// Eşleşmeleri listeleyen ve sohbet akışına geçiş sağlayan sekme.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useMatches } from "@/features/match/hooks/useMatches";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { formatScore } from "@/shared/utils/score";
import { useTheme } from "@/shared/theme";

export default function MatchesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { matches, isLoading } = useMatches();

  if (isLoading) {
    return <Loading label="Eşleşmeler yükleniyor" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Matches</Text>
        <Text style={styles.title}>Eşleşmeler</Text>
      </View>
      {matches.length === 0 ? (
        <EmptyState title="Henüz eşleşme yok" description="Keşfet'te karşılıklı beğeni olduğunda burada görünecek." />
      ) : (
        <View style={styles.list}>
          {matches.map((match) => {
            const partner = match.users.find((user) => user.id !== currentUser?.id) ?? match.users[1];

            return (
              <Pressable key={match.id} onPress={() => router.push("/tabs/chat")}>
                <Card style={styles.matchCard}>
                  <Avatar name={partner.name} uri={partner.photos[0]?.uri} size={68} />
                  <View style={styles.matchBody}>
                    <Text style={styles.name}>{partner.name}</Text>
                    <Text style={styles.preview}>{match.lastMessagePreview ?? "Yeni eşleşme. Sohbete başla."}</Text>
                    <Text style={styles.score}>{formatScore(match.compatibility.cultural)} Kültürel Uyum</Text>
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
    matchCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md
    },
    matchBody: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    preview: {
      ...theme.typography.body,
      color: theme.colors.muted
    },
    score: {
      ...theme.typography.caption,
      color: theme.colors.primary
    }
  });
