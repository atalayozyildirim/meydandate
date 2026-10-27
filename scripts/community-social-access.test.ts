import test from "node:test";
import assert from "node:assert/strict";
import { CommunityAccessService, VerifiedSessionAccessError } from "../src/features/community/access/CommunityAccessService";
import { SocialAuthCoordinator, type SocialAuthRuntime } from "../src/features/community/access/SocialAuthCoordinator";

const userId = "9b9f74e8-4190-4dac-84b1-a41b62e65db6";
const access = { userId, eligible: false, profileCompleted: false, termsAccepted: false, displayName: "", city: "" };
const redirect = "ehlibyte://auth/callback";

function fixture(options: { accessFailure?: boolean; oauthFailure?: boolean; exchangeFailure?: boolean } = {}) {
  const calls: any[] = [];
  let authenticated = false;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: authenticated ? {} : null }, error: null }),
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
      signInWithOAuth: async (payload: unknown) => { calls.push({ oauth: payload }); return { data: { url: options.oauthFailure ? null : "https://auth.example.invalid/authorize" }, error: options.oauthFailure ? {} : null }; },
      exchangeCodeForSession: async (code: string) => { calls.push({ exchange: code }); authenticated = !options.exchangeFailure; return { data: authenticated ? { user: { id: userId }, session: {} } : {}, error: options.exchangeFailure ? {} : null }; },
      signInWithIdToken: async (payload: unknown) => { calls.push({ apple: payload }); authenticated = true; return { data: { user: { id: userId }, session: {} }, error: null }; },
      updateUser: async (payload: unknown) => { calls.push({ metadata: payload }); return { error: null }; },
      signOut: async () => { authenticated = false; return { error: null }; },
    },
    rpc: async () => options.accessFailure ? { data: null, error: {} } : { data: access, error: null },
  };
  const runtime: SocialAuthRuntime = {
    platform: "ios", providerEnabled: async () => true, appleAvailable: async () => true,
    randomValue: () => "raw-random-value", hashNonce: async (nonce) => `hashed:${nonce}`,
    appleSignIn: async (nonce, state) => { calls.push({ nativeApple: { nonce, state } }); return { identityToken: "fixture-identity-token", state, fullName: "Deniz Yılmaz" }; },
    openAuthSession: async (url, target) => { calls.push({ browser: { url, target } }); return { type: "success", url: `${target}?code=fixture-code` }; },
  };
  const api = new CommunityAccessService(client as any);
  return { api, runtime, calls, options, coordinator: new SocialAuthCoordinator(api, runtime) };
}

test("Google uses OAuth PKCE and returns the server's onboarding decision", async () => {
  const { coordinator, calls } = fixture();
  assert.deepEqual(await coordinator.signIn("google", redirect), access);
  assert.deepEqual(calls[0], { oauth: { provider: "google", options: { redirectTo: redirect, skipBrowserRedirect: true } } });
  assert.deepEqual(calls[2], { exchange: "fixture-code" });
});

test("native Apple hashes the nonce sent to Apple and gives the original nonce to Supabase", async () => {
  const { coordinator, calls } = fixture();
  const result = await coordinator.signIn("apple", redirect);
  assert.equal(result?.eligible, false);
  assert.equal(result?.displayName, "Deniz Yılmaz");
  assert.deepEqual(calls[0], { nativeApple: { nonce: "hashed:raw-random-value", state: "raw-random-value" } });
  assert.deepEqual(calls[1], { apple: { provider: "apple", token: "fixture-identity-token", nonce: "raw-random-value" } });
  assert.equal(calls.some(call => call.oauth || call.browser), false);
  assert.deepEqual(calls[2], { metadata: { data: { full_name: "Deniz Yılmaz" } } });
});

test("Apple cancellation and browser cancellation do not create fake sessions", async () => {
  const apple = fixture();
  apple.runtime.appleSignIn = async () => { throw { code: "ERR_REQUEST_CANCELED" }; };
  assert.equal(await apple.coordinator.signIn("apple", redirect), null);
  assert.equal(await apple.api.restore(), null);
  const google = fixture();
  google.runtime.openAuthSession = async () => ({ type: "cancel" });
  assert.equal(await google.coordinator.signIn("google", redirect), null);
  assert.equal(google.calls.some(call => call.exchange), false);
});

test("an unavailable provider or missing native Apple support fails before authentication", async () => {
  const disabled = fixture();
  disabled.runtime.providerEnabled = async () => false;
  await assert.rejects(disabled.coordinator.signIn("google", redirect), /henüz kullanıma açılmadı/);
  assert.deepEqual(disabled.calls, []);
  const unsupported = fixture();
  unsupported.runtime.appleAvailable = async () => false;
  await assert.rejects(unsupported.coordinator.signIn("apple", redirect), /bu cihazda/);
  assert.deepEqual(unsupported.calls, []);
});

test("invalid Apple state and missing identity token never reach Supabase", async () => {
  for (const credential of [{ identityToken: "fixture", state: "wrong" }, { identityToken: null, state: "raw-random-value" }]) {
    const { runtime, coordinator, calls } = fixture();
    runtime.appleSignIn = async () => credential;
    await assert.rejects(coordinator.signIn("apple", redirect), /tamamlanamadı/);
    assert.deepEqual(calls, []);
  }
});

test("concurrent callback handling exchanges a one-time code once", async () => {
  const { api, calls } = fixture();
  const url = `${redirect}?code=one-time-code`;
  const results = await Promise.all([api.completeOAuthCallback(url, redirect), api.completeOAuthCallback(url, redirect)]);
  assert.equal(calls.filter(call => call.exchange).length, 1);
  assert.deepEqual(results, [access, access]);
});

test("foreign callbacks, provider error callbacks and missing codes cannot authenticate", async () => {
  const { api, calls } = fixture();
  for (const url of ["https://example.invalid/auth/callback?code=x", "ehlibyte://other?code=x", redirect, `${redirect}?error=access_denied`, `${redirect}?code=x&error=denied`])
    await assert.rejects(api.completeOAuthCallback(url, redirect));
  assert.deepEqual(calls, []);
});

test("an accepted social identity can recover an access outage without exchanging the code again", async () => {
  const { api, options, calls } = fixture({ accessFailure: true });
  await assert.rejects(api.completeOAuthCallback(`${redirect}?code=x`, redirect), VerifiedSessionAccessError);
  options.accessFailure = false;
  assert.deepEqual(await api.restore(), access);
  assert.equal(calls.length, 1);
});

test("Apple on other platforms uses the configured web OAuth flow", async () => {
  const { runtime, coordinator, calls } = fixture();
  runtime.platform = "android";
  assert.deepEqual(await coordinator.signIn("apple", redirect), access);
  assert.equal(calls[0].oauth.provider, "apple");
});

test("provider and token exchange errors remain failures", async () => {
  await assert.rejects(fixture({ oauthFailure: true }).coordinator.signIn("google", redirect), /kullanılamıyor/);
  const expired = fixture({ exchangeFailure: true });
  await assert.rejects(expired.api.completeOAuthCallback(`${redirect}?code=x`, redirect), /doğrulanamadı/);
  assert.equal(await expired.api.restore(), null);
});
