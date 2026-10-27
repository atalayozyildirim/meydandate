import React from "react";
import { Modal, Switch, Text, TextInput, View } from "react-native";
import { Button, Chips, Copy, Heading, IconButton, colors } from "../../ui";
import { groupsScreenStyles as styles } from "./groupsScreenStyles";

interface CreateCommunityModalProps {
  visible: boolean;
  name: string;
  topic: string;
  city: string;
  description: string;
  isPrivate: boolean;
  submitting: boolean;
  onChangeName: (name: string) => void;
  onChangeTopic: (topic: string) => void;
  onChangeCity: (city: string) => void;
  onChangeDescription: (description: string) => void;
  onChangeIsPrivate: (isPrivate: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateCommunityModal({
  visible,
  name,
  topic,
  city,
  description,
  isPrivate,
  submitting,
  onChangeName,
  onChangeTopic,
  onChangeCity,
  onChangeDescription,
  onChangeIsPrivate,
  onClose,
  onSubmit,
}: CreateCommunityModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Heading>Yeni Çevre Kur</Heading>
            <IconButton
              name="close"
              label="Kapat"
              onPress={onClose}
            />
          </View>

          <Copy muted small style={{ marginBottom: 12 }}>
            Ortak bir ilgi, üretim veya dayanışma çevresi oluştur.
          </Copy>

          <Text style={styles.inputLabel}>Çevre Adı *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Örn. Kadıköy Edebiyat Masası"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={onChangeName}
          />

          <Text style={styles.inputLabel}>Konu / İlgi Alanı *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Örn. Şiir & Hikâye Okumaları"
            placeholderTextColor={colors.muted}
            value={topic}
            onChangeText={onChangeTopic}
          />

          <Text style={styles.inputLabel}>Şehir</Text>
          <Chips
            values={["İstanbul", "Ankara", "İzmir", "Tüm şehirler"]}
            value={city}
            onChange={onChangeCity}
          />

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Açıklama</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="Bu çevrede ne konuşulacak, nasıl bir araya gelinecek?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={onChangeDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.switchTitle}>Kapalı Çevre</Text>
              <Text style={styles.switchDesc}>
                Yalnızca onayladığın üyeler içerikleri görebilir ve paylaşabilir.
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={onChangeIsPrivate}
              trackColor={{ false: colors.line, true: colors.wine }}
            />
          </View>

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
              disabled={submitting || !name.trim() || !topic.trim()}
              style={{ flex: 1 }}
            >
              {submitting ? "Kuruluyor..." : "Çevreyi Kur"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
