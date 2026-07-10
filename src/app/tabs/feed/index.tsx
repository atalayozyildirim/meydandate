// Topluluk akışını, post oluşturmayı ve etiket filtrelerini gösterir.
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import { feedTagValues } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { FeedAdPostCard } from "@/features/feed/components/FeedAdPostCard";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { FeedAdminPanel } from "@/features/feed/screens/FeedAdminPanel";
import { useFeed } from "@/features/feed/hooks/useFeed";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useUserRole } from "@/features/moderation/hooks/useModerationService";
import { useTheme } from "@/shared/theme";
import { useUnreadActivityCount } from "@/features/notifications/hooks/useActivities";

const visibleFeedTags = feedTagValues.filter((tag) => tag !== "muharrem");
const FIRST_FEED_AD_AFTER = 3;
const FEED_AD_REPEAT_INTERVAL = 5;

type FeedListItem =
  | { type: "post"; post: FeedPost }
  | { type: "ad"; id: string };

const feedTagLabels: Record<FeedTag | "all", string> = {
  all: "Sana özel",
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

export default function FeedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const listRef = useRef<FlatList<FeedListItem>>(null);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const [selectedTag, setSelectedTag] = useState<FeedTag | "all">("all");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const {
    posts,
    currentUser,
    isLoading,
    isRefreshing,
    refresh,
    fetchMorePosts,
    hasMorePosts,
    isFetchingMorePosts,
    toggleLike,
    addComment,
    addReply,
    reportPost,
    deletePost,
    votePoll,
    isMutating,
  } = useFeed(selectedTag);
  const { data: currentUserRole = "user" } = useUserRole(currentUser?.id ?? "");
  const { unreadCount } = useUnreadActivityCount();
  const isAdmin = currentUserRole === "admin";
  const feedItems = useMemo<FeedListItem[]>(() => {
    if (currentUser?.isPremium) {
      return posts.map((post) => ({ type: "post", post }));
    }

    return posts.flatMap((post, index) => {
      const item: FeedListItem = { type: "post", post };
      const itemNumber = index + 1;
      const shouldInsertAd =
        (posts.length < FIRST_FEED_AD_AFTER && index === posts.length - 1) ||
        (itemNumber >= FIRST_FEED_AD_AFTER &&
          (itemNumber - FIRST_FEED_AD_AFTER) % FEED_AD_REPEAT_INTERVAL === 0);

      if (!shouldInsertAd) {
        return [item];
      }

      return [item, { type: "ad", id: `feed-ad-${itemNumber}` }];
    });
  }, [currentUser?.isPremium, posts]);

  const quotePost = (post: FeedPost) => {
    router.push({
      pathname: "/feed-compose",
      params: { quotePostId: post.id },
    });
  };

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

  if (isLoading || !currentUser) {
    return <Loading label="Akış hazırlanıyor" />;
  }

  if (showAdminPanel && isAdmin) {
    return <FeedAdminPanel onClose={() => setShowAdminPanel(false)} />;
  }

  const feedHeader = (
    <View style={styles.feedHeader}>
      <View style={styles.header}>
        <Text style={styles.title}>Akış</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Hareketler, ${unreadCount} okunmamış`
                : "Hareketler"
            }
            onPress={() => router.push("/tabs/feed/activity")}
            style={({ pressed }) => [
              styles.activityButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={unreadCount > 0 ? "notifications" : "notifications-outline"}
              size={19}
              color={theme.colors.text}
            />
            {unreadCount > 0 ? (
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <View style={styles.liveBadge}>
            <Ionicons
              name="chatbubbles-outline"
              size={15}
              color={theme.colors.text}
            />
            <Text style={styles.liveBadgeText}>Sohbet akışı</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersFrame}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(["all", ...visibleFeedTags] as Array<FeedTag | "all">).map((tag) => {
            const selected = selectedTag === tag;

            return (
              <Pressable
                key={tag}
                onPress={() => setSelectedTag(tag)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {feedTagLabels[tag]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickLinks}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/tabs/feed/meydan")}
          style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
        >
          <Ionicons
            name="radio"
            size={17}
            color={theme.colors.text}
          />
          <Text style={styles.quickLinkText}>Meydan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/tabs/feed/muharrem")}
          style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
        >
          <Ionicons
            name="calendar-clear-outline"
            size={17}
            color={theme.colors.text}
          />
          <Text style={styles.quickLinkText}>Muharrem</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/tabs/feed/leaderboard")}
          style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
        >
          <Ionicons
            name="trophy-outline"
            size={17}
            color={theme.colors.text}
          />
          <Text style={styles.quickLinkText}>Liderler</Text>
        </Pressable>
        {isAdmin ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAdminPanel(true)}
            style={({ pressed }) => [
              styles.quickLink,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={theme.colors.text}
            />
            <Text style={styles.quickLinkText}>Admin</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.composerPromptFrame}>
        <Avatar
          name={currentUser.name}
          uri={currentUser.photos[0]?.uri}
          size={40}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni paylaşım oluştur"
          onPress={() => router.push("/feed-compose")}
          style={({ pressed }) => [
            styles.composerPrompt,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.composerPromptText}>Yeni sohbet başlat...</Text>
          <View style={styles.composerPromptIcon}>
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </View>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={listRef}
        data={feedItems}
        keyExtractor={(item) =>
          item.type === "post" ? item.post.id : item.id
        }
        ListHeaderComponent={feedHeader}
        ListEmptyComponent={
          <EmptyState
            title="Akış boş"
            description="İlk paylaşımı sen yap, topluluk buradan canlanacak."
          />
        }
        ListFooterComponent={
          isFetchingMorePosts ? (
            <View style={styles.listFooter}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.screen}
        renderItem={({ item }) => {
          if (item.type === "ad") {
            return <FeedAdPostCard />;
          }

          return (
            <FeedPostCard
              post={item.post}
              currentUser={currentUser}
              disabled={isMutating}
              onLike={toggleLike}
              onComment={(postId, commentBody) =>
                addComment({ postId, body: commentBody })
              }
              onReply={(postId, commentId, replyBody) =>
                addReply({ postId, commentId, body: replyBody })
              }
              onReport={reportPost}
              onDelete={deletePost}
              onVote={(pollId, optionId) =>
                void votePoll({ pollId, optionId })
              }
              onQuote={quotePost}
              canDelete={
                !item.post.isSponsored &&
                (isAdmin || item.post.authorId === currentUser.id)
              }
              onPermanentBan={handlePermanentBan}
              isSponsored={Boolean(item.post.isSponsored)}
              sponsorLabel={item.post.sponsorLabel ?? "Resmi rehber"}
              ctaLabel={item.post.ctaLabel ?? "İncele"}
              onCtaPress={() => router.push("/tabs/profile")}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
        refreshing={isRefreshing}
        onRefresh={() => void refresh()}
        onEndReachedThreshold={0.45}
        onEndReached={() => {
          if (hasMorePosts && !isFetchingMorePosts) {
            void fetchMorePosts();
          }
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    screen: {
      paddingTop: 0,
      paddingBottom: 104,
      backgroundColor: theme.colors.surface,
    },
    feedHeader: {
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      minHeight: 58,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      fontSize: 24,
      lineHeight: 30,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    activityButton: {
      position: "relative",
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activityBadge: {
      position: "absolute",
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    activityBadgeText: {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: "900",
      color: theme.colors.onPrimary,
      fontVariant: ["tabular-nums"],
    },
    liveBadge: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    liveBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    quickLinks: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    quickLink: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickLinkText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    composerPromptFrame: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    composerPrompt: {
      minHeight: 46,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingLeft: theme.spacing.md,
      paddingRight: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.elevated,
    },
    composerPromptText: {
      flex: 1,
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    composerPromptIcon: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    composer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    composerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    composerBody: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    input: {
      minHeight: 46,
      maxHeight: 118,
      paddingTop: 8,
      paddingBottom: 4,
      textAlignVertical: "top",
      ...theme.typography.body,
      fontSize: 17,
      lineHeight: 24,
      color: theme.colors.text,
    },
    composerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    composerMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    replyScopeText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    characterCounter: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontVariant: ["tabular-nums"],
    },
    characterCounterLow: {
      color: theme.colors.warning,
      fontWeight: "800",
    },
    imagePreviewList: {
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.md,
    },
    imagePreviewFrame: {
      width: 118,
      height: 118,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    removeImageButton: {
      position: "absolute",
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(17, 24, 39, 0.72)",
    },
    selectedQuoteFrame: {
      position: "relative",
      paddingRight: 34,
    },
    removeQuoteButton: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    photoButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    photoButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tagScroller: {
      flex: 1,
    },
    pollComposerBox: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    pollComposerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    pollComposerTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      flex: 1,
      fontSize: 14,
    },
    pollComposerClose: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    pollInput: {
      minHeight: 46,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    pollOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    pollOptionNumber: {
      width: 26,
      height: 26,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pollOptionNumberText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    pollOptionInput: {
      flex: 1,
      minHeight: 42,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      ...theme.typography.body,
      fontSize: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    pollRemoveButton: {
      width: 30,
      height: 30,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    pollAddOptionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    pollAddOptionText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },

    tagWrap: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.xs,
    },
    postTag: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    postTagSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    postTagText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    postTagTextSelected: {
      color: theme.colors.onPrimary,
    },
    shareButton: {
      minWidth: 86,
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    shareButtonDisabled: {
      opacity: 0.38,
    },
    shareButtonText: {
      ...theme.typography.caption,
      color: theme.colors.onPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    filtersFrame: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    filters: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    filterChip: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    filterChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    filterText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    filterTextSelected: {
      color: theme.colors.onPrimary,
    },
    pressed: {
      opacity: 0.82,
    },
    postSeparator: {
      height: 0,
    },
    listFooter: {
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
  });
