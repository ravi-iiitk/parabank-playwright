// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://parabank.parasoft.com';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },        // ← keep your original
  retries: 1,                         // ← keep your original
  forbidOnly: !!process.env.CI,       // safe guard
  fullyParallel: false,               // predictable order by default
  workers: process.env.CI ? 1 : undefined, // CI stability (serial); unchanged locally

  // ✅ reporters (unchanged)
  reporter: [
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'junit.xml' }]
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',          // ← keep your original
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // headless: leave default so you can override with --headed locally
  },

  projects: [
    // --- your original catch-all chromium project (unchanged) ---
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    // --- ordered flow using dependencies ---
    // 1) SETUP: registers a user and saves encrypted creds (.secure/users.json)
    {
      name: 'setup',
      testMatch: /tests\/register\.only\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 2) Dependent flows (will run only after "setup" finishes)
    {
      name: 'chromium-open-account',
      dependencies: ['setup'],
      testMatch: /tests\/login\.open-account\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-transfer',
      dependencies: ['setup'],
      testMatch: /tests\/login\.transfer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-billpay',
      dependencies: ['setup'],
      testMatch: /tests\/login\.billpay\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Optional big happy-path (also after setup)
    {
      name: 'chromium-e2e',
      dependencies: ['setup'],
      testMatch: /tests\/e2e\.parabank\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // If you want nav/API as ordered too, you can add more projects
    // with dependencies: ['setup'] and their own testMatch.
  ],
});
