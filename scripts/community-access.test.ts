import test from "node:test";
import assert from "node:assert/strict";
import { CommunityAccessService } from "../src/features/community/access/CommunityAccessService";
import {
  canEnterCommunity,
  normalizeCommunityPhone,
  parseAccess,
  parseLegalDocuments,
  validateOnboarding,
} from "../src/features/community/access/contracts";

const userId = "9b9f74e8-4190-4dac-84b1-a41b62e65db6";
const anotherUser = "491d7396-d26d-4c49-a59e-7a76e6e71b15";
const access = {
  userId,
  eligible: true,
  profileCompleted: true,
  termsAccepted: true,
  displayName: "Deniz",
  city: "İstanbul",
};
const documents = ["terms", "privacy", "kvkk", "community_rules"].map(
  (kind) => ({
    kind,
    version: "2026-10-27",
    title: kind,
    body: "Test fixture document body.",
  }),
);
const input = {
  displayName: " Deniz ",
  birthDate: "1994-01-01",
  city: " İstanbul ",
  interests: ["Müzik", "Müzik"],
  termsVersion: "2026-10-27",
  communityRulesVersion: "2026-10-27",
};

function fixture(overrides: Record<string, any> = {}) {
  const calls: Array<{ name: string; payload?: unknown }> = [];
  const auth = {
    getSession: async () => ({
      data: { session: { access_token: "test-fixture" } },
      error: null,
    }),
    getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    signInWithOtp: async (payload: unknown) => {
      calls.push({ name: "otp", payload });
      return { error: null };
    },
    verifyOtp: async (payload: unknown) => {
      calls.push({ name: "verify", payload });
      return { data: { user: { id: userId }, session: {} }, error: null };
    },
    signOut: async () => ({ error: null }),
    ...overrides.auth,
  };
  const rpc =
    overrides.rpc ??
    (async (name: string, payload?: unknown) => {
      calls.push({ name, payload });
      return {
        data: name === "get_community_legal_documents" ? { documents } : access,
        error: null,
      };
    });
  return { api: new CommunityAccessService({ auth, rpc } as any), calls };
}

test("access requires all three server decisions and a verified matching UUID", () => {
  assert.equal(canEnterCommunity(parseAccess(access, userId)), true);
  for (const field of ["eligible", "profileCompleted", "termsAccepted"]) {
    assert.equal(
      canEnterCommunity(parseAccess({ ...access, [field]: false }, userId)),
      false,
    );
    assert.throws(() => parseAccess({ ...access, [field]: "true" }, userId));
    const missing = { ...access } as any;
    delete missing[field];
    assert.throws(() => parseAccess(missing, userId));
  }
  assert.throws(() => parseAccess(access, anotherUser), /eşleşmiyor/);
  assert.throws(() => parseAccess([access], userId));
});

test("legal bootstrap requires all four distinct, versioned documents", () => {
  assert.equal(parseLegalDocuments({ documents }).length, 4);
  assert.throws(() => parseLegalDocuments({ documents: documents.slice(1) }));
  assert.throws(() =>
    parseLegalDocuments({
      documents: [...documents.slice(0, 3), documents[0]],
    }),
  );
  assert.throws(() =>
    parseLegalDocuments({
      documents: documents.map((item) => ({ ...item, version: " " })),
    }),
  );
});

test("onboarding rejects invalid dates and underage people, handles the birthday boundary, trims and deduplicates", () => {
  for (const birthDate of [
    "",
    "2026-10-28",
    "2008-10-28",
    "2008-02-30",
    "1900-01-01",
  ])
    assert.throws(() =>
      validateOnboarding({ ...input, birthDate }, "2026-10-27"),
    );
  const valid = validateOnboarding(
    { ...input, birthDate: "2008-10-27" },
    "2026-10-27",
  );
  assert.equal(valid.displayName, "Deniz");
  assert.equal(valid.city, "İstanbul");
  assert.deepEqual(valid.interests, ["Müzik"]);
  assert.throws(() =>
    validateOnboarding({ ...input, termsVersion: "" }, "2026-10-27"),
  );
  assert.throws(() =>
    validateOnboarding({ ...input, communityRulesVersion: "" }, "2026-10-27"),
  );
});

test("phone normalization preserves country codes and rejects malformed input", () => {
  for (const phone of ["0555 111 22 33", "5551112233", "+90 (555) 111-22-33"])
    assert.equal(normalizeCommunityPhone(phone), "+905551112233");
  assert.equal(normalizeCommunityPhone("+49 151 23456789"), "+4915123456789");
  for (const phone of [
    "",
    "+0012345678",
    "555",
    "+90<script>",
    "+905551112233999999",
  ])
    assert.throws(() => normalizeCommunityPhone(phone));
});

test("a persisted session is insufficient when Auth rejects the identity; no access RPC runs", async () => {
  const { api, calls } = fixture({
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: { message: "expired" },
      }),
    },
  });
  await assert.rejects(api.restore(), /doğrulanamadı/);
  assert.deepEqual(calls, []);
});

test("no persisted session returns signed out, and an identity mismatch never grants access", async () => {
  const signedOut = fixture({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  });
  assert.equal(await signedOut.api.restore(), null);
  assert.deepEqual(signedOut.calls, []);
  const switched = fixture({
    rpc: async () => ({
      data: { ...access, userId: anotherUser },
      error: null,
    }),
  });
  await assert.rejects(switched.api.loadAccess(), /eşleşmiyor/);
});

test("login cannot create an account; registration first requires published legal documents", async () => {
  const { api, calls } = fixture();
  await api.requestCode("05551112233", "login");
  assert.deepEqual(calls[0], {
    name: "otp",
    payload: { phone: "+905551112233", options: { shouldCreateUser: false } },
  });
  calls.length = 0;
  await api.requestCode("05551112233", "register");
  assert.deepEqual(
    calls.map((item) => item.name),
    ["get_community_legal_documents", "otp"],
  );
  assert.equal((calls[1].payload as any).options.shouldCreateUser, true);
  const unavailable = fixture({
    rpc: async () => ({ data: null, error: { message: "missing RPC" } }),
  });
  await assert.rejects(
    unavailable.api.requestCode("05551112233", "register"),
    /yüklenemedi/,
  );
  assert.deepEqual(unavailable.calls, []);
});

test("OTP needs a real server session and then a verified identity/access result", async () => {
  const { api, calls } = fixture();
  await assert.rejects(api.verifyCode("05551112233", "123"));
  assert.deepEqual(calls, []);
  assert.deepEqual(await api.verifyCode("05551112233", "123456"), access);
  assert.deepEqual(
    calls.map((item) => item.name),
    ["verify", "get_my_community_access"],
  );
  const missingSession = fixture({
    auth: {
      verifyOtp: async () => ({
        data: { user: { id: userId }, session: null },
        error: null,
      }),
    },
  });
  await assert.rejects(
    missingSession.api.verifyCode("05551112233", "123456"),
    /doğrulanamadı/,
  );
});

test("onboarding rejects stale terms before writing and cannot submit identity/role flags", async () => {
  const { api, calls } = fixture();
  await assert.rejects(
    api.completeOnboarding({ ...input, termsVersion: "old" }),
    /güncellendi/,
  );
  assert.deepEqual(
    calls.map((item) => item.name),
    ["get_community_legal_documents"],
  );
  calls.length = 0;
  assert.deepEqual(await api.completeOnboarding(input), access);
  const mutation = calls.find(
    (item) => item.name === "complete_community_onboarding",
  )!;
  assert.deepEqual(mutation.payload, {
    display_name: "Deniz",
    birth_date: "1994-01-01",
    city: "İstanbul",
    interests: ["Müzik"],
    terms_version: "2026-10-27",
    community_rules_version: "2026-10-27",
  });
  for (const key of ["userId", "role", "eligible", "age", "acceptedAt"])
    assert.equal(key in (mutation.payload as object), false);
});

test("RPC, Auth and signout failures remain errors, never successful local fallbacks", async () => {
  const unavailable = fixture({
    rpc: async () => ({ data: null, error: { message: "network" } }),
  });
  await assert.rejects(unavailable.api.loadAccess(), /yüklenemedi/);
  const mutationFailure = fixture({
    rpc: async (name: string) =>
      name === "get_community_legal_documents"
        ? { data: { documents }, error: null }
        : { data: null, error: { message: "transaction rejected" } },
  });
  await assert.rejects(
    mutationFailure.api.completeOnboarding(input),
    /kaydedilemedi/,
  );
  const authFailure = fixture({
    auth: {
      signInWithOtp: async () => ({ error: { message: "provider disabled" } }),
      signOut: async () => ({ error: { message: "network" } }),
    },
  });
  await assert.rejects(
    authFailure.api.requestCode("05551112233", "login"),
    /gönderilemedi/,
  );
  await assert.rejects(authFailure.api.signOut(), /yapılamadı/);
});
