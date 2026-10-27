import React from "react";
import { Pressable, Text, View } from "react-native";
import type { LiveParticipant } from "@/domain/entities/LiveRoom";
import { Icon, colors } from "../../ui";
import { spaceStyles as styles } from "./spaceStyles";

interface SpaceListenersGridProps {
  listeners: LiveParticipant[];
  currentUserId: string | null;
  isAdmin: boolean;
  onKickParticipant: (id: string) => void;
}

export function SpaceListenersGrid({
  listeners,
  currentUserId,
  isAdmin,
  onKickParticipant,
}: SpaceListenersGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        DİNLEYİCİLER ({listeners.length})
      </Text>
      <View style={styles.listenersGrid}>
        {listeners.map((l) => {
          const isMe = l.id === currentUserId || l.isCurrentUser;
          const hasHandRaised = Boolean(l.handRaisedAt);

          return (
            <View key={l.id} style={styles.listenerItem}>
              <View style={styles.listenerAvatarBox}>
                <View style={styles.listenerAvatar}>
                  <Text style={styles.listenerInitial}>
                    {l.name?.[0]?.toUpperCase() ?? "D"}
                  </Text>
                </View>
                {hasHandRaised && (
                  <View style={styles.handBadge}>
                    <Icon name="hand-right" size={10} color={colors.white} />
                  </View>
                )}
              </View>

              <Text style={styles.listenerName} numberOfLines={1}>
                {l.name || "Dinleyici"} {isMe ? "(Sen)" : ""}
              </Text>

              {isAdmin && (
                <Pressable
                  onPress={() => onKickParticipant(l.id)}
                  style={styles.kickBtn}
                >
                  <Text style={styles.kickBtnText}>Çıkar</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
