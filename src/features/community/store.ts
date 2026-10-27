import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
import type { City } from "./data";

const storage = new SecureStorageService();
const toggle = (values: string[], id: string) =>
  values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];

interface CommunityState {
  city: City;
  joinedEvents: string[];
  joinedCommunities: string[];
  requestedCommunities: string[];
  savedArticles: string[];
  blockedAuthors: string[];
  reports: Array<{ reason: string; date: string }>;
  replies: string[];
  participationVisible: boolean;
  setCity: (city: City) => void;
  toggleEvent: (id: string) => void;
  toggleCommunity: (id: string, privateGroup: boolean) => void;
  toggleArticle: (id: string) => void;
  toggleBlockedAuthor: (id: string) => void;
  report: (reason: string) => void;
  reply: (message: string) => void;
  setParticipationVisible: (value: boolean) => void;
  resetLocalPreferences: () => void;
}

const initial = {
  city: "İstanbul" as City,
  joinedEvents: [] as string[],
  joinedCommunities: [] as string[],
  requestedCommunities: [] as string[],
  savedArticles: [] as string[],
  blockedAuthors: [] as string[],
  reports: [] as Array<{ reason: string; date: string }>,
  replies: [] as string[],
  participationVisible: false,
};

// İstemci yerel tercihleri (seçili şehir, yerel filtreler).
export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      ...initial,
      setCity: (city) => set({ city }),
      toggleEvent: (id) =>
        set((state) => ({ joinedEvents: toggle(state.joinedEvents, id) })),
      toggleCommunity: (id, privateGroup) =>
        set((state) =>
          privateGroup
            ? { requestedCommunities: toggle(state.requestedCommunities, id) }
            : { joinedCommunities: toggle(state.joinedCommunities, id) },
        ),
      toggleArticle: (id) =>
        set((state) => ({ savedArticles: toggle(state.savedArticles, id) })),
      toggleBlockedAuthor: (id) =>
        set((state) => ({ blockedAuthors: toggle(state.blockedAuthors, id) })),
      report: (reason) =>
        set((state) => ({
          reports: [
            ...state.reports,
            { reason, date: new Date().toISOString() },
          ],
        })),
      reply: (message) => {
        const trimmed = message.trim().slice(0, 500);
        if (trimmed) set((state) => ({ replies: [...state.replies, trimmed] }));
      },
      setParticipationVisible: (participationVisible) =>
        set({ participationVisible }),
      resetLocalPreferences: () => set({ ...initial }),
    }),
    {
      name: "ehlibyte-community-preferences-v1",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getItem(key),
        setItem: (key, value) => storage.setItem(key, value),
        removeItem: (key) => storage.deleteItem(key),
      })),
      version: 1,
    },
  ),
);
