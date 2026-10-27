import React from "react";
import { Modal, Text, TextInput, View } from "react-native";
import type { EventCategory } from "@/domain/entities/Event";
import { Button, Chips, Heading, IconButton, colors } from "../../ui";
import { eventsScreenStyles as styles } from "./eventsScreenStyles";

interface CreateEventModalProps {
  visible: boolean;
  title: string;
  category: EventCategory;
  city: string;
  district: string;
  place: string;
  description: string;
  capacity: string;
  submitting: boolean;
  onChangeTitle: (title: string) => void;
  onChangeCategory: (category: EventCategory) => void;
  onChangeCity: (city: string) => void;
  onChangeDistrict: (district: string) => void;
  onChangePlace: (place: string) => void;
  onChangeDescription: (description: string) => void;
  onChangeCapacity: (capacity: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateEventModal({
  visible,
  title,
  category,
  city,
  district,
  place,
  description,
  capacity,
  submitting,
  onChangeTitle,
  onChangeCategory,
  onChangeCity,
  onChangeDistrict,
  onChangePlace,
  onChangeDescription,
  onChangeCapacity,
  onClose,
  onSubmit,
}: CreateEventModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Heading>Buluşma Düzenle</Heading>
            <IconButton
              name="close"
              label="Kapat"
              onPress={onClose}
            />
          </View>

          <Text style={styles.inputLabel}>Başlık *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Örn. Bağlama ve Türkü Atölyesi"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={onChangeTitle}
          />

          <Text style={styles.inputLabel}>Kategori</Text>
          <Chips
            values={["Atölye", "Söyleşi", "Buluşma", "Konser", "Diğer"]}
            value={category}
            onChange={(c) => onChangeCategory(c as EventCategory)}
          />

          <Text style={styles.inputLabel}>Şehir</Text>
          <Chips
            values={["İstanbul", "Ankara", "İzmir"]}
            value={city}
            onChange={onChangeCity}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>İlçe</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn. Kadıköy"
                placeholderTextColor={colors.muted}
                value={district}
                onChangeText={onChangeDistrict}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.inputLabel}>Kontenjan</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor={colors.muted}
                value={capacity}
                onChangeText={onChangeCapacity}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Mekân / Adres *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Örn. Örnek Kültür Evi · Kadıköy"
            placeholderTextColor={colors.muted}
            value={place}
            onChangeText={onChangePlace}
          />

          <Text style={styles.inputLabel}>Açıklama</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="Buluşmanın içeriği, kimler katılabilir?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={onChangeDescription}
            multiline
            numberOfLines={2}
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
              disabled={submitting || !title.trim() || !place.trim()}
              style={{ flex: 1 }}
            >
              {submitting ? "Oluşturuluyor..." : "Yayınla"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
