import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Copy,
  Eyebrow,
  Heading,
  Icon,
  SectionTitle,
  colors,
  ui,
  type IconName,
} from "../ui";
import { useCommunityStore } from "../store";
import {
  CommunitySessionAction,
  useCommunityIdentity,
} from "../access/CommunityAccessGate";
import type { Navigate } from "../navigation/types";

interface ProfileTabProps {
  navigate: Navigate;
  onResetPreferences: () => void;
}

export function ProfileTab({
  navigate,
  onResetPreferences,
}: ProfileTabProps) {
  const store = useCommunityStore();
  const identity = useCommunityIdentity();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Eyebrow>SENİN MEYDANIN</Eyebrow>
        <Heading large>İyi ki buradasın.</Heading>
        <Copy muted style={{ marginTop: 4 }}>
          Katıldıkların, kaydettiklerin ve topluluktaki izin.
        </Copy>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarBox}>
          <Icon name="person" size={28} color={colors.white} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.userName}>
            {identity?.displayName || "Meydan Canı"}
          </Text>
          <Copy small muted>
            {identity?.city ? `${identity.city} · Onaylı Üye` : "Topluluk Üyesi"}
          </Copy>
        </View>
      </View>

      <CommunitySessionAction />

      <View style={styles.menuSection}>
        <MenuRow
          icon="calendar-outline"
          title="Katıldığım Etkinlikler"
          subtitle={`${store.joinedEvents.length} etkinlik`}
          onPress={() => navigate({ type: "collection", collection: "events" })}
        />
        <MenuRow
          icon="people-outline"
          title="Topluluklarım"
          subtitle={`${store.joinedCommunities.length} topluluk`}
          onPress={() =>
            navigate({ type: "collection", collection: "communities" })
          }
        />
        <MenuRow
          icon="bookmark-outline"
          title="Kaydettiklerim"
          subtitle={`${store.savedArticles.length} yazı`}
          onPress={() => navigate({ type: "collection", collection: "articles" })}
        />
        <MenuRow
          icon="heart-outline"
          title="Eşleşmeler ve Can Cana Tanışma"
          subtitle="Kültürel uyum ve sohbet"
          onPress={() => navigate({ type: "connections" })}
        />
        <MenuRow
          icon="headset-outline"
          title="Meydan Space Odası"
          subtitle="Topluluk canlı sesli sohbet alanı"
          onPress={() => navigate({ type: "space" })}
        />
      </View>

      <SectionTitle>Hesap ve Ayarlar</SectionTitle>
      <View style={styles.menuSection}>
        <MenuRow
          icon="shield-checkmark-outline"
          title="Gizlilik ve KVKK Belgeleri"
          subtitle="Hizmet koşulları ve rıza tercihleri"
          onPress={() => {}}
        />
        <MenuRow
          icon="refresh-outline"
          title="Yerel Tercihleri Sıfırla"
          subtitle="Cihazdaki geçici filtre ve seçimleri temizler"
          onPress={onResetPreferences}
        />
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && ui.pressed]}
    >
      <View style={styles.menuIcon}>
        <Icon name={icon} size={22} color={colors.wine} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && (
          <Copy small muted>
            {subtitle}
          </Copy>
        )}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  hero: {
    marginBottom: 18,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
    marginBottom: 16,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.wine,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  menuSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.wineLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
});
