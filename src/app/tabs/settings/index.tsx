// Hesap, bildirim, gizlilik, dil, tema ve hukuki ayarlari sunar.
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/features/auth/hooks/useSession";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import { useTheme, type ThemePreference } from "@/shared/theme";

interface SettingsRowProps {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress?: () => void;
}

const legalLinks = [
  { title: "Gizlilik Politikası", path: "/legal/privacy-policy" },
  { title: "Kullanım Şartları", path: "/legal/terms-of-service" },
  { title: "Veri Dışa Aktarma", path: "/legal/data-export-request" },
  { title: "Rıza Yönetimi", path: "/legal/consent-management" },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { logout } = useSession();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileHidden, setProfileHidden] = useState(false);
  const [privacyStrict, setPrivacyStrict] = useState(true);
  const [language, setLanguage] = useState<"tr" | "en">("tr");

  const row = ({ title, subtitle, icon, danger = false, onPress }: SettingsRowProps) => (
    <Pressable onPress={onPress} style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Ionicons
            name={icon}
            size={20}
            color={danger ? theme.colors.danger : theme.colors.primary}
          />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} /> : null}
    </Pressable>
  );

  const openAccountDeletion = () => {
    Alert.alert(
      "Hesap silme",
      "Hesap silme talep ekranına geçeceksin. Bu işlem için kimlik doğrulama ve backend silme akışı ayrıca bağlanmalı.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Devam",
          style: "destructive",
          onPress: () => router.push("/legal/account-deletion"),
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Profil</Text>
          <Text style={styles.title}>Ayarlar</Text>
        </View>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Görünüm</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name={theme.isDark ? "moon" : "sunny"}
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Karanlık mod</Text>
            <Text style={styles.rowSubtitle}>Uygulama genelinde koyu tema kullan.</Text>
          </View>
          <Switch
            value={theme.isDark}
            onValueChange={(enabled) => theme.setPreference(enabled ? "dark" : "light")}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.chipWrap}>
          {(["system", "light", "dark"] as ThemePreference[]).map((preference) => (
            <OptionChip
              key={preference}
              label={preference === "system" ? "Sistem" : preference === "light" ? "Aydınlık" : "Karanlık"}
              selected={theme.preference === preference}
              onPress={() => theme.setPreference(preference)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        {row({
          title: "Telefon ve oturum",
          subtitle: "Oturum tokenları cihazda güvenli saklanır.",
          icon: "phone-portrait-outline",
        })}
        {row({
          title: "Engellenen kullanıcılar",
          subtitle: "Blokladığın hesaplar burada yönetilecek.",
          icon: "remove-circle-outline",
        })}
        {row({
          title: "Hesabı sil",
          subtitle: "Hesap silme talebini uygulama içinden başlat.",
          icon: "trash-outline",
          danger: true,
          onPress: openAccountDeletion,
        })}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Bildirimler</Text>
            <Text style={styles.rowSubtitle}>Eşleşme ve mesaj bildirimleri.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Gizlilik</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="eye-off-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Profili gizle</Text>
            <Text style={styles.rowSubtitle}>Profilini keşfet akışı dışında tut.</Text>
          </View>
          <Switch
            value={profileHidden}
            onValueChange={setProfileHidden}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Gizlilik koruması</Text>
            <Text style={styles.rowSubtitle}>KVKK/GDPR tercihlerini daha sıkı uygula.</Text>
          </View>
          <Switch
            value={privacyStrict}
            onValueChange={setPrivacyStrict}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Dil</Text>
        <View style={styles.chipWrap}>
          <OptionChip label="Türkçe" selected={language === "tr"} onPress={() => setLanguage("tr")} />
          <OptionChip label="English" selected={language === "en"} onPress={() => setLanguage("en")} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Hukuki</Text>
        {legalLinks.map((link) =>
          row({
            title: link.title,
            subtitle: "Uyumluluk ve kullanıcı hakları",
            icon: "document-text-outline",
            onPress: () => router.push(link.path)
          })
        )}
      </Card>

      <Button
        label="Çıkış yap"
        variant="danger"
        onPress={async () => {
          await logout();
          router.replace("/auth/login");
        }}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    rowIconDanger: {
      backgroundColor: "rgba(220, 38, 38, 0.10)"
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    rowBody: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text
    },
    dangerText: {
      color: theme.colors.danger
    },
    rowSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    }
  });
