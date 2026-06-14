// Akış ve keşfet yönetim araçlarını tek admin panelinde toplar.
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BotFeedPostPayload } from "@/domain/repositories/FeedRepository";
import {
  culturalIdentityValues,
  cultureImportanceValues,
  interestValues,
  type CulturalIdentity,
  type CultureImportance,
  type Interest,
} from "@/domain/entities/User";
import { useBotFeedAdmin } from "@/features/feed/hooks/useFeed";
import {
  useBanUser,
  useBannedUsers,
  useModerationReports,
  useUnbanUser,
  useUpdateReportStatus,
  useUserRole,
} from "@/features/moderation/hooks/useModerationService";
import { useBotProfiles } from "@/features/profile/hooks/useBotProfiles";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { supabase } from "@/infrastructure/supabase/client";
import { useTheme } from "@/shared/theme";

const defaultBotCtaLabel = "İncele";

interface FeedAdminPanelProps {
  onClose: () => void;
};

export const FeedAdminPanel = ({ onClose }: FeedAdminPanelProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { data: currentUserRole, isLoading: isLoadingRole } = useUserRole(
    currentUser?.id ?? "",
  );
  const isAdmin = currentUserRole === "admin";
  const {
    botPosts,
    isLoadingBotPosts,
    createBotPost,
    updateBotPost,
    deleteBotPost,
    isSavingBotPost,
  } = useBotFeedAdmin(isAdmin);
  const {
    bots,
    isLoading: isLoadingBots,
    toggleActive,
    createBot,
    isCreatingBot,
    isUpdating,
  } = useBotProfiles();
  const {
    data: reports = [],
    refetch: refetchReports,
    isLoading: isLoadingReports,
  } = useModerationReports();
  const {
    data: bannedUsers = [],
    refetch: refetchBannedUsers,
    isLoading: isLoadingBannedUsers,
  } = useBannedUsers();
  const banUserMutation = useBanUser();
  const unbanUserMutation = useUnbanUser();
  const updateReportMutation = useUpdateReportStatus();
  const [eventPushTitle, setEventPushTitle] = useState("");
  const [eventPushBody, setEventPushBody] = useState("");
  const [isSendingEventPush, setIsSendingEventPush] = useState(false);
  const [botBody, setBotBody] = useState("");
  const [botCtaLabel, setBotCtaLabel] = useState(defaultBotCtaLabel);
  const [botIsActive, setBotIsActive] = useState(true);
  const [botShowAdMob, setBotShowAdMob] = useState(true);
  const [editingBotPostId, setEditingBotPostId] = useState<string | null>(null);
  const [profileBotName, setProfileBotName] = useState("");
  const [profileBotAge, setProfileBotAge] = useState("28");
  const [profileBotCity, setProfileBotCity] = useState("");
  const [profileBotOccupation, setProfileBotOccupation] = useState("");
  const [profileBotBio, setProfileBotBio] = useState("");
  const [profileBotPhotoUri, setProfileBotPhotoUri] = useState("");
  const [profileBotHometown, setProfileBotHometown] = useState("");
  const [profileBotFavoriteSong, setProfileBotFavoriteSong] = useState("");
  const [profileBotFavoritePoet, setProfileBotFavoritePoet] = useState("");
  const [profileBotCulturalIdentity, setProfileBotCulturalIdentity] =
    useState<CulturalIdentity>("alevi");
  const [profileBotCultureImportance, setProfileBotCultureImportance] =
    useState<CultureImportance>("important");
  const [profileBotInterests, setProfileBotInterests] = useState<Interest[]>([
    "cem_culture",
    "turkish_folk_music",
  ]);
  const [profileBotKind, setProfileBotKind] =
    useState<"starter" | "ai_starter">("ai_starter");
  const [profileBotIsActive, setProfileBotIsActive] = useState(true);
  const pendingReports = reports.filter((report) => report.status === "pending");

  const resetBotForm = () => {
    setBotBody("");
    setBotCtaLabel(defaultBotCtaLabel);
    setBotIsActive(true);
    setBotShowAdMob(true);
    setEditingBotPostId(null);
  };

  const resetProfileBotForm = () => {
    setProfileBotName("");
    setProfileBotAge("28");
    setProfileBotCity("");
    setProfileBotOccupation("");
    setProfileBotBio("");
    setProfileBotPhotoUri("");
    setProfileBotHometown("");
    setProfileBotFavoriteSong("");
    setProfileBotFavoritePoet("");
    setProfileBotCulturalIdentity("alevi");
    setProfileBotCultureImportance("important");
    setProfileBotInterests(["cem_culture", "turkish_folk_music"]);
    setProfileBotKind("ai_starter");
    setProfileBotIsActive(true);
  };

  const toggleProfileBotInterest = (interest: Interest) => {
    setProfileBotInterests((current) => {
      if (current.includes(interest)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== interest);
      }

      return [...current, interest];
    });
  };

  const submitProfileBot = async () => {
    const age = Number(profileBotAge);

    if (
      !profileBotName.trim() ||
      !profileBotCity.trim() ||
      !profileBotBio.trim() ||
      !Number.isFinite(age)
    ) {
      return;
    }

    try {
      await createBot({
        name: profileBotName.trim(),
        age,
        city: profileBotCity.trim(),
        bio: profileBotBio.trim(),
        photoUri: profileBotPhotoUri.trim() || undefined,
        occupation: profileBotOccupation.trim() || undefined,
        hometown: profileBotHometown.trim() || undefined,
        favoriteSong: profileBotFavoriteSong.trim() || undefined,
        favoritePoet: profileBotFavoritePoet.trim() || undefined,
        culturalIdentity: profileBotCulturalIdentity,
        cultureImportance: profileBotCultureImportance,
        interests: profileBotInterests,
        profileKind: profileBotKind,
        isActive: profileBotIsActive,
      });
      resetProfileBotForm();
      Alert.alert("Bot eklendi", "Keşfet bot profili oluşturuldu.");
    } catch (error) {
      Alert.alert(
        "Bot oluşturulamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      await updateReportMutation.mutateAsync({
        reportId,
        status: "resolved",
        resolution: "Admin panelinden çözüldü.",
      });
      await refetchReports();
    } catch (error) {
      Alert.alert(
        "Şikayet güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const banReportedUser = async (userId: string, reason: string) => {
    try {
      await banUserMutation.mutateAsync({
        userId,
        banType: "permanent",
        reason: reason.trim() || "Admin panelinden kalıcı ban.",
      });
      await Promise.all([refetchReports(), refetchBannedUsers()]);
    } catch (error) {
      Alert.alert(
        "Kullanıcı banlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      await unbanUserMutation.mutateAsync(userId);
      await refetchBannedUsers();
    } catch (error) {
      Alert.alert(
        "Ban kaldırılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const buildBotPayload = (): BotFeedPostPayload => ({
    body: botBody.trim(),
    tags: ["gundem"],
    ctaLabel: botCtaLabel.trim() || defaultBotCtaLabel,
    isActive: botIsActive,
    showAdMob: botShowAdMob,
    sortOrder: 100,
  });

  const submitBotPost = async () => {
    if (!botBody.trim()) {
      return;
    }

    try {
      const payload = buildBotPayload();

      if (editingBotPostId) {
        await updateBotPost({ postId: editingBotPostId, payload });
      } else {
        await createBotPost(payload);
      }

      resetBotForm();
    } catch (error) {
      Alert.alert(
        "Rehber paylaşımı kaydedilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const editBotPost = (postId: string) => {
    const botPost = botPosts.find((post) => post.botPostId === postId);

    if (!botPost) {
      return;
    }

    setEditingBotPostId(postId);
    setBotBody(botPost.body);
    setBotCtaLabel(botPost.ctaLabel ?? defaultBotCtaLabel);
    setBotIsActive(botPost.isActive !== false);
    setBotShowAdMob(botPost.showAdMob !== false);
  };

  const removeBotPost = (postId: string) => {
    Alert.alert(
      "Rehber paylaşımı silinsin mi?",
      "Bu paylaşım akıştan kaldırılacak.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            void deleteBotPost(postId).catch((error) => {
              Alert.alert(
                "Rehber paylaşımı silinemedi",
                error instanceof Error ? error.message : "Tekrar deneyin.",
              );
            });
          },
        },
      ],
    );
  };

  const sendEventPush = async () => {
    if (!eventPushTitle.trim() || !eventPushBody.trim()) {
      return;
    }

    try {
      setIsSendingEventPush(true);
      const { data, error } = await supabase.functions.invoke(
        "send-admin-event-push",
        {
          body: {
            title: eventPushTitle.trim(),
            body: eventPushBody.trim(),
          },
        },
      );

      if (error) {
        throw error;
      }

      setEventPushTitle("");
      setEventPushBody("");
      Alert.alert(
        "Bildirim gönderildi",
        `${Number((data as { delivered?: number } | null)?.delivered ?? 0)} cihaza gönderildi.`,
      );
    } catch (error) {
      Alert.alert(
        "Bildirim gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    } finally {
      setIsSendingEventPush(false);
    }
  };

  if (!currentUser || isLoadingRole) {
    return <Loading label="Admin hazırlanıyor" />;
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.lockedHeader}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={23} color={theme.colors.text} />
          </Pressable>
        </View>
        <EmptyState
          title="Admin yetkisi gerekli"
          description="Bu ekran sadece yöneticiler için açık."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screen}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={23} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Yönetim</Text>
            <Text style={styles.title}>Admin Paneli</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color={theme.colors.primary}
            />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="notifications-outline"
              size={19}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Özel etkinlik bildirimi</Text>
              <Text style={styles.sectionMeta}>Tüm kayıtlı cihazlara push gönder.</Text>
            </View>
          </View>
          <TextInput
            value={eventPushTitle}
            onChangeText={setEventPushTitle}
            maxLength={80}
            placeholder="Bildirim başlığı"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <TextInput
            value={eventPushBody}
            onChangeText={setEventPushBody}
            maxLength={180}
            placeholder="Etkinlik mesajı"
            placeholderTextColor={theme.colors.muted}
            style={styles.textArea}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            disabled={
              !eventPushTitle.trim() ||
              !eventPushBody.trim() ||
              isSendingEventPush
            }
            onPress={() => void sendEventPush()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!eventPushTitle.trim() ||
                !eventPushBody.trim() ||
                isSendingEventPush) &&
                styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {isSendingEventPush ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Push gönder</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="person-add-outline"
              size={19}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Keşfet bot profili</Text>
              <Text style={styles.sectionMeta}>Detaylı bot kartı oluştur.</Text>
            </View>
          </View>

          <View style={styles.splitRow}>
            <TextInput
              value={profileBotName}
              onChangeText={setProfileBotName}
              maxLength={80}
              placeholder="Bot adı"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={profileBotAge}
              onChangeText={setProfileBotAge}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="Yaş"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.ageInput]}
            />
          </View>
          <View style={styles.splitRow}>
            <TextInput
              value={profileBotCity}
              onChangeText={setProfileBotCity}
              maxLength={80}
              placeholder="Şehir"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={profileBotOccupation}
              onChangeText={setProfileBotOccupation}
              maxLength={120}
              placeholder="Meslek"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.flexInput]}
            />
          </View>
          <TextInput
            value={profileBotBio}
            onChangeText={setProfileBotBio}
            maxLength={280}
            placeholder="Bio"
            placeholderTextColor={theme.colors.muted}
            style={styles.textArea}
            multiline
          />
          <TextInput
            value={profileBotPhotoUri}
            onChangeText={setProfileBotPhotoUri}
            maxLength={600}
            placeholder="Fotoğraf URL"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <View style={styles.splitRow}>
            <TextInput
              value={profileBotHometown}
              onChangeText={setProfileBotHometown}
              maxLength={80}
              placeholder="Memleket"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={profileBotFavoritePoet}
              onChangeText={setProfileBotFavoritePoet}
              maxLength={120}
              placeholder="Ozan/şair"
              placeholderTextColor={theme.colors.muted}
              style={[styles.input, styles.flexInput]}
            />
          </View>
          <TextInput
            value={profileBotFavoriteSong}
            onChangeText={setProfileBotFavoriteSong}
            maxLength={120}
            placeholder="Favori deyiş/türkü"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <View style={styles.chipWrap}>
            {(["ai_starter", "starter"] as const).map((kind) => (
              <Pressable
                key={kind}
                onPress={() => setProfileBotKind(kind)}
                style={({ pressed }) => [
                  styles.choiceChip,
                  profileBotKind === kind && styles.choiceChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    profileBotKind === kind && styles.choiceChipTextActive,
                  ]}
                >
                  {kind === "ai_starter" ? "AI bot" : "Rehber"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setProfileBotIsActive((value) => !value)}
              style={({ pressed }) => [
                styles.choiceChip,
                profileBotIsActive && styles.choiceChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  profileBotIsActive && styles.choiceChipTextActive,
                ]}
              >
                {profileBotIsActive ? "Aktif" : "Pasif"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Kimlik</Text>
          <View style={styles.chipWrap}>
            {culturalIdentityValues.map((identity) => (
              <Pressable
                key={identity}
                onPress={() => setProfileBotCulturalIdentity(identity)}
                style={({ pressed }) => [
                  styles.choiceChip,
                  profileBotCulturalIdentity === identity &&
                    styles.choiceChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    profileBotCulturalIdentity === identity &&
                      styles.choiceChipTextActive,
                  ]}
                >
                  {identity}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Kültür önemi</Text>
          <View style={styles.chipWrap}>
            {cultureImportanceValues.map((importance) => (
              <Pressable
                key={importance}
                onPress={() => setProfileBotCultureImportance(importance)}
                style={({ pressed }) => [
                  styles.choiceChip,
                  profileBotCultureImportance === importance &&
                    styles.choiceChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    profileBotCultureImportance === importance &&
                      styles.choiceChipTextActive,
                  ]}
                >
                  {importance}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>İlgi alanları</Text>
          <View style={styles.chipWrap}>
            {interestValues.map((interest) => {
              const selected = profileBotInterests.includes(interest);

              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleProfileBotInterest(interest)}
                  style={({ pressed }) => [
                    styles.choiceChip,
                    selected && styles.choiceChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      selected && styles.choiceChipTextActive,
                    ]}
                  >
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={
              !profileBotName.trim() ||
              !profileBotCity.trim() ||
              !profileBotBio.trim() ||
              isCreatingBot
            }
            onPress={() => void submitProfileBot()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!profileBotName.trim() ||
                !profileBotCity.trim() ||
                !profileBotBio.trim() ||
                isCreatingBot) &&
                styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {isCreatingBot ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Bot ekle</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="newspaper-outline"
              size={19}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Akış rehberi</Text>
              <Text style={styles.sectionMeta}>Resmi rehber/sponsor postlarını yönet.</Text>
            </View>
            {editingBotPostId ? (
              <Pressable
                accessibilityRole="button"
                onPress={resetBotForm}
                style={({ pressed }) => [
                  styles.ghostButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.ghostButtonText}>Yeni</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={botBody}
            onChangeText={setBotBody}
            maxLength={2000}
            placeholder="Rehber paylaşımı yaz..."
            placeholderTextColor={theme.colors.muted}
            style={styles.textArea}
            multiline
          />
          <TextInput
            value={botCtaLabel}
            onChangeText={setBotCtaLabel}
            maxLength={40}
            placeholder="Buton etiketi"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBotIsActive((value) => !value)}
              style={({ pressed }) => [
                styles.toggleChip,
                botIsActive && styles.toggleChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  botIsActive && styles.toggleChipTextActive,
                ]}
              >
                {botIsActive ? "Aktif" : "Pasif"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBotShowAdMob((value) => !value)}
              style={({ pressed }) => [
                styles.toggleChip,
                botShowAdMob && styles.toggleChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  botShowAdMob && styles.toggleChipTextActive,
                ]}
              >
                AdMob
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!botBody.trim() || isSavingBotPost}
              onPress={() => void submitBotPost()}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.flexButton,
                (!botBody.trim() || isSavingBotPost) && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              {isSavingBotPost ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editingBotPostId ? "Güncelle" : "Rehber paylaş"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.list}>
            {isLoadingBotPosts ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : botPosts.length === 0 ? (
              <Text style={styles.emptyText}>Henüz rehber paylaşımı yok.</Text>
            ) : (
              botPosts.map((post) => (
                <View key={post.botPostId ?? post.id} style={styles.listItem}>
                  <View style={styles.listItemCopy}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>
                      {post.body}
                    </Text>
                    <Text style={styles.listItemMeta}>
                      {post.isActive === false ? "Pasif" : "Aktif"} ·{" "}
                      {post.showAdMob === false ? "AdMob kapalı" : "AdMob açık"}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => post.botPostId && editBotPost(post.botPostId)}
                    style={({ pressed }) => [
                      styles.rowIconButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      post.botPostId && removeBotPost(post.botPostId)
                    }
                    style={({ pressed }) => [
                      styles.rowIconButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="people-outline"
              size={19}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Eşleştirme botları</Text>
              <Text style={styles.sectionMeta}>Keşfet akışındaki botları aç/kapat.</Text>
            </View>
            <Text style={styles.countText}>{bots.length}</Text>
          </View>

          <View style={styles.list}>
            {isLoadingBots ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : bots.length === 0 ? (
              <Text style={styles.emptyText}>Bot profili bulunamadı.</Text>
            ) : (
              bots.map((bot) => (
                <View key={bot.id} style={styles.botRow}>
                  <Avatar name={bot.name} uri={bot.photos[0]?.uri} size={40} />
                  <View style={styles.botCopy}>
                    <Text style={styles.listItemTitle}>{bot.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {bot.profileKind} · {bot.city}
                    </Text>
                  </View>
                  <Switch
                    value={bot.isActive}
                    disabled={isUpdating}
                    onValueChange={(isActive) =>
                      void toggleActive({ userId: bot.id, isActive }).catch(
                        (error) => {
                          Alert.alert(
                            "Bot durumu güncellenemedi",
                            error instanceof Error
                              ? error.message
                              : "Tekrar deneyin.",
                          );
                        },
                      )
                    }
                    trackColor={{
                      true: theme.colors.primary,
                      false: theme.colors.border,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="shield-outline"
              size={19}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Moderasyon araçları</Text>
              <Text style={styles.sectionMeta}>
                Gelen şikayetleri incele, banları yönet.
              </Text>
            </View>
            <Text style={styles.countText}>{pendingReports.length}</Text>
          </View>

          <View style={styles.list}>
            {isLoadingReports ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : pendingReports.length === 0 ? (
              <Text style={styles.emptyText}>Bekleyen şikayet yok.</Text>
            ) : (
              pendingReports.slice(0, 4).map((report) => (
                <View key={report.id} style={styles.moderationItem}>
                  <View style={styles.listItemCopy}>
                    <Text style={styles.listItemTitle}>
                      {report.category} · {report.reportedUserId}
                    </Text>
                    <Text numberOfLines={2} style={styles.listItemMeta}>
                      {report.description || "Açıklama yok"}
                    </Text>
                  </View>
                  <View style={styles.moderationActions}>
                    <Pressable
                      onPress={() => void resolveReport(report.id)}
                      style={({ pressed }) => [
                        styles.smallActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void banReportedUser(
                          report.reportedUserId,
                          report.description ||
                            `Şikayet kategorisi: ${report.category}`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.smallActionButton,
                        styles.dangerActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={16}
                        color={theme.colors.danger}
                      />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.fieldLabel}>Aktif banlar</Text>
          <View style={styles.list}>
            {isLoadingBannedUsers ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : bannedUsers.length === 0 ? (
              <Text style={styles.emptyText}>Banlı kullanıcı yok.</Text>
            ) : (
              bannedUsers.slice(0, 4).map((ban) => (
                <View key={ban.id} style={styles.moderationItem}>
                  <View style={styles.listItemCopy}>
                    <Text style={styles.listItemTitle}>{ban.userId}</Text>
                    <Text numberOfLines={2} style={styles.listItemMeta}>
                      {ban.banType === "permanent" ? "Kalıcı" : "Geçici"} ·{" "}
                      {ban.reason}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void unbanUser(ban.userId)}
                    style={({ pressed }) => [
                      styles.smallActionButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="refresh"
                      size={16}
                      color={theme.colors.primary}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screen: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxl,
    },
    lockedHeader: {
      minHeight: 58,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    header: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerCopy: {
      flex: 1,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      fontSize: 24,
      lineHeight: 30,
    },
    adminBadge: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.16)",
    },
    adminBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    section: {
      gap: theme.spacing.sm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    sectionTitleCopy: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    sectionMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    input: {
      minHeight: 44,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    splitRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    flexInput: {
      flex: 1,
    },
    ageInput: {
      width: 78,
      textAlign: "center",
    },
    textArea: {
      minHeight: 82,
      maxHeight: 148,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      textAlignVertical: "top",
      backgroundColor: theme.colors.background,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    fieldLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
      marginTop: theme.spacing.xs,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    choiceChip: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    choiceChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(233, 64, 87, 0.10)",
    },
    choiceChipText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    choiceChipTextActive: {
      color: theme.colors.primary,
    },
    primaryButton: {
      minHeight: 42,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },
    flexButton: {
      flex: 1,
    },
    disabledButton: {
      backgroundColor: "rgba(233, 64, 87, 0.36)",
    },
    primaryButtonText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    ghostButton: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    ghostButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    toggleChip: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    toggleChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(233, 64, 87, 0.10)",
    },
    toggleChipText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    toggleChipTextActive: {
      color: theme.colors.primary,
    },
    list: {
      gap: theme.spacing.xs,
    },
    listItem: {
      minHeight: 54,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    listItemCopy: {
      flex: 1,
      minWidth: 0,
    },
    listItemTitle: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: "800",
    },
    listItemMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    moderationItem: {
      minHeight: 64,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.background,
    },
    moderationActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    smallActionButton: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dangerActionButton: {
      borderColor: "rgba(239, 68, 68, 0.22)",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.xs,
    },
    rowIconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    botRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    botCopy: {
      flex: 1,
      minWidth: 0,
    },
    countText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "900",
    },
    emptyText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      paddingVertical: theme.spacing.sm,
      textAlign: "center",
    },
    pressed: {
      opacity: 0.78,
    },
  });
