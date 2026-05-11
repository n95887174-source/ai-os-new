import { test, expect } from 'playwright/test';

test.describe('AI-OS Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard', async ({ page }) => {
    await expect(page.getByText('Mission Control')).toBeVisible();
  });

  test('should navigate to keys page and add a key', async ({ page }) => {
    await page.getByRole('button', { name: /add provider/i }).click();
    await expect(page.getByText(/key management|api key/i)).toBeVisible();
  });

  test('should navigate to agents page', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByText(/agent|builder/i)).toBeVisible();
  });

  test('should open chat panel', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByPlaceholder(/type|message|send/i)).toBeVisible();
  });
});
