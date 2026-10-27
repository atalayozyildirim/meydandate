import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import type {
  Community,
  CommunityJoinRequest,
  CommunityPost,
} from "@/domain/entities/Community";
import { SupabaseCommunityRepository } from "@/infrastructure/supabase/SupabaseCommunityRepository";
import {
  Button,
  Copy,
  Empty,
  Heading,
  Icon,
  IconButton,
  colors,
} from "../ui";
import { groupDetailStyles as styles } from "./components/groupDetailStyles";
import { GroupHeroSection } from "./components/GroupHeroSection";
import { GroupPostModal } from "./components/GroupPostModal";
import { GroupPostItem, GroupRequestItem } from "./components/GroupListItems";

const communityRepo = new SupabaseCommunityRepository();

interface GroupDetailScreenProps {
  communityId: string;
  onBack: () => void;
}

export function GroupDetailScreen({
  communityId,
  onBack,
}: GroupDetailScreenProps) {
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [requests, setRequests] = useState<CommunityJoinRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "requests">("posts");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setErrorNotice(null);
      const comm = await communityRepo.getCommunityById(communityId);
      setCommunity(comm);

      if (comm) {
        const isOrganizer = comm.myMembership?.role === "organizer";
        const isActiveMember = comm.myMembership?.status === "active";
        const canViewContent = !comm.isPrivate || isActiveMember;

        if (canViewContent) {
          const fetchedPosts = await communityRepo.getCommunityPosts(communityId);
          setPosts(fetchedPosts);
        } else {
          setPosts([]);
        }

        if (isOrganizer && comm.isPrivate) {
          const fetchedRequests = await communityRepo.getJoinRequests(communityId);
          setRequests(fetchedRequests);
        } else {
          setRequests([]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Topluluk yüklenirken bir hata oluştu.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleJoin = async () => {
    if (!community) return;
    setActionLoading(true);
    setErrorNotice(null);
    try {
      const res = await communityRepo.joinCommunity(community.id);
      if (res.status === "pending") {
        setSuccessNotice("Katılım isteğiniz yöneticiye iletildi.");
      } else {
        setSuccessNotice("Çevreye başarıyla katıldınız!");
      }
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Katılım işlemi başarısız.";
      setErrorNotice(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!community) return;
    setActionLoading(true);
    setErrorNotice(null);
    try {
      await communityRepo.leaveCommunity(community.id);
      setSuccessNotice("Çevreden ayrıldınız.");
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ayrılma işlemi başarısız.";
      setErrorNotice(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !community) return;
    setSubmittingPost(true);
    setErrorNotice(null);
    try {
      await communityRepo.createCommunityPost(community.id, postContent.trim());
      setPostContent("");
      setShowPostModal(false);
      setSuccessNotice("Notunuz çevreyle paylaşıldı.");
      const fetchedPosts = await communityRepo.getCommunityPosts(community.id);
      setPosts(fetchedPosts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Paylaşım yapılırken bir hata oluştu.";
      setErrorNotice(message);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleRespondRequest = async (userId: string, approve: boolean) => {
    if (!community) return;
    setErrorNotice(null);
    try {
      await communityRepo.respondJoinRequest(community.id, userId, approve);
      setSuccessNotice(approve ? "Üye kabul edildi." : "Başvuru reddedildi.");
      const fetchedRequests = await communityRepo.getJoinRequests(community.id);
      setRequests(fetchedRequests);
      const comm = await communityRepo.getCommunityById(community.id);
      setCommunity(comm);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "İşlem sırasında hata oluştu.";
      setErrorNotice(message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.wine} />
        <Copy muted style={{ marginTop: 12 }}>
          Çevre bilgileri alınıyor...
        </Copy>
      </View>
    );
  }

  if (!community) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Icon name="alert-circle-outline" size={48} color={colors.muted} />
        <Heading style={{ marginTop: 12 }}>Çevre Bulunamadı</Heading>
        <Copy muted style={{ textAlign: "center", marginTop: 4 }}>
          Bu çevre silinmiş veya erişiminiz kısıtlanmış olabilir.
        </Copy>
        <Button onPress={onBack} style={{ marginTop: 16 }}>
          Geri Dön
        </Button>
      </View>
    );
  }

  const isOrganizer = community.myMembership?.role === "organizer";
  const isActiveMember = community.myMembership?.status === "active";
  const isPendingMember = community.myMembership?.status === "pending";
  const isClosedForUser = community.isPrivate && !isActiveMember;

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <IconButton name="arrow-back" label="Geri" onPress={onBack} />
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {community.name}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Notices */}
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

      {successNotice && (
        <View style={styles.successBanner}>
          <Icon name="checkmark-circle-outline" size={18} color={colors.green} />
          <Copy small style={{ color: colors.green, flex: 1 }}>
            {successNotice}
          </Copy>
          <IconButton
            name="close"
            label="Kapat"
            onPress={() => setSuccessNotice(null)}
          />
        </View>
      )}

      {/* Community Hero Header */}
      <GroupHeroSection
        community={community}
        isOrganizer={isOrganizer}
        isActiveMember={isActiveMember}
        isPendingMember={isPendingMember}
        actionLoading={actionLoading}
        activeTab={activeTab}
        postCount={posts.length}
        requestCount={requests.length}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onSelectTab={setActiveTab}
      />

      {/* Content Area */}
      {isClosedForUser ? (
        <View style={styles.lockedSection}>
          <Icon name="lock-closed" size={44} color={colors.wine} />
          <Heading style={{ marginTop: 12, textAlign: "center" }}>
            Bu Çevre Kapalıdır
          </Heading>
          <Copy muted style={styles.lockedText}>
            Bu çevreye ait yazışmalar ve paylaşılan notlar yalnızca onaylanmış
            üyelere açıktır.
          </Copy>
          {!isPendingMember && (
            <Button
              onPress={handleJoin}
              disabled={actionLoading}
              icon="paper-plane-outline"
              style={{ marginTop: 16 }}
            >
              Katılım İsteği Gönder
            </Button>
          )}
        </View>
      ) : activeTab === "requests" && isOrganizer ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.wine}
            />
          }
          ListEmptyComponent={
            <Empty
              title="Bekleyen istek yok"
              description="Topluluğa katılmak için başvuru yapan yeni üye bulunmuyor."
            />
          }
          renderItem={({ item }) => (
            <GroupRequestItem item={item} onRespond={handleRespondRequest} />
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {isActiveMember && (
            <View style={styles.composerBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPostModal(true)}
                style={styles.composerTrigger}
              >
                <Icon name="pencil-outline" size={18} color={colors.muted} />
                <Text style={styles.composerTriggerText}>
                  Çevreye bir not bırak...
                </Text>
              </Pressable>
            </View>
          )}

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.wine}
              />
            }
            ListEmptyComponent={
              <Empty
                title="Henüz paylaşım yok"
                description="Bu çevrede henüz bir duyuru veya sohbet başlatılmadı. İlk notu sen paylaş!"
              />
            }
            renderItem={({ item }) => <GroupPostItem item={item} />}
          />
        </View>
      )}

      {/* New Post Modal */}
      <GroupPostModal
        visible={showPostModal}
        content={postContent}
        submitting={submittingPost}
        onChangeContent={setPostContent}
        onClose={() => setShowPostModal(false)}
        onSubmit={handleCreatePost}
      />
    </View>
  );
}
