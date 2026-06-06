// Dependency injection container, ekranlarin somut veri kaynaklarina baglanma noktasidir.
import { ApiClient } from "@/infrastructure/api/ApiClient";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
import { env } from "@/infrastructure/config/env";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/SupabaseAuthRepository";
import { SupabaseChatRepository } from "@/infrastructure/supabase/SupabaseChatRepository";
import { SupabaseMatchRepository } from "@/infrastructure/supabase/SupabaseMatchRepository";
import { RevenueCatPaymentService } from "@/features/premium/services/RevenueCatPaymentService";
import { SupabaseUserRepository } from "@/infrastructure/supabase/SupabaseUserRepository";
import { SupabaseModerationRepository } from "@/infrastructure/supabase/SupabaseModerationRepository";
import { ContentModerationService } from "@/features/moderation/services/ContentModerationService";
import { MockModerationRepository } from "@/features/moderation/services/MockModerationRepository";
import { MockAuthRepository } from "@/features/auth/services/MockAuthRepository";
import { MockChatRepository } from "@/features/chat/services/MockChatRepository";
import { MockMatchRepository } from "@/features/match/services/MockMatchRepository";
import { MockPaymentService } from "@/features/premium/services/MockPaymentService";
import { MockUserRepository } from "@/features/profile/services/MockUserRepository";
import { MockFeedRepository } from "@/features/feed/services/MockFeedRepository";
import { ApiLiveRoomRepository } from "@/features/live/services/ApiLiveRoomRepository";
import { MockLiveRoomRepository } from "@/features/live/services/MockLiveRoomRepository";

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
const paymentService = env.useMockServices
  ? new MockPaymentService()
  : new RevenueCatPaymentService();
const userRepository = env.useMockServices
  ? new MockUserRepository()
  : new SupabaseUserRepository();
const liveRoomRepository = env.useLiveApi
  ? new ApiLiveRoomRepository(apiClient)
  : new MockLiveRoomRepository();
const moderationRepository = env.useMockServices
  ? new MockModerationRepository()
  : new SupabaseModerationRepository();
const feedRepository = new MockFeedRepository();

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
