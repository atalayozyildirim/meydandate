import { create } from "zustand";
import {
  initialSpace,
  transitionSpace,
  type SpaceCommand,
  type SpaceRole,
  type SpaceState,
} from "./spaceModel";
import { connectionProfiles } from "./connections";

interface NetworkState {
  ageConfirmed: boolean;
  liked: string[];
  passed: string[];
  matches: string[];
  spaceRole: SpaceRole;
  space: SpaceState;
  roomJoined: boolean;
  confirmAge: () => void;
  like: (id: string) => boolean;
  pass: (id: string) => void;
  resetConnections: () => void;
  setSpaceRole: (role: SpaceRole) => void;
  setRoomJoined: (value: boolean) => void;
  command: (command: SpaceCommand) => void;
}
export const useNetworkStore = create<NetworkState>((set, get) => ({
  ageConfirmed: false,
  liked: [],
  passed: [],
  matches: [],
  spaceRole: "member",
  space: initialSpace(),
  roomJoined: false,
  confirmAge: () => set({ ageConfirmed: true }),
  like: (id) => {
    if (!get().ageConfirmed)
      throw new Error("Önce yetişkin önizleme akışını onayla.");
    const profile = connectionProfiles.find((p) => p.id === id);
    if (!profile) throw new Error("Örnek profil bulunamadı.");
    if (get().liked.includes(id)) return false;
    const matched = Boolean((profile as any).reciprocal);
    set((state) => ({
      liked: [...state.liked, id],
      matches: matched ? [...state.matches, id] : state.matches,
    }));
    return matched;
  },
  pass: (id) => {
    if (!get().ageConfirmed)
      throw new Error("Önce yetişkin önizleme akışını onayla.");
    set((state) => ({ passed: [...state.passed, id] }));
  },
  resetConnections: () => set({ liked: [], passed: [], matches: [] }),
  setSpaceRole: (spaceRole) => set({ spaceRole }),
  setRoomJoined: (roomJoined) => set({ roomJoined }),
  command: (command) =>
    set((state) => ({
      space: transitionSpace(
        state.space,
        {
          id: state.spaceRole === "admin" ? "main-admin" : "self",
          role: state.spaceRole,
        },
        command,
      ),
    })),
}));
