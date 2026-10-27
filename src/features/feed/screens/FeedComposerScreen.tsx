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
import { createFeedComposerStyles } from "./composer/feedComposerStyles";
import { ComposerPollEditor } from "./composer/ComposerPollEditor";

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
  const styles = createFeedComposerStyles(theme);
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
          <ComposerPollEditor
            styles={styles}
            question={pollQuestion}
            onQuestionChange={setPollQuestion}
            options={pollOptions}
            onOptionsChange={setPollOptions}
            onClose={() => {
              setShowPollComposer(false);
              setPollQuestion("");
              setPollOptions(["", ""]);
            }}
          />
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
