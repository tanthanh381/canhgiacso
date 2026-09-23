import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_site_content", (route) => route.abort());
});

test("application shell, guest gameplay and static knowledge work on this OS/browser", async ({ page }) => {
  const severeConsole = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/supabase|net::ERR_FAILED|Failed to load resource/i.test(message.text())) {
      severeConsole.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (failure) requestFailures.push(`${request.url()} :: ${failure.errorText}`);
  });

  await page.goto("/");
  try {
    await expect(page.locator(".app")).toBeVisible({ timeout: 20_000 });
  } catch (error) {
    const body = (await page.locator("body").textContent().catch(() => ""))?.slice(0, 1200) || "";
    throw new Error([
      error instanceof Error ? error.message : String(error),
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `consoleErrors=${JSON.stringify(severeConsole)}`,
      `requestFailures=${JSON.stringify(requestFailures.slice(0, 12))}`,
      `body=${body}`,
    ].join("\n"));
  }
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
  const knowledgeCsp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(knowledgeCsp).toContain("https://www.google.com");

  await page.goto("/cong-cu/");
  await expect(page.locator(".seo-header")).toBeVisible();
  await expect(page.locator("h1")).toContainText("Kiểm tra");
  await expect(page.locator('a[href="/cong-cu/kiem-tra-cuoc-goi-la/"]')).toBeVisible();
  const toolOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(toolOverflow).toBeLessThanOrEqual(2);

  expect(severeConsole).toEqual([]);
});
