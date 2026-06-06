// Ilk surum deneyimini calistiran paylasimli mock veritabani.
import type { BlockedUser, Like, Match, Report } from "@/domain/entities/Match";
import type { Conversation } from "@/domain/entities/Message";
import type { Subscription } from "@/domain/entities/Subscription";
import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { testAccount } from "@/shared/constants/testAccount";

interface MutedUser {
  userId: string;
  mutedUserId: string;
  createdAt: string;
}

export interface MockDatabase {
  users: User[];
  likes: Like[];
  matches: Match[];
  conversations: Conversation[];
  reports: Report[];
  blockedUsers: BlockedUser[];
  mutedUsers: MutedUser[];
  subscriptions: Subscription[];
  tokenToUserId: Map<string, string>;
  bannedIdentifiers: {
    userIds: Set<string>;
    phoneNumbers: Set<string>;
    emails: Set<string>;
  };
}

const now = new Date().toISOString();

const photo = (id: string, uri: string) => ({ id, uri, isPrimary: true });

const currentUser: User = {
  id: "user-current",
  name: testAccount.name,
  email: "deniz@ehlibyte.app",
  phoneNumber: testAccount.phoneNumber,
  age: 30,
  city: "Istanbul",
  occupation: "Urun Tasarimcisi",
  bio: "Baglama dinlemeyi, uzun yuruyusleri ve iyi sohbeti severim.",
  hometown: "Tunceli",
  favoriteSong: "Yare Soyle",
  favoritePoet: "Asik Veysel",
  culturalIdentity: "alevi",
  cultureImportance: "important",
  interests: ["baglama", "turkish_folk_music", "art", "travel", "nature"],
  photos: [
    photo(
      "photo-current",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80",
    ),
  ],
  badges: ["community_member", "active_user"],
  isPremium: false,
  hasPassedEntryTest: false,
  hasCompletedOnboarding: false,
  createdAt: now,
  updatedAt: now,
};

const candidates: User[] = [
  {
    id: "user-zeynep",
    name: "Zeynep Arslan",
    email: "zeynep@example.com",
    age: 28,
    city: "Istanbul",
    occupation: "Mimar",
    bio: "Cem kulturune, edebiyata ve hafta sonu konserlerine vakit ayirmayi seviyorum.",
    hometown: "Tunceli",
    favoriteSong: "Yare Soyle",
    favoritePoet: "Asik Veysel",
    culturalIdentity: "alevi",
    cultureImportance: "very_important",
    interests: ["baglama", "folk_poets", "cem_culture", "literature", "travel"],
    photos: [
      photo(
        "photo-zeynep",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["verified_profile", "community_member"],
    isPremium: true,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user-cem",
    name: "Ajdar Anık",
    email: "ajdar@example.com",
    age: 52,
    city: "Ankara",
    occupation: "Muzisyen",
    bio: "Turk halk muzigi, sahne provalari ve deniz kenari sohbetleri.",
    hometown: "Sivas",
    favoriteSong: "Uzun Ince Bir Yoldayim",
    favoritePoet: "Asik Veysel",
    culturalIdentity: "close_to_alevi_culture",
    cultureImportance: "important",
    interests: ["turkish_folk_music", "folk_poets", "art", "sports", "nature"],
    photos: [
      photo(
        "photo-cem",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfI3M5CFmhoGPEdC6Eo-ICfZ5RO-9W_RvpKA&s",
      ),
    ],
    badges: ["active_user"],
    isPremium: false,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user-elif",
    name: "Elif Demir",
    email: "elif@example.com",
    age: 27,
    city: "Ankara",
    occupation: "Avukat",
    bio: "Dayanisma, doga gezileri ve guzel kitaplar etrafinda tanismayi severim.",
    hometown: "Malatya",
    favoriteSong: "Mihriban",
    favoritePoet: "Neset Ertas",
    culturalIdentity: "alevi",
    cultureImportance: "somewhat_important",
    interests: ["solidarity", "literature", "travel", "nature", "cem_culture"],
    photos: [
      photo(
        "photo-elif",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["community_member"],
    isPremium: false,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user-mert",
    name: "Mert Can",
    email: "mert@example.com",
    age: 34,
    city: "Istanbul",
    occupation: "Yazilimci",
    bio: "Sanat sergileri, halk ozanlari ve sakin kahve sohbetleri.",
    hometown: "Erzincan",
    favoriteSong: "Gesi Baglari",
    favoritePoet: "Pir Sultan Abdal",
    culturalIdentity: "prefer_not_to_say",
    cultureImportance: "important",
    interests: ["art", "folk_poets", "literature", "travel", "sports"],
    photos: [
      photo(
        "photo-mert",
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["verified_profile", "premium_member"],
    isPremium: true,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
];

const mertMatch: Match = {
  id: "match-mert",
  users: [currentUser, candidates[3] as User],
  compatibility: calculateCulturalMatchScore(
    currentUser,
    candidates[3] as User,
  ),
  createdAt: now,
  lastMessagePreview: "Selam Deniz, favori sergin hangisiydi?",
};

export const mockDatabase: MockDatabase = {
  users: [currentUser, ...candidates],
  likes: [
    {
      id: "like-zeynep-current",
      fromUserId: "user-zeynep",
      toUserId: "user-current",
      action: "like",
      createdAt: now,
    },
    {
      id: "like-cem-current",
      fromUserId: "user-cem",
      toUserId: "user-current",
      action: "super_like",
      createdAt: now,
    },
  ],
  matches: [mertMatch],
  conversations: [
    {
      id: "conversation-mert",
      participants: [currentUser, candidates[3] as User],
      messages: [
        {
          id: "message-1",
          conversationId: "conversation-mert",
          senderId: "user-mert",
          body: "Selam Deniz, favori sergin hangisiydi?",
          status: "read",
          createdAt: now,
        },
      ],
      unreadCount: 1,
      typingState: {
        conversationId: "conversation-mert",
        userId: "user-mert",
        isTyping: false,
        updatedAt: now,
      },
      updatedAt: now,
    },
  ],
  reports: [],
  blockedUsers: [],
  mutedUsers: [],
  subscriptions: [
    {
      id: "subscription-current",
      userId: "user-current",
      plan: "monthly",
      status: "inactive",
    },
  ],
  tokenToUserId: new Map([["demo-token", "user-current"]]),
  bannedIdentifiers: {
    userIds: new Set(),
    phoneNumbers: new Set(),
    emails: new Set(),
  },
};
