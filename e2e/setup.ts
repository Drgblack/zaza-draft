import { test as setup, expect } from '@playwright/test';

// Set up any data or state needed for all tests
setup('ensure server is ready', async ({ request }) => {
  // Retry health check up to 3 times
  for (let i = 0; i < 3; i++) {
    try {
      const health = await request.get('/api/health');
      expect(health.ok()).toBeTruthy();
      const json = await health.json();
      console.log('Server health check passed:', json);
      return;
    } catch (e) {
      console.log('Health check attempt', i + 1, 'failed, retrying...');
      await new Promise(r => setTimeout(r, 10000)); // Wait 10s between retries
    }
  }
  throw new Error('Server failed to become healthy');
});