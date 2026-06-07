// Mock kimlik dogrulama repository'si auth akisini backend olmadan calistirir.
import type {
  AuthRepository,
  AuthSession,
  OtpChallenge,
  SocialAuthProvider,
  VerifyOtpPayload,
} from "@/domain/repositories/AuthRepository";
import type { User } from "@/domain/entities/User";
import { createId } from "@/shared/utils/id";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";

const createToken = (userId: string) => `mock-token-${userId}-${Date.now()}`;

const findUserByEmail = (email: string) =>
  mockDatabase.users.find((user) => user.email.toLocaleLowerCase() === email.toLocaleLowerCase());

const findUserByPhone = (phoneNumber: string) =>
  mockDatabase.users.find((user) => user.phoneNumber === phoneNumber);

const banMessage =
  "Bu hesap kalıcı olarak banlandı. Aynı telefon veya e-posta ile tekrar giriş/kayıt yapılamaz.";

const assertUserIsAllowed = (user: User) => {
  const isBanned =
    mockDatabase.bannedIdentifiers.userIds.has(user.id) ||
    (user.phoneNumber ? mockDatabase.bannedIdentifiers.phoneNumbers.has(user.phoneNumber) : false) ||
    mockDatabase.bannedIdentifiers.emails.has(user.email.toLocaleLowerCase("tr-TR"));

  if (isBanned) {
    throw new Error(banMessage);
  }
};

const assertPhoneIsAllowed = (phoneNumber: string) => {
  if (mockDatabase.bannedIdentifiers.phoneNumbers.has(phoneNumber)) {
    throw new Error(banMessage);
  }
};

const createSession = (user: User): AuthSession => {
  assertUserIsAllowed(user);

  const accessToken = createToken(user.id);
  mockDatabase.tokenToUserId.set(accessToken, user.id);

  return { accessToken, user };
};

export class MockAuthRepository implements AuthRepository {
  private pendingChallenges = new Map<string, OtpChallenge>();

  async requestOtp(challenge: OtpChallenge): Promise<void> {
    assertPhoneIsAllowed(challenge.phoneNumber);
    const existingUser = findUserByPhone(challenge.phoneNumber);

    if (challenge.purpose === "login" && !existingUser) {
      throw new Error("Bu telefon numarasıyla kayıtlı hesap bulunamadı.");
    }

    if (challenge.purpose === "register" && existingUser) {
      throw new Error("Bu telefon numarası zaten kayıtlı.");
    }

    this.pendingChallenges.set(challenge.phoneNumber, challenge);
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    const challenge = this.pendingChallenges.get(payload.phoneNumber);

    if (!challenge || challenge.purpose !== payload.purpose) {
      throw new Error("Doğrulama isteği bulunamadı. Yeni kod isteyin.");
    }

    if (payload.token !== "123456") {
      throw new Error("Doğrulama kodu hatalı.");
    }

    let user = findUserByPhone(payload.phoneNumber);

    if (payload.purpose === "register") {
      const timestamp = new Date().toISOString();
      const email = `${payload.phoneNumber.replace(/\D/g, "")}@phone.ehlibyte.local`;

      if (mockDatabase.bannedIdentifiers.emails.has(email.toLocaleLowerCase("tr-TR"))) {
        throw new Error(banMessage);
      }

      user = {
        id: createId("user"),
        name: payload.name ?? "Yeni Üye",
        email,
        phoneNumber: payload.phoneNumber,
        age: 18,
        city: "",
        bio: "",
        culturalIdentity: "prefer_not_to_say",
        cultureImportance: "somewhat_important",
        interests: [],
        photos: [],
        badges: ["community_member"],
        isPremium: false,
        hasPassedEntryTest: false,
        hasCompletedOnboarding: false,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      mockDatabase.users.push(user);
    }

    if (!user) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    this.pendingChallenges.delete(payload.phoneNumber);
    return createSession(user);
  }

  async signInWithProvider(provider: SocialAuthProvider): Promise<AuthSession> {
    const user = findUserByEmail(`${provider}@ehlibyte.local`) ?? mockDatabase.users[0];

    if (!user) {
      throw new Error("Sosyal giris demo kullanicisi bulunamadi.");
    }

    return createSession(user);
  }

  async completeOAuthCallback(_callbackUrl: string): Promise<AuthSession> {
    const user = mockDatabase.users[0];

    if (!user) {
      throw new Error("Sosyal giriş demo kullanıcısı bulunamadı.");
    }

    return createSession(user);
  }

  async restoreSession(token: string, _refreshToken?: string): Promise<AuthSession | null> {
    const userId = mockDatabase.tokenToUserId.get(token);
    const user = mockDatabase.users.find((candidate) => candidate.id === userId);

    if (user) {
      try {
        assertUserIsAllowed(user);
      } catch {
        mockDatabase.tokenToUserId.delete(token);
        return null;
      }
    }

    return user ? { accessToken: token, user } : null;
  }

  async forgotPassword(_email: string): Promise<void> {
    return Promise.resolve();
  }

  async logout(token: string): Promise<void> {
    mockDatabase.tokenToUserId.delete(token);
  }
}
