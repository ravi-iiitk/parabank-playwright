import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class LoginPage extends BasePage {
  /** Click the “Register” link shown on the login page */
  async clickRegister() {
    await this.page.getByRole('link', { name: 'Register' }).click();
  }

  /**
   * Log in from the home/login page.
   * - Navigates to /parabank/index.htm
   * - Fills username/password (by exact name=)
   * - Clicks "Log In"
   * - Waits for post-login UI to appear
   */
  async login(username: string, password: string) {
    await this.page.goto('/parabank/index.htm', { waitUntil: 'domcontentloaded' });

    // Fill credentials via stable name= selectors
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);

    // Submit
    await this.page.getByRole('button', { name: 'Log In' }).click();

    // Post-login sanity: left panel "Account Services" should be visible
    const leftHeader = this.page.locator('#leftPanel h2');
    await expect(leftHeader).toBeVisible({ timeout: 20_000 });
    await expect(leftHeader).toHaveText(/account services/i);

    // Allow any final network to settle
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /** Strong post-login assertion */
  async assertLoggedIn(expectedWelcomeName?: string | RegExp) {
    await expect(this.page.locator('#leftPanel h2')).toHaveText(/account services/i);
    await expect(this.page.getByRole('link', { name: 'Log Out' })).toBeVisible();

    if (expectedWelcomeName) {
      const welcome = this.page.locator('#leftPanel .smallText');
      await expect(welcome).toContainText(expectedWelcomeName);
    }
  }

  /** Convenience logout */
  async logout() {
    await this.page.getByRole('link', { name: 'Log Out' }).click();
    await expect(this.page.locator('#loginPanel')).toBeVisible({ timeout: 15_000 });
  }
}
