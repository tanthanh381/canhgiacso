import type { Page, Route } from "@playwright/test";

// Giả lập Supabase cho các kiểm thử vòng đời tài khoản. Không bao giờ gọi Supabase thật: mọi
// yêu cầu tới dự án Supabase được chặn và trả bằng dữ liệu giả lập đúng hợp đồng phản hồi.

const SUPABASE_ORIGIN = "https://goietwyapiywrtibpkwo.supabase.co";
const STORAGE_KEY = "sb-goietwyapiywrtibpkwo-auth-token";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-expose-headers": "*",
};

export const TEST_ACCOUNT = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "hoc.vien@example.test",
  username: "hoc_vien",
  displayName: "Học Viên Thử",
};

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// JWT giả (chữ ký vô nghĩa): thư viện chỉ cần đọc được phần payload, không kiểm chữ ký ở trình duyệt.
function fakeAccessToken(expiresAt: number) {
  const payload = {
    sub: TEST_ACCOUNT.id,
    email: TEST_ACCOUNT.email,
    role: "authenticated",
    aal: "aal1",
    session_id: "22222222-2222-4222-8222-222222222222",
    iat: expiresAt - 3600,
    exp: expiresAt,
  };
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(payload)}.signature`;
}

function sessionBody() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: fakeAccessToken(expiresAt),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "fake-refresh-token",
    user: {
      id: TEST_ACCOUNT.id,
      aud: "authenticated",
      role: "authenticated",
      email: TEST_ACCOUNT.email,
      email_confirmed_at: "2026-10-01T00:00:00Z",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-10-01T00:00:00Z",
    },
  };
}

export function json(route: Route, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

export function preflight(route: Route) {
  return route.fulfill({ status: 204, headers: CORS_HEADERS });
}

/** Đặt sẵn phiên đăng nhập trong localStorage để trang khởi động ở trạng thái đã đăng nhập. */
export function seedLoggedInSession(page: Page) {
  const session = sessionBody();
  return page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage bị chặn */
      }
    },
    [STORAGE_KEY, JSON.stringify(session)] as const,
  );
}

export type AccountMockLog = {
  deleteBodies: unknown[];
  passwordGrants: number;
  logoutCalls: number;
};

/**
 * Giả lập các endpoint tài khoản đủ để trang tải được hồ sơ đã đăng nhập, đăng nhập lại bằng mật
 * khẩu (tạo ứng dụng khách xác thực lại) và gọi RPC delete_my_account.
 */
export async function mockAccountBackend(
  page: Page,
  options: { deleteResponse?: { status: number; body: unknown }; passwordGrant?: { status: number; body: unknown } } = {},
): Promise<AccountMockLog> {
  const log: AccountMockLog = { deleteBodies: [], passwordGrants: 0, logoutCalls: 0 };
  const deleteResponse = options.deleteResponse ?? { status: 200, body: { deleted: true } };

  await page.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return preflight(route);

    if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "password") {
        log.passwordGrants += 1;
        if (options.passwordGrant) return json(route, options.passwordGrant.status, options.passwordGrant.body);
      }
      return json(route, 200, sessionBody());
    }
    if (url.pathname === "/auth/v1/logout") {
      log.logoutCalls += 1;
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (url.pathname === "/auth/v1/user") return json(route, 200, sessionBody().user);
    if (url.pathname === "/rest/v1/profiles") {
      return json(route, 200, { username: TEST_ACCOUNT.username, display_name: TEST_ACCOUNT.displayName, created_at: "2026-10-01T00:00:00Z" });
    }
    if (url.pathname === "/rest/v1/rpc/get_game_state") {
      return json(route, 200, {
        run_id: "33333333-3333-4333-8333-333333333333",
        balance: 300_000_000,
        awareness: 100,
        results: [],
        history: [],
      });
    }
    if (url.pathname === "/rest/v1/rpc/get_my_training_certificates") return json(route, 200, []);
    if (url.pathname === "/rest/v1/rpc/get_content_management_role") return json(route, 200, "none");
    if (url.pathname === "/rest/v1/rpc/get_public_site_content") return route.abort();
    if (url.pathname === "/rest/v1/rpc/export_my_data") {
      return json(route, 200, {
        exportVersion: 1,
        profile: { username: TEST_ACCOUNT.username, display_name: TEST_ACCOUNT.displayName },
        runs: [],
        certificates: [],
      });
    }
    if (url.pathname === "/rest/v1/rpc/delete_my_account") {
      log.deleteBodies.push(request.postDataJSON());
      return json(route, deleteResponse.status, deleteResponse.body);
    }
    return json(route, 404, { message: `Không có giả lập cho ${url.pathname}` });
  });

  return log;
}
