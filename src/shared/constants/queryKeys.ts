// React Query anahtarlarini sabit tutarak cache hatalarini azaltir.
export const queryKeys = {
  discover: "discover",
  likedMe: "likedMe",
  matches: "matches",
  conversations: "conversations",
  conversation: "conversation",
  profile: "profile",
  publicProfile: "publicProfile",
  specialInvite: "specialInvite",
  subscription: "subscription",
  fireBalance: "fireBalance",
  fireLeaderboard: "fireLeaderboard",
  liveRoom: "liveRoom",
  feed: "feed",
  activities: "activities",
  unreadActivities: "unreadActivities"
} as const;
