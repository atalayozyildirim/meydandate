// Muharrem orucu icin gercek 2026 tarihli takvim ve hatirlatici ekranini sunar.
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Badge } from "@/domain/entities/User";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";
import { createMuharremStyles } from "../components/muharremStyles";
import { MuharremCalendarGrid } from "../components/MuharremCalendarGrid";

type NotificationsModule = typeof import("expo-notifications");

const muharremYear = 1448;
const muharremStart = new Date(2026, 5, 16);
const ashuraDay = 10;
const fastingDayCount = 12;
const muharrem2026Badge: Badge = "muharrem_orucu_2026";

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const diffDays = (first: Date, second: Date) =>
  Math.round((startOfDay(first).getTime() - startOfDay(second).getTime()) / 86400000);

const formatDate = (date: Date) =>
  date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
const getReminderDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 30);

const muharremDays = Array.from({ length: fastingDayCount }, (_, index) => {
  const day = index + 1;

  return {
    day,
    hicriLabel: `${day} Muharrem`,
    gregorianDate: addDays(muharremStart, index),
    note: day === 1 ? "Hicri yılbaşı" : day === ashuraDay ? "Aşure günü" : "Oruç günü",
  };
});

const muharremEnd = muharremDays[muharremDays.length - 1]?.gregorianDate ?? muharremStart;

const loadNotifications = async (): Promise<NotificationsModule | null> => {
  try {
    const notifications = await import("expo-notifications");
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    return notifications;
  } catch {
    return null;
  }
};

export default function MuharremTrackerScreen() {
  const theme = useTheme();
  const styles = createMuharremStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const today = startOfDay(new Date());
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notificationIds, setNotificationIds] = useState<string[]>([]);
  const [isAwardingBadge, setIsAwardingBadge] = useState(false);
  const daysUntilStart = diffDays(muharremStart, today);
  const daysSinceStart = diffDays(today, muharremStart);
  const isUpcoming = today < startOfDay(muharremStart);
  const isFinished = today > startOfDay(muharremEnd);
  const isTrackingDisabled = isFinished;
  const currentMuharremDay =
    !isUpcoming && !isFinished ? Math.min(daysSinceStart + 1, fastingDayCount) : null;
  const activeDay = currentMuharremDay ?? (isUpcoming ? 1 : fastingDayCount);
  const timelineDay = currentMuharremDay ?? (isUpcoming ? 0 : fastingDayCount);
  const progress = completedDays.length;
  const progressPercent = useMemo(
    () => Math.round((progress / fastingDayCount) * 100),
    [progress],
  );
  const progressLabel = isTrackingDisabled
    ? "Takip dönemi kapandı"
    : "16-27 Haziran 2026";
  const progressValueLabel = isTrackingDisabled ? "Kapalı" : `%${progressPercent}`;
  const statusText = isUpcoming
    ? `Başlamasına ${daysUntilStart} gün var`
    : isFinished
      ? "Bu yılki takip tamamlandı"
      : `Bugün ${currentMuharremDay}. gün`;
  const nextReminderDay =
    muharremDays.find((item) => getReminderDate(item.gregorianDate).getTime() > Date.now()) ??
    null;
  const reminderStatusText = nextReminderDay
    ? `${formatDate(nextReminderDay.gregorianDate)} 07:30`
    : isFinished
      ? "2026 takvimi tamamlandı"
      : "Bugünkü 07:30 uyarı saati geçti";

  const awardMuharrem2026Badge = async () => {
    if (
      !currentUser ||
      currentUser.badges.includes(muharrem2026Badge) ||
      isAwardingBadge
    ) {
      return;
    }

    try {
      setIsAwardingBadge(true);
      const updatedUser = await container.userRepository.claimMuharrem2026Badge(
        currentUser.id,
      );
      setCurrentUser(updatedUser);
      Alert.alert(
        "Rozet kazanıldı",
        "Muharrem Orucu 2026 rozeti profiline eklendi.",
      );
    } catch (error) {
      Alert.alert(
        "Rozet eklenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    } finally {
      setIsAwardingBadge(false);
    }
  };

  const toggleDay = (day: number) => {
    if (isTrackingDisabled) {
      return;
    }

    setCompletedDays((current) => {
      const nextDays = current.includes(day)
        ? current.filter((completedDay) => completedDay !== day)
        : [...current, day].sort((first, second) => first - second);

      if (nextDays.length === fastingDayCount) {
        void awardMuharrem2026Badge();
      }

      return nextDays;
    });
  };

  const toggleReminder = async (nextValue: boolean) => {
    try {
      const notifications = await loadNotifications();

      if (!notifications) {
        Alert.alert("Bildirim modülü yok", "Hatırlatıcı için uygulamayı yeni native build ile tekrar kur.");
        setReminderEnabled(false);
        return;
      }

      if (!nextValue) {
        await Promise.all(
          notificationIds.map((id) => notifications.cancelScheduledNotificationAsync(id)),
        );
        setNotificationIds([]);
        setReminderEnabled(false);
        return;
      }

      const existingPermission = await notifications.getPermissionsAsync();
      let status = existingPermission.status;

      if (status !== "granted") {
        const requestedPermission = await notifications.requestPermissionsAsync();
        status = requestedPermission.status;
      }

      if (status !== "granted") {
        Alert.alert("Bildirim izni yok", "Muharrem hatırlatıcısı için bildirim izni gerekli.");
        return;
      }

      const upcomingDays = muharremDays.filter((item) => {
        const reminderDate = getReminderDate(item.gregorianDate);

        return reminderDate.getTime() > Date.now();
      });

      if (upcomingDays.length === 0) {
        Alert.alert("Takvim bitti", "2026 Muharrem orucu günleri geride kalmış.");
        return;
      }

      const ids = await Promise.all(
        upcomingDays.map((item) => {
          const reminderDate = getReminderDate(item.gregorianDate);

          return notifications.scheduleNotificationAsync({
            content: {
              title: `${item.hicriLabel} hatırlatması`,
              body: `${formatDate(item.gregorianDate)} - ${item.note}. Bugünkü günü işaretlemeyi unutma.`,
              sound: true,
            },
            trigger: reminderDate as any,
          });
        }),
      );

      setNotificationIds(ids);
      setReminderEnabled(true);
      Alert.alert("Hatırlatıcı açıldı", `${ids.length} Muharrem günü için 07:30 hatırlatıcısı kuruldu.`);
    } catch (error) {
      Alert.alert(
        "Hatırlatıcı kurulamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="calendar-outline"
            size={28}
            color={theme.colors.onPrimary}
          />
        </View>
        <Text style={styles.kicker}>Muharrem {muharremYear}</Text>
        <Text style={styles.title}>Oruç takvimi</Text>
        <Text style={styles.description}>
          1 Muharrem 1448, 16 Haziran 2026 Salı günü başlar. 10 Muharrem/Aşure günü 25 Haziran 2026.
        </Text>
      </View>

      <View style={styles.streakPanel}>
        <View style={styles.streakLeft}>
          <Ionicons name="flame" size={32} color="#FFFFFF" />
          <View style={styles.streakCopy}>
            <View style={styles.streakMeta}>
              <Text style={styles.streakLabel}>Gerçek tarih durumu</Text>
              <View style={styles.targetPill}>
                <Text style={styles.targetText}>
                  {timelineDay}/{fastingDayCount}
                </Text>
              </View>
            </View>
            <Text style={styles.streakValue}>{statusText}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.reminderPanel, reminderEnabled && styles.reminderPanelActive]}>
        <View style={styles.reminderIcon}>
          <Ionicons
            name={reminderEnabled ? "notifications" : "notifications-outline"}
            size={24}
            color={theme.colors.onPrimary}
          />
        </View>
        <View style={styles.reminderText}>
          <Text style={styles.reminderTitle}>Oruç günü hatırlatıcı</Text>
          <Text style={styles.reminderDescription}>
            Sonraki uyarı: {reminderStatusText}
          </Text>
        </View>
        <Switch
          value={reminderEnabled}
          disabled={isTrackingDisabled}
          onValueChange={(value) => void toggleReminder(value)}
          trackColor={{ false: theme.colors.border, true: "#B7F7C1" }}
          thumbColor={reminderEnabled ? theme.colors.success : "#FFFFFF"}
        />
      </View>

      <View style={[styles.progressPanel, isTrackingDisabled && styles.disabledPanel]}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
          <Text style={styles.progressPercent}>{progressValueLabel}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <MuharremCalendarGrid
        muharremDays={muharremDays}
        completedDays={completedDays}
        activeDay={activeDay}
        isFinished={isFinished}
        today={today}
        ashuraDay={ashuraDay}
        isTrackingDisabled={isTrackingDisabled}
        onToggleDay={toggleDay}
        formatDate={formatDate}
        styles={styles}
      />

      <View style={styles.notePanel}>
        <View style={styles.noteTitleRow}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Bugünün notu</Text>
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          editable={!isTrackingDisabled}
          placeholder="Niyet, duygu veya hatırlamak istediğin kısa bir not..."
          placeholderTextColor={theme.colors.muted}
          style={[styles.noteInput, isTrackingDisabled && styles.noteInputDisabled]}
        />
      </View>
    </Screen>
  );
}
