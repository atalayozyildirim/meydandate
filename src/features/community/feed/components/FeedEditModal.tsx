import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type { FeedRepository } from "@/domain/repositories/FeedRepository";
import { Copy, Heading, colors, ui } from "../../ui";
import { styles } from "../feedStyles";

export interface FeedEditModalProps {
  visible: boolean;
  post: FeedPost;
  onClose: () => void;
  repository: FeedRepository;
  onPostUpdated: (post: FeedPost) => void;
}

export function FeedEditModal({
  visible,
  post,
  onClose,
  repository,
  onPostUpdated,
}: FeedEditModalProps) {
  const [body, setBody] = useState(post.body);
  const [selectedTag, setSelectedTag] = useState<FeedTag>(post.tags[0] ?? "gundem");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const clean = body.trim();
    if (!clean) {
      Alert.alert("Eksik metin", "Gönderi metni boş bırakılamaz.");
      return;
    }
    setSaving(true);
    try {
      const updated = await repository.updatePost(post.id, {
        body: clean,
        tags: [selectedTag],
      });
      onPostUpdated(updated);
    } catch {
      Alert.alert("Hata", "Gönderi güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.composerContainer}>
        <View style={styles.composerHeader}>
          <Pressable onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>İptal</Text>
          </Pressable>
          <Heading style={{ fontSize: 20 }}>Gönderiyi Düzenle</Heading>
          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            disabled={saving}
            style={[styles.postButton, saving && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.postButtonText}>Kaydet</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <TextInput
            multiline
            value={body}
            onChangeText={setBody}
            style={styles.composerInput}
            maxLength={2000}
          />
          <Copy small muted style={{ marginBottom: 8, marginTop: 16 }}>
            Kategori:
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
