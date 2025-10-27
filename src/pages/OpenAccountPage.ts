import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class OpenAccountPage extends BasePage {
  async openSavings(fromAccountId?: string) {
    // Use the real select by id (#type). ParaBank: value "1" = SAVINGS, "0" = CHECKING.
    await this.page.locator('#type').waitFor({ state: 'visible' });
    await this.page.selectOption('#type', '1'); // SAVINGS

    // From-account options populate asynchronously after load
    await this.page.waitForSelector('#fromAccountId', { state: 'visible', timeout: 20_000 });
    await this.page.waitForSelector('#fromAccountId option', { state: 'attached', timeout: 20_000 });

    if (fromAccountId) {
      // Try to use the account the test asked for; fall back to the first option if missing
      const opts = await this.page.locator('#fromAccountId option').allAttributeValues('value');
      const pick = opts.includes(fromAccountId) ? fromAccountId : (opts[0] ?? '');
      if (pick) await this.page.selectOption('#fromAccountId', pick);
    } else {
      const first = await this.page.locator('#fromAccountId option').first().getAttribute('value');
      if (first) await this.page.selectOption('#fromAccountId', first);
    }

    // Click the open button (input[type=button] value="Open New Account")
    const openBtn = this.page.locator('input[type="button"][value="Open New Account"], button:has-text("Open New Account")');
    await openBtn.waitFor({ state: 'visible' });
    await openBtn.click();

    // Result panel holds the new account id
    const newIdEl = this.page.locator('#newAccountId');
    await expect(newIdEl).toBeVisible({ timeout: 20_000 });
    const acct = (await newIdEl.textContent())?.trim() || '';
    expect(acct).toMatch(/^\d+$/);

    return acct;
  }
}
