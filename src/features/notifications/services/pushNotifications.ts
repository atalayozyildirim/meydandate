import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/infrastructure/supabase/client";

type NotificationsModule = typeof import("expo-notifications");
export type PushNotificationData = {
  type?: string;
  conversationId?: string;
  messageId?: string;
  postId?: string;
  commentId?: string;
  userId?: string;
  matchId?: string;
};

let notificationsModule: NotificationsModule | null = null;
let lastHandledNotificationId: string | null = null;
const notificationPreferenceKey = "settings_notifications";

const isExpoGo = () =>
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

const loadNotifications = async () => {
  if (notificationsModule) {
    return notificationsModule;
  }

  notificationsModule = await import("expo-notifications");
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  return notificationsModule;
};

const setStoredTokensActive = async (userId: string, isActive: boolean) => {
  const { error } = await supabase.rpc("set_push_notifications_enabled", {
    next_enabled: isActive,
  });

  if (error && __DEV__) {
    console.info(
      `Push token durumu güncellenemedi (${userId}):`,
      error.message,
    );
  }
};

export const registerPushNotifications = async (userId: string) => {
  if (Platform.OS === "web" || isExpoGo()) {
    return;
  }

  const storedPreference = await SecureStore.getItemAsync(
    notificationPreferenceKey,
  );

  if (storedPreference === "false") {
    await setStoredTokensActive(userId, false);
    return;
  }

  const Notifications = await loadNotifications();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("social", {
      name: "Sosyal etkileşimler",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 220],
    });
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Mesajlar",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 120, 250],
    });
    await Notifications.setNotificationChannelAsync("matches", {
      name: "Eşleşmeler",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 220],
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let status = existingPermission.status;

  if (status !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    status = requestedPermission.status;
  }

  if (status !== "granted") {
    return;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId;

  if (!projectId) {
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  if (!token) {
    return;
  }

  await supabase.rpc("upsert_push_token", {
    next_token: token,
    next_platform: Platform.OS,
  });
};

export const setPushNotificationsEnabled = async (
  userId: string,
  enabled: boolean,
) => {
  await SecureStore.setItemAsync(notificationPreferenceKey, String(enabled));

  if (!enabled) {
    await setStoredTokensActive(userId, false);
    return;
  }

  await registerPushNotifications(userId);
};

export const subscribeToPushNotificationResponses = async (
  onResponse: (data: PushNotificationData) => void,
) => {
  if (Platform.OS === "web" || isExpoGo()) {
    return () => undefined;
  }

  const Notifications = await loadNotifications();
  const handleResponse = (
    response: Awaited<
      ReturnType<typeof Notifications.getLastNotificationResponseAsync>
    >,
  ) => {
    if (!response) {
      return;
    }

    const notificationId = response.notification.request.identifier;

    if (lastHandledNotificationId === notificationId) {
      return;
    }

    lastHandledNotificationId = notificationId;
    onResponse(
      response.notification.request.content.data as PushNotificationData,
    );
  };

  handleResponse(await Notifications.getLastNotificationResponseAsync());
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleResponse,
  );

  return () => subscription.remove();
};
