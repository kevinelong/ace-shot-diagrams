import { defineConfig, devices } from '@playwright/test';

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
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:8080',
    
    // Screenshot and video on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
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
    command: 'npx http-server -p 8080 -c-1',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
