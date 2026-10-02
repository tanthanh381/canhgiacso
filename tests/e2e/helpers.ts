import type { Page, Route } from "@playwright/test";

// Chế độ khách chấm điểm trên máy chủ (RPC evaluate_guest_choice): dữ liệu công khai của trình duyệt
// không còn đáp án. Kiểm thử giả lập đúng hợp đồng phản hồi của RPC để không phụ thuộc Supabase thật.
export function mockGuestScoring(page: Page) {
  return page.route("**/rest/v1/rpc/evaluate_guest_choice", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "POST, OPTIONS",
        },
      });
    }
    const request = route.request().postDataJSON() as { scenario_id: number; choice_index: number };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        scenarioId: request.scenario_id,
        choiceIndex: request.choice_index,
        correct: true,
        moneyDelta: 0,
        awarenessDelta: 5,
        feedback: "Phản hồi giả lập từ máy chủ.",
      }),
    });
  });
}

// Banner đồng ý cookie là lớp cố định ở đáy màn hình; lưu trước lựa chọn "từ chối" để nó không che thao tác kiểm thử.
export function rejectConsentUpfront(page: Page) {
  return page.addInitScript(() => {
    try {
      window.localStorage.setItem("cgs-consent-v1", JSON.stringify({ analytics: false, ts: Date.now(), v: 1 }));
    } catch {
      /* storage bị chặn */
    }
  });
}

const SUPABASE_ORIGIN = "https://goietwyapiywrtibpkwo.supabase.co";
const SESSION_STORAGE_KEY = "sb-goietwyapiywrtibpkwo-auth-token";

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: "00000000-0000-4000-8000-0000000000aa",
    aud: "authenticated",
    role: "authenticated",
    email: "qc@example.test",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const claims = {
    sub: user.id, aud: "authenticated", role: "authenticated", aal: "aal2", amr: [{ method: "password", timestamp: now }],
    session_id: "00000000-0000-4000-8000-0000000000bb", exp: 4102444800, iat: now, email: user.email,
  };
  const token = `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.e2eSignatureAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
  return { access_token: token, refresh_token: "e2e-refresh", token_type: "bearer", expires_in: 3600 * 24 * 365, expires_at: 4102444800, user };
}

// Đăng nhập giả lập: đặt phiên Supabase vào localStorage và trả lời các lệnh gọi xác thực / RPC mà ứng dụng thực hiện khi có tài khoản.
// Thay cho việc chèn nút vào DOM: giao diện phải tự dựng menu quản lý từ trạng thái tài khoản và vai trò.
export async function mockSignedInSession(page: Page, role: "admin" | "editor" | "member" = "member") {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, PATCH, OPTIONS" };
  const reply = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(body) });
  await page.addInitScript(([key, value]) => {
    try { window.localStorage.setItem(key, value); } catch { /* storage bị chặn */ }
  }, [SESSION_STORAGE_KEY, JSON.stringify(fakeSession())]);
  await page.route(`${SUPABASE_ORIGIN}/**`, (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/rpc/get_public_site_content")) return route.abort();
    if (path.endsWith("/auth/v1/user")) return reply(route, fakeSession().user);
    if (path.includes("/auth/v1/token")) return reply(route, fakeSession());
    if (path.endsWith("/rest/v1/profiles")) {
      const row = { username: "qc", display_name: "QC Tester", created_at: "2026-01-01T00:00:00Z" };
      return reply(route, (request.headers()["accept"] ?? "").includes("pgrst.object") ? row : [row]);
    }
    if (path.endsWith("/rpc/get_game_state")) return reply(route, { run_id: "run-e2e", balance: 300000000, awareness: 100, results: [], history: [] });
    if (path.endsWith("/rpc/get_my_training_certificates")) return reply(route, []);
    if (path.endsWith("/rpc/get_content_management_role")) return reply(route, role === "member" ? null : role);
    return reply(route, []);
  });
}
