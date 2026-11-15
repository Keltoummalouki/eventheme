import { defineConfig, devices } from "@playwright/test";
import { baseURL, external, port, serverEnvironment } from "./e2e/environment";

/**
 * Tests de bout en bout : le site dans un vrai navigateur, sur ordinateur et
 * sur téléphone, en français, en anglais et en arabe (voir e2e/environment.ts
 * pour l’isolement du serveur de test).
 *
 * Sous Windows, Microsoft Edge installé sert de navigateur (aucun
 * téléchargement) ; ailleurs, Chromium de Playwright (`npx playwright install
 * chromium`). E2E_CHANNEL choisit un autre navigateur installé.
 */
const channel = process.env.E2E_CHANNEL || (process.platform === "win32" ? "msedge" : undefined);

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/e2e",
  // Le premier passage compile chaque page à la demande (next dev) : délais généreux.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    channel,
    reducedMotion: "reduce",
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npx next dev --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000,
        stdout: "ignore",
        stderr: "pipe",
        env: serverEnvironment,
      },
});
