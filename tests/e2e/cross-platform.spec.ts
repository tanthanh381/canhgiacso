import { expect, test } from "@playwright/test";

async function waitForApp(page) {
  await page.goto("/");
  await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
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
    await expect(menu.getByRole("menuitem")).toHaveCount(2);

    const navBox = await page.locator(".ux-bottom-nav").boundingBox();
    const menuBox = await menu.boundingBox();
    expect(navBox).not.toBeNull();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height - 1);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
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
    await page.getByRole("button", { name: "Đăng nhập" }).click();
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

test.describe("public static content", () => {
  for (const path of ["/kien-thuc/", "/tin-tuc/"]) {
    test(`${path} has responsive layout without horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
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
