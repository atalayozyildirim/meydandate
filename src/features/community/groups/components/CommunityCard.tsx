import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Community } from "@/domain/entities/Community";
import { Copy, Heading, Icon, colors, ui } from "../../ui";
import { groupsScreenStyles as styles } from "./groupsScreenStyles";

interface CommunityCardProps {
  item: Community;
  onPress: (id: string) => void;
}

export function CommunityCard({ item, onPress }: CommunityCardProps) {
  const isOrganizer = item.myMembership?.role === "organizer";
  const isActive = item.myMembership?.status === "active";
  const isPending = item.myMembership?.status === "pending";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} topluluğu`}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.card,
        pressed && ui.pressed && ui.focus,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              item.isPrivate && styles.privateBadge,
            ]}
          >
            <Icon
              name={
                item.isPrivate
                  ? "lock-closed-outline"
                  : "earth-outline"
              }
              size={12}
              color={item.isPrivate ? colors.wine : colors.green}
            />
            <Text
              style={[
                styles.typeBadgeText,
                item.isPrivate && { color: colors.wine },
              ]}
            >
              {item.isPrivate ? "Kapalı Çevre" : "Açık Çevre"}
            </Text>
          </View>
          <Text style={styles.cityText}>{item.city}</Text>
        </View>

        {/* Status indicator */}
        {isOrganizer && (
          <View style={styles.memberStatusBadge}>
            <Text style={styles.memberStatusText}>Yönetici</Text>
          </View>
        )}
        {!isOrganizer && isActive && (
          <View
            style={[
              styles.memberStatusBadge,
              { backgroundColor: "#E7F3EC" },
            ]}
          >
            <Text
              style={[
                styles.memberStatusText,
                { color: colors.green },
              ]}
            >
              Üyesin
            </Text>
          </View>
        )}
        {!isOrganizer && isPending && (
          <View
            style={[
              styles.memberStatusBadge,
              { backgroundColor: "#FFF4E5" },
            ]}
          >
            <Text
              style={[
                styles.memberStatusText,
                { color: "#B76E00" },
              ]}
            >
              Beklemede
            </Text>
          </View>
        )}
      </View>

      <Heading large style={styles.commTitle}>
        {item.name}
      </Heading>
      <Text style={styles.topicText}>{item.topic}</Text>

      {Boolean(item.description) && (
        <Text style={styles.descText} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.memberCount}>
          <Icon name="people-outline" size={14} color={colors.muted} />
          <Copy small muted>
            {item.memberCount} üye
          </Copy>
        </View>
        <View style={styles.arrowIcon}>
          <Icon name="chevron-forward" size={16} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );
}
