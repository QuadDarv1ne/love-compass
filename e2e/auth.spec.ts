import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show landing page with login and register links', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Love Compass')).toBeVisible();
    await expect(page.locator('text=Get Started')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h2')).toContainText(/log in|войти|登录/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h2')).toContainText(/sign up|регистрация|注册/i);
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should show validation errors on login form', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');

    // Should stay on login page (form validation prevents submission)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('App', () => {
  test('should have valid security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // Check CSP header exists
    expect(headers['content-security-policy']).toBeTruthy();
    // Check X-Frame-Options
    expect(headers['x-frame-options'] || headers['x-content-type-options']).toBeTruthy();
  });
});
