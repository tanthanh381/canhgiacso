import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_site_content", (route) => route.abort());
});

test("application shell, guest gameplay and static knowledge work on this OS/browser", async ({ page }) => {
  const severeConsole = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/supabase|net::ERR_FAILED|Failed to load resource/i.test(message.text())) {
      severeConsole.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".topbar nav")).toBeVisible();
  const guestModal = page.locator(".guest-limit-modal");
  if (await guestModal.isVisible().catch(() => false)) {
    await guestModal.getByRole("button", { name: "Tiếp tục với tư cách khách" }).click();
    await expect(guestModal).toBeHidden();
  }
  await expect(page.locator(".choice:not([disabled])").first()).toBeVisible({ timeout: 20_000 });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);

  await page.locator(".choice:not([disabled])").first().click();
  await expect(page.locator(".feedback")).toBeVisible();

  await page.goto("/kien-thuc/");
  await expect(page.locator(".seo-header")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  const knowledgeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(knowledgeOverflow).toBeLessThanOrEqual(2);

  expect(severeConsole).toEqual([]);
});
