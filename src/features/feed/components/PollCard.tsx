// Akış anket kartı: oy öncesi seçenek butonları, oy sonrası bar grafik görünümü.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedPoll } from "@/domain/entities/Feed";
import { useTheme, type AppTheme } from "@/shared/theme";

interface PollCardProps {
  poll: FeedPoll;
  onVote: (optionId: string) => void;
  disabled?: boolean;
}

export const PollCard = ({ poll, onVote, disabled }: PollCardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const hasVoted = Boolean(poll.votedOptionId);
  const isEnded = poll.endsAt ? new Date(poll.endsAt) <= new Date() : false;
  const showResults = hasVoted || isEnded;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{poll.question}</Text>

      {poll.options.map((option) => {
        const pct =
          poll.totalVotes > 0
            ? Math.round((option.voteCount / poll.totalVotes) * 100)
            : 0;
        const isVoted = poll.votedOptionId === option.id;

        if (showResults) {
          return (
            <View key={option.id} style={styles.resultRow}>
              <View style={[styles.resultBar, { width: `${pct}%` as `${number}%` }]} />
              <View style={styles.resultContent}>
                <Text style={styles.resultText}>{option.text}</Text>
                <View style={styles.resultRight}>
                  {isVoted ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={theme.colors.text}
                    />
                  ) : null}
                  <Text style={styles.resultPct}>{pct}%</Text>
                </View>
              </View>
            </View>
          );
        }

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`Seçenek: ${option.text}`}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
            disabled={disabled || isEnded}
            onPress={() => onVote(option.id)}
          >
            <Text style={styles.optionText}>{option.text}</Text>
          </Pressable>
        );
      })}

      <Text style={styles.meta}>
        {poll.totalVotes} oy
        {poll.endsAt
          ? ` · ${isEnded ? "Sona erdi" : "Aktif"}`
          : ""}
      </Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    question: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      color: theme.colors.text,
    },
    option: {
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    optionPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.99 }],
    },
    optionText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      fontWeight: "600",
    },
    resultRow: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
      minHeight: 44,
      justifyContent: "center",
    },
    resultBar: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.isDark
        ? "rgba(255,255,255,0.18)"
        : "rgba(0,0,0,0.10)",
      borderRadius: theme.radius.md,
    },
    resultContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    resultText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      flex: 1,
    },
    resultRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    resultPct: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.text,
      fontWeight: "700",
    },
    meta: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.muted,
    },
  });
