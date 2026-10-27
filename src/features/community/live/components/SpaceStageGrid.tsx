import React from "react";
import { Pressable, Text, View } from "react-native";
import type { LiveParticipant } from "@/domain/entities/LiveRoom";
import { Icon, colors } from "../../ui";
import { spaceStyles as styles } from "./spaceStyles";

interface SpaceStageGridProps {
  speakers: LiveParticipant[];
  currentUserId: string | null;
  isAdmin: boolean;
  onMuteSpeaker: (id: string) => void;
  onDemoteToListener: (id: string) => void;
}

export function SpaceStageGrid({
  speakers,
  currentUserId,
  isAdmin,
  onMuteSpeaker,
  onDemoteToListener,
}: SpaceStageGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        SAHNE & KONUŞMACILAR ({speakers.length})
      </Text>
      <View style={styles.stageGrid}>
        {speakers.map((s) => {
          const isMe = s.id === currentUserId || s.isCurrentUser;
          return (
            <View key={s.id} style={styles.speakerBox}>
              <View style={styles.speakerAvatarContainer}>
                <View style={styles.speakerAvatar}>
                  <Text style={styles.avatarInitial}>
                    {s.name?.[0]?.toUpperCase() ?? "K"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.micBadge,
                    s.isMuted ? styles.micMuted : styles.micActive,
                  ]}
                >
                  <Icon
                    name={s.isMuted ? "mic-off" : "mic"}
                    size={12}
                    color={colors.white}
                  />
                </View>
              </View>

              <Text style={styles.speakerName} numberOfLines={1}>
                {s.name || "Konuşmacı"} {isMe ? "(Sen)" : ""}
              </Text>
              <Text style={styles.speakerRole}>
                {s.role === "Yonetici" ? "Yönetici" : "Konuşmacı"}
              </Text>

              {/* Admin controls per speaker */}
              {isAdmin && s.role !== "Yonetici" && (
                <View style={styles.speakerAdminRow}>
                  <Pressable
                    onPress={() => onMuteSpeaker(s.id)}
                    style={styles.microBtn}
                  >
                    <Text style={styles.microBtnText}>Sustur</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDemoteToListener(s.id)}
                    style={styles.microBtn}
                  >
                    <Text style={styles.microBtnText}>İndir</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
