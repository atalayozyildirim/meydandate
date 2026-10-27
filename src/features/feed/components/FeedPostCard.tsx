// Akış post kartını, yorumları ve yanıt formunu gösterir.
import {
  ActivityIndicator,
  Alert,
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
import { FeedMediaGrid } from "./FeedMediaGrid";
import type { User } from "@/domain/entities/User";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { ZulfiqarBadgeIcon } from "@/shared/components/ZulfiqarBadgeIcon";
import { AdBanner } from "@/features/ads";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { formatDateTime } from "@/shared/utils/date";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { shouldShowVerifiedBadge } from "@/shared/utils/userRole";
import { useTheme } from "@/shared/theme";
import { createFeedPostCardStyles } from "./feedPostCardStyles";

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
  const styles = createFeedPostCardStyles(theme);
  const liked = post.likedByUserIds.includes(currentUser.id);
  const visibleCommentCount = post.commentCount ?? post.comments.length;
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

          {post.body.trim() ? (
            <Text style={styles.body}>{sanitizePlainText(post.body, 2000)}</Text>
          ) : null}

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

          <FeedMediaGrid
            accessibilityLabel={`${sanitizePlainText(post.author.name, 80)} post fotoğrafı`}
            imageUrls={post.imageUrls}
          />

          {post.linkPreview ? (
            <LinkPreviewCard preview={post.linkPreview} />
          ) : null}

          {isSponsored && post.showAdMob ? (
            <AdBanner style={styles.sponsorAd} />
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
                  {compactCount(visibleCommentCount)}
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
