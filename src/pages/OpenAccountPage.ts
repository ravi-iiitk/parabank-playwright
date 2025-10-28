import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class OpenAccountPage extends BasePage {
  /**
   * Opens a SAVINGS account and returns the new account id.
   * - Uses real IDs: #type (value "1" = SAVINGS), #fromAccountId
   * - Waits until the "from account" select is truly populated
   * - Clicks the exact <input type="button" value="Open New Account">
   * - Asserts success panel and extracts #newAccountId
   */
  async openSavings(fromAccountId?: string) {
    // Ensure the form is visible
    await this.page.locator('#openAccountForm').waitFor({ state: 'visible', timeout: 20_000 });

    // 1) Select SAVINGS (ParaBank uses value "1" for SAVINGS)
    await this.selectOptionByValue('#type', '1');

    // 2) Ensure "From account" select is visible and POPULATED
    const fromSel = this.page.locator('#fromAccountId');
    await fromSel.waitFor({ state: 'visible', timeout: 20_000 });

    // Wait until it actually has at least one meaningful option
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector<HTMLSelectElement>(sel);
        if (!el || !el.options || el.options.length === 0) return false;
        return Array.from(el.options).some(o => !!o.value && !!o.textContent?.trim());
      },
      '#fromAccountId',
      { timeout: 20_000 }
    );

    // 3) Select the desired "from" account (or first visible option)
    if (fromAccountId) {
      await this.selectOptionByValue('#fromAccountId', fromAccountId);
    } else {
      const firstVal = await this.page.evaluate(() => {
        const el = document.querySelector<HTMLSelectElement>('#fromAccountId');
        if (!el) return null;
        const opt = Array.from(el.options).find(o => !o.hidden && o.value && (o.textContent ?? '').trim());
        return opt?.value ?? null;
      });
      if (!firstVal) {
        // Last-ditch: read the raw values and pick index 0 if present
        const raw = await this.page.$$eval('#fromAccountId option', opts =>
          opts.map(o => (o as HTMLOptionElement).value).filter(Boolean)
        );
        if (!raw.length) throw new Error('No options available in #fromAccountId after waiting.');
        await this.selectOptionByValue('#fromAccountId', raw[0]);
      } else {
        await this.selectOptionByValue('#fromAccountId', firstVal);
      }
    }

    // 4) Submit
    const btn = this.page.locator('input[type="button"][value="Open New Account"]');
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();

    // 5) Assert success panel and capture the new account id
    const resultPanel = this.page.locator('#openAccountResult');
    await resultPanel.waitFor({ state: 'visible', timeout: 20_000 });

    const newIdEl = this.page.locator('#newAccountId');
    await expect(newIdEl).toBeVisible({ timeout: 20_000 });

    const acct = (await newIdEl.textContent())?.trim() ?? '';
    expect(acct).toMatch(/^\d+$/);

    return acct;
  }
}
