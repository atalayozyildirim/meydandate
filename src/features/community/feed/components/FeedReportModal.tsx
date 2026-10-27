import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { FeedPost } from "@/domain/entities/Feed";
import type { FeedRepository } from "@/domain/repositories/FeedRepository";
import { Button, Copy, Heading, Icon, colors, ui } from "../../ui";
import { styles } from "../feedStyles";

export const reportCategories = [
  { id: "inappropriate_content", label: "Uygunsuz içerik" },
  { id: "harassment", label: "Taciz / Rahatsız etme" },
  { id: "spam", label: "Spam / İstenmeyen reklam" },
  { id: "hate_speech", label: "Nefret söylemi" },
  { id: "fraud", label: "Dolandırıcılık / Yanıltıcı" },
];

export interface FeedReportModalProps {
  visible: boolean;
  post: FeedPost;
  reporterId: string;
  repository: FeedRepository;
  onClose: () => void;
}

export function FeedReportModal({
  visible,
  post,
  reporterId,
  repository,
  onClose,
}: FeedReportModalProps) {
  const [category, setCategory] = useState("inappropriate_content");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await repository.reportPost(post.id, reporterId, category, reason);
      Alert.alert(
        "Şikayet iletildi",
        "Bildiriminiz moderasyon ekibimize iletildi. İnceleme sonrası gerekli işlem yapılacaktır.",
      );
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Şikayet iletilemedi.";
      Alert.alert("Bilgi", msg);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Heading style={{ fontSize: 20, color: colors.wine }}>Gönderiyi Şikayet Et</Heading>
          <Copy small muted style={{ marginTop: 4 }}>
            Bu paylaşımın topluluk kurallarımıza aykırı olduğunu düşünüyorsanız lütfen nedenini belirtin.
          </Copy>

          <View style={{ marginTop: 12, gap: 6 }}>
            {reportCategories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.categoryOption,
                  category === c.id && styles.categoryOptionActive,
                ]}
              >
                <Icon
                  name={category === c.id ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={category === c.id ? colors.wine : colors.muted}
                />
                <Text style={styles.categoryOptionText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            placeholder="Ek açıklama (isteğe bağlı)..."
            placeholderTextColor={colors.muted}
            value={reason}
            onChangeText={setReason}
            style={styles.reportReasonInput}
            maxLength={500}
          />

          <View style={[ui.row, { marginTop: 16, justifyContent: "flex-end", gap: 10 }]}>
            <Button secondary onPress={onClose} disabled={submitting}>
              Vazgeç
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: colors.wine }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                "Şikayet Et"
              )}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
