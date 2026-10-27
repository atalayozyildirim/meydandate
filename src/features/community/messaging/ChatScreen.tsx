import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Conversation, Message } from "@/domain/entities/Message";
import { SupabaseChatRepository } from "@/infrastructure/supabase/SupabaseChatRepository";
import { supabase } from "@/infrastructure/supabase/client";
import {
  Button,
  Copy,
  Empty,
  Heading,
  Icon,
  IconButton,
  colors,
  fonts,
  ui,
} from "../ui";

const chatRepo = new SupabaseChatRepository();

interface LocalMessage extends Message {
  isOptimistic?: boolean;
  failed?: boolean;
}

interface ChatScreenProps {
  conversationId: string;
  partnerName?: string;
  currentUserId?: string;
  onBack: () => void;
}

export function ChatScreen({
  conversationId,
  partnerName: propPartnerName,
  currentUserId: propUserId,
  onBack,
}: ChatScreenProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    propUserId ?? null,
  );
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const flatListRef = useRef<FlatList<LocalMessage>>(null);

  // Resolve user id
  useEffect(() => {
    if (!currentUserId) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.id) {
          setCurrentUserId(data.session.user.id);
        }
      });
    }
  }, [currentUserId]);

  const loadConversation = useCallback(async () => {
    try {
      setErrorNotice(null);
      const conv = await chatRepo.getConversation(conversationId);
      setConversation(conv);

      const msgs = await chatRepo.listMessages(conversationId, { limit: 30 });
      setMessages(msgs);
      if (msgs.length < 30) {
        setHasMoreOlder(false);
      }
    } catch (err: any) {
      setErrorNotice(err.message ?? "Sohbet yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    loadConversation();
  }, [loadConversation]);

  // Realtime subscription & Session cleanup on unmount
  useEffect(() => {
    const unsubscribe = chatRepo.subscribeToMessages(
      conversationId,
      (newMsg: Message) => {
        setMessages((prev) => {
          // If already in list (e.g. from optimistic send)
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
          }
          return [...prev, newMsg];
        });
      },
    );

    return () => {
      unsubscribe();
      chatRepo.clearSessionCache();
    };
  }, [conversationId]);

  // Load older messages (cursor pagination)
  const handleLoadOlder = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const older = await chatRepo.listMessages(conversationId, {
        limit: 30,
        before: oldest.createdAt,
      });
      if (older.length < 30) {
        setHasMoreOlder(false);
      }
      setMessages((prev) => [...older, ...prev]);
    } catch {
      // Silently fail pagination
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSend = async (bodyToSend = text) => {
    const trimmed = bodyToSend.trim();
    if (!trimmed || !currentUserId || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: LocalMessage = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      body: trimmed,
      status: "sending",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setSending(true);

    try {
      setErrorNotice(null);
      const sent = await chatRepo.sendMessage({
        conversationId,
        senderId: currentUserId,
        body: trimmed,
      });

      // Replace optimistic message with server message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sent, isOptimistic: false } : m)),
      );
    } catch (err: any) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "sending", failed: true } : m,
        ),
      );
      setErrorNotice(
        err.message?.includes("security policy")
          ? "Bu kullanıcı ile mesajlaşılamıyor (engellenmiş veya uygunluk kapalı)."
          : err.message ?? "Mesaj gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetry = (msg: LocalMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    handleSend(msg.body);
  };

  const partner = conversation?.participants.find((p) => p.id !== currentUserId);
  const displayPartnerName =
    partner?.name || propPartnerName || "Sohbet Arkadaşı";

  const handleBlockUser = async () => {
    if (!partner?.id) return;
    try {
      await supabase.rpc("block_user", { target_user_id: partner.id });
      setIsBlocked(true);
      setErrorNotice("Kullanıcı engellendi. Bu sohbet kapatılıyor.");
      setTimeout(onBack, 1500);
    } catch (err: any) {
      setErrorNotice(err.message ?? "Kullanıcı engellenemedi.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.wine} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* Header */}
      <View style={styles.navbar}>
        <IconButton name="arrow-back" label="Geri" onPress={onBack} />

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {displayPartnerName}
          </Text>
          <Text style={styles.navSubtitle}>Karşılıklı Eşleşme</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kullanıcıyı Engelle"
          onPress={handleBlockUser}
          style={styles.blockBtn}
        >
          <Icon name="ban-outline" size={20} color={colors.wine} />
        </Pressable>
      </View>

      {/* Error banner */}
      {errorNotice && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={18} color={colors.wine} />
          <Copy small style={{ color: colors.wine, flex: 1 }}>
            {errorNotice}
          </Copy>
          <IconButton
            name="close"
            label="Kapat"
            onPress={() => setErrorNotice(null)}
          />
        </View>
      )}

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListHeaderComponent={
          hasMoreOlder ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleLoadOlder}
              style={styles.loadOlderBtn}
            >
              {loadingOlder ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <Text style={styles.loadOlderText}>
                  Daha eski mesajları yükle
                </Text>
              )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <Empty
            icon="chatbubbles-outline"
            title="Sohbete başla"
            description="İlk mesajı göndererek tanışmayı başlatabilirsin."
          />
        }
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUserId;
          const time = new Date(item.createdAt).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <View
              style={[
                styles.bubbleRow,
                isMine ? styles.bubbleRowMine : styles.bubbleRowPartner,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubblePartner,
                  item.failed && styles.bubbleFailed,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isMine ? styles.textMine : styles.textPartner,
                  ]}
                >
                  {item.body}
                </Text>

                <View style={styles.metaRow}>
                  <Text
                    style={[
                      styles.timeText,
                      isMine ? styles.timeMine : styles.timePartner,
                    ]}
                  >
                    {time}
                  </Text>
                  {isMine && !item.failed && (
                    <Icon
                      name={
                        item.status === "sending"
                          ? "time-outline"
                          : item.status === "read"
                            ? "checkmark-done"
                            : "checkmark"
                      }
                      size={12}
                      color={colors.wineLight}
                    />
                  )}
                </View>
              </View>

              {item.failed && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Yeniden dene"
                  onPress={() => handleRetry(item)}
                  style={styles.retryBtn}
                >
                  <Icon name="refresh-circle" size={24} color={colors.wine} />
                  <Text style={styles.retryText}>Tekrar dene</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={
            isBlocked ? "Bu kullanıcı engellendi" : "Bir merhaba yaz..."
          }
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          editable={!isBlocked}
          multiline
          maxLength={1000}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          disabled={!text.trim() || sending || isBlocked}
          onPress={() => handleSend()}
          style={({ pressed }) => [
            styles.sendBtn,
            (!text.trim() || isBlocked) && { opacity: 0.4 },
            pressed && ui.pressed && ui.focus,
          ]}
        >
          <Icon name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  navTitleContainer: { flex: 1, alignItems: "center" },
  navTitle: { fontFamily: fonts.semi, fontSize: 16, color: colors.ink },
  navSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  blockBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  messageList: { padding: 16, gap: 10 },
  loadOlderBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadOlderText: { fontFamily: fonts.medium, fontSize: 12, color: colors.wine },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowPartner: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleMine: {
    backgroundColor: colors.wine,
    borderBottomRightRadius: 2,
  },
  bubblePartner: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 2,
  },
  bubbleFailed: { backgroundColor: "#D32F2F" },
  bubbleText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  textMine: { color: colors.white },
  textPartner: { color: colors.ink },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  timeText: { fontSize: 10, fontFamily: fonts.regular },
  timeMine: { color: colors.wineLight },
  timePartner: { color: colors.muted },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  retryText: { fontFamily: fonts.medium, fontSize: 11, color: colors.wine },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.wine,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: colors.wineLight,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
});
