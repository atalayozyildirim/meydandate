// Tekil conversation ekraninda mesajlari ve mesaj gonderme formunu yonetir.
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/shared/components/Avatar";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { conversationStarters } from "@/shared/constants/options";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { useConversation } from "@/features/chat/hooks/useConversations";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useTheme } from "@/shared/theme";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const [message, setMessage] = useState("");
  const { conversation, currentUser, isLoading, sendMessage, isSending } = useConversation(conversationId);

  if (isLoading || !conversation || !currentUser) {
    return <Loading label="Sohbet aciliyor" />;
  }

  const partner = conversation.participants.find((user) => user.id !== currentUser.id) ?? conversation.participants[1];

  const submitMessage = async (body: string) => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    try {
      await sendMessage(trimmedBody);
      setMessage("");
    } catch (error) {
      if (isPermanentBanError(error)) {
        Alert.alert(
          "Kalıcı ban",
          error instanceof Error
            ? error.message
            : "Ağır güvenlik ihlali nedeniyle hesap kalıcı olarak banlandı.",
          [
            {
              text: "Tamam",
              style: "destructive",
              onPress: () => void applyPermanentBan(),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      Alert.alert("Mesaj gonderilemedi", error instanceof Error ? error.message : "Tekrar deneyin.");
    }
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Avatar name={partner.name} uri={partner.photos[0]?.uri} size={42} />
          <View style={styles.headerBody}>
            <Text style={styles.name}>{partner.name}</Text>
            <Text style={styles.status}>{conversation.typingState?.isTyping ? "Yaziyor..." : "Realtime hazir"}</Text>
          </View>
        </View>
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {conversation.messages.map((item) => (
            <MessageBubble key={item.id} message={item} isOwn={item.senderId === currentUser.id} />
          ))}
          {conversation.messages.length === 0 ? (
            <View style={styles.starters}>
              <Text style={styles.starterTitle}>Sohbet baslat</Text>
              {conversationStarters.map((starter) => (
                <Pressable key={starter} onPress={() => void submitMessage(starter)} style={styles.starterChip}>
                  <Text style={styles.starterText}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Mesaj yaz"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable disabled={isSending} onPress={() => void submitMessage(message)} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      paddingBottom: 0
    },
    keyboard: {
      flex: 1
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    headerBody: {
      flex: 1
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    status: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    messages: {
      flexGrow: 1,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.lg
    },
    messageList: {
      flex: 1
    },
    starters: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xl
    },
    starterTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      textAlign: "center"
    },
    starterChip: {
      borderRadius: theme.radius.pill,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.elevated
    },
    starterText: {
      ...theme.typography.body,
      color: theme.colors.text,
      textAlign: "center"
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background
    },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 110,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface
    },
    sendButton: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary
    }
  });
