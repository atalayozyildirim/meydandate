import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import type { Community } from "@/domain/entities/Community";
import { SupabaseCommunityRepository } from "@/infrastructure/supabase/SupabaseCommunityRepository";
import {
  Button,
  Chips,
  Copy,
  Empty,
  Eyebrow,
  Heading,
  Icon,
  IconButton,
  colors,
} from "../ui";
import { groupsScreenStyles as styles } from "./components/groupsScreenStyles";
import { CommunityCard } from "./components/CommunityCard";
import { CreateCommunityModal } from "./components/CreateCommunityModal";

const communityRepo = new SupabaseCommunityRepository();

interface GroupsScreenProps {
  onSelectCommunity?: (communityId: string) => void;
  onOpenFeed?: () => void;
}

export function GroupsScreen({
  onSelectCommunity,
  onOpenFeed: _onOpenFeed,
}: GroupsScreenProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCity, setSelectedCity] = useState("Tüm şehirler");
  const [tab, setTab] = useState<"all" | "joined">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCommunities = useCallback(async () => {
    try {
      setErrorNotice(null);
      const data = await communityRepo.getCommunities(
        selectedCity === "Tüm şehirler" ? undefined : selectedCity,
      );
      setCommunities(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Topluluklar yüklenemedi.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    setLoading(true);
    void loadCommunities();
  }, [loadCommunities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadCommunities();
  }, [loadCommunities]);

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) {
      setErrorNotice("Lütfen topluluk adı ve konusunu doldurun.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await communityRepo.createCommunity({
        name: name.trim(),
        topic: topic.trim(),
        description: description.trim(),
        city,
        isPrivate,
      });
      setShowCreateModal(false);
      setName("");
      setTopic("");
      setDescription("");
      setIsPrivate(false);
      void loadCommunities();
      if (onSelectCommunity) {
        onSelectCommunity(created.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Topluluk oluşturulamadı.";
      setErrorNotice(message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCommunities = communities.filter((c) => {
    if (tab === "joined") {
      return (
        c.myMembership?.status === "active" ||
        c.myMembership?.status === "pending"
      );
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Eyebrow>BİRLİKTE ÜRETİM VE PAYLAŞIM</Eyebrow>
            <Heading large>Meydandaki Çevreler</Heading>
          </View>
          <Button
            onPress={() => setShowCreateModal(true)}
            icon="add-outline"
            style={styles.createBtn}
          >
            Yeni Çevre
          </Button>
        </View>

        <Copy muted>
          Ortak merakların etrafında toplanan açık ve kapalı topluluklar.
        </Copy>

        {/* City Filter */}
        <View style={styles.filterSection}>
          <Chips
            values={["Tüm şehirler", "İstanbul", "Ankara", "İzmir"]}
            value={selectedCity}
            onChange={(c) => setSelectedCity(c)}
          />
        </View>

        {/* Tab switch */}
        <View style={styles.tabRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "all" }}
            onPress={() => setTab("all")}
            style={[styles.tabBtn, tab === "all" && styles.tabBtnActive]}
          >
            <Text
              style={[styles.tabText, tab === "all" && styles.tabTextActive]}
            >
              Tüm Çevreler ({communities.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "joined" }}
            onPress={() => setTab("joined")}
            style={[styles.tabBtn, tab === "joined" && styles.tabBtnActive]}
          >
            <Text
              style={[styles.tabText, tab === "joined" && styles.tabTextActive]}
            >
              Dahil Olduklarım
            </Text>
          </Pressable>
        </View>
      </View>

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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.wine} />
        </View>
      ) : (
        <FlatList
          data={filteredCommunities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.wine}
            />
          }
          ListEmptyComponent={
            <Empty
              title="Henüz topluluk bulunamadı"
              description={
                tab === "joined"
                  ? "Henüz bir çevreye katılmadın. Çevreleri keşfet ve katıl."
                  : "Bu şehirde henüz topluluk yok. İlk çevreyi sen kurabilirsin!"
              }
              action="Yenile"
              onPress={loadCommunities}
            />
          }
          renderItem={({ item }) => (
            <CommunityCard
              item={item}
              onPress={(id) => onSelectCommunity?.(id)}
            />
          )}
        />
      )}

      {/* Create Community Modal */}
      <CreateCommunityModal
        visible={showCreateModal}
        name={name}
        topic={topic}
        city={city}
        description={description}
        isPrivate={isPrivate}
        submitting={submitting}
        onChangeName={setName}
        onChangeTopic={setTopic}
        onChangeCity={setCity}
        onChangeDescription={setDescription}
        onChangeIsPrivate={setIsPrivate}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
}
