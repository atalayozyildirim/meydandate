// Token saklamayi Expo SecureStore ve web fallback ile soyutlar.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const memoryStorage = new Map<string, string>();

const canUseWebStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export class SecureStorageService {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return canUseWebStorage() ? window.localStorage.getItem(key) : memoryStorage.get(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (canUseWebStorage()) {
        window.localStorage.setItem(key, value);
        return;
      }

      memoryStorage.set(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (canUseWebStorage()) {
        window.localStorage.removeItem(key);
        return;
      }

      memoryStorage.delete(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  }
}
