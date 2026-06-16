// Engellenen kullanicilari ayarlardan ayri, sayfali liste olarak yonetir.
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { Screen } from "@/shared/components/Screen";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useTheme } from "@/shared/theme";

const PAGE_SIZE = 20;

interface BlockedProfilePreview {
  id: string;
  name: string;
  city?: string;
}

interface BlockedUsersPage {
  items: BlockedProfilePreview[];
  nextCursor?: number;
}

export default function BlockedUsersSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const blockedIds = useMemo(
    () => currentUser?.blockedUsers ?? [],
    [currentUser?.blockedUsers],
  );

  const blockedUsersQuery = useInfiniteQuery<BlockedUsersPage>(
    ["settings", "blocked-users", blockedIds],
    async ({ pageParam = 0 }): Promise<BlockedUsersPage> => {
      const cursor = Number(pageParam) || 0;
      const pageIds = blockedIds.slice(cursor, cursor + PAGE_SIZE);
      const items = await Promise.all(
        pageIds.map(async (blockedUserId) => {
          try {
            const user = await container.userRepository.getUserById(blockedUserId);

            return {
              id: user.id,
              name: user.name,
              city: user.city,
            };
          } catch {
            return {
              id: blockedUserId,
              name: "Kullanıcı",
            };
          }
        }),
      );
      const nextCursor = cursor + PAGE_SIZE;

      return {
        items,
        ...(nextCursor < blockedIds.length ? { nextCursor } : {}),
      };
    },
    {
      enabled: Boolean(currentUser),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );
  const blockedUsers = blockedUsersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const unblockUserMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      if (!currentUser) {
        throw new Error("Engel kaldırmak için oturum gerekli.");
      }

      await container.userRepository.unblockUser(currentUser.id, blockedUserId);
      return blockedUserId;
    },
    onSuccess: async (blockedUserId) => {
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          blockedUsers: blockedIds.filter((candidateId) => candidateId !== blockedUserId),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings", "blocked-users"] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        "Engel kaldırılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    },
  });

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  const loadMore = () => {
    if (
      blockedUsersQuery.hasNextPage &&
      !blockedUsersQuery.isFetchingNextPage
    ) {
      void blockedUsersQuery.fetchNextPage();
    }
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Güvenlik</Text>
          <Text style={styles.title}>Engellenenler</Text>
          <Text style={styles.description}>
            Bu kişiler Keşfet, eşleşme ve mesaj akışında karşına çıkarılmaz.
          </Text>
        </View>
      </View>

      <FlatList
        data={blockedUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.55}
        onEndReached={loadMore}
        ListEmptyComponent={
          blockedUsersQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.stateText}>Liste hazırlanıyor...</Text>
            </View>
          ) : (
            <View style={styles.centerState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>Engellenen kullanıcı yok</Text>
              <Text style={styles.stateText}>
                Profil güvenlik menüsünden engellediklerin burada görünür.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          blockedUsersQuery.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                {item.city ?? "Profil erişimi sınırlı"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={unblockUserMutation.isPending}
              onPress={() => unblockUserMutation.mutate(item.id)}
              style={({ pressed }) => [
                styles.unblockButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.unblockButtonText}>Kaldır</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      paddingBottom: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs,
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
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    list: {
      gap: theme.spacing.xs,
      paddingBottom: 132,
      flexGrow: 1,
    },
    row: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontWeight: "900",
    },
    rowBody: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    rowSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    unblockButton: {
      minHeight: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    unblockButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.82,
    },
    centerState: {
      flex: 1,
      minHeight: 420,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    emptyTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      textAlign: "center",
    },
    stateText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: "center",
    },
    footerLoader: {
      paddingVertical: theme.spacing.md,
    },
  });
