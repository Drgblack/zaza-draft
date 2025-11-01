async function fillSignup(page, email, password) {
  await page.goto("/auth/sign-up");
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(()=>{});

  // Try testids first
  let emailCtl = page.getByTestId("signup-email");
  let passCtl  = page.getByTestId("signup-password");
  let submit   = page.getByTestId("signup-submit");

  const hasTestIds = await emailCtl.count().then(n => n > 0).catch(() => false);

  if (!hasTestIds) {
    // Fallback to accessible labels
    emailCtl = page.getByLabel(/email/i);
    passCtl  = page.getByLabel(/password/i);
    submit   = page.getByRole("button", { name: /sign up|create account|continue/i });
  }

  const found = await emailCtl.count().then(n => n > 0).catch(() => false);
  if (!found) return false; // let caller decide (skip test)

  await emailCtl.fill(email);
  await passCtl.fill(password);
  await submit.click();
  return true;
}
import { test, expect, type Page } from '@playwright/test';

// Helper to mock Stripe webhook
async function triggerStripeWebhook(page: Page, eventType: string, customerId: string) {
  // Use Playwright's APIRequest to POST directly to webhook route (bypasses client-side JS)
  const event = {
    id: `evt_${eventType}_${customerId}`,
    type: eventType,
    data: { object: { customer: customerId, status: eventType === 'customer.subscription.deleted' ? 'canceled' : 'active' } },
  };
  await page.request.post('/api/stripe/webhook', {
    data: event,
    headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test' },
  });
}

test.describe('Critical billing flows', () => {
  test('Sign up, sign in, usage gate, upgrade, downgrade', async ({ page }) => {
    // Sign up
    await page.goto('/auth/sign-up');
await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.getByLabel('Email').fill('e2euser@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await expect(page.getByTestId('dashboard')).toBeVisible();

    // Sign out and sign in
    await page.getByTestId('signout-btn').click();
    await page.goto('/auth/sign-in');
    await page.getByTestId('signin-email').fill('e2euser@example.com');
    await page.getByTestId('signin-password').fill('TestPassword123!');
    await page.getByTestId('signin-submit').click();
    await expect(page.getByTestId('dashboard')).toBeVisible();

    // Generate drafts up to limit
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('draft-notes').fill(`Draft ${i}`);
      await page.getByTestId('draft-generate').click();
      await expect(page.getByTestId('draft-result')).toBeVisible();
      // accessibility: copy toolbar should be present
      await expect(page.getByRole('toolbar', { name: 'Copy options' })).toBeVisible();
    }

    // Try to generate after limit
    await page.getByTestId('draft-notes').fill('Draft over limit');
    await page.getByTestId('draft-generate').click();
    await expect(page.getByTestId('upgrade-cta')).toBeVisible();

    // Upgrade via mocked Stripe webhook
    const customerId = 'cus_e2euser';
    await triggerStripeWebhook(page, 'customer.subscription.created', customerId);
    await page.reload();
    await expect(page.getByTestId('plan-status')).toHaveText(/Pro/);

    // Downgrade via mocked cancel webhook
    await triggerStripeWebhook(page, 'customer.subscription.deleted', customerId);
    await page.reload();
    await expect(page.getByTestId('plan-status')).toHaveText(/Free/);
  });
});




