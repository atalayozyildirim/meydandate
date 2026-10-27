import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type { FeedRepository } from "@/domain/repositories/FeedRepository";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { Copy, Heading, Icon, colors, ui } from "../../ui";
import { styles } from "../feedStyles";

export interface FeedComposerModalProps {
  visible: boolean;
  onClose: () => void;
  repository: FeedRepository;
  authorId: string;
  onPostCreated: (post: FeedPost) => void;
}

export function FeedComposerModal({
  visible,
  onClose,
  repository,
  authorId,
  onPostCreated,
}: FeedComposerModalProps) {
  const [body, setBody] = useState("");
  const [selectedTag, setSelectedTag] = useState<FeedTag>("gundem");
  const [images, setImages] = useState<Array<{ uri: string; base64?: string | null }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const { pickImageAssets, isPicking } = useImagePicker();

  const handlePickImages = async () => {
    const assets = await pickImageAssets({
      base64: true,
      quality: 0.8,
      selectionLimit: 4 - images.length,
    });
    if (assets.length > 0) {
      const newItems = assets.map((a) => ({ uri: a.uri, base64: a.base64 }));
      setImages((prev) => [...prev, ...newItems].slice(0, 4));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const cleanBody = body.trim();
    if (!cleanBody && images.length === 0) {
      Alert.alert("Eksik bilgi", "Lütfen bir mesaj yazın veya fotoğraf ekleyin.");
      return;
    }

    setSubmitting(true);
    try {
      const post = await repository.createPost({
        authorId,
        body: cleanBody,
        tags: [selectedTag],
        images,
      });
      setBody("");
      setImages([]);
      onPostCreated(post);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gönderi paylaşılamadı. Lütfen tekrar deneyin.";
      Alert.alert("Paylaşım başarısız", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.composerContainer}>
        <View style={styles.composerHeader}>
          <Pressable onPress={onClose} disabled={submitting}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
          <Heading style={{ fontSize: 20 }}>Yeni Paylaşım</Heading>
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.postButton, submitting && { opacity: 0.5 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.postButtonText}>Paylaş</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <TextInput
              multiline
              placeholder="Toplulukla ne paylaşmak istersin? (Türkü, deyiş, etkinlik, düşünce...)"
              placeholderTextColor={colors.muted}
              value={body}
              onChangeText={setBody}
              style={styles.composerInput}
              maxLength={2000}
              autoFocus
            />

            {/* Tag Selection */}
            <Copy small muted style={{ marginBottom: 8, marginTop: 16 }}>
              Kategori seç:
            </Copy>
            <View style={ui.chips}>
              {(["gundem", "deyis", "soru", "muharrem"] as FeedTag[]).map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(tag)}
                  style={[
                    styles.tagChip,
                    selectedTag === tag && styles.tagChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      selectedTag === tag && styles.tagChipTextActive,
                    ]}
                  >
                    #{tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Photos Preview */}
            {images.length > 0 && (
              <View style={styles.pickedPhotosGrid}>
                {images.map((img, i) => (
                  <View key={img.uri + i} style={styles.pickedPhotoBox}>
                    <Image source={{ uri: img.uri }} style={styles.pickedPhotoThumb} />
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemoveImage(i)}
                    >
                      <Icon name="close" size={16} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Photo Picker Trigger */}
            {images.length < 4 && (
              <Pressable
                accessibilityRole="button"
                onPress={handlePickImages}
                disabled={isPicking}
                style={styles.addPhotoBar}
              >
                <Icon name="image-outline" size={22} color={colors.wine} />
                <Text style={styles.addPhotoText}>
                  {images.length === 0
                    ? "Fotoğraf ekle (En fazla 4)"
                    : `Daha fazla fotoğraf ekle (${4 - images.length} kaldı)`}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
