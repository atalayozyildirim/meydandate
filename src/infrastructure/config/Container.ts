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
import { SupabaseActivityRepository } from "@/infrastructure/supabase/SupabaseActivityRepository";
import { SupabaseCommunityRepository } from "@/infrastructure/supabase/SupabaseCommunityRepository";
import { SupabaseEventRepository } from "@/infrastructure/supabase/SupabaseEventRepository";
import { ContentModerationService } from "@/features/moderation/services/ContentModerationService";
import { ApiLiveRoomRepository } from "@/features/live/services/ApiLiveRoomRepository";

validateRuntimeConfig();

const apiClient = new ApiClient(env.apiBaseUrl);

const authRepository = new SupabaseAuthRepository();
const chatRepository = new SupabaseChatRepository();
const matchRepository = new SupabaseMatchRepository();
const paymentService = new RevenueCatPaymentService();
const userRepository = new SupabaseUserRepository();
const liveRoomRepository = env.useLiveApi
  ? new ApiLiveRoomRepository(apiClient)
  : new SupabaseLiveRoomRepository();
const moderationRepository = new SupabaseModerationRepository();
const feedRepository = new SupabaseFeedRepository();
const activityRepository = new SupabaseActivityRepository();
const communityRepository = new SupabaseCommunityRepository();
const eventRepository = new SupabaseEventRepository();

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
  activityRepository,
  communityRepository,
  eventRepository,
  contentModerationService: new ContentModerationService(),
} as const;
