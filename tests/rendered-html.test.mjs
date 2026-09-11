import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the Cảnh Giác Số experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Cảnh Giác Số: Nhận diện lừa đảo trực tuyến/);
  assert.match(html, /HDBANK · IT SECURITY/);
  assert.match(html, /THƯ VIỆN TÌNH HUỐNG/);
  assert.match(html, /Cuộc gọi ‘điều tra khẩn cấp’/);
  assert.match(html, /Mô phỏng/);
  assert.match(html, /Đăng nhập/);
  assert.match(html, /Đăng ký/);
  assert.match(html, /Đang tham gia với tư cách khách/);
  assert.match(html, />Dashboard</);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships product metadata and social artwork", async () => {
  const [layout, page, admin, data, schema, contentRoles, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/content_roles.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /Cảnh Giác Số: Nhận diện lừa đảo trực tuyến/);
  assert.match(layout, /lang="vi"/);
  assert.match(page, /localStorage/);
  assert.match(page, /CẢNH GIÁC SỐ/);
  assert.match(page, /FooterNotice/);
  assert.match(page, /footer-warning/);
  assert.match(page, /split\(\/\\n\+\//);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /role="status"/);
  assert.match(page, /readStoredProgress/);
  assert.match(page, /supabase\.auth\.signUp/);
  assert.match(page, /data: \{ username, display_name: displayName \}/);
  assert.match(page, /USERNAME_PATTERN/);
  assert.match(page, /PASSWORD_PATTERN/);
  assert.match(page, /Mật khẩu cần 8–72 ký tự/);
  assert.match(page, /supabase\.auth\.signInWithPassword/);
  assert.match(page, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(page, /continueAsGuest/);
  assert.match(page, /Tiếp tục với tư cách khách/);
  assert.match(page, /supabase\.rpc\("submit_game_choice"/);
  assert.match(page, /supabase\.rpc\("get_game_state"/);
  assert.match(page, /get_ciso_dashboard/);
  assert.match(page, /DefenseBadge/);
  assert.match(page, /Chuyên gia Cảnh Giác Số/);
  assert.match(page, /achievement-progress/);
  assert.match(page, /defenseBadges\.length/);
  assert.match(page, /Đăng xuất/);
  assert.match(page, /Tài sản vừa bị tổn thất/);
  assert.match(page, /Đã hiểu hậu quả/);
  assert.match(page, /khien-so-progress:\$\{username/);
  assert.match(page, /resetAuthForm/);
  assert.match(page, /loadRemoteAccount/);
  assert.match(page, /exportCisoReport/);
  assert.match(data, /Dashboard rủi ro nhận thức/);
  assert.match(page, /Môi trường mô phỏng/);
  assert.match(page, /Phân loại sử dụng nội bộ/);
  assert.match(page, /156 hoặc 5656/);
  assert.match(admin, /Kiểm soát trước khi xuất bản/);
  assert.match(data, /Website được quản lý và vận hành bởi: IT Security Team - HDBank/);
  assert.match(data, /nâng cao nhận thức cộng đồng về phòng chống tội phạm lừa đảo trực tuyến/);
  assert.match(page, /get_public_site_content/);
  assert.match(page, /#\/admin/);
  assert.match(page, /AdminPage/);
  assert.match(admin, /Lưu bản nháp/);
  assert.match(admin, /Xuất bản/);
  assert.match(admin, /main-draft/);
  assert.match(admin, /get_content_management_access/);
  assert.match(admin, /set_content_manager_role/);
  assert.match(admin, /Biên tập viên chỉ có thể lưu bản nháp/);
  assert.match(admin, /Phân quyền/);
  assert.match(admin, /grantRoleByIdentity/);
  assert.match(admin, /Email hoặc tên đăng nhập/);
  assert.match(admin, /Cấp quyền/);
  assert.match(admin, /Người dùng cần đăng ký và xác nhận email/);
  assert.match(data, /normalizeSiteContent/);
  assert.doesNotMatch(data.slice(data.indexOf("const scenarioDefinitions"), data.indexOf("export const scenarios")), /correct:\s*(?:true|false)|moneyDelta:|awarenessDelta:|feedback:/);
  const scenarioIds = [...data.matchAll(/\bid:\s*(\d+),/g)].map((match) => Number(match[1]));
  assert.equal(new Set(scenarioIds).size, 42);
  assert.equal(Math.max(...scenarioIds), 42);
  assert.match(page, /Thợ săn xu hướng mới/);
  assert.match(schema, /alter table public\.site_content enable row level security/);
  assert.match(schema, /site_content_public_read/);
  assert.match(schema, /private\.user_is_app_admin/);
  assert.match(schema, /auth\.sessions session_row/);
  assert.match(schema, /auth\.jwt\(\) ->> 'session_id'/);
  assert.match(schema, /if not \(select private\.user_is_app_admin\(\)\)/);
  assert.match(schema, /private\.app_editors/);
  assert.match(schema, /private\.user_can_edit_content/);
  assert.match(schema, /public\.get_content_management_access/);
  assert.match(schema, /public\.set_content_manager_role/);
  assert.match(contentRoles, /not published or \(select private\.user_is_app_admin\(\)\)/);
  assert.match(contentRoles, /Administrators cannot change their own role/);
  assert.match(schema, /username ~ '\^\[a-z0-9\._-\]\{3,24\}\$'/);
  assert.doesNotMatch(page, /PBKDF2|khien-so-accounts|khien-so-session/);
  assert.doesNotMatch(page, /HỖ TRỢ KHẨN CẤP|Liên hệ HDBank 1900 6060/);
  assert.doesNotMatch(data, /Tài khoản và kết quả được bảo vệ trên Supabase/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/khien-so-logo.png", import.meta.url));
  await assert.rejects(access(new URL("../public/favicon.svg", import.meta.url)));
  await assert.rejects(access(new URL("../public/hdbank-logo.png", import.meta.url)));
  await assert.rejects(access(new URL("../public/favicon.png", import.meta.url)));
  assert.match(page, /function BrandMark/);
  assert.match(styles, /khien-so-logo\.png/);
  assert.doesNotMatch(styles, /khien-logo-shield|khien-logo-signal/);
  assert.doesNotMatch(page, /hdbank-logo\.png|alt="HDBank"|className="hdbank-logo"/);
  assert.match(styles, /\.app \{[^}]*color: var\(--ink\)/);
  assert.match(styles, /\.app\.dark \{[^}]*color-scheme: dark/);
  await assert.rejects(access(new URL("../app/_sites-preview", root)));
});
