import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedComment, FeedPost } from "@/domain/entities/Feed";
import type { FeedRepository } from "@/domain/repositories/FeedRepository";
import { Button, Copy, Empty, Heading, Icon, colors, ui } from "../../ui";
import { styles } from "../feedStyles";

export interface FeedCommentsModalProps {
  visible: boolean;
  post: FeedPost;
  currentUserId: string;
  repository: FeedRepository;
  onClose: () => void;
}

export function FeedCommentsModal({
  visible,
  post,
  currentUserId,
  repository,
  onClose,
}: FeedCommentsModalProps) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const page = await repository.listComments(post.id, { limit: 50 });
      setComments(page.comments);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [post.id, repository]);

  useEffect(() => {
    if (visible) {
      void loadComments();
    }
  }, [visible, loadComments]);

  const handleSend = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      if (replyingTo) {
        await repository.addReply({
          postId: post.id,
          commentId: replyingTo.id,
          authorId: currentUserId,
          body: text,
        });
        setReplyingTo(null);
      } else {
        await repository.addComment({
          postId: post.id,
          authorId: currentUserId,
          body: text,
        });
      }
      setNewComment("");
      void loadComments();
    } catch {
      Alert.alert("Hata", "Yorum gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.composerContainer}>
        <View style={styles.composerHeader}>
          <Pressable onPress={onClose}>
            <Icon name="close" size={24} color={colors.ink} />
          </Pressable>
          <Heading style={{ fontSize: 18 }}>Yorumlar</Heading>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.wine} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={[ui.row, { gap: 8 }]}>
                  <Text style={styles.commentAuthor}>{item.author.name}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                <Copy style={{ marginTop: 4 }}>{item.body}</Copy>

                <Pressable
                  onPress={() => setReplyingTo(item)}
                  style={{ marginTop: 6 }}
                >
                  <Text style={styles.replyButtonText}>Yanıtla</Text>
                </Pressable>

                {/* Nested replies */}
                {item.replies && item.replies.length > 0 && (
                  <View style={styles.repliesBox}>
                    {item.replies.map((r) => (
                      <View key={r.id} style={{ marginTop: 6 }}>
                        <Text style={styles.commentAuthor}>{r.author.name}</Text>
                        <Copy small>{r.body}</Copy>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Empty
                icon="chatbubble-outline"
                title="Henüz yorum yok"
                description="İlk yorumu sen yaz."
              />
            }
            contentContainerStyle={{ padding: 16 }}
          />
        )}

        {/* Input Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                {replyingTo.author.name} adlı üyeye yanıt veriliyor
              </Text>
              <Pressable onPress={() => setReplyingTo(null)}>
                <Icon name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              placeholder="Bir yorum yaz..."
              placeholderTextColor={colors.muted}
              value={newComment}
              onChangeText={setNewComment}
              style={styles.commentInput}
            />
            <Button
              onPress={handleSend}
              disabled={submitting || !newComment.trim()}
              style={{ minHeight: 40, paddingHorizontal: 14 }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                "Gönder"
              )}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
