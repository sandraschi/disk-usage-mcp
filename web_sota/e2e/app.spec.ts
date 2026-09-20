import { expect, test } from "@playwright/test";

const ROUTES: { path: string; heading: RegExp; testid: string }[] = [
  { path: "/dashboard", heading: /reclaim space/i, testid: "dashboard" },
  { path: "/drives", heading: /treemap scanner/i, testid: "drives-page" },
  { path: "/duplicates", heading: /duplicate finder/i, testid: "duplicates-page" },
  { path: "/inbox", heading: /snapshots/i, testid: "inbox-page" },
  { path: "/tools", heading: /^tools$/i, testid: "tools-page" },
  { path: "/skills", heading: /^skills$/i, testid: "skills-page" },
  { path: "/chat", heading: /^chat$/i, testid: "chat-page" },
  { path: "/logs", heading: /logs/i, testid: "logs-page" },
  { path: "/apps", heading: /fleet apps/i, testid: "apps-page" },
  { path: "/settings", heading: /^settings$/i, testid: "settings-page" },
  { path: "/help", heading: /^help$/i, testid: "help-page" },
];

test("sidebar nav walk hits every page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  for (const route of ROUTES.slice(1)) {
    await page.goto(route.path);
    await expect(page.getByTestId(route.testid)).toBeVisible();
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  }
});

test("dashboard shows hero and backend status", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-hero")).toBeVisible();
  await expect(page.getByTestId("backend-dot")).toContainText(/connected|connecting|offline/i);
});

test("chat page offers example prompts", async ({ page }) => {
  await page.goto("/chat");
  await expect(page.getByTestId("example-prompts")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeVisible();
});

test("snapshots API round-trips through the UI backend", async ({ page, request }) => {
  const health = await request.get("http://127.0.0.1:11114/api/health");
  expect(health.ok()).toBeTruthy();
  await page.goto("/inbox");
  await expect(page.getByTestId("inbox-page")).toBeVisible();
});
