// Topluluk akışını, post oluşturmayı ve etiket filtrelerini gösterir.
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedTag } from "@/domain/entities/Feed";
import { feedTagValues } from "@/domain/entities/Feed";
import type { BotFeedPostPayload } from "@/domain/repositories/FeedRepository";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { AdMobBanner } from "@/features/ads";
import { useBotFeedAdmin, useFeed } from "@/features/feed/hooks/useFeed";
import { useGifSearch } from "@/shared/hooks/useGifSearch";
import { supabase } from "@/infrastructure/supabase/client";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useUserRole } from "@/features/moderation/hooks/useModerationService";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { useTheme } from "@/shared/theme";

const feedTagLabels: Record<FeedTag | "all", string> = {
  all: "Tümü",
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

const defaultBotCtaLabel = "İncele";
const MAX_FEED_IMAGE_BYTES = 6 * 1024 * 1024;

export default function FeedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const imagePicker = useImagePicker();
  const [selectedTag, setSelectedTag] = useState<FeedTag | "all">("all");
  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    base64?: string | null;
  } | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<Array<{ id: string; url: string; preview?: string }>>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const gifSearch = useGifSearch();
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [selectedPostTags, setSelectedPostTags] = useState<FeedTag[]>([
    "gundem",
  ]);
  const [botBody, setBotBody] = useState("");
  const [botCtaLabel, setBotCtaLabel] = useState(defaultBotCtaLabel);
  const [botIsActive, setBotIsActive] = useState(true);
  const [botShowAdMob, setBotShowAdMob] = useState(true);
  const [editingBotPostId, setEditingBotPostId] = useState<string | null>(null);
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
    votePoll,
    isMutating,
  } = useFeed(selectedTag);
  const { data: currentUserRole = "user" } = useUserRole(currentUser?.id ?? "");
  const isAdmin = currentUserRole === "admin";
  const {
    botPosts,
    createBotPost,
    updateBotPost,
    deleteBotPost,
    isSavingBotPost,
  } = useBotFeedAdmin(isAdmin);

  const togglePostTag = (tag: FeedTag) => {
    setSelectedPostTags((current) => {
      if (current.includes(tag)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== tag);
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
      const payload: any = {
        body: trimmedBody,
        tags: selectedPostTags,
        ...(selectedImage ? { image: selectedImage } : {}),
      };

      if (pollQuestion.trim() && pollOptions.filter(Boolean).length >= 2) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter(Boolean),
        };
      }

      await createPost(payload);
      setBody("");
      setSelectedImage(null);
      setSelectedPostTags(["gundem"]);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollComposer(false);
    } catch (error) {
      if (isPermanentBanError(error)) {
        handlePermanentBan(error);
        return;
      }

      Alert.alert(
        "Post paylaşılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const selectPostImage = async () => {
    const asset = await imagePicker.pickImageAsset({
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
      quality: 0.78,
    });

    if (!asset) {
      return;
    }

    const estimatedBytes = asset.base64
      ? Math.ceil((asset.base64.length * 3) / 4)
      : 0;

    if (estimatedBytes > MAX_FEED_IMAGE_BYTES) {
      Alert.alert(
        "Fotoğraf çok büyük",
        "Post fotoğrafı en fazla 6 MB olabilir.",
      );
      return;
    }

    setSelectedImage({ uri: asset.uri, base64: asset.base64 });
  };

  const resetBotForm = () => {
    setBotBody("");
    setBotCtaLabel(defaultBotCtaLabel);
    setBotIsActive(true);
    setBotShowAdMob(true);
    setEditingBotPostId(null);
  };

  const buildBotPayload = (): BotFeedPostPayload => ({
    body: botBody.trim(),
    tags: ["gundem"],
    ctaLabel: botCtaLabel.trim() || "İncele",
    isActive: botIsActive,
    showAdMob: botShowAdMob,
    sortOrder: 100,
  });

  const submitBotPost = async () => {
    if (!botBody.trim()) {
      return;
    }

    try {
      const payload = buildBotPayload();

      if (editingBotPostId) {
        await updateBotPost({ postId: editingBotPostId, payload });
      } else {
        await createBotPost(payload);
      }

      resetBotForm();
    } catch (error) {
      Alert.alert(
        "Rehber paylaşımı kaydedilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const editBotPost = (postId: string) => {
    const botPost = botPosts.find((post) => post.botPostId === postId);

    if (!botPost) {
      return;
    }

    setEditingBotPostId(postId);
    setBotBody(botPost.body);
    setBotCtaLabel(botPost.ctaLabel ?? "İncele");
    setBotIsActive(botPost.isActive !== false);
    setBotShowAdMob(botPost.showAdMob !== false);
  };

  const removeBotPost = (postId: string) => {
    Alert.alert(
      "Rehber paylaşımı silinsin mi?",
      "Bu paylaşım feed'den kalkacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            void deleteBotPost(postId).catch((error) => {
              Alert.alert(
                "Rehber paylaşımı silinemedi",
                error instanceof Error ? error.message : "Tekrar deneyin.",
              );
            });
          },
        },
      ],
    );
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
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={theme.colors.primary}
          />
          <Text style={styles.liveBadgeText}>Güvenli</Text>
        </View>
      </View>

      <View style={styles.quickLinks}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/tabs/meydan")}
          style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
        >
          <Ionicons
            name="radio-outline"
            size={17}
            color={theme.colors.primary}
          />
          <Text style={styles.quickLinkText}>Meydan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/tabs/muharrem")}
          style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={theme.colors.primary}
          />
          <Text style={styles.quickLinkText}>Oruç</Text>
        </Pressable>
      </View>

      <View style={styles.composer}>
        <View style={styles.composerTop}>
          <Avatar
            name={currentUser.name}
            uri={currentUser.photos[0]?.uri}
            size={42}
          />
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
            {selectedImage ? (
              <View style={styles.imagePreviewFrame}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Seçili fotoğrafı kaldır"
                  onPress={() => setSelectedImage(null)}
                  style={({ pressed }) => [
                    styles.removeImageButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fotoğraf ekle"
                disabled={imagePicker.isPicking || isCreatingPost}
                onPress={() => void selectPostImage()}
                style={({ pressed }) => [
                  styles.photoButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="image-outline" size={19} color={theme.colors.primary} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Anket ekle"
                disabled={isCreatingPost}
                onPress={() => setShowPollComposer((v) => !v)}
                style={({ pressed }) => [
                  styles.photoButton,
                  showPollComposer && styles.photoButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={19}
                  color={showPollComposer ? "#FFFFFF" : theme.colors.primary}
                />
              </Pressable>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagScroller}
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
                      <Text
                        style={[
                          styles.postTagText,
                          selected && styles.postTagTextSelected,
                        ]}
                      >
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
                  (!body.trim() || isCreatingPost) &&
                    styles.shareButtonDisabled,
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
      {showPollComposer ? (
        <View style={styles.pollComposerBox}>
          <View style={styles.pollComposerHeader}>
            <Ionicons name="bar-chart-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.pollComposerTitle}>Anket Oluştur</Text>
            <Pressable
              onPress={() => { setShowPollComposer(false); setPollQuestion(""); setPollOptions(["", ""]); }}
              style={styles.pollComposerClose}
            >
              <Ionicons name="close" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
          <TextInput
            value={pollQuestion}
            onChangeText={setPollQuestion}
            placeholder="Anket sorusunu yaz..."
            placeholderTextColor={theme.colors.muted}
            style={styles.pollInput}
          />
          {pollOptions.map((opt, idx) => (
            <View key={idx} style={styles.pollOptionRow}>
              <View style={styles.pollOptionNumber}>
                <Text style={styles.pollOptionNumberText}>{idx + 1}</Text>
              </View>
              <TextInput
                value={opt}
                onChangeText={(v) => setPollOptions((cur) => cur.map((c, i) => i === idx ? v : c))}
                placeholder={`Seçenek ${idx + 1}`}
                placeholderTextColor={theme.colors.muted}
                style={styles.pollOptionInput}
              />
              {pollOptions.length > 2 ? (
                <Pressable
                  onPress={() => setPollOptions((cur) => cur.filter((_, i) => i !== idx))}
                  style={styles.pollRemoveButton}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {pollOptions.length < 5 ? (
            <Pressable
              onPress={() => setPollOptions((cur) => [...cur, ""])}
              style={styles.pollAddOptionButton}
            >
              <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.pollAddOptionText}>Seçenek Ekle</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {isAdmin ? (
        <View style={styles.botPanel}>
          <View style={styles.botPanelHeader}>
            <View style={styles.botPanelTitleRow}>
              <Ionicons
                name="megaphone-outline"
                size={17}
                color={theme.colors.primary}
              />
              <Text style={styles.botPanelTitle}>Ehlibyte Rehberi</Text>
            </View>
            {editingBotPostId ? (
              <Pressable
                accessibilityRole="button"
                onPress={resetBotForm}
                style={({ pressed }) => [
                  styles.botGhostButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.botGhostButtonText}>Yeni</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            value={botBody}
            onChangeText={setBotBody}
            maxLength={2000}
            placeholder="Rehber paylaşımı yaz..."
            placeholderTextColor={theme.colors.muted}
            style={styles.botInput}
            multiline
          />
          <TextInput
            value={botCtaLabel}
            onChangeText={setBotCtaLabel}
            maxLength={40}
            placeholder="CTA etiketi"
            placeholderTextColor={theme.colors.muted}
            style={styles.botCtaInput}
          />
          <View style={styles.botActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBotIsActive((value) => !value)}
              style={({ pressed }) => [
                styles.botToggle,
                botIsActive && styles.botToggleActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.botToggleText,
                  botIsActive && styles.botToggleTextActive,
                ]}
              >
                {botIsActive ? "Aktif" : "Pasif"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBotShowAdMob((value) => !value)}
              style={({ pressed }) => [
                styles.botToggle,
                botShowAdMob && styles.botToggleActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.botToggleText,
                  botShowAdMob && styles.botToggleTextActive,
                ]}
              >
                AdMob
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!botBody.trim() || isSavingBotPost}
              onPress={() => void submitBotPost()}
              style={({ pressed }) => [
                styles.botSubmitButton,
                (!botBody.trim() || isSavingBotPost) &&
                  styles.shareButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isSavingBotPost ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.botSubmitText}>
                  {editingBotPostId ? "Güncelle" : "Rehber paylaş"}
                </Text>
              )}
            </Pressable>
          </View>
          {botPosts.length > 0 ? (
            <View style={styles.botList}>
              {botPosts.slice(0, 3).map((post) => (
                <View
                  key={post.botPostId ?? post.id}
                  style={styles.botListItem}
                >
                  <View style={styles.botListText}>
                    <Text style={styles.botListTitle} numberOfLines={1}>
                      {post.body}
                    </Text>
                    <Text style={styles.botListMeta}>
                      {post.isActive === false ? "Pasif" : "Aktif"} ·{" "}
                      {post.showAdMob === false ? "AdMob kapalı" : "AdMob açık"}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      post.botPostId && editBotPost(post.botPostId)
                    }
                    style={({ pressed }) => [
                      styles.botIconButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={theme.colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      post.botPostId && removeBotPost(post.botPostId)
                    }
                    style={({ pressed }) => [
                      styles.botIconButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

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
      <AdMobBanner style={styles.feedAdBanner} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
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
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
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
            onVote={(pollId, optionId) => void votePoll({ pollId, optionId })}
            canDelete={
              !item.isSponsored && (isAdmin || item.authorId === currentUser.id)
            }
            onPermanentBan={handlePermanentBan}
            isSponsored={Boolean(item.isSponsored)}
            sponsorLabel={item.sponsorLabel ?? "Resmi rehber"}
            ctaLabel={item.ctaLabel ?? "İncele"}
            onCtaPress={() => router.push("/tabs/profile")}
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
      borderColor: "rgba(233, 64, 87, 0.12)",
    },
    quickLinkText: {
      ...theme.typography.caption,
      color: theme.colors.text,
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
      gap: theme.spacing.xs,
    },
    imagePreviewFrame: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 20,
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
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
      backgroundColor: theme.isDark ? "#161B26" : "#FFF8FB",
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
      backgroundColor: "rgba(233, 64, 87, 0.10)",
    },
    pollOptionNumberText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
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
      color: theme.colors.primary,
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
    botPanel: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
      backgroundColor: theme.isDark ? "#151922" : "#FFF7F8",
    },
    botPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    botPanelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    botPanelTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    botGhostButton: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    botGhostButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    botInput: {
      minHeight: 68,
      maxHeight: 126,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
      backgroundColor: theme.colors.surface,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    botCtaInput: {
      minHeight: 42,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    botActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    botToggle: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    botToggleActive: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(233, 64, 87, 0.10)",
    },
    botToggleText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    botToggleTextActive: {
      color: theme.colors.primary,
    },
    botSubmitButton: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    botSubmitText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    botList: {
      gap: theme.spacing.xs,
    },
    botListItem: {
      minHeight: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    botListText: {
      flex: 1,
      minWidth: 0,
    },
    botListTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    botListMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontSize: 11,
      lineHeight: 14,
    },
    botIconButton: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    filtersFrame: {
      borderBottomWidth: 1,
      borderBottomColor: "rgba(17, 24, 39, 0.08)",
      backgroundColor: theme.colors.surface,
    },
    feedAdBanner: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.isDark ? "#1C212D" : "rgba(255, 255, 255, 0.74)",
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
