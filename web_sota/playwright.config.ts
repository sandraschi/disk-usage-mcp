import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 11114);
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 11115);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `uv run --project .. python -m disk_usage_mcp.server`,
      env: { MCP_PORT: String(BACKEND_PORT), MCP_HOST: "127.0.0.1" },
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "bun run dev",
      url: `http://127.0.0.1:${FRONTEND_PORT}/`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
