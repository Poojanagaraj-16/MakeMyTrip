import { defineConfig } from '@playwright/test';

const retryValue = Number.parseInt(process.env.PW_RETRIES ?? '1', 10);
if (!Number.isInteger(retryValue) || retryValue < 0) {
  throw new Error('PW_RETRIES must be a non-negative integer.');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: retryValue,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  outputDir: './reports/artifacts',
  reporter: [
    ['./reporter/CustomReporter.ts'],
    ['list'],
  ],
  use: {
    baseURL: 'https://www.makemytrip.com',
    channel: 'msedge',
    headless: process.env.HEADLESS === 'true',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'Microsoft Edge',
      use: { browserName: 'chromium', channel: 'msedge' },
    },
  ],
});
