import { expect, test, type Page } from "@playwright/test";
import { TEST_ACCOUNT, json, mockAccountBackend, preflight, seedLoggedInSession } from "./account-mocks";
import { mockGuestScoring, rejectConsentUpfront } from "./helpers";

// Vòng đời tài khoản và xác minh chứng nhận. Toàn bộ Supabase được giả lập; không có yêu cầu nào
// tới dịch vụ thật.

const NEUTRAL = "Nếu địa chỉ email này có tài khoản";

async function dismissGuestNotice(page: Page) {
  const guestModal = page.locator(".guest-limit-modal");
  if (await guestModal.isVisible().catch(() => false)) {
    await guestModal.getByRole("button", { name: "Tiếp tục với tư cách khách" }).click();
    await expect(guestModal).toBeHidden();
  }
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ page }) => {
  await rejectConsentUpfront(page);
});

test.describe("quên mật khẩu", () => {
  async function openForgotForm(page: Page) {
    await page.route("**/rest/v1/rpc/get_public_site_content", (route) => route.abort());
    await mockGuestScoring(page);
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    await dismissGuestNotice(page);
    await page.locator("header").getByRole("button", { name: "Đăng nhập", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Quên mật khẩu?" }).click();
    await expect(dialog.getByRole("heading", { name: "Quên mật khẩu" })).toBeVisible();
    return dialog;
  }

  test("trả lời giống hệt nhau dù email có tài khoản hay không, và khóa nút trong thời gian chờ", async ({ page }) => {
    const bodies: Array<Record<string, unknown>> = [];
    let respondUnknown = false;
    await page.route("**/auth/v1/recover*", (route) => {
      if (route.request().method() === "OPTIONS") return preflight(route);
      bodies.push(route.request().postDataJSON());
      // Supabase thật trả {} cho cả email lạ; kiểm tra thêm nhánh lỗi 4xx để chắc chắn giao diện không phân biệt.
      return respondUnknown
        ? json(route, 400, { code: "user_not_found", msg: "User not found" })
        : json(route, 200, {});
    });

    const dialog = await openForgotForm(page);
    const email = dialog.getByLabel("Email");
    const submit = dialog.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu" });

    await email.fill("co.tai.khoan@example.test");
    await submit.click();
    const notice = dialog.getByRole("status");
    await expect(notice).toContainText(NEUTRAL);
    const knownText = (await notice.textContent()) ?? "";
    await expect(dialog.getByRole("button", { name: /Gửi lại sau \d+ giây/ })).toBeDisabled();

    // Cùng một địa chỉ gửi lại sau khi tải lại trang với phản hồi "không tìm thấy" phải ra thông điệp y hệt.
    respondUnknown = true;
    await page.reload();
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    await dismissGuestNotice(page);
    await page.locator("header").getByRole("button", { name: "Đăng nhập", exact: true }).click();
    const again = page.getByRole("dialog");
    await again.getByRole("button", { name: "Quên mật khẩu?" }).click();
    await again.getByLabel("Email").fill("khong.ton.tai@example.test");
    await again.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu" }).click();
    await expect(again.getByRole("status")).toHaveText(knownText);
    await expect(again.getByRole("alert")).toHaveCount(0);

    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toMatchObject({ email: "co.tai.khoan@example.test" });
    expect(bodies[1]).toMatchObject({ email: "khong.ton.tai@example.test" });
  });

  test("email không hợp lệ bị chặn ở trình duyệt và không gọi máy chủ", async ({ page }) => {
    let calls = 0;
    await page.route("**/auth/v1/recover*", (route) => {
      calls += 1;
      return json(route, 200, {});
    });
    const dialog = await openForgotForm(page);
    await dialog.getByLabel("Email").fill("khong-phai-email");
    await dialog.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("status")).toHaveCount(0);
    expect(calls).toBe(0);
  });

  test("lỗi hạ tầng được báo để thử lại, không hiện thông điệp trung tính và không bắt chờ", async ({ page }) => {
    await page.route("**/auth/v1/recover*", (route) =>
      route.request().method() === "OPTIONS" ? preflight(route) : json(route, 503, { msg: "unavailable" }),
    );
    const dialog = await openForgotForm(page);
    await dialog.getByLabel("Email").fill("nguoi.dung@example.test");
    const submit = dialog.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu" });
    await submit.click();
    await expect(dialog.getByRole("alert")).toContainText("Chưa gửi được yêu cầu");
    await expect(dialog.getByRole("status")).toHaveCount(0);
    await expect(submit).toBeEnabled();
  });

  test("nút quay lại đưa về biểu mẫu đăng nhập", async ({ page }) => {
    const dialog = await openForgotForm(page);
    await dialog.getByRole("button", { name: "Quay lại đăng nhập" }).click();
    await expect(dialog.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Quên mật khẩu?" })).toBeVisible();
  });
});

test.describe("liên kết khôi phục trong email", () => {
  test("liên kết hết hạn hiện thông báo và dọn mã lỗi khỏi thanh địa chỉ", async ({ page }) => {
    await page.route("**/rest/v1/rpc/get_public_site_content", (route) => route.abort());
    await page.goto("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    const dialog = page.getByRole("dialog", { name: "Không mở được liên kết" });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByRole("alert")).toContainText("hết hạn");
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    expect(page.url()).not.toContain("otp_expired");

    await dialog.getByRole("button", { name: "Nhận liên kết mới" }).click();
    const forgot = page.getByRole("dialog");
    await expect(forgot.getByRole("heading", { name: "Quên mật khẩu" })).toBeVisible();
  });

  test("liên kết hợp lệ mở form đặt mật khẩu mới, kiểm tra mật khẩu và không để token trên URL", async ({ page }) => {
    const updates: Array<Record<string, unknown>> = [];
    const log = await mockAccountBackend(page);
    await page.route("**/auth/v1/user", (route) => {
      if (route.request().method() === "OPTIONS") return preflight(route);
      if (route.request().method() === "PUT") {
        updates.push(route.request().postDataJSON());
        return json(route, 200, { id: TEST_ACCOUNT.id, email: TEST_ACCOUNT.email });
      }
      return json(route, 200, { id: TEST_ACCOUNT.id, email: TEST_ACCOUNT.email });
    });
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ sub: TEST_ACCOUNT.id, email: TEST_ACCOUNT.email, role: "authenticated", aal: "aal1", exp: expiresAt })).toString("base64url");
    const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${payload}.sig`;

    await page.goto(`/#access_token=${token}&expires_in=3600&expires_at=${expiresAt}&refresh_token=fake-refresh&token_type=bearer&type=recovery`);
    const dialog = page.locator('[role="dialog"][aria-labelledby="password-recovery-title"]');
    await expect(dialog.getByRole("heading", { name: "Đặt mật khẩu mới" })).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    expect(page.url()).not.toContain("access_token");

    // Hộp thoại này không đóng bằng Esc: phiên khôi phục là phiên đăng nhập thật.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    const newPassword = dialog.getByLabel("Mật khẩu mới", { exact: true });
    const confirm = dialog.getByLabel("Xác nhận mật khẩu mới");
    await newPassword.fill("ngan");
    await confirm.fill("ngan");
    await dialog.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(updates).toHaveLength(0);

    await newPassword.fill("MatKhau#Moi2026");
    await confirm.fill("MatKhau#Khac2026");
    await dialog.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(updates).toHaveLength(0);

    await confirm.fill("MatKhau#Moi2026");
    await dialog.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(dialog.getByRole("heading", { name: "Đã đổi mật khẩu" })).toBeVisible();
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ password: "MatKhau#Moi2026" });
    expect(log.passwordGrants).toBe(0);
    expect(page.url()).not.toContain("access_token");
  });
});

test.describe("xuất và xóa tài khoản", () => {
  async function openProfile(page: Page) {
    await seedLoggedInSession(page);
    const log = await mockAccountBackend(page);
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    await dismissGuestNotice(page);
    const profileButton = page.getByRole("button", { name: /Mở tài khoản của/ });
    await expect(profileButton).toBeVisible({ timeout: 20_000 });
    await profileButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Hồ sơ của bạn" })).toBeVisible();
    return { dialog, log };
  }

  test("tải dữ liệu của tôi tạo tệp JSON", async ({ page }) => {
    const { dialog } = await openProfile(page);
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Tải dữ liệu của tôi (JSON)" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^canhgiacso-du-lieu-cua-toi-\d{4}-\d{2}-\d{2}\.json$/);
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
    expect(parsed.profile).toMatchObject({ username: TEST_ACCOUNT.username });
    expect(JSON.stringify(parsed)).not.toMatch(/access_token|refresh_token|password/i);
  });

  test("hộp thoại xóa nêu hậu quả, yêu cầu mật khẩu và tên đăng nhập, cho phép hủy", async ({ page }) => {
    const { dialog, log } = await openProfile(page);
    await dialog.getByRole("button", { name: "Xóa tài khoản…" }).click();
    await expect(dialog.getByRole("heading", { name: "Xóa tài khoản vĩnh viễn?" })).toBeVisible();
    await expect(dialog).toContainText("Điều gì sẽ xảy ra");
    await expect(dialog).toContainText("không thể hoàn tác");
    await expect(dialog).toContainText("mã chứng nhận sẽ không còn xác minh được");

    const remove = dialog.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" });
    await expect(remove).toBeDisabled();
    await dialog.getByLabel("Mật khẩu hiện tại").fill("MatKhau#Hien2026");
    await expect(remove).toBeDisabled();
    await dialog.getByLabel(/Nhập tên đăng nhập/).fill("sai_ten");
    await expect(remove).toBeDisabled();
    await dialog.getByLabel(/Nhập tên đăng nhập/).fill(TEST_ACCOUNT.username);
    await expect(remove).toBeEnabled();

    await dialog.getByRole("button", { name: "Hủy, giữ tài khoản" }).click();
    await expect(dialog.getByRole("heading", { name: "Hồ sơ của bạn" })).toBeVisible();
    expect(log.deleteBodies).toHaveLength(0);
    expect(log.passwordGrants).toBe(0);
  });

  test("mật khẩu sai không xóa gì", async ({ page }) => {
    await seedLoggedInSession(page);
    const log = await mockAccountBackend(page, {
      passwordGrant: { status: 400, body: { code: "invalid_credentials", msg: "Invalid login credentials" } },
    });
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    await dismissGuestNotice(page);
    await page.getByRole("button", { name: /Mở tài khoản của/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Xóa tài khoản…" }).click();
    await dialog.getByLabel("Mật khẩu hiện tại").fill("SaiMatKhau#1");
    await dialog.getByLabel(/Nhập tên đăng nhập/).fill(TEST_ACCOUNT.username);
    await dialog.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Mật khẩu không đúng");
    expect(log.deleteBodies).toHaveLength(0);
    await expect(page.getByRole("heading", { name: "Đã xóa tài khoản" })).toHaveCount(0);
  });

  test("tài khoản quản trị bị chặn được giải thích rõ và không bị xóa", async ({ page }) => {
    await seedLoggedInSession(page);
    const log = await mockAccountBackend(page, {
      deleteResponse: { status: 400, body: { code: "CG005", message: "privileged", details: "last_admin", hint: null } },
    });
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    await dismissGuestNotice(page);
    await page.getByRole("button", { name: /Mở tài khoản của/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Xóa tài khoản…" }).click();
    await dialog.getByLabel("Mật khẩu hiện tại").fill("MatKhau#Hien2026");
    await dialog.getByLabel(/Nhập tên đăng nhập/).fill(TEST_ACCOUNT.username);
    await dialog.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" }).click();
    await expect(dialog.getByRole("alert")).toContainText("quản trị viên cuối cùng");
    expect(log.deleteBodies).toHaveLength(1);
    await expect(page.getByRole("heading", { name: "Đã xóa tài khoản" })).toHaveCount(0);
  });

  test("xóa thành công: gọi RPC với tên đăng nhập xác nhận, đăng xuất và báo kết quả", async ({ page }) => {
    const { dialog, log } = await openProfile(page);
    await dialog.getByRole("button", { name: "Xóa tài khoản…" }).click();
    await dialog.getByLabel("Mật khẩu hiện tại").fill("MatKhau#Hien2026");
    await dialog.getByLabel(/Nhập tên đăng nhập/).fill(TEST_ACCOUNT.username);
    await dialog.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" }).click();

    const notice = page.getByRole("dialog", { name: "Đã xóa tài khoản" });
    await expect(notice).toBeVisible();
    expect(log.passwordGrants).toBe(1);
    expect(log.deleteBodies).toEqual([{ confirmation: TEST_ACCOUNT.username }]);
    await notice.getByRole("button", { name: "Đã hiểu" }).click();
    await expect(notice).toBeHidden();
    // Đã trở về chế độ khách: nút Đăng nhập hiện lại, không còn nút hồ sơ.
    await expect(page.locator("header").getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mở tài khoản của/ })).toHaveCount(0);
    const stored = await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("sb-")));
    for (const key of stored) {
      const value = await page.evaluate((k) => window.localStorage.getItem(k), key);
      expect(value ?? "").not.toContain(TEST_ACCOUNT.email);
    }
  });
});

test.describe("xác minh chứng nhận", () => {
  const VERIFY_PATH = "/xac-minh-chung-chi/";
  const VALID_CODE = "CGS-2026-0123456789ABCDEF";

  async function mockVerify(page: Page, handler: (code: string) => { status: number; body: unknown }) {
    const seen: string[] = [];
    await page.route("**/rest/v1/rpc/verify_training_certificate", (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return preflight(route);
      expect(request.method()).toBe("POST");
      const payload = request.postDataJSON() as { code: string };
      seen.push(payload.code);
      const reply = handler(payload.code);
      return json(route, reply.status, reply.body);
    });
    return seen;
  }

  test("mã hợp lệ hiện thông tin tối thiểu, tên đã che", async ({ page }) => {
    const seen = await mockVerify(page, () => ({
      status: 200,
      body: { valid: true, name: "N*** V*** M***", issuedOn: "2026-10-03", rating: "XUẤT SẮC", accuracy: 95, scenarioTotal: 40, completed: 40 },
    }));
    await page.goto(VERIFY_PATH);
    await page.getByRole("textbox", { name: "Mã chứng nhận" }).fill("  cgs-2026-0123 456789abcdef ");
    await page.getByRole("button", { name: "Xác minh" }).click();
    const result = page.locator("#verify-result");
    await expect(result).toContainText("Chứng nhận hợp lệ");
    await expect(result).toContainText("N*** V*** M***");
    await expect(result).toContainText("03/10/2026");
    await expect(result).toContainText("XUẤT SẮC");
    await expect(result).toContainText("95%");
    await expect(result).toContainText("40/40");
    expect(seen).toEqual([VALID_CODE]);
    await noHorizontalOverflow(page);
  });

  test("mã không tồn tại báo không tìm thấy, không phân biệt lý do", async ({ page }) => {
    await mockVerify(page, () => ({ status: 200, body: { valid: false } }));
    await page.goto(VERIFY_PATH);
    await page.getByRole("textbox", { name: "Mã chứng nhận" }).fill("CGS-2026-FFFFFFFFFFFFFFFF");
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(page.locator("#verify-result")).toContainText("Không tìm thấy chứng nhận");
  });

  test("mã khách và mã sai định dạng được giải thích mà không gọi máy chủ", async ({ page }) => {
    const seen = await mockVerify(page, () => ({ status: 200, body: { valid: false } }));
    await page.goto(VERIFY_PATH);
    const input = page.getByRole("textbox", { name: "Mã chứng nhận" });
    const result = page.locator("#verify-result");

    await input.fill("CGS-GUEST-ABCDEF1234");
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(result).toContainText("chế độ khách");

    await input.fill("xin chao");
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(result).toContainText("Mã chưa đúng định dạng");

    await input.fill("");
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(result).toContainText("Chưa nhập mã");
    expect(seen).toHaveLength(0);
  });

  test("bị giới hạn tốc độ hoặc mất kết nối thì báo thử lại sau", async ({ page }) => {
    let mode: "limit" | "down" = "limit";
    await page.route("**/rest/v1/rpc/verify_training_certificate", (route) => {
      if (route.request().method() === "OPTIONS") return preflight(route);
      return mode === "limit" ? json(route, 429, { message: "rate limit" }) : route.abort();
    });
    await page.goto(VERIFY_PATH);
    const input = page.getByRole("textbox", { name: "Mã chứng nhận" });
    await input.fill(VALID_CODE);
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(page.locator("#verify-result")).toContainText("Tra cứu quá nhiều lần");
    mode = "down";
    await page.getByRole("button", { name: "Xác minh" }).click();
    await expect(page.locator("#verify-result")).toContainText("Chưa kiểm tra được");
  });

  test("liên kết ?code= tự điền và tra cứu; kết quả không được dựng như HTML", async ({ page }) => {
    const seen = await mockVerify(page, () => ({
      status: 200,
      body: { valid: true, name: "<img src=x onerror=window.__xss=1>", issuedOn: "2026-10-03", rating: "<b>TỐT</b>", accuracy: 80, scenarioTotal: 10, completed: 10 },
    }));
    await page.goto(`${VERIFY_PATH}?code=${VALID_CODE.toLowerCase()}`);
    await expect(page.locator("#verify-result")).toContainText("Chứng nhận hợp lệ");
    await expect(page.getByRole("textbox", { name: "Mã chứng nhận" })).toHaveValue(VALID_CODE);
    expect(seen).toEqual([VALID_CODE]);
    await expect(page.locator("#verify-result img, #verify-result b")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("trang không có script nội tuyến và không tải tài nguyên bên thứ ba", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname !== "127.0.0.1" && !/supabase\.co$/.test(url.hostname)) external.push(request.url());
    });
    await page.goto(VERIFY_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Xác minh chứng nhận" })).toBeVisible();
    const inlineScripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("script:not([src])")).filter((node) => (node as HTMLScriptElement).type !== "application/ld+json").length,
    );
    expect(inlineScripts).toBe(0);
    expect(external).toEqual([]);
  });
});

test.describe("hoạt hình giới thiệu (không còn ngoại lệ CSP)", () => {
  test("chạy mà không vi phạm CSP chặt (script-src 'self', style-src 'self')", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        console.error(`Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    await page.goto("/gioi-thieu/hoat-hinh.html");
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain("unsafe-inline");
    await expect(page.locator("#bg")).toBeVisible();
    // Cho hoạt hình chạy qua vài cảnh để các thao tác kiểu dáng bằng JS đều được thực thi.
    await page.waitForTimeout(4000);
    expect(violations).toEqual([]);
    const inline = await page.evaluate(() => ({
      scripts: document.querySelectorAll("script:not([src])").length,
      styleTags: document.querySelectorAll("style").length,
      handlers: Array.from(document.querySelectorAll("*")).filter((node) => node.getAttributeNames().some((name) => name.startsWith("on"))).length,
    }));
    expect(inline).toEqual({ scripts: 0, styleTags: 0, handlers: 0 });
  });

  test("vẫn nhúng được trong trang Giới thiệu", async ({ page }) => {
    await page.goto("/gioi-thieu/");
    const frame = page.frameLocator('iframe[src="/gioi-thieu/hoat-hinh.html"]');
    await expect(frame.locator("#bg")).toBeAttached();
    await noHorizontalOverflow(page);
  });
});
