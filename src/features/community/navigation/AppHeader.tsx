import React from "react";
import { StyleSheet, View } from "react-native";
import { Brand, Copy, IconButton, colors, ui } from "../ui";
import type { Route } from "./types";

interface AppHeaderProps {
  route: Route;
  onBack: () => void;
  onOpenMessages: () => void;
  isArticleSaved?: boolean;
  onToggleSaveArticle?: () => void;
}

export function AppHeader({
  route,
  onBack,
  onOpenMessages,
  isArticleSaved,
  onToggleSaveArticle,
}: AppHeaderProps) {
  const isTab = route.type === "tab";

  const getHeaderTitle = () => {
    switch (route.type) {
      case "event":
        return "ETKİNLİK";
      case "community":
        return "TOPLULUK";
      case "article":
        return "KÜLTÜR";
      case "discussion":
        return "MEYDANDAN";
      case "space":
        return "MEYDAN SPACE";
      case "connections":
        return "EŞLEŞME";
      case "connection-chat":
        return "SOHBET";
      case "collection":
        return "KOLEKSİYONUM";
      default:
        return "";
    }
  };

  return (
    <View style={styles.header}>
      {isTab ? (
        <Brand />
      ) : (
        <View style={ui.row}>
          <IconButton name="arrow-back" label="Geri dön" onPress={onBack} />
          <Copy small muted style={styles.eyebrow}>
            {getHeaderTitle()}
          </Copy>
        </View>
      )}

      {route.type === "article" ? (
        <IconButton
          name={isArticleSaved ? "bookmark" : "bookmark-outline"}
          label={isArticleSaved ? "Kaydı kaldır" : "Kaydet"}
          onPress={onToggleSaveArticle ?? (() => {})}
        />
      ) : (
        <IconButton
          name="chatbubble-outline"
          label="Mesaj kutusunu aç"
          onPress={onOpenMessages}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.paper,
  },
  eyebrow: {
    letterSpacing: 1.2,
    fontWeight: "600",
  },
});
