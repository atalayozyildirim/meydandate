// Akış post kartını, yorumları ve yanıt formunu gösterir.
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type { User } from "@/domain/entities/User";
import { useFeedComments } from "@/features/feed/hooks/useFeed";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { formatDateTime } from "@/shared/utils/date";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

interface FeedPostCardProps {
  post: FeedPost;
  currentUser: User;
  onLike: (postId: string) => Promise<unknown>;
  onComment: (postId: string, body: string) => Promise<unknown>;
  onReply: (postId: string, commentId: string, body: string) => Promise<unknown>;
  onReport: (postId: string) => Promise<unknown>;
  onDelete: (postId: string) => Promise<unknown>;
  onPermanentBan: (error: unknown) => void;
  canDelete?: boolean;
  disabled?: boolean;
}

const feedTagDisplayLabels: Record<FeedTag, string> = {
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

export const FeedPostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  onReport,
  onDelete,
  onPermanentBan,
  canDelete = false,
  disabled = false,
}: FeedPostCardProps) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const {
    comments,
    isLoadingComments,
    fetchMoreComments,
    hasMoreComments,
    isFetchingMoreComments,
  } = useFeedComments(post.id, isCommentsOpen);
  const liked = post.likedByUserIds.includes(currentUser.id);
  const replyCount = comments.reduce((total, comment) => total + comment.replies.length, 0);
  const commentActionLabel =
    comments.length > 0 ? `${comments.length}${hasMoreComments ? "+" : ""}` : "Yorum";
  const openProfile = (userId: string) => {
    router.push({ pathname: "/tabs/profile/[userId]", params: { userId } });
  };

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

  const deletePost = () => {
    Alert.alert("Post silinsin mi?", "Bu post ve bağlı yorumları akıştan kaldırılacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void onDelete(post.id).catch((error) => {
            Alert.alert("Post silinemedi", error instanceof Error ? error.message : "Tekrar deneyin.");
          });
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.postRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${sanitizePlainText(post.author.name, 80)} profilini aç`}
          onPress={() => openProfile(post.authorId)}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <Avatar name={post.author.name} uri={post.author.photos[0]?.uri} size={44} />
        </Pressable>

        <View style={styles.postContent}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${sanitizePlainText(post.author.name, 80)} profilini aç`}
              onPress={() => openProfile(post.authorId)}
              style={({ pressed }) => [styles.authorButton, pressed && styles.pressed]}
            >
              <View style={styles.headerBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {sanitizePlainText(post.author.name, 80)}
                  </Text>
                  {post.isPinned ? (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={11} color={theme.colors.primary} />
                      <Text style={styles.pinnedText}>Sabit</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>{formatDateTime(post.createdAt)}</Text>
              </View>
            </Pressable>
            <View style={styles.headerActions}>
              {canDelete ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={deletePost}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={reportPost}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Ionicons name="flag-outline" size={18} color={theme.colors.muted} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.body}>{sanitizePlainText(post.body, 2000)}</Text>

          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{feedTagDisplayLabels[tag]}</Text>
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
                size={19}
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
              <Ionicons name="chatbubble-outline" size={18} color={theme.colors.muted} />
              <Text style={styles.actionText}>{commentActionLabel}</Text>
            </Pressable>
            <View style={styles.action}>
              <Ionicons name="return-down-back-outline" size={18} color={theme.colors.muted} />
              <Text style={styles.actionText}>{replyCount}</Text>
            </View>
          </View>

          {isCommentsOpen ? (
            <View style={styles.comments}>
          <View style={styles.commentComposer}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              maxLength={1000}
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

          {isLoadingComments ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <Text style={styles.emptyComments}>Henüz yorum yok. İlk yorumu sen yaz.</Text>
          ) : null}

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentBlock}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openProfile(comment.authorId)}
                style={({ pressed }) => [styles.commentHeader, pressed && styles.pressed]}
              >
                <Avatar name={comment.author.name} uri={comment.author.photos[0]?.uri} size={32} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentName}>{sanitizePlainText(comment.author.name, 80)}</Text>
                  <Text style={styles.commentText}>{sanitizePlainText(comment.body, 1000)}</Text>
                </View>
              </Pressable>
              {comment.replies.map((reply) => (
                <Pressable
                  key={reply.id}
                  accessibilityRole="button"
                  onPress={() => openProfile(reply.authorId)}
                  style={({ pressed }) => [styles.replyRow, pressed && styles.pressed]}
                >
                  <Avatar name={reply.author.name} uri={reply.author.photos[0]?.uri} size={26} />
                  <View style={styles.replyBody}>
                    <Text style={styles.replyName}>{sanitizePlainText(reply.author.name, 80)}</Text>
                    <Text style={styles.replyText}>{sanitizePlainText(reply.body, 1000)}</Text>
                  </View>
                </Pressable>
              ))}
              <View style={styles.replyComposer}>
                <TextInput
                  value={replyInputs[comment.id] ?? ""}
                  onChangeText={(value) =>
                    setReplyInputs((current) => ({ ...current, [comment.id]: value }))
                  }
                  maxLength={1000}
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
          {hasMoreComments ? (
            <Button
              label="Daha fazla yorum"
              variant="ghost"
              loading={isFetchingMoreComments}
              style={styles.loadMoreCommentsButton}
              onPress={() => void fetchMoreComments()}
            />
          ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
      padding: 0,
      backgroundColor: theme.colors.surface,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    postRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    avatarButton: {
      paddingTop: 2,
    },
    postContent: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    headerBody: {
      flex: 1,
    },
    authorButton: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      flexShrink: 1,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    pinnedBadge: {
      minHeight: 20,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      backgroundColor: "rgba(233, 64, 87, 0.08)",
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
      fontSize: 16,
      lineHeight: 23,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },
    tag: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 4,
      backgroundColor: "rgba(233, 64, 87, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.10)",
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: theme.spacing.xs,
      paddingRight: theme.spacing.lg,
    },
    action: {
      minHeight: 32,
      minWidth: 62,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingRight: theme.spacing.sm,
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
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: "rgba(17, 24, 39, 0.08)",
      paddingTop: theme.spacing.sm,
      marginTop: 2,
    },
    commentsLoading: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyComments: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: "center",
      paddingVertical: theme.spacing.xs,
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(17, 24, 39, 0.10)",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(17, 24, 39, 0.03)",
      ...theme.typography.body,
      color: theme.colors.text,
    },
    smallButton: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    commentBlock: {
      gap: theme.spacing.sm,
      paddingLeft: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: "rgba(233, 64, 87, 0.18)",
    },
    commentHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    commentBody: {
      flex: 1,
      borderRadius: 16,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(17, 24, 39, 0.03)",
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
      borderLeftWidth: 2,
      borderLeftColor: "rgba(17, 24, 39, 0.10)",
      paddingLeft: theme.spacing.sm,
    },
    replyBody: {
      flex: 1,
      borderRadius: 16,
      padding: theme.spacing.xs,
      backgroundColor: "rgba(17, 24, 39, 0.03)",
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
    loadMoreCommentsButton: {
      minHeight: 42,
    },
  });
