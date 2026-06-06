// Profil uzerindeki engelle, sikayet ve sessize alma aksiyonlarini sunar.
import { Alert, StyleSheet, Text, View } from "react-native";
import type { User } from "@/domain/entities/User";
import { Button } from "@/shared/components/Button";
import { BottomSheet } from "@/shared/components/BottomSheet";
import { OptionChip } from "@/shared/components/OptionChip";
import { reportCategoryOptions } from "@/shared/constants/options";
import { useSafetyActions } from "@/features/profile/hooks/useSafetyActions";
import { useTheme } from "@/shared/theme";

interface SafetySheetProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

export const SafetySheet = ({ visible, user, onClose }: SafetySheetProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const safetyActions = useSafetyActions();

  if (!user) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Guvenlik</Text>
      <Text style={styles.description}>
        {user.name} profili icin bir aksiyon secin.
      </Text>
      <View style={styles.reportGrid}>
        {reportCategoryOptions.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            selected={false}
            onPress={async () => {
              await safetyActions.reportUser({
                reportedUserId: user.id,
                category: option.value,
              });
              Alert.alert(
                "Şikayet alindi",
                "Güvenlik ekibinin incelemesi icin kaydedildi.",
              );
              onClose();
            }}
          />
        ))}
      </View>
      <Button
        label="Sessize al"
        variant="secondary"
        onPress={async () => {
          await safetyActions.muteUser(user.id);
          onClose();
        }}
      />
      <Button
        label="Engelle"
        variant="danger"
        onPress={async () => {
          await safetyActions.blockUser(user.id);
          onClose();
        }}
      />
    </BottomSheet>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    reportGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginVertical: theme.spacing.sm,
    },
  });
