// Dependency injection container, ekranlarin somut veri kaynaklarina baglanma noktasidir.
import { ApiClient } from "@/infrastructure/api/ApiClient";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
import { env, validateRuntimeConfig } from "@/infrastructure/config/env";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/SupabaseAuthRepository";
import { SupabaseChatRepository } from "@/infrastructure/supabase/SupabaseChatRepository";
import { SupabaseMatchRepository } from "@/infrastructure/supabase/SupabaseMatchRepository";
import { RevenueCatPaymentService } from "@/features/premium/services/RevenueCatPaymentService";
import { SupabaseUserRepository } from "@/infrastructure/supabase/SupabaseUserRepository";
import { SupabaseModerationRepository } from "@/infrastructure/supabase/SupabaseModerationRepository";
import { SupabaseFeedRepository } from "@/infrastructure/supabase/SupabaseFeedRepository";
import { SupabaseLiveRoomRepository } from "@/infrastructure/supabase/SupabaseLiveRoomRepository";
import { ContentModerationService } from "@/features/moderation/services/ContentModerationService";
import { MockModerationRepository } from "@/features/moderation/services/MockModerationRepository";
import { MockAuthRepository } from "@/features/auth/services/MockAuthRepository";
import { MockChatRepository } from "@/features/chat/services/MockChatRepository";
import { MockMatchRepository } from "@/features/match/services/MockMatchRepository";
import { MockUserRepository } from "@/features/profile/services/MockUserRepository";
import { MockFeedRepository } from "@/features/feed/services/MockFeedRepository";
import { ApiLiveRoomRepository } from "@/features/live/services/ApiLiveRoomRepository";
import { MockLiveRoomRepository } from "@/features/live/services/MockLiveRoomRepository";

validateRuntimeConfig();

const apiClient = new ApiClient(env.apiBaseUrl);

const authRepository = env.useMockServices
  ? new MockAuthRepository()
  : new SupabaseAuthRepository();
const chatRepository = env.useMockServices
  ? new MockChatRepository()
  : new SupabaseChatRepository();
const matchRepository = env.useMockServices
  ? new MockMatchRepository()
  : new SupabaseMatchRepository();
const paymentService = new RevenueCatPaymentService();
const userRepository = env.useMockServices
  ? new MockUserRepository()
  : new SupabaseUserRepository();
const liveRoomRepository = env.useLiveApi
  ? new ApiLiveRoomRepository(apiClient)
  : env.useMockServices
    ? new MockLiveRoomRepository()
    : new SupabaseLiveRoomRepository();
const moderationRepository = env.useMockServices
  ? new MockModerationRepository()
  : new SupabaseModerationRepository();
const feedRepository = env.useMockServices
  ? new MockFeedRepository()
  : new SupabaseFeedRepository();

export const container = {
  apiClient,
  authRepository,
  chatRepository,
  matchRepository,
  paymentService,
  liveRoomRepository,
  tokenStorage: new SecureStorageService(),
  userRepository,
  moderationRepository,
  feedRepository,
  contentModerationService: new ContentModerationService(),
} as const;
