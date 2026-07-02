// Hesap, bildirim, gizlilik, dil, tema ve hukuki ayarlari sunar.
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { setPushNotificationsEnabled } from "@/features/notifications/services/pushNotifications";
import { container } from "@/infrastructure/config/Container";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import { queryKeys } from "@/shared/constants/queryKeys";
import {
  clampMatchRadiusKm,
  DEFAULT_MATCH_RADIUS_KM,
} from "@/shared/utils/location";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
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

const locationRadiusOptions = [10, 25, 50, 100, 250] as const;
const settingsStorage = new SecureStorageService();

interface LocationPreferenceArgs {
  enabled: boolean;
  radiusKm: number;
  refreshLocation?: boolean;
}

const getLocationPreferenceErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (/Konum izni verilmedi/i.test(message)) {
    return message;
  }

  if (/Location is required|latitude|longitude/i.test(message)) {
    return "Yakındaki eşleşmeyi açmak için konumunu bir kez yenilemen gerekiyor.";
  }

  if (
    /PGRST|PostgREST|schema cache|set_location_matching|function|permission denied|column/i.test(
      message,
    )
  ) {
    return "Konum tercihini şu an kaydedemedik. Eşleşme akışı mevcut tercihinle devam edecek; birazdan tekrar dene.";
  }

  return message || "Konum tercihi güncellenemedi. Tekrar deneyin.";
};

const requestCurrentLocation = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error(
      "Konum izni verilmedi. Yakındaki eşleşmeler için izin gerekli.",
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { currentUser, logout } = useSession();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyStrict, setPrivacyStrict] = useState(true);
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const hasUnsavedChanges = useRef(false);

  // Tercihleri SecureStore'dan yukle
  useEffect(() => {
    void (async () => {
      try {
        const [storedNotifications, storedPrivacy, storedLanguage] =
          await Promise.all([
            settingsStorage.getItem("settings_notifications"),
            settingsStorage.getItem("settings_privacy_strict"),
            settingsStorage.getItem("settings_language"),
          ]);
        if (storedNotifications !== null)
          setNotificationsEnabled(storedNotifications === "true");
        if (storedPrivacy !== null) setPrivacyStrict(storedPrivacy === "true");
        if (storedLanguage === "en" || storedLanguage === "tr")
          setLanguage(storedLanguage);
      } catch {
        // Okuma hatasi sessizce gecilir, varsayilan degerler kalir
      }
    })();
  }, []);

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    hasUnsavedChanges.current = true;

    if (!currentUser) {
      void settingsStorage.setItem("settings_notifications", String(enabled));
      return;
    }

    void setPushNotificationsEnabled(currentUser.id, enabled).catch(() => {
      setNotificationsEnabled(!enabled);
      void settingsStorage.setItem(
        "settings_notifications",
        String(!enabled),
      );
      Alert.alert(
        "Bildirim ayarı değiştirilemedi",
        "Bağlantını kontrol edip tekrar dene.",
      );
    });
  };

  const handlePrivacyStrictChange = (strict: boolean) => {
    setPrivacyStrict(strict);
    hasUnsavedChanges.current = true;
    void settingsStorage.setItem("settings_privacy_strict", String(strict));
  };

  const handleLanguageChange = (lang: "tr" | "en") => {
    setLanguage(lang);
    hasUnsavedChanges.current = true;
    void settingsStorage.setItem("settings_language", lang);
  };

  // Warn user before leaving with unsaved changes
  const handleBack = () => {
    if (hasUnsavedChanges.current) {
      Alert.alert(
        "Kaydedilmemiş değişiklikler",
        "Yaptığın değişiklikleri kaydetmeden çıkacaksın. Devam etmek istiyor musun?",
        [
          {
            text: "İptal",
            style: "cancel",
          },
          {
            text: "Çık",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };
  const blockedCount = currentUser?.blockedUsers?.length ?? 0;
  const profileHidden = currentUser
    ? !(currentUser.isDiscoverable ?? true)
    : false;
  const locationMatchEnabled = currentUser?.matchByLocation ?? false;
  const matchRadiusKm = clampMatchRadiusKm(
    currentUser?.matchRadiusKm ?? DEFAULT_MATCH_RADIUS_KM,
  );
  const hasProfileLocation =
    typeof currentUser?.locationLatitude === "number" &&
    typeof currentUser?.locationLongitude === "number";
  const locationUpdatedAt = currentUser?.locationUpdatedAt
    ? new Date(currentUser.locationUpdatedAt)
    : null;
  const locationUpdatedLabel =
    locationUpdatedAt && Number.isFinite(locationUpdatedAt.getTime())
      ? `${locationUpdatedAt.toLocaleDateString("tr-TR")} ${locationUpdatedAt.toLocaleTimeString(
          "tr-TR",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`
      : null;
  const locationSubtitle = locationMatchEnabled
    ? hasProfileLocation
      ? `Yakındaki profiller ${matchRadiusKm} km içinde. ${locationUpdatedLabel ? `Son: ${locationUpdatedLabel}` : ""}`
      : "Konumu yenilemek gerekiyor."
    : "Discover akışında yakın profilleri öne çıkar.";
  const profileVisibilityMutation = useMutation({
    mutationFn: async (isHidden: boolean) => {
      if (!currentUser) {
        throw new Error("Profil gizliliği için oturum gerekli.");
      }

      return container.userRepository.setProfileDiscoverability(
        currentUser.id,
        !isHidden,
      );
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);
      hasUnsavedChanges.current = false;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        "Gizlilik güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    },
  });
  const locationMatchingMutation = useMutation({
    mutationFn: async ({
      enabled,
      radiusKm,
      refreshLocation = false,
    }: LocationPreferenceArgs) => {
      if (!currentUser) {
        throw new Error("Konum tercihi için oturum gerekli.");
      }

      const needsLocation = enabled && (refreshLocation || !hasProfileLocation);
      const coordinates = needsLocation
        ? await requestCurrentLocation()
        : undefined;

      return container.userRepository.setLocationMatching(currentUser.id, {
        enabled,
        radiusKm,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);
      hasUnsavedChanges.current = false;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        "Konum kaydedilemedi",
        getLocationPreferenceErrorMessage(error),
      );
    },
  });
  const updateLocationPreference = (
    enabled: boolean,
    radiusKm = matchRadiusKm,
    refreshLocation = false,
  ) => {
    if (locationMatchingMutation.isPending) {
      return;
    }

    locationMatchingMutation.mutate({ enabled, radiusKm, refreshLocation });
  };

  const row = ({
    title,
    subtitle,
    icon,
    danger = false,
    onPress,
  }: SettingsRowProps) => (
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
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      ) : null}
    </Pressable>
  );

  const openAccountDeletion = () => {
    Alert.alert(
      "Hesap silme",
      "Hesap silme ekranına geçeceksin. Silme işleminden önce son kez onay istenir.",
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
          hitSlop={8}
          onPress={handleBack}
          style={styles.backButton}
        >
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
            <Text style={styles.rowSubtitle}>
              Uygulama genelinde koyu tema kullan.
            </Text>
          </View>
          <Switch
            value={theme.isDark}
            onValueChange={(enabled) =>
              theme.setPreference(enabled ? "dark" : "light")
            }
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.chipWrap}>
          {(["system", "light", "dark"] as ThemePreference[]).map(
            (preference) => (
              <OptionChip
                key={preference}
                label={
                  preference === "system"
                    ? "Sistem"
                    : preference === "light"
                      ? "Aydınlık"
                      : "Karanlık"
                }
                selected={theme.preference === preference}
                onPress={() => theme.setPreference(preference)}
              />
            ),
          )}
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
          subtitle:
            blockedCount > 0
              ? `${blockedCount} kullanıcı engelli. Engellediklerin Keşfet akışında görünmez.`
              : "Profil güvenlik menüsünden engellediğin kişiler Keşfet akışından çıkarılır.",
          icon: "remove-circle-outline",
          onPress: () => router.push("/tabs/profile/blocked-users"),
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
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Bildirimler</Text>
            <Text style={styles.rowSubtitle}>
              Beğeni, yorum, eşleşme ve mesaj bildirimleri.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsChange}
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Eşleşme</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="navigate-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Konuma göre eşleşme</Text>
            <Text style={styles.rowSubtitle}>{locationSubtitle}</Text>
          </View>
          <Switch
            value={locationMatchEnabled}
            disabled={!currentUser || locationMatchingMutation.isPending}
            onValueChange={(enabled) =>
              updateLocationPreference(enabled, matchRadiusKm, enabled)
            }
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.chipWrap}>
          {locationRadiusOptions.map((radiusKm) => (
            <OptionChip
              key={radiusKm}
              label={`${radiusKm} km`}
              selected={matchRadiusKm === radiusKm}
              disabled={!currentUser || locationMatchingMutation.isPending}
              onPress={() =>
                updateLocationPreference(
                  true,
                  radiusKm,
                  !locationMatchEnabled || !hasProfileLocation,
                )
              }
            />
          ))}
        </View>
        <Button
          label={locationMatchEnabled ? "Konumu yenile" : "Konumu kullan"}
          variant="ghost"
          loading={locationMatchingMutation.isPending}
          disabled={!currentUser}
          icon={
            <Ionicons name="locate" size={18} color={theme.colors.primary} />
          }
          onPress={() => updateLocationPreference(true, matchRadiusKm, true)}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Gizlilik</Text>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="eye-off-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Profili gizle</Text>
            <Text style={styles.rowSubtitle}>
              Profilini keşfet akışı dışında tut.
            </Text>
          </View>
          <Switch
            value={profileHidden}
            disabled={profileVisibilityMutation.isPending}
            onValueChange={(hidden) => profileVisibilityMutation.mutate(hidden)}
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Gizlilik koruması</Text>
            <Text style={styles.rowSubtitle}>
              KVKK/GDPR tercihlerini daha sıkı uygula.
            </Text>
          </View>
          <Switch
            value={privacyStrict}
            onValueChange={handlePrivacyStrictChange}
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Dil</Text>
        <View style={styles.chipWrap}>
          <OptionChip
            label="Türkçe"
            selected={language === "tr"}
            onPress={() => handleLanguageChange("tr")}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Hukuki</Text>
        {legalLinks.map((link) => (
          <React.Fragment key={link.path}>
            {row({
              title: link.title,
              subtitle: "Uyumluluk ve kullanıcı hakları",
              icon: "document-text-outline",
              onPress: () => router.push(link.path),
            })}
          </React.Fragment>
        ))}
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
      marginBottom: theme.spacing.lg,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    rowIconDanger: {
      backgroundColor: "rgba(220, 38, 38, 0.10)",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    rowBody: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    dangerText: {
      color: theme.colors.danger,
    },
    rowSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.78,
    },
  });
