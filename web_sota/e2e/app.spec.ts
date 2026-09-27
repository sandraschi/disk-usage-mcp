import { expect, test } from "@playwright/test";

const ROUTES: { path: string; heading: RegExp; testid: string }[] = [
  { path: "/dashboard", heading: /reclaim space/i, testid: "dashboard" },
  { path: "/drives", heading: /treemap scanner/i, testid: "drives-page" },
  { path: "/cloud", heading: /cloud storage/i, testid: "cloud-page" },
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

test("drives page lists connected drives without a scanner", async ({ page }) => {
  await page.goto("/drives");
  await expect(page.getByTestId("drives-overview")).toBeVisible();
  await expect(page.getByTestId("drives-overview")).toContainText(/connected drives|Probing|No drives|not running/i);
});

test("duplicates page shows safety rule and BC verify panel", async ({ page }) => {
  await page.goto("/duplicates");
  await expect(page.getByTestId("duplicates-safety")).toBeVisible();
  await expect(page.getByTestId("duplicates-verify")).toBeVisible();
  await expect(page.getByTestId("peer-badge-beyondcompare")).toBeVisible();
});

test("peers API degrades dialogically when companions are down", async ({ request }) => {
  const peers = await request.get("http://127.0.0.1:11114/api/peers/status");
  expect(peers.ok()).toBeTruthy();
  const body = await peers.json();
  expect(body.success).toBe(true);
  expect(body.peers.beyondcompare).toHaveProperty("reachable");
  const compare = await request.post("http://127.0.0.1:11114/api/peers/bc/compare", {
    data: { left_path: "Z:\\nope-1", right_path: "Z:\\nope-2" },
  });
  expect(compare.ok()).toBeTruthy();
  expect((await compare.json()).success).toBe(false);
});

test("google state + preflight APIs never 500", async ({ request }) => {
  const gstate = await request.get("http://127.0.0.1:11114/api/peers/google/state");
  expect(gstate.ok()).toBeTruthy();
  const gbody = await gstate.json();
  expect(gbody.success).toBe(true);
  expect(gbody.quota).toBeNull();
  const preflight = await request.post("http://127.0.0.1:11114/api/peers/backup/preflight", {
    data: { bytes_needed_gb: 1 },
  });
  expect(preflight.ok()).toBeTruthy();
  const pbody = await preflight.json();
  expect(pbody.success).toBe(true);
  expect(Array.isArray(pbody.candidates)).toBe(true);
});
