import React from "react";
import { Text, View } from "react-native";
import type { LiveParticipant } from "@/domain/entities/LiveRoom";
import { Button, Icon, colors } from "../../ui";
import { spaceStyles as styles } from "./spaceStyles";

interface SpaceHandRaiseQueueProps {
  handRaisers: LiveParticipant[];
  onPromoteToSpeaker: (id: string) => void;
}

export function SpaceHandRaiseQueue({
  handRaisers,
  onPromoteToSpeaker,
}: SpaceHandRaiseQueueProps) {
  if (handRaisers.length === 0) return null;

  return (
    <View style={styles.adminQueueCard}>
      <View style={styles.queueHeader}>
        <Icon name="hand-right" size={18} color={colors.wine} />
        <Text style={styles.queueTitle}>
          Söz İsteyenler ({handRaisers.length})
        </Text>
      </View>
      {handRaisers.map((p) => (
        <View key={p.id} style={styles.queueItem}>
          <Text style={styles.queueName}>
            {p.name || "Dinleyici"}
          </Text>
          <Button
            onPress={() => onPromoteToSpeaker(p.id)}
            style={styles.inviteStageBtn}
          >
            Sahneye Al
          </Button>
        </View>
      ))}
    </View>
  );
}
