import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost, FeedTag } from "@/domain/entities/Feed";
import type { FeedRepository, FeedScope } from "@/domain/repositories/FeedRepository";
import { SupabaseFeedRepository } from "@/infrastructure/supabase/SupabaseFeedRepository";
import { supabase } from "@/infrastructure/supabase/client";
import {
  Button,
  Chips,
  colors,
  Copy,
  Empty,
  Heading,
  Icon,
  ui,
  useContentWidth,
} from "../ui";
import { styles } from "./feedStyles";
import { PostCard } from "./components/PostCard";
import { FeedComposerModal } from "./components/FeedComposerModal";
import { FeedEditModal } from "./components/FeedEditModal";
import { FeedCommentsModal } from "./components/FeedCommentsModal";
import { FeedReportModal } from "./components/FeedReportModal";

export interface FeedScreenProps {
  currentUserId?: string;
  repository?: FeedRepository;
  onBack?: () => void;
  onOpenProfile?: (userId: string) => void;
  hideTopHeader?: boolean;
}

const tagsList: readonly string[] = ["Tümü", "Gündem", "Deyiş", "Soru", "Muharrem"];
const tagMapping: Record<string, FeedTag | "all"> = {
  Tümü: "all",
  Gündem: "gundem",
  Deyiş: "deyis",
  Soru: "soru",
  Muharrem: "muharrem",
};

export function FeedScreen({
  currentUserId: propUserId,
  repository: propRepository,
  onBack,
  onOpenProfile,
  hideTopHeader,
}: FeedScreenProps) {
  const repository: FeedRepository = useMemo(
    () => propRepository ?? new SupabaseFeedRepository(),
    [propRepository],
  );
  const [activeUserId, setActiveUserId] = useState<string>(
    propUserId ?? "00000000-0000-0000-0000-000000000001",
  );

  const [scope, setScope] = useState<FeedScope>("all");
  const [selectedTagLabel, setSelectedTagLabel] = useState<string>("Tümü");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Modals state
  const [composerVisible, setComposerVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [commentingPost, setCommentingPost] = useState<FeedPost | null>(null);
  const [reportingPost, setReportingPost] = useState<FeedPost | null>(null);
  const [blockingUser, setBlockingUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (propUserId) {
      setActiveUserId(propUserId);
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        setActiveUserId(data.session.user.id);
      }
    }).catch(() => {});
  }, [propUserId]);

  const activeTag = tagMapping[selectedTagLabel] ?? "all";

  const loadFeed = useCallback(
    async (reset = false) => {
      if (reset) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      try {
        const page = await repository.listFeed(activeUserId, activeTag, {
          offset: currentOffset,
          limit: 10,
          scope,
        });

        if (reset) {
          setPosts(page.posts);
        } else {
          setPosts((prev) => [...prev, ...page.posts]);
        }
        setOffset(page.nextOffset ?? currentOffset + page.posts.length);
        setHasMore(page.hasMore);
        setErrorText(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Akış yüklenemedi. Lütfen tekrar deneyin.";
        setErrorText(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeUserId, activeTag, scope, offset, repository],
  );

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    void loadFeed(true);
  }, [activeTag, scope]);

  const handleRefresh = () => {
    setOffset(0);
    void loadFeed(true);
  };

  const handleEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      void loadFeed(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      await repository.votePoll(pollId, optionId, activeUserId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.poll?.id === pollId) {
            const nextOptions = p.poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, voteCount: opt.voteCount + 1 } : opt,
            );
            return {
              ...p,
              poll: {
                ...p.poll,
                options: nextOptions,
                totalVotes: p.poll.totalVotes + 1,
                votedOptionId: optionId,
              },
            };
          }
          return p;
        }),
      );
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Oy verilemedi.");
    }
  };

  const handleToggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.likedByUserIds.includes(activeUserId);
          const nextLiked = isLiked
            ? p.likedByUserIds.filter((id) => id !== activeUserId)
            : [...p.likedByUserIds, activeUserId];
          return {
            ...p,
            likedByUserIds: nextLiked,
          };
        }
        return p;
      }),
    );
    try {
      const updated = await repository.togglePostLike(postId, activeUserId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch {
      void loadFeed(true);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockingUser) return;
    try {
      await repository.blockUser(blockingUser.id);
      setPosts((prev) => prev.filter((p) => p.authorId !== blockingUser.id));
      setBlockingUser(null);
      Alert.alert("Başarılı", `${blockingUser.name} engellendi.`);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Engelleme başarısız.");
    }
  };

  const Container = hideTopHeader ? View : SafeAreaView;
  const width = useContentWidth();

  return (
    <Container style={styles.container}>
      {/* Header bar if standalone */}
      {!hideTopHeader && (
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Geri dön"
                onPress={onBack}
                style={({ pressed }) => [{ padding: 6 }, pressed && ui.pressed]}
              >
                <Icon name="arrow-back" size={20} color={colors.ink} />
              </Pressable>
            )}
            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.wine, letterSpacing: 1 }}>MEYDAN AKIŞI</Text>
              <Heading style={{ fontSize: 20 }}>Muhabbet & Paylaşım</Heading>
            </View>
          </View>
          <Pressable
            onPress={() => setComposerVisible(true)}
            style={styles.composeButton}
          >
            <Icon name="create-outline" size={16} color={colors.white} />
            <Text style={styles.composeButtonText}>Yaz</Text>
          </Pressable>
        </View>
      )}

      {/* Scope Switcher: Tümü vs Takip Ettiklerim */}
      <View style={styles.scopeBar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === "all" }}
          onPress={() => setScope("all")}
          style={[styles.scopeTab, scope === "all" && styles.scopeTabActive]}
        >
          <Text
            style={[
              styles.scopeTabText,
              scope === "all" && styles.scopeTabTextActive,
            ]}
          >
            Meydan
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === "following" }}
          onPress={() => setScope("following")}
          style={[
            styles.scopeTab,
            scope === "following" && styles.scopeTabActive,
          ]}
        >
          <Text
            style={[
              styles.scopeTabText,
              scope === "following" && styles.scopeTabTextActive,
            ]}
          >
            Takip Ettiklerim
          </Text>
        </Pressable>
      </View>

      {/* Topic Tag Filter Chips */}
      <View style={styles.chipsContainer}>
        <Chips
          values={tagsList}
          value={selectedTagLabel}
          onChange={(newVal) => setSelectedTagLabel(newVal)}
        />
      </View>

      {/* Error banner */}
      {errorText && (
        <View style={{ padding: 12, backgroundColor: colors.wineLight, marginHorizontal: 16, borderRadius: 8, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.wine, fontSize: 13, flex: 1 }}>{errorText}</Text>
          <Pressable onPress={() => void loadFeed(true)}>
            <Text style={{ color: colors.wine, fontWeight: "bold", marginLeft: 8 }}>Tekrar Dene</Text>
          </Pressable>
        </View>
      )}

      {/* Feed List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.wine} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 40,
            maxWidth: Math.min(width, 680),
            alignSelf: "center",
            width: "100%",
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.wine}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.wine} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Empty
              title="Henüz paylaşım yok"
              description={
                scope === "following"
                  ? "Takip ettiğin canların paylaşımları burada listelenir. Henüz kimseyi takip etmiyorsun."
                  : "Bu başlıkta henüz bir paylaşım yapılmadı. Meydana ilk sözü sen bırak!"
              }
              action="Yenile"
              onPress={() => void loadFeed(true)}
            />
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={activeUserId}
              contentWidth={width}
              onToggleLike={() => handleToggleLike(item.id)}
              onToggleBookmark={() => {}}
              onToggleFollow={() => {}}
              onVotePoll={(optId) => handleVotePoll(item.poll!.id, optId)}
              onOpenComments={() => setCommentingPost(item)}
              onEditPost={() => setEditingPost(item)}
              onDeletePost={() => {
                Alert.alert(
                  "Paylaşımı Sil",
                  "Bu paylaşımı silmek istediğinden emin misin?",
                  [
                    { text: "Vazgeç", style: "cancel" },
                    {
                      text: "Sil",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await repository.deletePost(item.id, activeUserId);
                          setPosts((prev) => prev.filter((p) => p.id !== item.id));
                        } catch (err) {
                          Alert.alert("Hata", err instanceof Error ? err.message : "Silinemedi.");
                        }
                      },
                    },
                  ],
                );
              }}
              onReportPost={() => setReportingPost(item)}
              onBlockAuthor={() =>
                setBlockingUser({ id: item.authorId, name: item.author.name })
              }
              onOpenProfile={onOpenProfile}
            />
          )}
        />
      )}

      {/* Composer Modal */}
      <FeedComposerModal
        visible={composerVisible}
        authorId={activeUserId}
        repository={repository}
        onClose={() => setComposerVisible(false)}
        onPostCreated={(created) => {
          setPosts((prev) => [created, ...prev]);
          setComposerVisible(false);
        }}
      />

      {/* Edit Post Modal */}
      {editingPost && (
        <FeedEditModal
          visible={Boolean(editingPost)}
          post={editingPost}
          repository={repository}
          onClose={() => setEditingPost(null)}
          onPostUpdated={(updated) => {
            setPosts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
            setEditingPost(null);
          }}
        />
      )}

      {/* Comments Modal */}
      {commentingPost && (
        <FeedCommentsModal
          visible={Boolean(commentingPost)}
          post={commentingPost}
          currentUserId={activeUserId}
          repository={repository}
          onClose={() => setCommentingPost(null)}
        />
      )}

      {/* Report Modal */}
      {reportingPost && (
        <FeedReportModal
          visible={Boolean(reportingPost)}
          post={reportingPost}
          reporterId={activeUserId}
          repository={repository}
          onClose={() => setReportingPost(null)}
        />
      )}

      {/* Block Confirm Modal */}
      <Modal
        visible={Boolean(blockingUser)}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockingUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Heading style={{ fontSize: 18, marginBottom: 8 }}>Kullanıcıyı Engelle</Heading>
            <Copy muted style={{ marginVertical: 12 }}>
              {blockingUser?.name} adlı kullanıcıyı engellemek istediğinden emin misin?
              Gönderilerini artık akışında görmeyeceksin.
            </Copy>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Button
                secondary
                onPress={() => setBlockingUser(null)}
                style={{ flex: 1 }}
              >
                Vazgeç
              </Button>
              <Button
                onPress={handleConfirmBlock}
                style={{ flex: 1, backgroundColor: colors.wine }}
              >
                Engelle
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}
