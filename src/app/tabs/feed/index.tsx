// Topluluk akışını, post oluşturmayı ve etiket filtrelerini gösterir.
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedTag } from "@/domain/entities/Feed";
import { feedTagValues } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { useFeed } from "@/features/feed/hooks/useFeed";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";

const feedTagLabels: Record<FeedTag | "all", string> = {
  all: "Tümü",
  cem: "Cem",
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  lokma: "Lokma",
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
    createPost,
    isCreatingPost,
    toggleLike,
    addComment,
    addReply,
    reportPost,
    isMutating,
  } = useFeed(selectedTag);

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

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Ehlibyte</Text>
          <Text style={styles.title}>Akış</Text>
        </View>
        <View style={styles.liveBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.liveBadgeText}>Filtre aktif</Text>
        </View>
      </View>

      <Card style={styles.composer}>
        <View style={styles.composerTop}>
          <Avatar name={currentUser.name} uri={currentUser.photos[0]?.uri} size={44} />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Topluluğa bir şey yaz..."
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            multiline
          />
        </View>
        <View style={styles.tagWrap}>
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
        </View>
        <Button
          label="Paylaş"
          loading={isCreatingPost}
          disabled={!body.trim()}
          icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
          onPress={() => void submitPost()}
        />
      </Card>

      <View style={styles.filters}>
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
      </View>

      {posts.length === 0 ? (
        <EmptyState title="Akış boş" description="İlk paylaşımı sen yap, topluluk buradan canlanacak." />
      ) : (
        <View style={styles.postList}>
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              disabled={isMutating}
              onLike={toggleLike}
              onComment={(postId, commentBody) => addComment({ postId, body: commentBody })}
              onReply={(postId, commentId, replyBody) => addReply({ postId, commentId, body: replyBody })}
              onReport={reportPost}
              onPermanentBan={handlePermanentBan}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.lg,
      paddingBottom: 104,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    liveBadge: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: "#FFF0F3",
    },
    liveBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    composer: {
      gap: theme.spacing.md,
      borderRadius: 24,
    },
    composerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: 92,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
      backgroundColor: theme.colors.surface,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    tagWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    postTag: {
      minHeight: 34,
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
      backgroundColor: "#FFF0F3",
    },
    postTagText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    postTagTextSelected: {
      color: theme.colors.primary,
    },
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    filterChip: {
      minHeight: 38,
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
      color: "#FFFFFF",
    },
    pressed: {
      opacity: 0.82,
    },
    postList: {
      gap: theme.spacing.md,
    },
  });
