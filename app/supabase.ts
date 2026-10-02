import { createClient, type Session } from "@supabase/supabase-js";
import { parseAuthRedirect, sanitizeAuthRedirectUrl, type AuthRedirectState } from "./domains/auth/model";

// This is a browser-safe Supabase publishable key. Authorization is enforced
// by Postgres Row Level Security; no secret/service-role key is shipped here.
const SUPABASE_URL = "https://goietwyapiywrtibpkwo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4";

// Phải đọc TRƯỚC createClient: thư viện xóa token khỏi hash sau khi nhận phiên, còn giao diện chỉ
// được dựng sau SessionBootstrap nên sự kiện PASSWORD_RECOVERY có thể đã phát trước khi có ai nghe.
// Chỉ lưu LOẠI sự kiện (đặt lại mật khẩu / liên kết hết hạn), không lưu token.
export const initialAuthRedirect: AuthRedirectState = typeof window === "undefined"
  ? { kind: "none" }
  : parseAuthRedirect(window.location.hash, window.location.search);

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Thư viện không xóa hash lỗi (#error=access_denied&error_code=otp_expired…) và chỉ đặt hash rỗng
// sau khi nhận token. Dọn cả hai để token / mã lỗi không nằm lại trong thanh địa chỉ, lịch sử
// trình duyệt hay công cụ đo lường.
if (typeof window !== "undefined" && initialAuthRedirect.kind !== "none") {
  void client.auth.initialize().then(() => {
    try {
      window.history.replaceState(window.history.state, "", sanitizeAuthRedirectUrl(window.location.href));
    } catch {
      // Trình duyệt không cho thay đổi lịch sử: bỏ qua.
    }
  });
}

const guestMemoryStorage = new Map<string, string>();

// A distinct storage key keeps this client from sharing the account session's
// GoTrue storage slot (which triggers "Multiple GoTrueClient instances").
const guestClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: "cgs-guest-isolated",
    storage: {
      getItem: (key) => guestMemoryStorage.get(key) ?? null,
      setItem: (key, value) => { guestMemoryStorage.set(key, value); },
      removeItem: (key) => { guestMemoryStorage.delete(key); },
    },
  },
});

// Ứng dụng khách dùng một lần cho thao tác nhạy cảm cần đăng nhập lại bằng mật khẩu (xóa tài khoản).
// Phiên của nó nằm trong bộ nhớ, tách khỏi phiên đang dùng nên không làm đổi phiên của người dùng.
export function createReauthClient() {
  const memory = new Map<string, string>();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: "cgs-reauth-isolated",
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => { memory.set(key, value); },
        removeItem: (key) => { memory.delete(key); },
      },
    },
  });
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

async function stabilizeSession(session: Session) {
  // A successful password exchange can emit SIGNED_IN immediately before
  // account Data API calls start. Verify that Auth can resolve the new JWT
  // before the UI asks PostgREST for profile/progress data.
  for (const pause of [0, 120, 320] as const) {
    if (pause) await delay(pause);
    const userResult = await client.auth.getUser();
    if (!userResult.error && userResult.data.user?.id === session.user.id) {
      return { session, user: userResult.data.user };
    }
  }

  // One explicit refresh handles a just-rotated/stale browser token without
  // weakening RLS or falling back to an unverified local session.
  const refreshResult = await client.auth.refreshSession(session);
  if (!refreshResult.error && refreshResult.data.session && refreshResult.data.user) {
    return { session: refreshResult.data.session, user: refreshResult.data.user };
  }

  return null;
}

const originalSignInWithPassword = client.auth.signInWithPassword.bind(client.auth);
client.auth.signInWithPassword = (async (...args: Parameters<typeof originalSignInWithPassword>) => {
  const result = await originalSignInWithPassword(...args);
  if (result.error || !result.data.session) return result;

  const stable = await stabilizeSession(result.data.session);
  if (!stable) {
    await client.auth.signOut({ scope: "local" });
    throw new Error("Authenticated session could not be verified");
  }

  return { data: stable, error: null };
}) as typeof client.auth.signInWithPassword;

const originalSignUp = client.auth.signUp.bind(client.auth);
client.auth.signUp = (async (...args: Parameters<typeof originalSignUp>) => {
  const result = await originalSignUp(...args);
  if (result.error || !result.data.session) return result;

  const stable = await stabilizeSession(result.data.session);
  if (!stable) {
    await client.auth.signOut({ scope: "local" });
    throw new Error("Registered session could not be verified");
  }

  return { data: stable, error: null };
}) as typeof client.auth.signUp;

// Supabase may emit SIGNED_IN before the promise returned by signIn/signUp has
// completed the verification above. Defer only that event briefly so Home's
// account loader cannot race the verified login path. Other auth events keep
// their normal timing.
const originalOnAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
client.auth.onAuthStateChange = ((callback: Parameters<typeof originalOnAuthStateChange>[0]) =>
  originalOnAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      window.setTimeout(() => callback(event, session), 450);
      return;
    }
    callback(event, session);
  })) as typeof client.auth.onAuthStateChange;

export const supabase = client;
export const guestSupabase = guestClient;
