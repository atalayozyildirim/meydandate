import React from "react";
import { Modal, View } from "react-native";
import type { Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { Button, Copy, Eyebrow, Heading, Icon, colors } from "../../ui";
import { matchingStyles as styles } from "./matchingStyles";

interface MatchingCelebrationModalProps {
  newMatch: { match: Match; conversationId?: string } | null;
  onClose: () => void;
  onOpenChat: (conversationId: string, partnerName?: string) => void;
  getPartner: (match: Match) => User;
}

export function MatchingCelebrationModal({
  newMatch,
  onClose,
  onOpenChat,
  getPartner,
}: MatchingCelebrationModalProps) {
  return (
    <Modal visible={Boolean(newMatch)} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.celebrationCard}>
          <Icon name="heart-circle" size={60} color={colors.wine} />
          <Eyebrow>BİR MERHABA, İKİ TARAFTAN</Eyebrow>
          <Heading large style={{ textAlign: "center", marginVertical: 6 }}>
            Karşılıklı Eşleştiniz!
          </Heading>
          <Copy muted style={{ textAlign: "center", marginBottom: 16 }}>
            {newMatch ? getPartner(newMatch.match).name : ""} ile birbirinizi
            beğendiniz. Şimdi sohbet başlatabilirsiniz.
          </Copy>

          <View style={styles.modalBtnRow}>
            <Button
              secondary
              onPress={onClose}
              style={{ flex: 1 }}
            >
              Keşfete Devam Et
            </Button>
            <Button
              onPress={() => {
                const convId = newMatch?.conversationId;
                const partner = newMatch ? getPartner(newMatch.match) : null;
                onClose();
                if (convId) {
                  onOpenChat(convId, partner?.name);
                }
              }}
              style={{ flex: 1 }}
            >
              Sohbeti Aç
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
