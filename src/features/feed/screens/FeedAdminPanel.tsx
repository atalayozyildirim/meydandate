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
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { ReportCategory, ReportStatus } from "@/domain/entities/Moderation";
import { useBotFeedAdmin } from "@/features/feed/hooks/useFeed";
import {
  useBanUser,
  useBannedUsers,
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
import { queryKeys } from "@/shared/constants/queryKeys";
import { useTheme } from "@/shared/theme";

const defaultBotCtaLabel = "İncele";
const adminReportPageSize = 25;
type AdminTool = "push" | "bots" | "guide" | "moderation";
type ReportStatusFilter = ReportStatus;
type ReportCategoryFilter =
  | ReportCategory
  | "all"
  | "fake_profile"
  | "inappropriate_content";

const reportStatusFilters: ReportStatusFilter[] = [
  "pending",
  "in_review",
  "resolved",
  "dismissed",
];

const reportCategoryFilters: ReportCategoryFilter[] = [
  "all",
  "fake_profile",
  "profanity",
  "sexual_content",
  "harassment",
  "inappropriate_content",
  "spam",
  "fraud",
  "other",
];

interface ReportUserPreview {
  id: string;
  name: string;
  age?: number | null;
  city?: string | null;
  occupation?: string | null;
  photoUri?: string;
  isActive?: boolean | null;
  profileKind?: string | null;
}

interface AdminProfileReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  category: string;
  description: string;
  evidence: string[];
  status: ReportStatus;
  createdAt: string;
  reportedUser?: ReportUserPreview;
  reporter?: ReportUserPreview;
}

interface FeedPostReport {
  id: string;
  postId: string;
  reporterId: string;
  createdAt: string;
  status: "pending" | "resolved" | "dismissed";
  resolution?: string | null;
  post?: {
    id: string;
    body: string;
    authorId: string;
  } | null;
  reporter?: ReportUserPreview;
  author?: ReportUserPreview;
}

interface FeedAdminPanelProps {
  onClose: () => void;
};

const getPhotoUri = (photos: unknown): string | undefined => {
  if (!Array.isArray(photos)) {
    return undefined;
  }

  const primary = photos.find(
    (photo) =>
      photo &&
      typeof photo === "object" &&
      "uri" in photo &&
      (photo as { isPrimary?: unknown }).isPrimary === true,
  );
  const fallback = primary ?? photos[0];

  return fallback &&
    typeof fallback === "object" &&
    typeof (fallback as { uri?: unknown }).uri === "string"
    ? (fallback as { uri: string }).uri
    : undefined;
};

const mapUserPreview = (row: any): ReportUserPreview => ({
  id: String(row.id),
  name: String(row.name ?? "Kullanıcı"),
  age: typeof row.age === "number" ? row.age : null,
  city: typeof row.city === "string" ? row.city : null,
  occupation: typeof row.occupation === "string" ? row.occupation : null,
  photoUri: getPhotoUri(row.photos),
  isActive: typeof row.isActive === "boolean" ? row.isActive : null,
  profileKind: typeof row.profileKind === "string" ? row.profileKind : null,
});

const reportStatusLabel: Record<ReportStatusFilter, string> = {
  pending: "Bekleyen",
  in_review: "İncelemede",
  resolved: "Çözüldü",
  dismissed: "Yanlış",
};

const reportCategoryLabel: Record<ReportCategoryFilter, string> = {
  all: "Tümü",
  fake_profile: "Sahte",
  profanity: "Küfür",
  sexual_content: "Cinsel",
  harassment: "Taciz",
  inappropriate_content: "Uygunsuz",
  spam: "Spam",
  fraud: "Dolandırıcılık",
  other: "Diğer",
};

const getEvidenceValue = (evidence: string[], prefix: string) =>
  evidence
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();

const getMessageReportContext = (evidence: string[]) =>
  evidence
    .filter((item) => item.startsWith("context:"))
    .map((item) => item.slice("context:".length).trim())
    .filter(Boolean);

const isMessageReportEvidence = (evidence: string[]) =>
  evidence.includes("type:message") ||
  Boolean(getEvidenceValue(evidence, "messageId:"));

const sanitizeReportSearch = (value: string) =>
  value
    .trim()
    .replace(/[(),]/g, " ")
    .replace(/[%_]/g, "\\$&")
    .replace(/\s+/g, " ");

const buildUserPreviewMap = async (userIds: string[]) => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const usersById = new Map<string, ReportUserPreview>();

  if (uniqueUserIds.length === 0) {
    return usersById;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,name,age,city,occupation,photos,isActive,profileKind")
    .in("id", uniqueUserIds);

  if (error) {
    throw error;
  }

  for (const user of data ?? []) {
    usersById.set(String(user.id), mapUserPreview(user));
  }

  return usersById;
};

export const FeedAdminPanel = ({ onClose }: FeedAdminPanelProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
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
    data: bannedUsers = [],
    refetch: refetchBannedUsers,
    isLoading: isLoadingBannedUsers,
  } = useBannedUsers();
  const banUserMutation = useBanUser();
  const unbanUserMutation = useUnbanUser();
  const updateReportMutation = useUpdateReportStatus();
  const [activeTool, setActiveTool] = useState<AdminTool>("moderation");
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
  const [profileReportStatus, setProfileReportStatus] =
    useState<ReportStatusFilter>("pending");
  const [profileReportCategory, setProfileReportCategory] =
    useState<ReportCategoryFilter>("all");
  const [profileReportSearch, setProfileReportSearch] = useState("");
  const [profileReportPage, setProfileReportPage] = useState(0);
  const [postReportStatus, setPostReportStatus] =
    useState<ReportStatusFilter>("pending");
  const [postReportSearch, setPostReportSearch] = useState("");
  const [postReportPage, setPostReportPage] = useState(0);
  const profileReportsQuery = useQuery({
    queryKey: [
      "moderation",
      "admin-profile-reports",
      profileReportStatus,
      profileReportCategory,
      profileReportSearch.trim(),
      profileReportPage,
    ],
    enabled: isAdmin,
    keepPreviousData: true,
    queryFn: async (): Promise<{
      reports: AdminProfileReport[];
      total: number;
    }> => {
      const from = profileReportPage * adminReportPageSize;
      const to = from + adminReportPageSize - 1;
      const search = sanitizeReportSearch(profileReportSearch);
      let query = supabase
        .from("reports")
        .select(
          'id,"reporterId","reportedUserId",category,description,evidence,status,"createdAt"',
          { count: "exact" },
        )
        .eq("status", profileReportStatus)
        .order("createdAt", { ascending: false })
        .range(from, to);

      if (profileReportCategory !== "all") {
        query = query.eq("category", profileReportCategory);
      }

      if (search) {
        query = query.or(
          `description.ilike.%${search}%,category.ilike.%${search}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const rows = data ?? [];
      const usersById = await buildUserPreviewMap(
        rows.flatMap((row) => [
          String(row.reportedUserId),
          String(row.reporterId),
        ]),
      );

      return {
        total: count ?? rows.length,
        reports: rows.map((row) => ({
          id: String(row.id),
          reporterId: String(row.reporterId),
          reportedUserId: String(row.reportedUserId),
          category: String(row.category),
          description: String(row.description ?? ""),
          evidence: Array.isArray(row.evidence)
            ? row.evidence.map((item) => String(item))
            : [],
          status: (row.status ?? "pending") as ReportStatus,
          createdAt: String(row.createdAt),
          reportedUser: usersById.get(String(row.reportedUserId)),
          reporter: usersById.get(String(row.reporterId)),
        })),
      };
    },
  });
  const feedPostReportsQuery = useQuery({
    queryKey: [
      queryKeys.feed,
      "admin-post-reports",
      postReportStatus,
      postReportSearch.trim(),
      postReportPage,
    ],
    enabled: isAdmin,
    keepPreviousData: true,
    queryFn: async (): Promise<{
      reports: FeedPostReport[];
      total: number;
    }> => {
      const from = postReportPage * adminReportPageSize;
      const to = from + adminReportPageSize - 1;
      const search = sanitizeReportSearch(postReportSearch);
      let reportQuery = supabase
        .from("feed_post_reports")
        .select("id,post_id,reporter_id,created_at,status,resolution", {
          count: "exact",
        })
        .eq("status", postReportStatus)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) {
        const { data: matchingPosts, error: postSearchError } = await supabase
          .from("feed_posts")
          .select("id")
          .ilike("body", `%${search}%`)
          .limit(100);

        if (postSearchError) {
          throw postSearchError;
        }

        const matchingPostIds = (matchingPosts ?? []).map((post) => post.id);

        if (matchingPostIds.length === 0) {
          return { reports: [], total: 0 };
        }

        reportQuery = reportQuery.in("post_id", matchingPostIds);
      }

      const { data: reportRows, error: reportError, count } = await reportQuery;

      if (reportError) {
        throw reportError;
      }

      const rows = reportRows ?? [];
      const postIds = rows
        .map((row) => row.post_id)
        .filter((postId): postId is string => typeof postId === "string");
      const postsById = new Map<string, FeedPostReport["post"]>();

      if (postIds.length > 0) {
        const { data: postRows, error: postError } = await supabase
          .from("feed_posts")
          .select("id,body,author_id")
          .in("id", postIds);

        if (postError) {
          throw postError;
        }

        for (const post of postRows ?? []) {
          postsById.set(post.id, {
            id: post.id,
            body: post.body,
            authorId: post.author_id,
          });
        }
      }

      const usersById = await buildUserPreviewMap(
        rows.flatMap((row) => {
          const post = postsById.get(row.post_id);
          return [String(row.reporter_id), post?.authorId ?? ""];
        }),
      );

      return {
        total: count ?? rows.length,
        reports: rows.map((row) => {
          const post = postsById.get(row.post_id) ?? null;

          return {
            id: row.id,
            postId: row.post_id,
            reporterId: row.reporter_id,
            createdAt: row.created_at,
            status: row.status ?? "pending",
            resolution: row.resolution,
            post,
            reporter: usersById.get(String(row.reporter_id)),
            author: post?.authorId
              ? usersById.get(String(post.authorId))
              : undefined,
          };
        }),
      };
    },
  });
  const profileReports = profileReportsQuery.data?.reports ?? [];
  const profileReportTotal = profileReportsQuery.data?.total ?? 0;
  const pendingFeedPostReports = feedPostReportsQuery.data?.reports ?? [];
  const feedPostReportTotal = feedPostReportsQuery.data?.total ?? 0;
  const adminTools: Array<{
    key: AdminTool;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    count?: number;
  }> = [
    { key: "push", label: "Bildirim", icon: "notifications-outline" },
    { key: "bots", label: "Botlar", icon: "people-outline", count: bots.length },
    { key: "guide", label: "Rehber", icon: "newspaper-outline", count: botPosts.length },
    {
      key: "moderation",
      label: "Moderasyon",
      icon: "shield-outline",
      count: profileReportTotal + feedPostReportTotal,
    },
  ];

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

  const dismissReport = async (reportId: string) => {
    try {
      await updateReportMutation.mutateAsync({
        reportId,
        status: "dismissed",
        resolution: "Yanlış şikayet olarak kapatıldı.",
      });
      await profileReportsQuery.refetch();
    } catch (error) {
      Alert.alert(
        "Şikayet güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const banReportedUser = async (
    reportId: string,
    userId: string,
    reason: string,
  ) => {
    try {
      await banUserMutation.mutateAsync({
        userId,
        banType: "permanent",
        reason: reason.trim() || "Admin panelinden kalıcı ban.",
      });
      await updateReportMutation.mutateAsync({
        reportId,
        status: "resolved",
        resolution: "Kullanıcı banlandı.",
      });
      await Promise.all([profileReportsQuery.refetch(), refetchBannedUsers()]);
    } catch (error) {
      Alert.alert(
        "Kullanıcı banlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const dismissFeedPostReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("feed_post_reports")
        .update({
          status: "dismissed",
          resolution: "Yanlış şikayet olarak kapatıldı.",
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser?.id ?? null,
        })
        .eq("id", reportId);

      if (error) {
        throw error;
      }

      await feedPostReportsQuery.refetch();
    } catch (error) {
      Alert.alert(
        "Post şikayeti kapatılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const banFeedPostAuthor = async (report: FeedPostReport) => {
    const authorId = report.post?.authorId;

    if (!authorId) {
      Alert.alert("Post bulunamadı", "Bu şikayetin post yazarı okunamadı.");
      return;
    }

    try {
      await banUserMutation.mutateAsync({
        userId: authorId,
        banType: "permanent",
        reason: `Akış post şikayeti: ${report.post?.body ?? report.postId}`,
      });
      const { error } = await supabase
        .from("feed_post_reports")
        .update({
          status: "resolved",
          resolution: "Post yazarı banlandı.",
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser?.id ?? null,
        })
        .eq("id", report.id);

      if (error) {
        throw error;
      }

      await Promise.all([
        feedPostReportsQuery.refetch(),
        refetchBannedUsers(),
        queryClient.invalidateQueries({ queryKey: [queryKeys.feed] }),
      ]);
    } catch (error) {
      Alert.alert(
        "Post yazarı banlanamadı",
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

        <View style={styles.toolTabs}>
          {adminTools.map((tool) => {
            const selected = activeTool === tool.key;

            return (
              <Pressable
                key={tool.key}
                accessibilityRole="button"
                onPress={() => setActiveTool(tool.key)}
                style={({ pressed }) => [
                  styles.toolTab,
                  selected && styles.toolTabActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={tool.icon}
                  size={18}
                  color={selected ? theme.colors.onPrimary : theme.colors.muted}
                />
                <Text
                  style={[
                    styles.toolTabText,
                    selected && styles.toolTabTextActive,
                  ]}
                >
                  {tool.label}
                </Text>
                {tool.count !== undefined && tool.count > 0 ? (
                  <Text
                    style={[
                      styles.toolTabCount,
                      selected && styles.toolTabCountActive,
                    ]}
                  >
                    {tool.count}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {activeTool === "push" ? (
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
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="send" size={15} color={theme.colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Push gönder</Text>
              </>
            )}
          </Pressable>
        </View>
        ) : null}

        {activeTool === "bots" ? (
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
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons
                  name="person-add"
                  size={15}
                  color={theme.colors.onPrimary}
                />
                <Text style={styles.primaryButtonText}>Bot ekle</Text>
              </>
            )}
          </Pressable>
        </View>
        ) : null}

        {activeTool === "guide" ? (
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
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
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
        ) : null}

        {activeTool === "bots" ? (
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
        ) : null}

        {activeTool === "moderation" ? (
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
            <Text style={styles.countText}>{profileReportTotal}</Text>
          </View>

          <TextInput
            value={profileReportSearch}
            onChangeText={(value) => {
              setProfileReportSearch(value);
              setProfileReportPage(0);
            }}
            maxLength={120}
            placeholder="Profil şikayeti ara..."
            placeholderTextColor={theme.colors.muted}
            style={styles.searchInput}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRail}
          >
            {reportStatusFilters.map((status) => (
              <Pressable
                key={status}
                onPress={() => {
                  setProfileReportStatus(status);
                  setProfileReportPage(0);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  profileReportStatus === status && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    profileReportStatus === status &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {reportStatusLabel[status]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRail}
          >
            {reportCategoryFilters.map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  setProfileReportCategory(category);
                  setProfileReportPage(0);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  profileReportCategory === category && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    profileReportCategory === category &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {reportCategoryLabel[category]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.list}>
            {profileReportsQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : profileReports.length === 0 ? (
              <Text style={styles.emptyText}>Profil şikayeti bulunamadı.</Text>
            ) : (
              profileReports.map((report) => (
                <View key={report.id} style={styles.moderationItem}>
                  <View style={styles.reportProfileRow}>
                    <Avatar
                      name={report.reportedUser?.name ?? report.reportedUserId}
                      uri={report.reportedUser?.photoUri}
                      size={42}
                    />
                    <View style={styles.listItemCopy}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {report.reportedUser?.name ?? "Profil"}
                      </Text>
                      <Text numberOfLines={1} style={styles.listItemMeta}>
                        {[
                          reportCategoryLabel[
                            report.category as ReportCategoryFilter
                          ] ?? report.category,
                          report.reportedUser?.age
                            ? `${report.reportedUser.age} yaş`
                            : null,
                          report.reportedUser?.city,
                          report.reportedUser?.isActive === false
                            ? "Pasif"
                            : "Aktif",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      <Text numberOfLines={2} style={styles.listItemMeta}>
                        {report.description || report.reportedUserId}
                      </Text>
                      <Text numberOfLines={1} style={styles.reporterMeta}>
                        Şikayet eden: {report.reporter?.name ?? report.reporterId}
                      </Text>
                    </View>
                  </View>
                  {isMessageReportEvidence(report.evidence) ? (
                    <View style={styles.messageEvidenceBox}>
                      <View style={styles.messageEvidenceHeader}>
                        <Ionicons
                          name="chatbox-ellipses-outline"
                          size={14}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.messageEvidenceTitle}>
                          Mesaj şikayeti
                        </Text>
                      </View>
                      <Text style={styles.messageEvidenceBody}>
                        {getEvidenceValue(report.evidence, "reportedMessage:") ||
                          report.description}
                      </Text>
                      <Text numberOfLines={1} style={styles.reportIdText}>
                        Konuşma:{" "}
                        {getEvidenceValue(report.evidence, "conversationId:") ??
                          "-"}{" "}
                        · Mesaj:{" "}
                        {getEvidenceValue(report.evidence, "messageId:") ?? "-"}
                      </Text>
                      {getMessageReportContext(report.evidence).length > 0 ? (
                        <View style={styles.messageContextList}>
                          <Text style={styles.messageEvidenceTitle}>
                            Son {getMessageReportContext(report.evidence).length} mesaj
                          </Text>
                          {getMessageReportContext(report.evidence).map(
                            (item, index) => (
                              <Text
                                key={`${report.id}-message-context-${index}`}
                                style={styles.messageContextText}
                                numberOfLines={2}
                              >
                                {item}
                              </Text>
                            ),
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={styles.reportIdRow}>
                    <Text numberOfLines={1} style={styles.reportIdText}>
                      {report.reportedUserId}
                    </Text>
                  </View>
                  <View style={styles.moderationActions}>
                    <Pressable
                      onPress={() => void dismissReport(report.id)}
                      style={({ pressed }) => [
                        styles.textActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.textActionButtonText}>Yanlış</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void banReportedUser(
                          report.id,
                          report.reportedUserId,
                          report.description ||
                            `Şikayet kategorisi: ${report.category}`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.textActionButton,
                        styles.dangerTextActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.textActionButtonText,
                          styles.dangerText,
                        ]}
                      >
                        Banla
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.pagerRow}>
            <Pressable
              disabled={profileReportPage === 0}
              onPress={() =>
                setProfileReportPage((page) => Math.max(0, page - 1))
              }
              style={({ pressed }) => [
                styles.pagerButton,
                profileReportPage === 0 && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.pagerButtonText}>Önceki</Text>
            </Pressable>
            <Text style={styles.pageText}>
              {profileReportPage + 1} /{" "}
              {Math.max(1, Math.ceil(profileReportTotal / adminReportPageSize))}
            </Text>
            <Pressable
              disabled={
                (profileReportPage + 1) * adminReportPageSize >=
                profileReportTotal
              }
              onPress={() => setProfileReportPage((page) => page + 1)}
              style={({ pressed }) => [
                styles.pagerButton,
                (profileReportPage + 1) * adminReportPageSize >=
                  profileReportTotal && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.pagerButtonText}>Sonraki</Text>
            </Pressable>
          </View>

          <View style={styles.sectionDivider} />
          <View style={styles.sectionHeader}>
            <Ionicons
              name="flag-outline"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.sectionTitleCopy}>
              <Text style={styles.sectionTitle}>Post şikayetleri</Text>
              <Text style={styles.sectionMeta}>
                Akışta bayraklanan postlar burada düşer.
              </Text>
            </View>
            <Text style={styles.countText}>{feedPostReportTotal}</Text>
          </View>
          <TextInput
            value={postReportSearch}
            onChangeText={(value) => {
              setPostReportSearch(value);
              setPostReportPage(0);
            }}
            maxLength={120}
            placeholder="Post şikayeti ara..."
            placeholderTextColor={theme.colors.muted}
            style={styles.searchInput}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRail}
          >
            {reportStatusFilters.map((status) => (
              <Pressable
                key={status}
                onPress={() => {
                  setPostReportStatus(status);
                  setPostReportPage(0);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  postReportStatus === status && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    postReportStatus === status &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {reportStatusLabel[status]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.list}>
            {feedPostReportsQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : pendingFeedPostReports.length === 0 ? (
              <Text style={styles.emptyText}>Post şikayeti bulunamadı.</Text>
            ) : (
              pendingFeedPostReports.map((report) => (
                <View key={report.id} style={styles.moderationItem}>
                  <View style={styles.reportProfileRow}>
                    <Avatar
                      name={report.author?.name ?? report.post?.authorId ?? "Post"}
                      uri={report.author?.photoUri}
                      size={42}
                    />
                    <View style={styles.listItemCopy}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {report.author?.name ?? "Post yazarı"}
                      </Text>
                      <Text numberOfLines={1} style={styles.listItemMeta}>
                        {[
                          report.author?.age ? `${report.author.age} yaş` : null,
                          report.author?.city,
                          report.author?.isActive === false ? "Pasif" : "Aktif",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      <Text numberOfLines={2} style={styles.listItemMeta}>
                        {report.post?.body || report.postId}
                      </Text>
                      <Text numberOfLines={1} style={styles.reporterMeta}>
                        Şikayet eden: {report.reporter?.name ?? report.reporterId}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reportIdRow}>
                    <Text numberOfLines={1} style={styles.reportIdText}>
                      {report.post?.authorId ?? report.postId}
                    </Text>
                  </View>
                  <View style={styles.moderationActions}>
                    <Pressable
                      onPress={() => void dismissFeedPostReport(report.id)}
                      style={({ pressed }) => [
                        styles.textActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.textActionButtonText}>Yanlış</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void banFeedPostAuthor(report)}
                      style={({ pressed }) => [
                        styles.textActionButton,
                        styles.dangerTextActionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.textActionButtonText,
                          styles.dangerText,
                        ]}
                      >
                        Banla
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.pagerRow}>
            <Pressable
              disabled={postReportPage === 0}
              onPress={() => setPostReportPage((page) => Math.max(0, page - 1))}
              style={({ pressed }) => [
                styles.pagerButton,
                postReportPage === 0 && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.pagerButtonText}>Önceki</Text>
            </Pressable>
            <Text style={styles.pageText}>
              {postReportPage + 1} /{" "}
              {Math.max(1, Math.ceil(feedPostReportTotal / adminReportPageSize))}
            </Text>
            <Pressable
              disabled={
                (postReportPage + 1) * adminReportPageSize >=
                feedPostReportTotal
              }
              onPress={() => setPostReportPage((page) => page + 1)}
              style={({ pressed }) => [
                styles.pagerButton,
                (postReportPage + 1) * adminReportPageSize >=
                  feedPostReportTotal && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.pagerButtonText}>Sonraki</Text>
            </Pressable>
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
        ) : null}
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
      borderColor: "rgba(128, 128, 128, 0.16)",
    },
    adminBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    toolTabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    toolTab: {
      minHeight: 42,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    toolTabActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    toolTabText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
    },
    toolTabTextActive: {
      color: theme.colors.onPrimary,
    },
    toolTabCount: {
      minWidth: 20,
      overflow: "hidden",
      borderRadius: theme.radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: theme.colors.elevated,
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: "center",
      fontWeight: "900",
    },
    toolTabCountActive: {
      backgroundColor: theme.isDark
        ? "rgba(0,0,0,0.16)"
        : "rgba(255,255,255,0.20)",
      color: theme.colors.onPrimary,
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
    searchInput: {
      minHeight: 42,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    filterRail: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.md,
    },
    filterChip: {
      minHeight: 32,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    filterChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    filterChipText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
    },
    filterChipTextActive: {
      color: theme.colors.onPrimary,
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
      backgroundColor: "rgba(128, 128, 128, 0.10)",
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
      backgroundColor: "rgba(128, 128, 128, 0.36)",
    },
    primaryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.onPrimary,
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
      backgroundColor: "rgba(128, 128, 128, 0.10)",
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
      minHeight: 96,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "stretch",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    reportProfileRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    reporterMeta: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "700",
      marginTop: 2,
    },
    messageEvidenceBox: {
      gap: theme.spacing.xxs,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: "rgba(128, 128, 128, 0.18)",
      padding: theme.spacing.sm,
      backgroundColor: "rgba(128, 128, 128, 0.06)",
    },
    messageEvidenceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    messageEvidenceTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
    },
    messageEvidenceBody: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    messageContextList: {
      gap: 4,
      marginTop: theme.spacing.xxs,
    },
    messageContextText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    reportIdRow: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.colors.surface,
    },
    reportIdText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontSize: 10,
    },
    moderationActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xxs,
    },
    pagerRow: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    pagerButton: {
      minHeight: 34,
      minWidth: 82,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    pagerButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    pageText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
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
    textActionButton: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dangerTextActionButton: {
      borderColor: "rgba(239, 68, 68, 0.22)",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
    },
    textActionButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    dangerText: {
      color: theme.colors.danger,
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
