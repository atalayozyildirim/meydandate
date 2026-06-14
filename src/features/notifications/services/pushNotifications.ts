import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { supabase } from "@/infrastructure/supabase/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerPushNotifications = async (userId: string) => {
  if (Platform.OS === "web") {
    return;
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
