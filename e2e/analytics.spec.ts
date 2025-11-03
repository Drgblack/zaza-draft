import { test, expect, type Page } from '@playwright/test';

test.describe('Analytics and Data Use', () => {
  test.beforeEach(async ({ page }) => {
    console.log('Starting Analytics test');
  });

  test('Toggle data use and download insights', async ({ page }) => {
    console.log('Testing analytics flow...');
    // Sign in with test user
    await page.goto('/auth/sign-in');
    await page.waitForSelector('[data-testid="signin-email"]', { timeout: 90_000 });
    await page.getByTestId('signin-email').fill('test+e2e@example.com');
    await page.getByTestId('signin-password').fill('TestPassword123!');
    await page.getByTestId('signin-submit').click();

    // Wait for successful sign in and navigation
    await page.waitForURL(/\/dashboard/);

    // Navigate to settings and toggle data use
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="analytics-opt-in"]', { timeout: 30_000 });
    const toggle = page.getByTestId('analytics-opt-in');
    await toggle.click();

    // Verify toggle state changed
    await expect(toggle).toBeChecked();

    // Navigate to insights
    await page.goto('/insights');
    await page.waitForSelector('[data-testid="insights-summary"]', { timeout: 30_000 });

    // Verify summary cards are present
    const summaryCards = page.getByTestId('insights-card');
    const cardCount = await summaryCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Download CSV and verify
    const [download] = await Promise.all([
      // Start waiting for the download before clicking
      page.waitForEvent('download'),
      // Click the download button
      page.getByTestId('download-csv').click()
    ]);

    // Get downloaded file name (optional verification)
    const suggestedFileName = await download.suggestedFilename();
    expect(suggestedFileName).toMatch(/insights.*\.csv$/i);
  });
});