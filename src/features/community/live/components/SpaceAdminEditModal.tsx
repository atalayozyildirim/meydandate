import React from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { Button, Heading, IconButton } from "../../ui";
import { spaceStyles as styles } from "./spaceStyles";

interface SpaceAdminEditModalProps {
  visible: boolean;
  title: string;
  description: string;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function SpaceAdminEditModal({
  visible,
  title,
  description,
  onChangeTitle,
  onChangeDescription,
  onClose,
  onSave,
}: SpaceAdminEditModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Heading>Oda Ayarları</Heading>
            <IconButton
              name="close"
              label="Kapat"
              onPress={onClose}
            />
          </View>

          <Text style={styles.inputLabel}>Oda Başlığı</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={onChangeTitle}
          />

          <Text style={styles.inputLabel}>Açıklama</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={description}
            onChangeText={onChangeDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <Button
              secondary
              onPress={onClose}
              style={{ flex: 1 }}
            >
              Vazgeç
            </Button>
            <Button onPress={onSave} style={{ flex: 1 }}>
              Kaydet
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
