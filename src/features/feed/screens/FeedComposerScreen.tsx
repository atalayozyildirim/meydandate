import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import { feedTagValues } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { Loading } from "@/shared/components/Loading";
import { QuotedPostCard } from "@/features/feed/components/QuotedPostCard";
import { useCreateFeedPost } from "@/features/feed/hooks/useFeed";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { container } from "@/infrastructure/config/Container";
import { useTheme } from "@/shared/theme";

const MAX_FEED_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_FEED_IMAGES = 4;

const feedTagLabels: Record<FeedTag, string> = {
  muharrem: "Muharrem",
  deyis: "Deyiş",
  soru: "Soru",
  gundem: "Gündem",
};

export default function FeedComposerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ quotePostId?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const imagePicker = useImagePicker();
  const { createPost, isCreatingPost } = useCreateFeedPost();
  const [body, setBody] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    Array<{ uri: string; base64?: string | null }>
  >([]);
  const [selectedQuote, setSelectedQuote] = useState<FeedPost | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [selectedPostTags, setSelectedPostTags] = useState<FeedTag[]>([
    "gundem",
  ]);
  const quotedPostId =
    typeof params.quotePostId === "string" ? params.quotePostId : "";
  const headerTopInset = insets.top;

  useEffect(() => {
    if (!quotedPostId || !currentUser) {
      setSelectedQuote(null);
      return;
    }

    let isActive = true;
    setIsLoadingQuote(true);

    void container.feedRepository
      .getPost(quotedPostId, currentUser.id)
      .then((post) => {
        if (isActive) setSelectedQuote(post);
      })
      .catch(() => {
        if (isActive) {
          setSelectedQuote(null);
          Alert.alert(
            "Alıntı açılamadı",
            "Paylaşım silinmiş veya artık görüntülenemiyor olabilir.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingQuote(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?.id, quotedPostId]);

  const remainingCharacters = 2000 - body.length;
  const hasValidPoll = useMemo(
    () =>
      Boolean(
        pollQuestion.trim() &&
          pollOptions.filter((option) => option.trim()).length >= 2,
      ),
    [pollOptions, pollQuestion],
  );
  const canShare = Boolean(
    body.trim() || hasValidPoll || selectedImages.length > 0,
  );

  const closeComposer = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/tabs/feed");
  };

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

  const selectPostImage = async () => {
    const remainingSlots = MAX_FEED_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
      Alert.alert("Fotoğraf sınırı", "Bir paylaşımda en fazla 4 fotoğraf olabilir.");
      return;
    }

    const assets = await imagePicker.pickImageAssets({
      base64: true,
      quality: 0.78,
      selectionLimit: remainingSlots,
    });

    if (assets.length === 0) return;

    const nextImages = assets.slice(0, remainingSlots).map((asset) => ({
      uri: asset.uri,
      base64: asset.base64,
    }));
    const hasOversizedImage = nextImages.some((asset) => {
      const estimatedBytes = asset.base64
        ? Math.ceil((asset.base64.length * 3) / 4)
        : 0;
      return estimatedBytes > MAX_FEED_IMAGE_BYTES;
    });

    if (hasOversizedImage) {
      Alert.alert("Fotoğraf çok büyük", "Her fotoğraf en fazla 6 MB olabilir.");
      return;
    }

    setSelectedImages((current) =>
      [...current, ...nextImages].slice(0, MAX_FEED_IMAGES),
    );
  };

  const submitPost = async () => {
    if (!canShare) return;

    const trimmedBody = body.trim();
    const trimmedPollQuestion = pollQuestion.trim();
    const trimmedPollOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    try {
      await createPost({
        body: trimmedBody || trimmedPollQuestion,
        tags: selectedPostTags,
        ...(selectedImages.length > 0 ? { images: selectedImages } : {}),
        ...(selectedQuote ? { quotedPostId: selectedQuote.id } : {}),
        ...(hasValidPoll
          ? {
              poll: {
                question: trimmedPollQuestion,
                options: trimmedPollOptions,
              },
            }
          : {}),
      });
      closeComposer();
    } catch (error) {
      if (isPermanentBanError(error)) {
        Alert.alert(
          "Kalıcı ban",
          error.message,
          [
            {
              text: "Tamam",
              style: "destructive",
              onPress: () => void applyPermanentBan(),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      Alert.alert(
        "Post paylaşılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (!currentUser) {
    return <Loading label="Besteci hazırlanıyor" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View
        style={[
          styles.header,
          {
            minHeight: 58 + headerTopInset,
            paddingTop: headerTopInset,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paylaşımı kapat"
          disabled={isCreatingPost}
          hitSlop={8}
          onPress={closeComposer}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={23} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Yeni paylaşım</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paylaş"
          disabled={!canShare || isCreatingPost}
          onPress={() => void submitPost()}
          style={({ pressed }) => [
            styles.shareButton,
            (!canShare || isCreatingPost) && styles.shareButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isCreatingPost ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.shareButtonText}>Paylaş</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: theme.spacing.lg,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md) + 132,
          },
        ]}
      >
        <View style={styles.composerRow}>
          <Avatar
            name={currentUser.name}
            uri={currentUser.photos[0]?.uri}
            size={44}
          />
          <View style={styles.composerBody}>
            <Text style={styles.authorName}>{currentUser.name}</Text>
            <TextInput
              autoFocus
              value={body}
              onChangeText={setBody}
              maxLength={2000}
              multiline
              placeholder={
                selectedQuote
                  ? "Alıntına düşünceni ekle"
                  : "Ne konuşmak istersin?"
              }
              placeholderTextColor={theme.colors.muted}
              selectionColor={theme.colors.text}
              style={styles.bodyInput}
            />

            {selectedImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageList}
              >
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.imageFrame}>
                    <Image
                      source={{ uri: image.uri }}
                      resizeMode="cover"
                      style={styles.image}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Fotoğrafı kaldır"
                      onPress={() =>
                        setSelectedImages((current) =>
                          current.filter((_, imageIndex) => imageIndex !== index),
                        )
                      }
                      style={styles.removeMediaButton}
                    >
                      <Ionicons name="close" size={17} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {isLoadingQuote ? (
              <View style={styles.quoteLoading}>
                <ActivityIndicator size="small" color={theme.colors.text} />
                <Text style={styles.quoteLoadingText}>Alıntı hazırlanıyor</Text>
              </View>
            ) : selectedQuote ? (
              <View style={styles.quoteFrame}>
                <QuotedPostCard
                  quotedPost={{
                    id: selectedQuote.id,
                    authorId: selectedQuote.authorId,
                    authorName: selectedQuote.author.name,
                    authorPhotoUrl: selectedQuote.author.photos[0]?.uri ?? null,
                    body: selectedQuote.body,
                    imageUrl: selectedQuote.imageUrl ?? null,
                    createdAt: selectedQuote.createdAt,
                  }}
                  compact
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Alıntıyı kaldır"
                  onPress={() => setSelectedQuote(null)}
                  style={styles.removeQuoteButton}
                >
                  <Ionicons name="close" size={16} color={theme.colors.text} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {showPollComposer ? (
          <View style={styles.pollPanel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="bar-chart-outline"
                  size={18}
                  color={theme.colors.text}
                />
                <Text style={styles.sectionTitle}>Anket</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Anketi kaldır"
                onPress={() => {
                  setShowPollComposer(false);
                  setPollQuestion("");
                  setPollOptions(["", ""]);
                }}
                style={styles.smallIconButton}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.muted} />
              </Pressable>
            </View>
            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Anket sorusu"
              placeholderTextColor={theme.colors.muted}
              style={styles.pollInput}
            />
            {pollOptions.map((option, index) => (
              <View key={index} style={styles.pollOptionRow}>
                <Text style={styles.pollOptionNumber}>{index + 1}</Text>
                <TextInput
                  value={option}
                  onChangeText={(value) =>
                    setPollOptions((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    )
                  }
                  placeholder={`Seçenek ${index + 1}`}
                  placeholderTextColor={theme.colors.muted}
                  style={styles.pollOptionInput}
                />
                {pollOptions.length > 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}. seçeneği kaldır`}
                    onPress={() =>
                      setPollOptions((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    style={styles.smallIconButton}
                  >
                    <Ionicons name="close" size={17} color={theme.colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {pollOptions.length < 5 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setPollOptions((current) => [...current, ""])}
                style={styles.addOptionButton}
              >
                <Ionicons name="add" size={18} color={theme.colors.text} />
                <Text style={styles.addOptionText}>Seçenek ekle</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>Konu</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tags}
          >
            {feedTagValues.map((tag) => {
              const selected = selectedPostTags.includes(tag);

              return (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => togglePostTag(tag)}
                  style={({ pressed }) => [
                    styles.tag,
                    selected && styles.tagSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                    #{feedTagLabels[tag]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      <View
        style={[
          styles.toolbar,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
        ]}
      >
        <View style={styles.toolbarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotoğraf ekle"
            disabled={imagePicker.isPicking || isCreatingPost}
            onPress={() => void selectPostImage()}
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
          >
            <Ionicons name="images-outline" size={21} color={theme.colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anket ekle"
            disabled={isCreatingPost}
            onPress={() => setShowPollComposer((current) => !current)}
            style={({ pressed }) => [
              styles.toolButton,
              showPollComposer && styles.toolButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={21}
              color={
                showPollComposer ? theme.colors.onPrimary : theme.colors.text
              }
            />
          </Pressable>
        </View>
        <Text style={styles.replyScope}>Herkes yanıtlayabilir</Text>
        <Text
          style={[
            styles.counter,
            remainingCharacters < 120 && styles.counterLow,
          ]}
        >
          {remainingCharacters}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      position: "relative",
      backgroundColor: theme.colors.surface,
    },
    header: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerTitle: {
      flex: 1,
      ...theme.typography.subheading,
      color: theme.colors.text,
      textAlign: "center",
    },
    shareButton: {
      minWidth: 78,
      minHeight: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },
    shareButtonDisabled: {
      opacity: 0.38,
    },
    shareButtonText: {
      ...theme.typography.caption,
      color: theme.colors.onPrimary,
      fontWeight: "800",
    },
    content: {
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    scroll: {
      flex: 1,
    },
    composerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    composerBody: {
      flex: 1,
      gap: theme.spacing.md,
    },
    authorName: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: "800",
    },
    bodyInput: {
      minHeight: 96,
      maxHeight: 240,
      padding: 0,
      textAlignVertical: "top",
      ...theme.typography.body,
      color: theme.colors.text,
      fontSize: 18,
      lineHeight: 26,
    },
    imageList: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.md,
    },
    imageFrame: {
      width: 176,
      height: 210,
      borderRadius: theme.radius.lg,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    removeMediaButton: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.68)",
    },
    quoteLoading: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
    },
    quoteLoadingText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    quoteFrame: {
      position: "relative",
      paddingRight: 32,
    },
    removeQuoteButton: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pollPanel: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.elevated,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    smallIconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    pollInput: {
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    pollOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    pollOptionNumber: {
      width: 26,
      color: theme.colors.muted,
      fontWeight: "800",
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    pollOptionInput: {
      flex: 1,
      minHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    addOptionButton: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    addOptionText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "700",
    },
    tagsSection: {
      gap: theme.spacing.sm,
    },
    tagsLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    tags: {
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.md,
    },
    tag: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "700",
    },
    tagTextSelected: {
      color: theme.colors.onPrimary,
    },
    toolbar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    toolbarActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    toolButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    toolButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    replyScope: {
      flex: 1,
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    counter: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontVariant: ["tabular-nums"],
    },
    counterLow: {
      color: theme.colors.warning,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.68,
    },
  });
