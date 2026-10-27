import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Button,
  Copy,
  Heading,
  Icon,
  IconButton,
  colors,
  ui,
} from "../ui";
import { cities, type City } from "../data";
import { useCommunityStore } from "../store";
import type { Navigate, SheetType } from "../navigation/types";

interface AppSheetsProps {
  sheet: SheetType;
  onClose: () => void;
  onNotify: (msg: string) => void;
  navigate: Navigate;
}

export function AppSheets({
  sheet,
  onClose,
  onNotify,
  navigate,
}: AppSheetsProps) {
  const city = useCommunityStore((state) => state.city);
  const setCity = useCommunityStore((state) => state.setCity);
  const addReport = useCommunityStore((state) => state.report);
  const [reportReason, setReportReason] = useState("");

  if (!sheet) return null;

  return (
    <Modal
      visible={Boolean(sheet)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Heading style={styles.sheetTitle}>
              {sheet === "city"
                ? "Şehir Değiştir"
                : sheet === "messages"
                  ? "Mesajlaşma & Eşleşmeler"
                  : "Şikayet Bildirimi"}
            </Heading>
            <IconButton name="close" label="Kapat" onPress={onClose} />
          </View>

          {sheet === "city" && (
            <ScrollView style={styles.list}>
              {cities.map((c) => {
                const isSelected = city === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCity(c as City);
                      onNotify(`${c} şehri seçildi.`);
                      onClose();
                    }}
                    style={[
                      styles.listItem,
                      isSelected && styles.listItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.listItemText,
                        isSelected && styles.listItemTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark" color={colors.wine} size={20} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {sheet === "messages" && (
            <View style={styles.messageBox}>
              <Copy style={{ marginBottom: 16 }}>
                Topluluk üyeleriyle doğrudan bağlantı kurmak ve sohbet etmek için Eşleşme alanına gidebilirsin.
              </Copy>
              <Button
                icon="heart-outline"
                onPress={() => {
                  onClose();
                  navigate({ type: "connections" });
                }}
              >
                Eşleşmeler ve Mesajlar
              </Button>
            </View>
          )}

          {sheet === "report" && (
            <View style={styles.reportBox}>
              <Copy small muted style={{ marginBottom: 12 }}>
                Topluluk kurallarını ihlal eden içerik veya davranışları bize bildirin.
              </Copy>
              <TextInput
                style={ui.field}
                placeholder="Şikayet gerekçenizi yazın…"
                placeholderTextColor={colors.muted}
                value={reportReason}
                onChangeText={setReportReason}
                multiline
                numberOfLines={3}
              />
              <View style={[ui.row, { marginTop: 16, justifyContent: "flex-end", gap: 10 }]}>
                <Button secondary onPress={onClose}>
                  Vazgeç
                </Button>
                <Button
                  disabled={!reportReason.trim()}
                  onPress={() => {
                    addReport(reportReason.trim());
                    setReportReason("");
                    onNotify("Şikayetiniz incelemeye alındı.");
                    onClose();
                  }}
                >
                  Gönder
                </Button>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
  },
  list: {
    maxHeight: 280,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  listItemSelected: {
    backgroundColor: colors.wineLight,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  listItemText: {
    fontSize: 15,
    color: colors.ink,
  },
  listItemTextSelected: {
    color: colors.wine,
    fontWeight: "600",
  },
  messageBox: {
    paddingVertical: 12,
  },
  reportBox: {
    paddingVertical: 8,
  },
});
