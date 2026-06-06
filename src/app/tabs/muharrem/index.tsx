// Muharrem orucu icin gercek 2026 tarihli takvim ve hatirlatici ekranini sunar.
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";

type NotificationsModule = typeof import("expo-notifications");

const muharremYear = 1448;
const muharremStart = new Date(2026, 5, 16);
const ashuraDay = 10;
const fastingDayCount = 12;

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
    note: day === 1 ? "Hicri yilbasi" : day === ashuraDay ? "Asure gunu" : "Oruç gunu",
  };
});

const muharremEnd = muharremDays[muharremDays.length - 1]?.gregorianDate ?? muharremStart;

const loadNotifications = async (): Promise<NotificationsModule | null> => {
  try {
    const notifications = await import("expo-notifications");
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
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
  const styles = createStyles(theme);
  const today = startOfDay(new Date());
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notificationIds, setNotificationIds] = useState<string[]>([]);
  const daysUntilStart = diffDays(muharremStart, today);
  const daysSinceStart = diffDays(today, muharremStart);
  const isUpcoming = today < startOfDay(muharremStart);
  const isFinished = today > startOfDay(muharremEnd);
  const currentMuharremDay =
    !isUpcoming && !isFinished ? Math.min(daysSinceStart + 1, fastingDayCount) : null;
  const activeDay = currentMuharremDay ?? (isUpcoming ? 1 : fastingDayCount);
  const progress = completedDays.length;
  const progressPercent = useMemo(
    () => Math.round((progress / fastingDayCount) * 100),
    [progress],
  );
  const statusText = isUpcoming
    ? `Baslamasina ${daysUntilStart} gun var`
    : isFinished
      ? "Bu yilki takip tamamlandi"
      : `Bugun ${currentMuharremDay}. gun`;
  const nextReminderDay =
    muharremDays.find((item) => getReminderDate(item.gregorianDate).getTime() > Date.now()) ??
    null;
  const reminderStatusText = nextReminderDay
    ? `${formatDate(nextReminderDay.gregorianDate)} 07:30`
    : "2026 takvimi tamamlandi";

  const toggleDay = (day: number) => {
    setCompletedDays((current) =>
      current.includes(day)
        ? current.filter((completedDay) => completedDay !== day)
        : [...current, day].sort((first, second) => first - second),
    );
  };

  const toggleReminder = async (nextValue: boolean) => {
    try {
      const notifications = await loadNotifications();

      if (!notifications) {
        Alert.alert("Bildirim modulu yok", "Hatirlatici icin uygulamayi yeni native build ile tekrar kur.");
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
        Alert.alert("Bildirim izni yok", "Muharrem hatirlaticisi icin bildirim izni gerekli.");
        return;
      }

      const upcomingDays = muharremDays.filter((item) => {
        const reminderDate = getReminderDate(item.gregorianDate);

        return reminderDate.getTime() > Date.now();
      });

      if (upcomingDays.length === 0) {
        Alert.alert("Takvim bitti", "2026 Muharrem orucu gunleri geride kalmis.");
        return;
      }

      const ids = await Promise.all(
        upcomingDays.map((item) => {
          const reminderDate = getReminderDate(item.gregorianDate);

          return notifications.scheduleNotificationAsync({
            content: {
              title: `${item.hicriLabel} hatirlatmasi`,
              body: `${formatDate(item.gregorianDate)} - ${item.note}. Bugunku gunu isaretlemeyi unutma.`,
              sound: true,
            },
            trigger: reminderDate as any,
          });
        }),
      );

      setNotificationIds(ids);
      setReminderEnabled(true);
      Alert.alert("Hatirlatici acildi", `${ids.length} Muharrem gunu icin 07:30 hatirlaticisi kuruldu.`);
    } catch (error) {
      Alert.alert(
        "Hatirlatici kurulamadi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="calendar-outline" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.kicker}>Muharrem {muharremYear}</Text>
        <Text style={styles.title}>Oruç takvimi</Text>
        <Text style={styles.description}>
          1 Muharrem 1448, 16 Haziran 2026 Sali gunu baslar. 10 Muharrem/Asure gunu 25 Haziran 2026.
        </Text>
      </View>

      <View style={styles.streakPanel}>
        <View style={styles.streakLeft}>
          <Ionicons name="flame" size={32} color="#FFFFFF" />
          <View>
            <Text style={styles.streakLabel}>Gercek tarih durumu</Text>
            <Text style={styles.streakValue}>{statusText}</Text>
          </View>
        </View>
        <View style={styles.targetPill}>
          <Text style={styles.targetText}>{progress}/12</Text>
        </View>
      </View>

      <View style={[styles.reminderPanel, reminderEnabled && styles.reminderPanelActive]}>
        <View style={styles.reminderIcon}>
          <Ionicons
            name={reminderEnabled ? "notifications" : "notifications-outline"}
            size={24}
            color="#FFFFFF"
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
          onValueChange={(value) => void toggleReminder(value)}
          trackColor={{ false: theme.colors.border, true: "#B7F7C1" }}
          thumbColor={reminderEnabled ? theme.colors.success : "#FFFFFF"}
        />
      </View>

      <View style={styles.progressPanel}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>16-27 Haziran 2026</Text>
          <Text style={styles.progressPercent}>%{progressPercent}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <View style={styles.calendarPanel}>
        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>12 gunluk takvim</Text>
          <Text style={styles.calendarHint}>Bugun: {formatDate(today)}</Text>
        </View>
        <View style={styles.daysGrid}>
          {muharremDays.map((item) => {
            const completed = completedDays.includes(item.day);
            const active = item.day === activeDay && !isFinished;
            const past = startOfDay(item.gregorianDate) < today;
            const isAshura = item.day === ashuraDay;

            return (
              <Pressable
                key={item.day}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completed }}
                onPress={() => toggleDay(item.day)}
                style={({ pressed }) => [
                  styles.dayCell,
                  active && styles.dayCellActive,
                  past && styles.dayCellPast,
                  isAshura && styles.dayCellAshura,
                  completed && styles.dayCellCompleted,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.dayOrb, completed && styles.dayOrbCompleted]}>
                  <Ionicons
                    name={completed ? "checkmark" : isAshura ? "star" : active ? "flame" : "ellipse-outline"}
                    size={completed ? 22 : 20}
                    color={completed || active || isAshura ? "#FFFFFF" : theme.colors.muted}
                  />
                </View>
                <Text style={[styles.dayNumber, completed && styles.dayNumberCompleted]}>
                  {item.hicriLabel}
                </Text>
                <Text style={styles.dayDate}>{formatDate(item.gregorianDate)}</Text>
                <Text style={styles.dayNote}>{item.note}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.notePanel}>
        <View style={styles.noteTitleRow}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Bugunun notu</Text>
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Niyet, duygu veya hatirlamak istedigin kisa bir not..."
          placeholderTextColor={theme.colors.muted}
          style={styles.noteInput}
        />
      </View>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.lg,
      paddingBottom: 104,
    },
    header: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    headerIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
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
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    streakPanel: {
      minHeight: 104,
      borderRadius: 28,
      padding: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.success,
      shadowColor: "rgba(22, 163, 74, 0.24)",
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    streakLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    streakLabel: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.78)",
    },
    streakValue: {
      ...theme.typography.heading,
      color: "#FFFFFF",
    },
    targetPill: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    targetText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    progressPanel: {
      gap: theme.spacing.sm,
    },
    progressTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressLabel: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    progressPercent: {
      ...theme.typography.subheading,
      color: theme.colors.primary,
    },
    progressTrack: {
      height: 12,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    calendarPanel: {
      gap: theme.spacing.md,
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    calendarHint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    dayCell: {
      width: "48.5%",
      minHeight: 142,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
    },
    dayCellActive: {
      borderColor: theme.colors.primary,
      backgroundColor: "#FFF0F3",
    },
    dayCellPast: {
      opacity: 0.72,
    },
    dayCellAshura: {
      borderColor: theme.colors.secondary,
    },
    dayCellCompleted: {
      borderColor: theme.colors.success,
      backgroundColor: "#ECFDF3",
      opacity: 1,
    },
    pressed: {
      opacity: 0.82,
    },
    dayOrb: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    dayOrbCompleted: {
      backgroundColor: theme.colors.success,
    },
    dayNumber: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    dayNumberCompleted: {
      color: theme.colors.success,
    },
    dayDate: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "800",
      color: theme.colors.text,
      textAlign: "center",
    },
    dayNote: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600",
      color: theme.colors.muted,
      textAlign: "center",
    },
    reminderPanel: {
      minHeight: 94,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.28)",
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      backgroundColor: "#FFF0F3",
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    reminderPanelActive: {
      borderColor: "rgba(22, 163, 74, 0.34)",
      backgroundColor: "#ECFDF3",
    },
    reminderIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    reminderText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    reminderTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    reminderDescription: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    notePanel: {
      gap: theme.spacing.sm,
    },
    noteTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    noteInput: {
      minHeight: 118,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      textAlignVertical: "top",
      ...theme.typography.body,
      color: theme.colors.text,
    },
  });
