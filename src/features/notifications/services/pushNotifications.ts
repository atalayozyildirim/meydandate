import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/infrastructure/supabase/client";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;

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

export const registerPushNotifications = async (userId: string) => {
  if (Platform.OS === "web" || isExpoGo()) {
    return;
  }

  const Notifications = await loadNotifications();
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
