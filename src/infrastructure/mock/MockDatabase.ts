// Ilk surum deneyimini calistiran paylasimli mock veritabani.
import type { BlockedUser, Like, Match, Report } from "@/domain/entities/Match";
import type { Conversation } from "@/domain/entities/Message";
import type { Subscription } from "@/domain/entities/Subscription";
import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";

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
  fireWallets: Record<string, number>;
  tokenToUserId: Map<string, string>;
  bannedIdentifiers: {
    userIds: Set<string>;
    phoneNumbers: Set<string>;
    emails: Set<string>;
  };
}

const now = new Date().toISOString();
const activeBoostUntil = new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString();

const photo = (id: string, uri: string) => ({ id, uri, isPrimary: true });

const currentUser: User = {
  id: "user-current",
  name: "Deniz Kaya",
  email: "deniz@ehlibyte.app",
  phoneNumber: "+905559990011",
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
  profileKind: "member",
  isPremium: false,
  matchByLocation: false,
  matchRadiusKm: 50,
  locationLatitude: 41.0082,
  locationLongitude: 28.9784,
  locationUpdatedAt: now,
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
    profileKind: "member",
    isPremium: true,
    fireScore: 42,
    locationLatitude: 41.0422,
    locationLongitude: 29.0083,
    locationUpdatedAt: now,
    boostedUntil: activeBoostUntil,
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
    profileKind: "member",
    isPremium: false,
    locationLatitude: 39.9334,
    locationLongitude: 32.8597,
    locationUpdatedAt: now,
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
    profileKind: "member",
    isPremium: false,
    locationLatitude: 39.9208,
    locationLongitude: 32.8541,
    locationUpdatedAt: now,
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
    profileKind: "member",
    isPremium: true,
    locationLatitude: 40.9923,
    locationLongitude: 29.1244,
    locationUpdatedAt: now,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
];

const starterGuides: User[] = [
  {
    id: "user-guide-ece",
    name: "Ece Yalın",
    email: "ece.rehber@ehlibyte.app",
    age: 29,
    city: "İstanbul",
    occupation: "Kültür sanat editörü",
    bio: "Deyiş geceleri, kitaplar ve sakin yürüyüşler etrafında güzel bir sohbet kurmayı severim.",
    hometown: "Tunceli",
    favoriteSong: "Dostum Dostum",
    favoritePoet: "Pir Sultan Abdal",
    culturalIdentity: "alevi",
    cultureImportance: "important",
    interests: ["cem_culture", "turkish_folk_music", "solidarity", "literature"],
    photos: [
      photo(
        "photo-guide-ece",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["verified_profile", "community_member"],
    profileKind: "starter",
    isPremium: false,
    locationLatitude: 41.021,
    locationLongitude: 28.93,
    locationUpdatedAt: now,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user-guide-selin",
    name: "Selin Karaca",
    email: "selin.rehber@ehlibyte.app",
    age: 31,
    city: "İzmir",
    occupation: "Mimar",
    bio: "Bağlama dinlemeyi, sergi gezmeyi ve hafta sonu sahil yürüyüşlerini seviyorum.",
    hometown: "Sivas",
    favoriteSong: "Gesi Bağları",
    favoritePoet: "Aşık Veysel",
    culturalIdentity: "close_to_alevi_culture",
    cultureImportance: "important",
    interests: ["baglama", "folk_poets", "art", "travel"],
    photos: [
      photo(
        "photo-guide-selin",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["verified_profile", "community_member"],
    profileKind: "starter",
    isPremium: false,
    locationLatitude: 38.4237,
    locationLongitude: 27.1428,
    locationUpdatedAt: now,
    hasPassedEntryTest: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user-guide-murat",
    name: "Murat Aydın",
    email: "murat.rehber@ehlibyte.app",
    age: 34,
    city: "Ankara",
    occupation: "Müzik öğretmeni",
    bio: "Türk halk müziği, yol hikayeleri ve içten sohbetler benim tarafım. Kahveyi sade içerim.",
    hometown: "Erzincan",
    favoriteSong: "Uzun İnce Bir Yoldayım",
    favoritePoet: "Aşık Veysel",
    culturalIdentity: "alevi",
    cultureImportance: "very_important",
    interests: ["turkish_folk_music", "folk_poets", "cem_culture", "nature"],
    photos: [
      photo(
        "photo-guide-murat",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
      ),
    ],
    badges: ["verified_profile", "community_member"],
    profileKind: "starter",
    isPremium: false,
    locationLatitude: 39.9334,
    locationLongitude: 32.8597,
    locationUpdatedAt: now,
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

const starterGuideMatches: Match[] = starterGuides.map((guide) => ({
  id: `match-${guide.id}`,
  users: [currentUser, guide],
  compatibility: calculateCulturalMatchScore(currentUser, guide),
  createdAt: now,
  lastMessagePreview: "Hoş geldin. İlk sohbeti birlikte kolaylaştıralım.",
}));

export const mockDatabase: MockDatabase = {
  users: [currentUser, ...starterGuides, ...candidates],
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
  matches: [...starterGuideMatches, mertMatch],
  conversations: [
    ...starterGuides.map((guide) => ({
      id: `conversation-${guide.id}`,
      participants: [currentUser, guide] as [User, User],
      messages: [
        {
          id: `message-${guide.id}-welcome`,
          conversationId: `conversation-${guide.id}`,
          senderId: guide.id,
          body:
            guide.id === "user-guide-ece"
              ? "Merhaba, ben Ece. Ehlibyte karşılama rehberlerindenim; ilk sohbeti birlikte yumuşakça açabiliriz."
              : guide.id === "user-guide-selin"
                ? "Hoş geldin, ben Selin. Profil ve ilk sohbet başlangıcında eşlik ediyorum; bugün nasılsın?"
                : "Selam, ben Murat. İlk günlerde yol göstermek için buradayım; müzik mi sohbet mi daha çok ilgini çeker?",
          status: "read" as const,
          createdAt: now,
        },
      ],
      unreadCount: 1,
      typingState: {
        conversationId: `conversation-${guide.id}`,
        userId: guide.id,
        isTyping: false,
        updatedAt: now,
      },
      updatedAt: now,
    })),
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
  fireWallets: {
    "user-current": 100,
  },
  tokenToUserId: new Map([["demo-token", "user-current"]]),
  bannedIdentifiers: {
    userIds: new Set(),
    phoneNumbers: new Set(),
    emails: new Set(),
  },
};
