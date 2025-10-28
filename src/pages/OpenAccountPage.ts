// src/pages/OpenAccountPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class OpenAccountPage extends BasePage {
  /**
   * Opens a SAVINGS account and returns the new account id.
   * - Uses real IDs: #type (value "1" = SAVINGS), #fromAccountId
   * - Relies on BasePage.selectOptionByValue to avoid timing flakes
   * - Clicks the exact <input type="button" value="Open New Account">
   * - Asserts success panel and extracts #newAccountId
   */
  async openSavings(fromAccountId?: string) {
    // Ensure we're on the page and form is visible
    await this.goto('/parabank/openaccount.htm');
    await this.page.locator('#openAccountForm').waitFor({ state: 'visible', timeout: 20_000 });

    // 1) Select SAVINGS (ParaBank uses value "1" for SAVINGS)
    await this.selectOptionByValue('#type', '1');

    // 2) Ensure "From account" options are present and select either provided id or first visible
    //    (selectOptionByValue will itself wait until the requested value exists)
    if (fromAccountId) {
      await this.selectOptionByValue('#fromAccountId', fromAccountId);
    } else {
      // Discover the first visible option value (robust against empty/populating lists)
      const firstVal = await this.page.evaluate(() => {
        const el = document.querySelector<HTMLSelectElement>('#fromAccountId');
        if (!el) return null;
        const opt = Array.from(el.options).find(o => !o.hidden && o.value && (o.textContent ?? '').trim());
        return opt?.value ?? null;
      });
      if (!firstVal) throw new Error('No visible options found in #fromAccountId');
      await this.selectOptionByValue('#fromAccountId', firstVal);
    }

    // 3) Submit
    const btn = this.page.locator('input[type="button"][value="Open New Account"]');
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();

    // 4) Assert success panel, title and capture the new account id
    const resultPanel = this.page.locator('#openAccountResult');
    await resultPanel.waitFor({ state: 'visible', timeout: 20_000 });

    // Title is typically "Account Opened!"
    await expect(resultPanel.locator('h1.title')).toHaveText(/Account Opened!?/i);

    // New account link/id
    const newIdEl = this.page.locator('#newAccountId');
    await expect(newIdEl).toBeVisible({ timeout: 20_000 });

    const acct = (await newIdEl.textContent())?.trim() ?? '';
    expect(acct).toMatch(/^\d+$/);

    // Optional: the link should point to activity.htm?id=<acct>
    const href = (await newIdEl.getAttribute('href')) ?? '';
    expect(href).toContain(`activity.htm?id=${acct}`);

    return acct;
  }
}
