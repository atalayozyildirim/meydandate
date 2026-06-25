// Akış post kartını, yorumları ve yanıt formunu gösterir.
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import { PollCard } from "./PollCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { QuotedPostCard } from "./QuotedPostCard";
import type { User } from "@/domain/entities/User";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { ZulfiqarBadgeIcon } from "@/shared/components/ZulfiqarBadgeIcon";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { formatDateTime } from "@/shared/utils/date";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { shouldShowVerifiedBadge } from "@/shared/utils/userRole";
import { useTheme } from "@/shared/theme";

interface FeedPostCardProps {
  post: FeedPost;
  currentUser: User;
  onLike: (postId: string) => Promise<unknown>;
  onComment: (postId: string, body: string) => Promise<unknown>;
  onReply: (
    postId: string,
    commentId: string,
    body: string,
  ) => Promise<unknown>;
  onReport: (postId: string) => Promise<unknown>;
  onDelete: (postId: string) => Promise<unknown>;
  onVote?: (pollId: string, optionId: string) => void;
  onQuote?: (post: FeedPost) => void;
  onPermanentBan: (error: unknown) => void;
  canDelete?: boolean;
  disabled?: boolean;
  isSponsored?: boolean;
  sponsorLabel?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  onOpenDetail?: (postId: string) => void;
}

const feedTagDisplayLabels: Record<FeedTag, string> = {
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

const compactCount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
  return String(value);
};

export const FeedPostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  onReport,
  onDelete,
  onVote,
  onQuote,
  onPermanentBan,
  canDelete = false,
  disabled = false,
  isSponsored = false,
  sponsorLabel = "Sponsorlu",
  ctaLabel = "İncele",
  onCtaPress,
  onOpenDetail,
}: FeedPostCardProps) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const liked = post.likedByUserIds.includes(currentUser.id);
  const openProfile = (userId: string) => {
    router.push({ pathname: "/tabs/profile/[userId]", params: { userId } });
  };
  const openDetail = () => {
    if (isSponsored) {
      onCtaPress?.();
      return;
    }

    if (onOpenDetail) {
      onOpenDetail(post.id);
      return;
    }

    router.push({ pathname: "/tabs/feed/[postId]", params: { postId: post.id } });
  };
  const openQuotedPost = () => {
    const quotedPostId = post.quotedPost?.id;

    if (!quotedPostId) {
      return;
    }

    router.push({
      pathname: "/tabs/feed/[postId]",
      params: { postId: quotedPostId },
    });
  };

  const sharePost = () => {
    const message = `${sanitizePlainText(post.author.name, 80)}: ${sanitizePlainText(post.body, 260)}`;
    void Share.share({ message }).catch(() => undefined);
  };

  const reportPost = () => {
    Alert.alert(
      "Post bildirilsin mi?",
      "Bu post moderasyon kuyruğuna alınacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Bildir",
          style: "destructive",
          onPress: () => {
            void onReport(post.id).catch((error) => {
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

  const deletePost = () => {
    Alert.alert(
      "Post silinsin mi?",
      "Bu post ve bağlı yorumları akıştan kaldırılacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            void onDelete(post.id).catch((error) => {
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openDetail}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
      <View style={styles.postRow}>
        <View style={styles.avatarColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isSponsored
                ? `${sanitizePlainText(post.author.name, 80)} paylaşımını aç`
                : `${sanitizePlainText(post.author.name, 80)} profilini aç`
            }
            onPress={() =>
              isSponsored ? onCtaPress?.() : openProfile(post.authorId)
            }
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.pressed,
            ]}
          >
            <Avatar
              name={post.author.name}
              uri={post.author.photos[0]?.uri}
              size={44}
            />
          </Pressable>
          <View style={styles.avatarRail} />
        </View>

        <View style={styles.postContent}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSponsored
                  ? `${sanitizePlainText(post.author.name, 80)} paylaşımını aç`
                  : `${sanitizePlainText(post.author.name, 80)} profilini aç`
              }
              onPress={() =>
                isSponsored ? onCtaPress?.() : openProfile(post.authorId)
              }
              style={({ pressed }) => [
                styles.authorButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.headerBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {sanitizePlainText(post.author.name, 80)}
                  </Text>
                  {shouldShowVerifiedBadge(post.author) ? (
                    <PremiumVerifiedBadge size={16} />
                  ) : null}
                  {isSponsored ? (
                    <View style={styles.sponsoredBadge}>
                      <Ionicons
                        name="megaphone-outline"
                        size={11}
                        color={theme.colors.muted}
                      />
                      <Text style={styles.sponsoredText}>{sponsorLabel}</Text>
                    </View>
                  ) : post.isPinned ? (
                    <View style={styles.pinnedBadge}>
                      <Ionicons
                        name="pin"
                        size={11}
                        color={theme.colors.muted}
                      />
                      <Text style={styles.pinnedText}>Sabit</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  @{sanitizePlainText(post.author.name, 32)
                    .replace(/\s+/g, "")
                    .toLocaleLowerCase("tr-TR")} · {formatDateTime(post.createdAt)}
                </Text>
              </View>
            </Pressable>
            {isSponsored ? null : (
              <View style={styles.headerActions}>
                {canDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={deletePost}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={reportPost}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={theme.colors.muted}
                  />
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.body}>{sanitizePlainText(post.body, 2000)}</Text>

          {post.quotedPost ? (
            <QuotedPostCard
              quotedPost={post.quotedPost}
              onPress={post.quotedPost.id ? openQuotedPost : undefined}
              compact
            />
          ) : null}

          {post.poll && !isSponsored ? (
            <PollCard
              poll={post.poll}
              onVote={(optionId) => onVote?.(post.poll!.id, optionId)}
              disabled={disabled}
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

          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{feedTagDisplayLabels[tag]}</Text>
              </View>
            ))}
          </View>

          {isSponsored ? (
            <View style={styles.nativeSponsorFooter}>
              <Pressable
                accessibilityRole="button"
                onPress={onCtaPress}
                style={({ pressed }) => [
                  styles.nativeSponsorCta,
                  pressed && styles.pressed,
                ]}
              >
                <ZulfiqarBadgeIcon size={38} />
                <View style={styles.nativeSponsorText}>
                  <View style={styles.nativeSponsorTitleRow}>
                    <Text style={styles.nativeSponsorTitle} numberOfLines={1}>
                      {sanitizePlainText(post.author.name, 80)}
                    </Text>
                    {shouldShowVerifiedBadge(post.author) ? (
                      <PremiumVerifiedBadge size={16} />
                    ) : null}
                  </View>
                  <Text style={styles.nativeSponsorMeta}>
                    Sponsorlu · {ctaLabel}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => void onLike(post.id)}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={20}
                  color={liked ? theme.colors.text : theme.colors.muted}
                />
                <Text
                  style={[styles.actionText, liked && styles.actionTextActive]}
                >
                  {compactCount(post.likedByUserIds.length)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={openDetail}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={19}
                  color={theme.colors.muted}
                />
                <Text style={styles.actionText}>
                  {compactCount(post.comments.length)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={disabled || !onQuote}
                onPress={() => onQuote?.(post)}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="repeat-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={styles.actionText}>Alıntı</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={sharePost}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={19}
                  color={theme.colors.muted}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
      </Card>
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    avatarColumn: {
      width: 44,
      alignItems: "center",
      alignSelf: "stretch",
    },
    avatarButton: {
      paddingTop: 2,
    },
    avatarRail: {
      flex: 1,
      width: 2,
      minHeight: 22,
      marginTop: theme.spacing.xs,
      borderRadius: 1,
      backgroundColor: theme.colors.border,
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
      minWidth: 0,
    },
    authorButton: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      minWidth: 0,
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
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pinnedText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    sponsoredBadge: {
      minHeight: 20,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)",
    },
    sponsoredText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontSize: 16,
      lineHeight: 23,
    },
    postImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 18,
      backgroundColor: theme.colors.elevated,
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
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: theme.spacing.xs,
      paddingRight: theme.spacing.sm,
    },
    action: {
      minHeight: 32,
      minWidth: 44,
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
      color: theme.colors.text,
    },
    nativeSponsorFooter: {
      paddingTop: theme.spacing.xs,
    },
    nativeSponsorCta: {
      minHeight: 54,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(235, 239, 247, 0.12)"
        : "rgba(0, 0, 0, 0.10)",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
    },
    nativeSponsorText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    nativeSponsorTitleRow: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    nativeSponsorTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: 17,
      flexShrink: 1,
    },
    nativeSponsorMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    pressed: {
      opacity: 0.78,
    },
    comments: {
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
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
      borderLeftColor: theme.colors.border,
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
