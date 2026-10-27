import React from "react";
import { Modal, TextInput, View } from "react-native";
import { Button, Heading, IconButton, colors } from "../../ui";
import { groupDetailStyles as styles } from "./groupDetailStyles";

interface GroupPostModalProps {
  visible: boolean;
  content: string;
  submitting: boolean;
  onChangeContent: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function GroupPostModal({
  visible,
  content,
  submitting,
  onChangeContent,
  onClose,
  onSubmit,
}: GroupPostModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Heading>Çevrede Paylaşım Yap</Heading>
            <IconButton
              name="close"
              label="Kapat"
              onPress={onClose}
            />
          </View>

          <TextInput
            style={styles.postInput}
            placeholder="Düşüncelerini, tavsiyelerini veya sorularını paylaş..."
            placeholderTextColor={colors.muted}
            value={content}
            onChangeText={onChangeContent}
            multiline
            autoFocus
          />

          <View style={styles.modalActions}>
            <Button
              secondary
              onPress={onClose}
              style={{ flex: 1 }}
            >
              Vazgeç
            </Button>
            <Button
              onPress={onSubmit}
              disabled={submitting || !content.trim()}
              style={{ flex: 1 }}
            >
              {submitting ? "Paylaşılıyor..." : "Paylaş"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
