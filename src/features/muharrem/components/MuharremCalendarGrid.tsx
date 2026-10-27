import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";
import type { createMuharremStyles } from "./muharremStyles";

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

interface MuharremDayItem {
  day: number;
  hicriLabel: string;
  gregorianDate: Date;
  note: string;
}

interface MuharremCalendarGridProps {
  muharremDays: MuharremDayItem[];
  completedDays: number[];
  activeDay: number;
  isFinished: boolean;
  today: Date;
  ashuraDay: number;
  isTrackingDisabled: boolean;
  onToggleDay: (day: number) => void;
  formatDate: (date: Date) => string;
  styles: ReturnType<typeof createMuharremStyles>;
}

export function MuharremCalendarGrid({
  muharremDays,
  completedDays,
  activeDay,
  isFinished,
  today,
  ashuraDay,
  isTrackingDisabled,
  onToggleDay,
  formatDate,
  styles,
}: MuharremCalendarGridProps) {
  const theme = useTheme();

  return (
    <View style={styles.calendarPanel}>
      <View style={styles.calendarHeader}>
        <Text style={styles.sectionTitle}>12 günlük takvim</Text>
        <Text style={styles.calendarHint}>Bugün: {formatDate(today)}</Text>
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
              accessibilityState={{
                checked: completed,
                disabled: isTrackingDisabled,
              }}
              disabled={isTrackingDisabled}
              onPress={() => onToggleDay(item.day)}
              style={({ pressed }) => [
                styles.dayCell,
                active && styles.dayCellActive,
                past && styles.dayCellPast,
                isAshura && styles.dayCellAshura,
                completed && styles.dayCellCompleted,
                isTrackingDisabled && styles.dayCellDisabled,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.dayOrb,
                  active && styles.dayOrbActive,
                  isAshura && styles.dayOrbAshura,
                  completed && styles.dayOrbCompleted,
                ]}
              >
                <Ionicons
                  name={
                    completed
                      ? "checkmark"
                      : isAshura
                        ? "star"
                        : active
                          ? "flame"
                          : "ellipse-outline"
                  }
                  size={completed ? 22 : 20}
                  color={
                    completed || active || isAshura
                      ? "#FFFFFF"
                      : theme.colors.muted
                  }
                />
              </View>
              <Text
                style={[
                  styles.dayNumber,
                  completed && styles.dayNumberCompleted,
                ]}
              >
                {item.hicriLabel}
              </Text>
              <Text style={styles.dayDate}>
                {formatDate(item.gregorianDate)}
              </Text>
              <Text style={styles.dayNote}>{item.note}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
