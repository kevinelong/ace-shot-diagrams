import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Locally the OS Chromium is used; CI installs and uses the Playwright browser.
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

// Isolated runs (worktrees, parallel agents) can move both the app and the
// Playwright base URL together: ACE_TEST_PORT=8091 npx playwright test
const port = process.env.ACE_TEST_PORT || '8080';

/**
 * Playwright configuration for ACE Shot Diagrams UX tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The palette UI tests use fixed waits and can flake under heavy parallel
  // load (the suite is 163 tests); one retry absorbs that timing noise.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: `http://localhost:${port}`,

    // Artefact recording: on failure, and on the first retry. Recording every test across
    // five projects costs disk and time for nothing when everything passes; specs that want a
    // video deliberately opt in with test.use({ video: 'on' }). Measured effect of this change:
    // the chromium suite went 7.0 -> 6.4 min, so the runtime is not recording but the specs'
    // own fixed waits (92 calls, 57.6 s per pass, 32.3 s of it in shot-animation.spec.ts) and
    // the per-test boot cost. See NEXT_STEPS.md.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Viewport size (desktop)
    viewport: { width: 1920, height: 1080 },

    // Emulate user preferences
    colorScheme: 'dark', // App uses dark theme

    // Timeouts
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: chromiumExecutable ? {
          executablePath: chromiumExecutable,
          args: ['--no-sandbox'],
        } : undefined,
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Additional viewport sizes
    {
      name: 'laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        launchOptions: chromiumExecutable ? {
          executablePath: chromiumExecutable,
          args: ['--no-sandbox'],
        } : undefined,
      },
    },

    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro landscape'],
      },
    },
  ],

  // Web server to run during tests
  webServer: {
    command: `npx http-server -p ${port} -c-1`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
