// X benzeri post detay ekranı: postu, yorum composer'ını ve yanıt thread'ini gösterir.
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinkPreviewCard } from "@/features/feed/components/LinkPreviewCard";
import { PollCard } from "@/features/feed/components/PollCard";
import { QuotedPostCard } from "@/features/feed/components/QuotedPostCard";
import { useFeedComments, useFeedPost } from "@/features/feed/hooks/useFeed";
import { useUserRole } from "@/features/moderation/hooks/useModerationService";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useAuthStore } from "@/features/auth/stores/authStore";
import type { FeedTag } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { formatDateTime } from "@/shared/utils/date";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

const feedTagDisplayLabels: Record<FeedTag, string> = {
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

export default function FeedPostDetailScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = params.postId ?? "";
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const [commentText, setCommentText] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const {
    post,
    currentUser,
    isLoading,
    toggleLike,
    addComment,
    addReply,
    reportPost,
    deletePost,
    votePoll,
    isMutating,
  } = useFeedPost(postId);
  const {
    comments,
    isLoadingComments,
    fetchMoreComments,
    hasMoreComments,
    isFetchingMoreComments,
  } = useFeedComments(postId, Boolean(postId));
  const { data: currentUserRole = "user" } = useUserRole(currentUser?.id ?? "");
  const isAdmin = currentUserRole === "admin";
  const liked = post?.likedByUserIds.includes(currentUser?.id ?? "") ?? false;
  const canDelete = Boolean(post && (isAdmin || post.authorId === currentUser.id));

  const handlePermanentBan = (error: unknown) => {
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
  };

  const submitComment = async () => {
    const body = commentText.trim();

    if (!body) return;

    try {
      await addComment(body);
      setCommentText("");
    } catch (error) {
      if (isPermanentBanError(error)) {
        handlePermanentBan(error);
        return;
      }

      Alert.alert(
        "Yorum gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const submitReply = async (commentId: string) => {
    const body = replyInputs[commentId]?.trim();

    if (!body) return;

    try {
      await addReply({ commentId, body });
      setReplyInputs((current) => ({ ...current, [commentId]: "" }));
    } catch (error) {
      if (isPermanentBanError(error)) {
        handlePermanentBan(error);
        return;
      }

      Alert.alert(
        "Yanıt gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const removePost = () => {
    Alert.alert(
      "Post silinsin mi?",
      "Bu post ve bağlı yorumları akıştan kaldırılacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            void deletePost()
              .then(() => router.back())
              .catch((error) => {
                Alert.alert(
                  "Post silinemedi",
                  error instanceof Error ? error.message : "Tekrar deneyin.",
                );
              });
          },
        },
      ],
    );
  };

  const confirmReportPost = () => {
    Alert.alert(
      "Post bildirilsin mi?",
      "Bu post moderasyon kuyruğuna alınacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Bildir",
          style: "destructive",
          onPress: () => {
            void reportPost().catch((error) => {
              Alert.alert(
                "Bildirim alınamadı",
                error instanceof Error ? error.message : "Tekrar deneyin.",
              );
            });
          },
        },
      ],
    );
  };
  const quotePost = () => {
    if (!post) {
      return;
    }

    router.push({
      pathname: "/tabs/feed",
      params: { quotePostId: post.id },
    });
  };

  if (isLoading || !currentUser) {
    return <Loading label="Post açılıyor" />;
  }

  if (!post) {
    return (
      <Screen>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>Post</Text>
        </View>
        <EmptyState
          title="Post bulunamadı"
          description="Bu paylaşım silinmiş veya görüntülenemiyor olabilir."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.topTitle}>Post</Text>
          <Text style={styles.topMeta}>{comments.length} yorum</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.post}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/tabs/profile/[userId]",
                params: { userId: post.authorId },
              })
            }
            style={({ pressed }) => [
              styles.postAvatar,
              pressed && styles.pressed,
            ]}
          >
            <Avatar
              name={post.author.name}
              uri={post.author.photos[0]?.uri}
              size={46}
            />
          </Pressable>

          <View style={styles.postBody}>
            <View style={styles.postHeader}>
              <View style={styles.postHeaderCopy}>
                <Text style={styles.postName} numberOfLines={1}>
                  {sanitizePlainText(post.author.name, 80)}
                </Text>
                <Text style={styles.postDate}>{formatDateTime(post.createdAt)}</Text>
              </View>
              <View style={styles.headerActions}>
                {canDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isMutating}
                    onPress={removePost}
                    style={({ pressed }) => [
                      styles.headerIcon,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmReportPost}
                  style={({ pressed }) => [
                    styles.headerIcon,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={19}
                    color={theme.colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            <Text style={styles.postText}>{sanitizePlainText(post.body, 2000)}</Text>

            {post.quotedPost ? (
              <QuotedPostCard
                quotedPost={post.quotedPost}
                onPress={
                  post.quotedPost.id
                    ? () =>
                        router.push({
                          pathname: "/tabs/feed/[postId]",
                          params: { postId: post.quotedPost?.id ?? "" },
                        })
                    : undefined
                }
              />
            ) : null}

            {post.poll ? (
              <PollCard
                poll={post.poll}
                onVote={(optionId) =>
                  void votePoll({ pollId: post.poll!.id, optionId })
                }
                disabled={isMutating}
              />
            ) : null}

            {post.imageUrl ? (
              <Image
                accessibilityLabel={`${sanitizePlainText(post.author.name, 80)} post fotoğrafı`}
                source={{ uri: post.imageUrl }}
                resizeMode="cover"
                style={styles.postImage}
              />
            ) : null}

            {post.linkPreview ? (
              <LinkPreviewCard preview={post.linkPreview} />
            ) : null}

            {post.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {post.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{feedTagDisplayLabels[tag]}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.postActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isMutating}
                onPress={() => void toggleLike()}
                style={({ pressed }) => [
                  styles.postAction,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={21}
                  color={liked ? theme.colors.primary : theme.colors.muted}
                />
                <Text
                  style={[styles.postActionText, liked && styles.postActionActive]}
                >
                  {post.likedByUserIds.length}
                </Text>
              </Pressable>
              <View style={styles.postAction}>
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={styles.postActionText}>{comments.length}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isMutating}
                onPress={quotePost}
                style={({ pressed }) => [
                  styles.postAction,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="repeat-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={styles.postActionText}>Alıntıla</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.composer}>
          <Avatar
            name={currentUser.name}
            uri={currentUser.photos[0]?.uri}
            size={38}
          />
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            maxLength={1000}
            placeholder="Yanıtını gönder"
            placeholderTextColor={theme.colors.muted}
            style={styles.commentInput}
            multiline
          />
          <Pressable
            disabled={isMutating || !commentText.trim()}
            onPress={() => void submitComment()}
            style={({ pressed }) => [
              styles.sendButton,
              (!commentText.trim() || isMutating) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sendButtonText}>Gönder</Text>
          </Pressable>
        </View>

        <View style={styles.thread}>
          {isLoadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyThread}>
              <View style={styles.emptyThreadIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={26}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.emptyThreadTitle}>İlk yorumu sen yaz.</Text>
              <Text style={styles.emptyThreadCopy}>
                Bu postun sohbetini başlatan yorum burada görünecek.
              </Text>
            </View>
          ) : null}

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.threadRail} />
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/tabs/profile/[userId]",
                    params: { userId: comment.authorId },
                  })
                }
                style={({ pressed }) => [
                  styles.commentAvatar,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar
                  name={comment.author.name}
                  uri={comment.author.photos[0]?.uri}
                  size={38}
                />
              </Pressable>
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentName} numberOfLines={1}>
                    {sanitizePlainText(comment.author.name, 80)}
                  </Text>
                  <Text style={styles.commentDate}>
                    {formatDateTime(comment.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentText}>
                  {sanitizePlainText(comment.body, 1000)}
                </Text>

                {comment.replies.map((reply) => (
                  <View key={reply.id} style={styles.replyRow}>
                    <Avatar
                      name={reply.author.name}
                      uri={reply.author.photos[0]?.uri}
                      size={28}
                    />
                    <View style={styles.replyBody}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.replyName} numberOfLines={1}>
                          {sanitizePlainText(reply.author.name, 80)}
                        </Text>
                        <Text style={styles.commentDate}>
                          {formatDateTime(reply.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.replyText}>
                        {sanitizePlainText(reply.body, 1000)}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.replyComposer}>
                  <TextInput
                    value={replyInputs[comment.id] ?? ""}
                    onChangeText={(value) =>
                      setReplyInputs((current) => ({
                        ...current,
                        [comment.id]: value,
                      }))
                    }
                    maxLength={1000}
                    placeholder="Yanıt yaz..."
                    placeholderTextColor={theme.colors.muted}
                    style={styles.replyInput}
                  />
                  <Pressable
                    disabled={isMutating || !replyInputs[comment.id]?.trim()}
                    onPress={() => void submitReply(comment.id)}
                    style={({ pressed }) => [
                      styles.replyButton,
                      (!replyInputs[comment.id]?.trim() || isMutating) &&
                        styles.replyButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          {hasMoreComments ? (
            <Pressable
              disabled={isFetchingMoreComments}
              onPress={() => void fetchMoreComments()}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed && styles.pressed,
              ]}
            >
              {isFetchingMoreComments ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Daha fazla yorum</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: 0,
      paddingBottom: 0,
    },
    scroller: {
      flex: 1,
    },
    topBar: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    topCopy: {
      flex: 1,
    },
    topTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 18,
    },
    topMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    content: {
      flexGrow: 1,
      paddingBottom: 0,
      backgroundColor: theme.colors.background,
    },
    post: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: "transparent",
    },
    postAvatar: {
      paddingTop: 2,
    },
    postBody: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    postHeaderCopy: {
      flex: 1,
    },
    postName: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 17,
    },
    postDate: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    headerIcon: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    postText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontSize: 18,
      lineHeight: 27,
    },
    postImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 16,
      backgroundColor: theme.colors.elevated,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },
    tag: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
      backgroundColor: "rgba(233, 64, 87, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    postActions: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.xs,
    },
    postAction: {
      minWidth: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    postActionText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    postActionActive: {
      color: theme.colors.primary,
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    commentInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 9,
      ...theme.typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.elevated,
    },
    sendButton: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },
    sendButtonDisabled: {
      backgroundColor: "#303747",
    },
    sendButtonText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    thread: {
      flexGrow: 1,
      minHeight: 360,
      backgroundColor: theme.colors.background,
    },
    loadingComments: {
      paddingVertical: theme.spacing.xl,
    },
    emptyThread: {
      minHeight: 320,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    emptyThreadIcon: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 91, 112, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 91, 112, 0.22)",
    },
    emptyThreadTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    emptyThreadCopy: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      maxWidth: 280,
      textAlign: "center",
    },
    commentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    threadRail: {
      position: "absolute",
      left: theme.spacing.lg + 18,
      top: 56,
      bottom: 0,
      width: 2,
      backgroundColor: theme.colors.border,
    },
    commentAvatar: {
      zIndex: 1,
    },
    commentBody: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    commentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    commentName: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      flexShrink: 1,
    },
    commentDate: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    commentText: {
      ...theme.typography.body,
      color: theme.colors.text,
      lineHeight: 22,
    },
    replyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    replyBody: {
      flex: 1,
      paddingTop: 1,
      backgroundColor: "transparent",
    },
    replyName: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "800",
      flexShrink: 1,
    },
    replyText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      lineHeight: 18,
    },
    replyComposer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    replyInput: {
      flex: 1,
      minHeight: 38,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: "transparent",
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
    replyButtonDisabled: {
      backgroundColor: theme.colors.elevated,
    },
    loadMoreButton: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    loadMoreText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.82,
    },
  });
