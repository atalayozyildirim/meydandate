// Topluluk akışını, post oluşturmayı ve etiket filtrelerini gösterir.
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedTag } from "@/domain/entities/Feed";
import { feedTagValues } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { useFeed } from "@/features/feed/hooks/useFeed";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useUserRole } from "@/features/moderation/hooks/useModerationService";
import { useTheme } from "@/shared/theme";

const feedTagLabels: Record<FeedTag | "all", string> = {
  all: "Tümü",
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

export default function FeedScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const [selectedTag, setSelectedTag] = useState<FeedTag | "all">("all");
  const [body, setBody] = useState("");
  const [selectedPostTags, setSelectedPostTags] = useState<FeedTag[]>(["gundem"]);
  const {
    posts,
    currentUser,
    isLoading,
    isRefreshing,
    refresh,
    fetchMorePosts,
    hasMorePosts,
    isFetchingMorePosts,
    createPost,
    isCreatingPost,
    toggleLike,
    addComment,
    addReply,
    reportPost,
    deletePost,
    isMutating,
  } = useFeed(selectedTag);
  const { data: currentUserRole = "user" } = useUserRole(currentUser?.id ?? "");
  const isAdmin = currentUserRole === "admin";

  const togglePostTag = (tag: FeedTag) => {
    setSelectedPostTags((current) => {
      if (current.includes(tag)) {
        return current.length === 1 ? current : current.filter((item) => item !== tag);
      }

      return [...current, tag];
    });
  };

  const submitPost = async () => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    try {
      await createPost({ body: trimmedBody, tags: selectedPostTags });
      setBody("");
      setSelectedPostTags(["gundem"]);
    } catch (error) {
      if (isPermanentBanError(error)) {
        handlePermanentBan(error);
        return;
      }

      Alert.alert("Post paylaşılamadı", error instanceof Error ? error.message : "Tekrar deneyin.");
    }
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

  const feedHeader = (
    <View style={styles.feedHeader}>
      <View style={styles.header}>
        <Text style={styles.title}>Akış</Text>
        <View style={styles.liveBadge}>
          <Ionicons name="shield-checkmark-outline" size={15} color={theme.colors.primary} />
          <Text style={styles.liveBadgeText}>Güvenli</Text>
        </View>
      </View>

      <View style={styles.composer}>
        <View style={styles.composerTop}>
          <Avatar name={currentUser.name} uri={currentUser.photos[0]?.uri} size={42} />
          <View style={styles.composerBody}>
            <TextInput
              value={body}
              onChangeText={setBody}
              maxLength={2000}
              placeholder="Neler oluyor?"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              multiline
            />
            <View style={styles.composerActions}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagWrap}
              >
                {feedTagValues.map((tag) => {
                  const selected = selectedPostTags.includes(tag);

                  return (
                    <Pressable
                      key={tag}
                      onPress={() => togglePostTag(tag)}
                      style={({ pressed }) => [
                        styles.postTag,
                        selected && styles.postTagSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.postTagText, selected && styles.postTagTextSelected]}>
                        #{feedTagLabels[tag]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                disabled={!body.trim() || isCreatingPost}
                onPress={() => void submitPost()}
                style={({ pressed }) => [
                  styles.shareButton,
                  (!body.trim() || isCreatingPost) && styles.shareButtonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {isCreatingPost ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Paylaş</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.filtersFrame}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(["all", ...feedTagValues] as Array<FeedTag | "all">).map((tag) => {
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
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {feedTagLabels[tag]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        ListHeaderComponent={feedHeader}
        ListEmptyComponent={
          <EmptyState title="Akış boş" description="İlk paylaşımı sen yap, topluluk buradan canlanacak." />
        }
        ListFooterComponent={
          isFetchingMorePosts ? (
            <View style={styles.listFooter}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.screen}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            currentUser={currentUser}
            disabled={isMutating}
            onLike={toggleLike}
            onComment={(postId, commentBody) => addComment({ postId, body: commentBody })}
            onReply={(postId, commentId, replyBody) => addReply({ postId, commentId, body: replyBody })}
            onReport={reportPost}
            onDelete={deletePost}
            canDelete={isAdmin || item.authorId === currentUser.id}
            onPermanentBan={handlePermanentBan}
          />
        )}
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
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      fontSize: 24,
      lineHeight: 30,
    },
    liveBadge: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: "rgba(233, 64, 87, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.10)",
    },
    liveBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    composer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
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
      gap: theme.spacing.sm,
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
      borderColor: "rgba(233, 64, 87, 0.14)",
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
      color: "#FFFFFF",
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
      backgroundColor: "rgba(233, 64, 87, 0.36)",
    },
    shareButtonText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontSize: 13,
      lineHeight: 18,
    },
    filtersFrame: {
      borderBottomWidth: 1,
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
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
      borderColor: "rgba(17, 24, 39, 0.10)",
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
      color: "#FFFFFF",
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
