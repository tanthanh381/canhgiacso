import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_site_content", (route) => route.abort());
});

async function waitForApp(page) {
  await page.goto("/");
  await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
  const guestModal = page.locator(".guest-limit-modal");
  if (await guestModal.isVisible().catch(() => false)) {
    await guestModal.getByRole("button", { name: "Tiếp tục với tư cách khách" }).click();
    await expect(guestModal).toBeHidden();
  }
  await expect(page.locator(".choice").first()).toBeVisible({ timeout: 20_000 });
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(2);
  expect(overflow.html).toBeLessThanOrEqual(2);
}

test.describe("cross-platform shell and responsive navigation", () => {
  test("home renders without horizontal overflow", async ({ page }) => {
    await waitForApp(page);
    await expectNoHorizontalOverflow(page);
  });

  test("desktop and mobile navigation use the correct shell", async ({ page }) => {
    await waitForApp(page);
    const width = page.viewportSize()?.width ?? 0;
    const desktopNav = page.locator(".topbar nav");
    const mobileNav = page.locator(".ux-bottom-nav");

    if (width <= 900) {
      await expect(desktopNav).toBeHidden();
      await expect(mobileNav).toBeVisible();
      await expect(mobileNav.locator(":scope > button")).toHaveCount(5);
      const box = await mobileNav.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.y)).toBeGreaterThanOrEqual(62);
      expect(Math.round(box!.y)).toBeLessThanOrEqual(66);
    } else {
      await expect(desktopNav).toBeVisible();
      await expect(mobileNav).toBeHidden();
    }
  });

  test("dark mode does not break layout", async ({ page }) => {
    await waitForApp(page);
    await page.locator(".icon-button").click();
    await expect(page.locator(".app")).toHaveClass(/dark/);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("mobile interaction states", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 9999) > 900, "mobile/tablet viewport only");

  test("Cẩm nang opens one isolated submenu and closes with Escape", async ({ page }) => {
    await waitForApp(page);
    const handbook = page.locator(".ux-bottom-nav button", { hasText: "Cẩm nang" });
    await handbook.click();

    const menu = page.locator("#ux-mobile-knowledge-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button")).toHaveCount(2);

    const navBox = await page.locator(".ux-bottom-nav").boundingBox();
    const menuBox = await menu.boundingBox();
    expect(navBox).not.toBeNull();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height - 1);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("Cẩm nang checklist opens the interactive checklist view", async ({ page }) => {
    await waitForApp(page);
    const handbook = page.locator(".ux-bottom-nav button", { hasText: "Cẩm nang" });
    await handbook.click();
    const menu = page.locator("#ux-mobile-knowledge-menu");
    await menu.getByRole("button", { name: /Danh sách kiểm tra/ }).click();
    await expect(page.locator("#security-checklist-title")).toBeVisible();
    await expect(handbook).toHaveAttribute("aria-current", "page");
  });

  test("guest answer selection produces feedback without sync error", async ({ page }) => {
    await waitForApp(page);
    const firstChoice = page.locator(".choice:not([disabled])").first();
    await expect(firstChoice).toBeVisible();
    await firstChoice.click();
    await expect(page.locator(".feedback")).toBeVisible();
    await expect(page.getByText("Chưa chấm được lựa chọn", { exact: false })).toHaveCount(0);
  });

  test("auth modal stays above mobile navigation", async ({ page }) => {
    await waitForApp(page);
    const login = page.getByRole("button", { name: "Đăng nhập" });
    await login.click();
    const modalLayer = page.locator(".modal-layer");
    await expect(modalLayer).toBeVisible();

    const order = await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>(".modal-layer");
      const nav = document.querySelector<HTMLElement>(".ux-bottom-nav");
      return {
        modal: Number(getComputedStyle(modal!).zIndex || 0),
        nav: Number(getComputedStyle(nav!).zIndex || 0),
      };
    });
    expect(order.modal).toBeGreaterThan(order.nav);

    const focusInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    });
    expect(focusInsideDialog).toBe(true);
    await page.keyboard.press("Escape");
    await expect(modalLayer).toBeHidden();
    await expect(login).toBeFocused();
  });

  test("scenario and insight drawers cover navigation cleanly", async ({ page }) => {
    await waitForApp(page);

    const scenarioTrigger = page.getByRole("button", { name: /Danh sách tình huống/ });
    await expect(scenarioTrigger).toBeVisible();
    await scenarioTrigger.click();
    await expect(page.locator(".app")).toHaveClass(/ux-scenarios-open/);
    await expect(page.locator(".ux-drawer-backdrop")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".app")).not.toHaveClass(/ux-scenarios-open/);

    const insightTrigger = page.getByRole("button", { name: /Mẹo & tiến trình/ });
    await insightTrigger.click();
    await expect(page.locator(".app")).toHaveClass(/ux-insight-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".app")).not.toHaveClass(/ux-insight-open/);
  });

  test("utility menu is mutually exclusive with Cẩm nang", async ({ page }) => {
    await waitForApp(page);

    await page.evaluate(() => {
      const actions = document.querySelector(".top-actions");
      if (!actions || actions.querySelector(".profile-button")) return;
      const profile = document.createElement("button");
      profile.className = "profile-button";
      profile.textContent = "QC";
      actions.appendChild(profile);
    });

    const utility = page.locator(".ux-utility-trigger");
    await expect(utility).toBeVisible();
    await utility.click();
    await expect(page.locator(".ux-utility-popover-mobile")).toBeVisible();

    const handbook = page.locator(".ux-bottom-nav button", { hasText: "Cẩm nang" });
    await handbook.click();
    await expect(page.locator(".ux-utility-popover-mobile")).toBeHidden();
    await expect(page.locator("#ux-mobile-knowledge-menu")).toBeVisible();
  });
});


test.describe("resilience and breakpoint boundaries", () => {
  test("built-in scenarios remain playable when public content RPC is unavailable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "single deterministic resilience run");
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
    const choice = page.locator(".choice:not([disabled])").first();
    await expect(choice).toBeVisible({ timeout: 20_000 });
    await choice.click();
    await expect(page.locator(".feedback")).toBeVisible();
    await expect(page.getByText("đang dùng thư viện tích hợp sẵn", { exact: false })).toBeVisible();
  });

  test("responsive breakpoint matrix has no horizontal overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "boundary matrix runs once");
    await waitForApp(page);
    const widths = [320, 360, 390, 520, 560, 760, 820, 900, 901, 1024, 1180, 1181, 1366, 1440, 1920];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 560 ? 740 : 900 });
      await page.waitForTimeout(40);
      await expectNoHorizontalOverflow(page);
      if (width <= 900) {
        await expect(page.locator(".ux-bottom-nav")).toBeVisible();
        await expect(page.locator(".ux-bottom-nav > button")).toHaveCount(5);
      } else {
        await expect(page.locator(".topbar nav")).toBeVisible();
        await expect(page.locator(".ux-bottom-nav")).toBeHidden();
      }
    }
  });

  test("desktop Cẩm nang closes when another primary destination is selected", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("desktop-"), "desktop navigation only");
    await waitForApp(page);
    const details = page.locator(".knowledge-menu");
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await page.getByRole("button", { name: "Tin tức", exact: true }).click();
    await expect(details).not.toHaveAttribute("open", "");
  });
});

test.describe("public static content", () => {
  for (const path of ["/kien-thuc/", "/tin-tuc/", "/gioi-thieu/", "/quyen-rieng-tu/", "/phuong-phap-kiem-chung/", "/sitemap/", "/cong-cu/", "/canh-bao-lua-dao-hom-nay/", "/co-phai-lua-dao-khong/", "/tu-dien-lua-dao/"]) {
    test(`${path} has responsive layout without horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const header = page.locator(".seo-header");
      if (await header.count()) {
        await page.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight)));
        const box = await header.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.abs(box!.y)).toBeLessThanOrEqual(2);
      }
    });
  }
});

test("visible buttons expose an accessible name", async ({ page }) => {
  await waitForApp(page);
  const unnamed = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons
      .filter((button) => {
        const el = button as HTMLButtonElement;
        return !(el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("title"));
      })
      .map((button) => (button as HTMLElement).outerHTML.slice(0, 180)),
  );
  expect(unnamed).toEqual([]);
});


test.describe("trust/system page consistency", () => {
  for (const path of ["/gioi-thieu/", "/quyen-rieng-tu/", "/phuong-phap-kiem-chung/", "/sitemap/"]) {
    test(`${path} shares the site brand shell and dark-mode preference`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("khien-so-theme", "dark"));
      await page.goto(path);
      await expect(page.locator(".seo-header")).toBeVisible();
      await expect(page.locator(".seo-brand-logo")).toBeVisible();
      await expect(page.locator(".seo-brand-divider")).toBeVisible();
      await expect(page.locator(".seo-product-lockup")).toBeVisible();
      await expect(page.locator(".seo-footer")).toBeVisible();
      await expect(page.locator(".seo-footer-links a")).toHaveCount(4);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator(".seo-nav-links a", { hasText: "Cẩm nang" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});


test.describe("Growth Wave 9 anti-scam tools", () => {
  test("call triage returns a high-risk response without horizontal overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "deterministic tool interaction run");
    await page.goto("/cong-cu/kiem-tra-cuoc-goi-la/");
    const tool = page.locator('[data-scam-tool="call-triage"]');
    await tool.locator('select[name="claim"]').selectOption("police");
    await tool.locator('select[name="request"]').selectOption("transfer");
    await tool.locator('input[name="secrecy"]').check();
    await tool.getByRole("button", { name: "Đánh giá tình huống" }).click();
    const result = tool.locator("[data-tool-result]");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-level", "high");
    await expect(result).toContainText("Rủi ro cao");
    await expectNoHorizontalOverflow(page);
  });

  test("SMS checker analyzes locally and exposes risk signals", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "deterministic tool interaction run");
    await page.goto("/cong-cu/kiem-tra-tin-nhan-dang-ngo/");
    const tool = page.locator('[data-scam-tool="sms-check"]');
    await tool.locator("textarea").fill("NGAN HANG: tai khoan se bi khoa. Bam https://example.top va nhap OTP de xac minh ngay.");
    await tool.getByRole("button", { name: "Phân tích tín hiệu" }).click();
    const result = tool.locator("[data-tool-result]");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-level", "high");
    await expect(result).toContainText("đường link");
    await expect(result).toContainText("xác thực");
  });

  test("scenario library filters 30 scenarios", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "deterministic tool interaction run");
    await page.goto("/cong-cu/thu-vien-kich-ban-lua-dao/");
    const cards = page.locator("[data-scenario-card]");
    await expect(cards).toHaveCount(30);
    await page.locator("[data-filter-input]").fill("điện lực");
    await expect(page.locator("[data-scenario-card]:visible")).toHaveCount(1);
    await expect(page.locator("[data-scenario-card]:visible")).toContainText("Điện lực");
  });

  test("new static pages honor the stored dark theme through the CSP-safe script", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "single theme integration run");
    await page.addInitScript(() => localStorage.setItem("khien-so-theme", "dark"));
    await page.goto("/cong-cu/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".seo-header")).toBeVisible();
    await expect(page.locator(".seo-footer")).toBeVisible();
  });
});


test.describe("Wave 9 security shell", () => {
  test("Wave 9 tool pages keep CSP and local tool scripts", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "single deterministic security-shell run");
    await page.goto("/cong-cu/kiem-tra-tin-nhan-dang-ngo/");
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    await expect(page.locator('script[src="/theme-init.js"]')).toHaveCount(1);
    await expect(page.locator('script[src="/scam-tools.js"]')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });
});
