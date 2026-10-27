import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Copy,
  Heading,
  Icon,
  SectionTitle,
  colors,
  ui,
} from "../ui";
import { useCommunityStore } from "../store";
import type { Navigate } from "../navigation/types";

interface HomeTabProps {
  navigate: Navigate;
}

export function HomeTab({ navigate }: HomeTabProps) {
  const city = useCommunityStore((state) => state.city);

  return (
    <View style={styles.container}>
      {/* Hero Welcome */}
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {"Gelin canlar\nbir olalım."}
      </Text>
      <Text style={styles.heroSubtitle}>
        {city ? `${city} ve çevresindeki canlarla meydanda buluş.` : "Topluluğun dijital meydanına hoş geldin."}
      </Text>

      {/* Social Feed CTA Card */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate({ type: "tab", tab: "feed" })}
        style={styles.feedCard}
      >
        <View style={ui.row}>
          <View style={styles.feedBadge}>
            <Icon name="chatbubbles" size={16} color={colors.white} />
          </View>
          <Text style={styles.feedTag}>CANLI TOPLULUK AKIŞI</Text>
        </View>
        <Heading style={styles.cardHeading}>Meydan'da neler konuşuluyor?</Heading>
        <Copy muted small style={{ marginTop: 4 }}>
          Deyişler, nefesler, Muharrem hasbihalleri ve topluluk paylaşımlarını keşfet, canlarla etkileşime geç.
        </Copy>
        <View style={[ui.row, { marginTop: 14 }]}>
          <Text style={styles.feedAction}>Akışa Git</Text>
          <Icon name="arrow-forward" size={16} color={colors.wine} />
        </View>
      </Pressable>

      {/* Live Space Banner */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate({ type: "space" })}
        style={styles.spaceBanner}
      >
        <View style={ui.row}>
          <View style={styles.liveDot} />
          <Text style={styles.spaceTag}>CANLI MEYDAN SPACE</Text>
        </View>
        <Heading style={styles.cardHeading}>Alevi-Bektaşi Sohbetleri & Dinleti</Heading>
        <Copy muted small style={{ marginTop: 4 }}>
          Söz almak, dinlemek ve toplulukla canlı sohbete katılmak için tıkla.
        </Copy>
        <View style={[ui.row, { marginTop: 14 }]}>
          <Text style={styles.spaceAction}>Odaya Katıl</Text>
          <Icon name="arrow-forward" size={16} color={colors.wine} />
        </View>
      </Pressable>

      {/* Matching Section */}
      <View style={styles.matchingSection}>
        <SectionTitle>Can Cana Tanışma</SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate({ type: "connections" })}
          style={styles.matchingCard}
        >
          <View style={{ flex: 1 }}>
            <Heading style={{ fontSize: 20 }}>Topluluğundaki Canlarla Tanış</Heading>
            <Copy muted small style={{ marginTop: 6 }}>
              Ortak değerler, kültür ve ilgi alanlarına göre yakınındaki canlarla eşleş.
            </Copy>
          </View>
          <View style={styles.matchingIconBox}>
            <Icon name="heart" size={26} color={colors.wine} />
          </View>
        </Pressable>
      </View>

      {/* Culture Section */}
      <View style={{ marginTop: 8 }}>
        <SectionTitle
          action="Keşfet"
          onPress={() => navigate({ type: "tab", tab: "culture" })}
        >
          Kültür ve Erkan
        </SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate({ type: "tab", tab: "culture" })}
          style={styles.cultureCard}
        >
          <View style={{ flex: 1 }}>
            <Heading style={{ fontSize: 18 }}>Deyişler, Nefesler ve Cem Erkanı</Heading>
            <Copy muted small style={{ marginTop: 4 }}>
              Yolumuzun kadim hafızasını, zakirlerin nefeslerini ve erkan rehberini inceleyin.
            </Copy>
          </View>
          <View style={styles.cultureIconBox}>
            <Icon name="book-outline" size={24} color={colors.ink} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 40,
    lineHeight: 46,
    color: colors.ink,
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 20,
  },
  feedCard: {
    backgroundColor: colors.wineLight,
    borderWidth: 1,
    borderColor: "#EBD9DD",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  feedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.wine,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  feedTag: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.wine,
  },
  feedAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.wine,
    marginRight: 4,
  },
  spaceBanner: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53E3E",
    marginRight: 6,
  },
  spaceTag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#E53E3E",
  },
  cardHeading: {
    fontSize: 20,
    marginTop: 8,
  },
  spaceAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.wine,
    marginRight: 4,
  },
  matchingSection: {
    marginBottom: 20,
  },
  matchingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.wineLight,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  matchingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cultureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  cultureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0ECE1",
    alignItems: "center",
    justifyContent: "center",
  },
});
