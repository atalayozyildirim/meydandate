// Token saklamayi Expo SecureStore ve guvenli olmayan acil durum fallback'i ile soyutlar.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const memoryStorage = new Map<string, string>();

const canUseWebStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const reportSecureStoreFailure = (operation: string, key: string, error: unknown) => {
  if (!__DEV__) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.info(`[SecureStorage] ${operation} failed for "${key}", using memory fallback: ${message}`);
};

export class SecureStorageService {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return canUseWebStorage() ? window.localStorage.getItem(key) : memoryStorage.get(key) ?? null;
    }

    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        memoryStorage.set(key, value);
      }
      return value;
    } catch (error) {
      reportSecureStoreFailure("getItem", key, error);
      return memoryStorage.get(key) ?? null;
    }
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

    memoryStorage.set(key, value);

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      reportSecureStoreFailure("setItem", key, error);
    }
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

    memoryStorage.delete(key);

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      reportSecureStoreFailure("deleteItem", key, error);
    }
  }
}
