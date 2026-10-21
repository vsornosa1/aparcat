import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);
const port = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: isCi ? `npm run start -- --port ${port}` : `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Key falsa: las llamadas a MapTiler están simuladas, y así el test no depende de .env.local.
    env: { NEXT_PUBLIC_MAPTILER_KEY: 'e2e-test-key' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
