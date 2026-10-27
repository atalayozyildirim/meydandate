import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import type { Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { SupabaseMatchRepository } from "@/infrastructure/supabase/SupabaseMatchRepository";
import { supabase } from "@/infrastructure/supabase/client";
import { mapSupabaseUser, publicUserColumns } from "@/infrastructure/supabase/userMapper";
import {
  Chips,
  Copy,
  Empty,
  Eyebrow,
  Heading,
  Icon,
  IconButton,
  colors,
} from "../ui";
import { matchingStyles as styles } from "./components/matchingStyles";
import { MatchingCandidateCard } from "./components/MatchingCandidateCard";
import { MatchingCelebrationModal } from "./components/MatchingCelebrationModal";
import { MatchingRowItem } from "./components/MatchingRowItem";

const matchRepo = new SupabaseMatchRepository();

const getPrimaryPhotoUri = (user?: User | null): string | undefined => {
  if (!user || !user.photos || user.photos.length === 0) return undefined;
  const photo = user.photos.find((p) => p.isPrimary) ?? user.photos[0];
  if (!photo) return undefined;
  return typeof photo === "string" ? photo : photo.uri;
};

interface MatchingScreenProps {
  currentUserId?: string;
  onOpenChat: (conversationId: string, partnerName?: string) => void;
  onBack?: () => void;
}

export function MatchingScreen({
  currentUserId: propUserId,
  onOpenChat,
}: MatchingScreenProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    propUserId ?? null,
  );
  const [tab, setTab] = useState<"discover" | "matches">("discover");
  const [selectedCity, setSelectedCity] = useState("Tüm şehirler");
  const [candidates, setCandidates] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Swipe action loading & mutual match celebration modal
  const [actionLoading, setActionLoading] = useState(false);
  const [newMatch, setNewMatch] = useState<{
    match: Match;
    conversationId?: string;
  } | null>(null);

  // Resolve active session
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (uid) {
        setCurrentUserId(uid);
      }
    });
  }, []);

  const loadDiscover = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setErrorNotice(null);

      const { data: swipedRows } = await supabase
        .from("user_swipes")
        .select('"targetUserId"')
        .eq('"userId"', currentUserId);

      const swipedIds = new Set(
        ((swipedRows as Array<{ targetUserId: string }>) ?? []).map(
          (r) => r.targetUserId,
        ),
      );
      swipedIds.add(currentUserId);

      let query = supabase
        .from("users")
        .select(publicUserColumns)
        .eq('"profileCompleted"', true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (selectedCity !== "Tüm şehirler") {
        query = query.eq("city", selectedCity);
      }

      const { data: users, error } = await query;
      if (error) throw error;

      const unswiped = ((users as unknown as Array<Record<string, unknown>>) ?? [])
        .map(mapSupabaseUser)
        .filter((u) => !swipedIds.has(u.id));

      setCandidates(unswiped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Adaylar yüklenemedi.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, selectedCity]);

  const loadMatches = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setErrorNotice(null);
      const data = await matchRepo.listMatches(currentUserId);
      setMatches(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Eşleşmeler alınamadı.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    if (tab === "discover") {
      void loadDiscover();
    } else {
      void loadMatches();
    }
  }, [currentUserId, tab, loadDiscover, loadMatches]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (tab === "discover") {
      void loadDiscover();
    } else {
      void loadMatches();
    }
  }, [tab, loadDiscover, loadMatches]);

  const handleSwipe = async (targetUserId: string, action: "like" | "pass") => {
    if (!currentUserId) return;
    setActionLoading(true);
    setErrorNotice(null);
    try {
      const result = await matchRepo.swipe(currentUserId, targetUserId, action);
      setCandidates((prev) => prev.filter((c) => c.id !== targetUserId));

      if (result.match) {
        setNewMatch({
          match: result.match,
          conversationId: result.conversationId,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "İşlem sırasında hata oluştu.";
      setErrorNotice(message);
    } finally {
      setActionLoading(false);
    }
  };

  const getPartner = (match: Match): User => {
    if (match.users[0]?.id === currentUserId) return match.users[1];
    return match.users[0];
  };

  const currentCandidate = candidates[0] ?? null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Eyebrow>BİR CAN, BİR CANA MERHABA</Eyebrow>
        <Heading large>Meydanda Karşılaşma</Heading>
        <Copy muted style={{ marginTop: 2 }}>
          Ortak değerler, şehir ve niyet çerçevesinde yeni canlarla tanışma alanı.
        </Copy>

        {/* City Filter */}
        <View style={styles.cityFilter}>
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
            accessibilityState={{ selected: tab === "discover" }}
            onPress={() => setTab("discover")}
            style={[styles.tabBtn, tab === "discover" && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "discover" && styles.tabTextActive,
              ]}
            >
              Keşfet
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "matches" }}
            onPress={() => setTab("matches")}
            style={[styles.tabBtn, tab === "matches" && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "matches" && styles.tabTextActive,
              ]}
            >
              Eşleşmelerim ({matches.length})
            </Text>
          </Pressable>
        </View>
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.wine} />
        </View>
      ) : tab === "matches" ? (
        /* Matches List */
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.matchesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.wine}
            />
          }
          ListEmptyComponent={
            <Empty
              icon="heart-outline"
              title="İlk merhaba burada başlayacak."
              description="Karşılıklı beğeni oluştuğunda eşleşmelerin burada görünür. Keşfet sekmesinden yeni profilleri inceleyebilirsin."
            />
          }
          renderItem={({ item }) => (
            <MatchingRowItem
              item={item}
              getPartner={getPartner}
              getPrimaryPhotoUri={getPrimaryPhotoUri}
              onPress={async () => {
                const partner = getPartner(item);
                const { data } = await supabase
                  .from("conversations")
                  .select("id")
                  .eq('"matchId"', item.id)
                  .maybeSingle();

                if (data?.id) {
                  onOpenChat(data.id, partner.name);
                }
              }}
            />
          )}
        />
      ) : (
        /* Discover Candidates Card */
        <View style={styles.discoverContainer}>
          {currentCandidate ? (
            <MatchingCandidateCard
              candidate={currentCandidate}
              actionLoading={actionLoading}
              onPass={(id) => handleSwipe(id, "pass")}
              onLike={(id) => handleSwipe(id, "like")}
              getPrimaryPhotoUri={getPrimaryPhotoUri}
            />
          ) : (
            <Empty
              icon="sparkles-outline"
              title="Şimdilik yeni profil yok"
              description="Bu şehirdeki tüm profilleri inceledin. Şehir filtresini değiştirebilir veya daha sonra tekrar bakabilirsin."
              action="Yenile"
              onPress={loadDiscover}
            />
          )}
        </View>
      )}

      {/* Mutual Match Celebration Modal */}
      <MatchingCelebrationModal
        newMatch={newMatch}
        onClose={() => setNewMatch(null)}
        onOpenChat={onOpenChat}
        getPartner={getPartner}
      />
    </View>
  );
}
