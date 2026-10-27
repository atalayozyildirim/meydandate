import React from "react";
import { Pressable, Text, View } from "react-native";
import type { CommunityEvent } from "@/domain/entities/Event";
import { Heading, Icon, colors, fonts, ui } from "../../ui";
import { eventsScreenStyles as styles } from "./eventsScreenStyles";

interface EventCardProps {
  item: CommunityEvent;
  onSelectEvent?: (eventId: string) => void;
}

export function EventCard({ item, onSelectEvent }: EventCardProps) {
  const formatDateBlock = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = d
      .toLocaleDateString("tr-TR", { month: "short" })
      .toUpperCase();
    return { day, month };
  };

  const formatTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const s = `${start.getHours().toString().padStart(2, "0")}.${start.getMinutes().toString().padStart(2, "0")}`;
    const e = `${end.getHours().toString().padStart(2, "0")}.${end.getMinutes().toString().padStart(2, "0")}`;
    return `${s} – ${e}`;
  };

  const { day, month } = formatDateBlock(item.startsAt);
  const isFull = item.currentParticipants >= item.capacity;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} etkinliği`}
      onPress={() => onSelectEvent?.(item.id)}
      style={({ pressed }) => [
        styles.card,
        pressed && ui.pressed && ui.focus,
      ]}
    >
      <View style={styles.cardMain}>
        {/* Calendar Block */}
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>

        {/* Info Block */}
        <View style={styles.infoBlock}>
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.cityText}>
              {item.city} {item.district ? `· ${item.district}` : ""}
            </Text>
          </View>

          <Heading style={styles.eventTitle}>{item.title}</Heading>

          <Text style={styles.placeText} numberOfLines={1}>
            {item.place}
          </Text>

          <Text style={styles.timeText}>
            {formatTime(item.startsAt, item.endsAt)}
          </Text>
        </View>
      </View>

      {/* Footer with Capacity and Join State */}
      <View style={styles.cardFooter}>
        <View style={styles.capacityRow}>
          <Icon
            name="people-outline"
            size={15}
            color={isFull ? colors.wine : colors.muted}
          />
          <Text
            style={[
              styles.capacityText,
              isFull && { color: colors.wine, fontFamily: fonts.semi },
            ]}
          >
            {item.currentParticipants} / {item.capacity} katılımcı
            {isFull ? " (Kontenjan Dolu)" : ""}
          </Text>
        </View>

        {item.isJoinedByMe ? (
          <View style={styles.joinedBadge}>
            <Icon
              name="checkmark-circle"
              size={14}
              color={colors.green}
            />
            <Text style={styles.joinedText}>Katılıyorsun</Text>
          </View>
        ) : (
          <View style={styles.detailArrow}>
            <Text style={styles.detailLink}>İncele</Text>
            <Icon
              name="arrow-forward"
              size={14}
              color={colors.wine}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}
