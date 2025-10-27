import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class OpenAccountPage extends BasePage {
  /**
   * Opens a SAVINGS account.
   * - Uses the real IDs on the page: #type and #fromAccountId
   * - Waits until the "fromAccount" list is truly populated (visible + options > 0)
   * - Clicks the exact input button for "Open New Account"
   * - Returns the new account id from #newAccountId
   */
  async openSavings(fromAccountId?: string) {
    // The account-type select is <select id="type"> with option value "1" = SAVINGS
    await this.page.locator('#type').waitFor({ state: 'visible' });
    await this.page.selectOption('#type', { value: '1' });

    // "From account" options are injected asynchronously; wait until at least one visible option exists.
    const fromSel = this.page.locator('#fromAccountId');
    await fromSel.waitFor({ state: 'visible' });

    await this.page.waitForFunction(() => {
      const el = document.querySelector<HTMLSelectElement>('#fromAccountId');
      if (!el) return false;
      const visibleOptions = [...el.options].filter(o => !o.hidden && o.value && o.textContent?.trim());
      return visibleOptions.length > 0;
    }, null, { timeout: 20_000 });

    if (fromAccountId) {
      await this.page.selectOption('#fromAccountId', fromAccountId);
    } else {
      // Pick the first *visible* option
      const first = await this.page.evaluate(() => {
        const el = document.querySelector<HTMLSelectElement>('#fromAccountId');
        if (!el) return null;
        const opt = [...el.options].find(o => !o.hidden && o.value);
        return opt?.value ?? null;
      });
      if (first) await this.page.selectOption('#fromAccountId', first);
    }

    // The button on this page is an <input type="button" value="Open New Account">
    const btn = this.page.locator('input[type="button"][value="Open New Account"]');
    await btn.waitFor({ state: 'visible' });
    await btn.click();

    // New account id appears in #newAccountId (inside the result panel)
    const newIdEl = this.page.locator('#newAccountId');
    await expect(newIdEl).toBeVisible({ timeout: 20_000 });
    const acct = (await newIdEl.textContent())?.trim() || '';
    expect(acct).toMatch(/^\d+$/);

    return acct;
  }
}
