// Hesap, bildirim, gizlilik, dil, tema ve hukuki ayarlari sunar.
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
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
  onPress?: () => void;
}

const legalLinks = [
  { title: "Privacy Policy", path: "/legal/privacy-policy" },
  { title: "Terms Of Service", path: "/legal/terms-of-service" },
  { title: "Account Deletion", path: "/legal/account-deletion" },
  { title: "Data Export Request", path: "/legal/data-export-request" },
  { title: "Consent Management", path: "/legal/consent-management" }
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

  const row = ({ title, subtitle, onPress }: SettingsRowProps) => (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} /> : null}
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Settings</Text>
        <Text style={styles.title}>Ayarlar</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap Ayarlari</Text>
        {row({ title: "Telefon ve oturum", subtitle: "Telefon dogrulama ve token saklama SecureStore ile hazir." })}
        {row({ title: "Engellenen Kullanicilar", subtitle: "Backend baglandiginda liste olarak acilacak." })}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirim Ayarlari</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Bildirimler</Text>
            <Text style={styles.rowSubtitle}>Match ve mesaj bildirimleri.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Gizlilik Ayarlari</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Profil Gizleme</Text>
            <Text style={styles.rowSubtitle}>Profilini discover akisi disinda tut.</Text>
          </View>
          <Switch value={profileHidden} onValueChange={setProfileHidden} />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Gizlilik korumasi</Text>
            <Text style={styles.rowSubtitle}>KVKK/GDPR tercihlerini daha siki uygula.</Text>
          </View>
          <Switch value={privacyStrict} onValueChange={setPrivacyStrict} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Dil Secimi</Text>
        <View style={styles.chipWrap}>
          <OptionChip label="Turkce" selected={language === "tr"} onPress={() => setLanguage("tr")} />
          <OptionChip label="English" selected={language === "en"} onPress={() => setLanguage("en")} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Tema Secimi</Text>
        <View style={styles.chipWrap}>
          {(["system", "light", "dark"] as ThemePreference[]).map((preference) => (
            <OptionChip
              key={preference}
              label={preference === "system" ? "Sistem" : preference === "light" ? "Aydinlik" : "Karanlik"}
              selected={theme.preference === preference}
              onPress={() => theme.setPreference(preference)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Hukuki</Text>
        {legalLinks.map((link) =>
          row({
            title: link.title,
            subtitle: "Hazir uyumluluk ekrani",
            onPress: () => router.push(link.path)
          })
        )}
      </Card>

      <Button
        label="Cikis yap"
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
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg
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
