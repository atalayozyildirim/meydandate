import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Community } from "@/domain/entities/Community";
import { Button, Copy, Heading, Icon, colors } from "../../ui";
import { groupDetailStyles as styles } from "./groupDetailStyles";

interface GroupHeroSectionProps {
  community: Community;
  isOrganizer: boolean;
  isActiveMember: boolean;
  isPendingMember: boolean;
  actionLoading: boolean;
  activeTab: "posts" | "requests";
  postCount: number;
  requestCount: number;
  onJoin: () => void;
  onLeave: () => void;
  onSelectTab: (tab: "posts" | "requests") => void;
}

export function GroupHeroSection({
  community,
  isOrganizer,
  isActiveMember,
  isPendingMember,
  actionLoading,
  activeTab,
  postCount,
  requestCount,
  onJoin,
  onLeave,
  onSelectTab,
}: GroupHeroSectionProps) {
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroTop}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              community.isPrivate && styles.privateBadge,
            ]}
          >
            <Icon
              name={
                community.isPrivate
                  ? "lock-closed-outline"
                  : "earth-outline"
              }
              size={12}
              color={community.isPrivate ? colors.wine : colors.green}
            />
            <Text
              style={[
                styles.typeBadgeText,
                community.isPrivate && { color: colors.wine },
              ]}
            >
              {community.isPrivate ? "Kapalı Çevre" : "Açık Çevre"}
            </Text>
          </View>
          <Text style={styles.cityText}>{community.city}</Text>
        </View>
        <Copy small muted>
          {community.memberCount} üye
        </Copy>
      </View>

      <Heading large style={styles.heroTitle}>
        {community.name}
      </Heading>
      <Text style={styles.heroTopic}>{community.topic}</Text>

      {Boolean(community.description) && (
        <Copy style={styles.heroDesc}>{community.description}</Copy>
      )}

      {/* Membership Actions */}
      <View style={styles.actionRow}>
        {!community.myMembership && (
          <Button
            onPress={onJoin}
            disabled={actionLoading}
            icon={
              community.isPrivate
                ? "paper-plane-outline"
                : "enter-outline"
            }
            style={{ flex: 1 }}
          >
            {community.isPrivate
              ? "Katılım İsteği Gönder"
              : "Bu Çevreye Katıl"}
          </Button>
        )}

        {isPendingMember && (
          <View style={styles.pendingStatusBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Katılım İsteği İletildi</Text>
              <Text style={styles.pendingDesc}>
                Yönetici başvurunuzu inceledikten sonra içerikleri görebileceksiniz.
              </Text>
            </View>
            <Button
              secondary
              onPress={onLeave}
              disabled={actionLoading}
              style={styles.cancelReqBtn}
            >
              Geri Çek
            </Button>
          </View>
        )}

        {isActiveMember && (
          <View style={styles.activeMemberRow}>
            <View style={styles.activeBadgeContainer}>
              <Icon name="checkmark-circle" size={18} color={colors.green} />
              <Text style={styles.activeBadgeText}>
                {isOrganizer ? "Yöneticisin" : "Bu çevrenin üyesisin"}
              </Text>
            </View>
            {!isOrganizer && (
              <Pressable
                accessibilityRole="button"
                onPress={onLeave}
                disabled={actionLoading}
                style={styles.leaveBtn}
              >
                <Text style={styles.leaveText}>Ayrıl</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Organizer Tab switcher (Posts vs Pending Requests) */}
      {isOrganizer && community.isPrivate && (
        <View style={styles.organizerTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "posts" }}
            onPress={() => onSelectTab("posts")}
            style={[
              styles.orgTab,
              activeTab === "posts" && styles.orgTabActive,
            ]}
          >
            <Text
              style={[
                styles.orgTabText,
                activeTab === "posts" && styles.orgTabTextActive,
              ]}
            >
              Paylaşımlar ({postCount})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "requests" }}
            onPress={() => onSelectTab("requests")}
            style={[
              styles.orgTab,
              activeTab === "requests" && styles.orgTabActive,
            ]}
          >
            <Text
              style={[
                styles.orgTabText,
                activeTab === "requests" && styles.orgTabTextActive,
              ]}
            >
              Katılım İstekleri ({requestCount})
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
