// Akış post kartını, yorumları ve yanıt formunu gösterir.
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedPost } from "@/domain/entities/Feed";
import type { User } from "@/domain/entities/User";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { formatDateTime } from "@/shared/utils/date";
import { useTheme } from "@/shared/theme";

interface FeedPostCardProps {
  post: FeedPost;
  currentUser: User;
  onLike: (postId: string) => Promise<unknown>;
  onComment: (postId: string, body: string) => Promise<unknown>;
  onReply: (postId: string, commentId: string, body: string) => Promise<unknown>;
  onReport: (postId: string) => Promise<unknown>;
  onPermanentBan: (error: unknown) => void;
  disabled?: boolean;
}

export const FeedPostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  onReport,
  onPermanentBan,
  disabled = false,
}: FeedPostCardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [isCommentsOpen, setIsCommentsOpen] = useState(post.comments.length > 0);
  const [commentText, setCommentText] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const liked = post.likedByUserIds.includes(currentUser.id);

  const submitComment = async () => {
    const body = commentText.trim();

    if (!body) {
      return;
    }

    try {
      await onComment(post.id, body);
      setCommentText("");
      setIsCommentsOpen(true);
    } catch (error) {
      if (isPermanentBanError(error)) {
        onPermanentBan(error);
        return;
      }

      Alert.alert("Yorum gönderilemedi", error instanceof Error ? error.message : "Tekrar deneyin.");
    }
  };

  const submitReply = async (commentId: string) => {
    const body = replyInputs[commentId]?.trim();

    if (!body) {
      return;
    }

    try {
      await onReply(post.id, commentId, body);
      setReplyInputs((current) => ({ ...current, [commentId]: "" }));
    } catch (error) {
      if (isPermanentBanError(error)) {
        onPermanentBan(error);
        return;
      }

      Alert.alert("Yanıt gönderilemedi", error instanceof Error ? error.message : "Tekrar deneyin.");
    }
  };

  const reportPost = () => {
    Alert.alert("Post bildirilsin mi?", "Bu post moderasyon kuyruğuna alınacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Bildir",
        style: "destructive",
        onPress: () => {
          void onReport(post.id).catch((error) => {
            Alert.alert("Bildirim alınamadı", error instanceof Error ? error.message : "Tekrar deneyin.");
          });
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author.name} uri={post.author.photos[0]?.uri} size={46} />
        <View style={styles.headerBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.author.name}</Text>
            {post.isPinned ? (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color={theme.colors.primary} />
                <Text style={styles.pinnedText}>Sabit</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>{formatDateTime(post.createdAt)}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={reportPost} style={styles.iconButton}>
          <Ionicons name="flag-outline" size={20} color={theme.colors.muted} />
        </Pressable>
      </View>

      <Text style={styles.body}>{post.body}</Text>

      <View style={styles.tagRow}>
        {post.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => void onLike(post.id)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? theme.colors.primary : theme.colors.muted}
          />
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>
            {post.likedByUserIds.length}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsCommentsOpen((current) => !current)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="chatbubble-outline" size={19} color={theme.colors.muted} />
          <Text style={styles.actionText}>{post.comments.length}</Text>
        </Pressable>
        <View style={styles.action}>
          <Ionicons name="return-down-back-outline" size={19} color={theme.colors.muted} />
          <Text style={styles.actionText}>
            {post.comments.reduce((total, comment) => total + comment.replies.length, 0)}
          </Text>
        </View>
      </View>

      {isCommentsOpen ? (
        <View style={styles.comments}>
          <View style={styles.commentComposer}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Yorum yaz..."
              placeholderTextColor={theme.colors.muted}
              style={styles.commentInput}
              multiline
            />
            <Button
              label="Gönder"
              disabled={disabled || !commentText.trim()}
              style={styles.smallButton}
              onPress={() => void submitComment()}
            />
          </View>

          {post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentBlock}>
              <View style={styles.commentHeader}>
                <Avatar name={comment.author.name} uri={comment.author.photos[0]?.uri} size={32} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentName}>{comment.author.name}</Text>
                  <Text style={styles.commentText}>{comment.body}</Text>
                </View>
              </View>
              {comment.replies.map((reply) => (
                <View key={reply.id} style={styles.replyRow}>
                  <Avatar name={reply.author.name} uri={reply.author.photos[0]?.uri} size={26} />
                  <View style={styles.replyBody}>
                    <Text style={styles.replyName}>{reply.author.name}</Text>
                    <Text style={styles.replyText}>{reply.body}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.replyComposer}>
                <TextInput
                  value={replyInputs[comment.id] ?? ""}
                  onChangeText={(value) =>
                    setReplyInputs((current) => ({ ...current, [comment.id]: value }))
                  }
                  placeholder="Yanıt yaz..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.replyInput}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled || !replyInputs[comment.id]?.trim()}
                  onPress={() => void submitReply(comment.id)}
                  style={styles.replyButton}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.md,
      borderRadius: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerBody: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexWrap: "wrap",
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    pinnedBadge: {
      minHeight: 24,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: theme.spacing.xs,
      backgroundColor: "#FFF0F3",
    },
    pinnedText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    tag: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      backgroundColor: theme.colors.elevated,
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    action: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    actionText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    actionTextActive: {
      color: theme.colors.primary,
    },
    pressed: {
      opacity: 0.78,
    },
    comments: {
      gap: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
    },
    commentComposer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.xs,
    },
    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 96,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    smallButton: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    commentBlock: {
      gap: theme.spacing.sm,
    },
    commentHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    commentBody: {
      flex: 1,
      borderRadius: 18,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
    },
    commentName: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    commentText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    replyRow: {
      marginLeft: 38,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    replyBody: {
      flex: 1,
      borderRadius: 16,
      padding: theme.spacing.xs,
      backgroundColor: "rgba(255, 240, 243, 0.72)",
    },
    replyName: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    replyText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    replyComposer: {
      marginLeft: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    replyInput: {
      flex: 1,
      minHeight: 38,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    replyButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
  });
