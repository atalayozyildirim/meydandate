// Uygulamaya giris onay testini gorunur bir kapı olarak sunar.
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useApprovalTest } from "@/features/onboarding/hooks/useApprovalTest";
import { useSession } from "@/features/auth/hooks/useSession";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";

const approvalItems = [
  {
    id: "age",
    title: "18 yasindan buyugum",
    description: "Ehlibyte yalnizca yetiskin kullanicilar icindir.",
  },
  {
    id: "real_profile",
    title: "Profil bilgilerim bana ait",
    description: "Sahte profil, baskasina ait fotograf veya yaniltici bilgi kullanmayacagim.",
  },
  {
    id: "respect",
    title: "Saygili iletisim kuracagim",
    description: "Alevi kulturune, farkli inanclara ve kullanicilarin sinirlarina saygi gosterecegim.",
  },
  {
    id: "safety",
    title: "Taciz ve nefret soylemi yok",
    description: "Rahatsiz edici davranis, ayrimcilik veya israrli mesajlasma yapmayacagim.",
  },
] as const;

export default function ApprovalTestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { currentUser } = useSession();
  const { completeApprovalTest, isCompletingApproval } = useApprovalTest();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const isComplete = approvalItems.every((item) => answers[item.id]);

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  if (currentUser.hasPassedEntryTest) {
    return currentUser.hasCompletedOnboarding ? (
      <Redirect href="/tabs/discover" />
    ) : (
      <Redirect href="/onboarding" />
    );
  }

  const toggleAnswer = (id: string) => {
    setAnswers((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const onSubmit = async () => {
    if (!isComplete) {
      Alert.alert("Onay testi eksik", "Devam etmek icin tum maddeleri onayla.");
      return;
    }

    try {
      await completeApprovalTest();
      router.replace(currentUser.hasCompletedOnboarding ? "/tabs/discover" : "/onboarding");
    } catch (error) {
      Alert.alert(
        "Onay kaydedilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>e</Text>
        </View>
        <Text style={styles.kicker}>Ehlibyte onay testi</Text>
        <Text style={styles.title}>Topluluga girmeden once net kurallar.</Text>
        <Text style={styles.description}>
          Bu testi gecmeyen kullanici Kesfet, eslesme ve mesaj ekranlarina giremez.
        </Text>
      </View>

      <View style={styles.list}>
        {approvalItems.map((item) => {
          const selected = Boolean(answers[item.id]);

          return (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleAnswer(item.id)}
              style={({ pressed }) => [
                styles.item,
                selected && styles.itemSelected,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={28}
                color={selected ? theme.colors.primary : theme.colors.muted}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Onay testini tamamla"
        disabled={!isComplete}
        loading={isCompletingApproval}
        onPress={() => void onSubmit()}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.lg,
    },
    hero: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    mark: {
      width: 58,
      height: 58,
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
    markText: {
      fontSize: 38,
      lineHeight: 42,
      fontWeight: "900",
      color: "#FFFFFF",
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
    list: {
      gap: theme.spacing.sm,
    },
    item: {
      minHeight: 92,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "flex-start",
    },
    itemSelected: {
      borderColor: "rgba(233, 64, 87, 0.42)",
      backgroundColor: "#FFF0F3",
    },
    pressed: {
      opacity: 0.84,
    },
    itemText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    itemTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    itemDescription: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
  });
