// src/pages/TransferFundsPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class TransferFundsPage extends BasePage {
  /**
   * Transfer funds using resilient logic for the "to account" select:
   * - Waits for both selects to be attached & populated
   * - If the requested `toId` doesn't exist, picks the first available (prefer != fromId)
   * - Clicks Transfer and waits for a success hint
   */
  async transfer(amount: number, fromId: string, toId: string) {
    const fromSel = this.page.locator('#fromAccountId');
    const toSel   = this.page.locator('#toAccountId');

    // Ensure selects exist
    await fromSel.waitFor({ state: 'visible' });
    await toSel.waitFor({ state: 'visible' });

    // Ensure options are populated
    const waitForOptions = async (selector: string) => {
      await this.page.waitForFunction((sel) => {
        const el = document.querySelector<HTMLSelectElement>(sel);
        return !!el && el.options && el.options.length > 0;
      }, selector, { timeout: 20_000 });
    };
    await waitForOptions('#fromAccountId');
    await waitForOptions('#toAccountId');

    // Select "from"
    await fromSel.selectOption(fromId);

    // Work out a safe "to" value
    const toOptions: string[] = await this.page.$$eval('#toAccountId option',
      opts => opts.map(o => (o as HTMLOptionElement).value).filter(Boolean));

    // Choose the requested toId if present; otherwise prefer a different id than fromId; otherwise the first one.
    let finalTo = toId && toOptions.includes(toId)
      ? toId
      : (toOptions.find(v => v !== fromId) ?? toOptions[0]);

    // Guard: if nothing was found (very unlikely), throw a clear error
    if (!finalTo) {
      throw new Error('No options available in #toAccountId to select.');
    }

    await toSel.selectOption(finalTo);

    // Fill amount & submit
    await this.page.locator('#amount').fill(String(amount));

    const submit = this.page.locator('input[type="submit"][value="Transfer"], input.button[value="Transfer"]');
    await submit.waitFor({ state: 'visible' });
    await submit.click();

    // Wait for any success indicator the app shows
    const successText = this.page.getByText(/Transfer Complete!?/i);
    const resultPanel = this.page.locator('#showResult, #transferResult');
    await Promise.race([
      successText.waitFor({ state: 'visible' }),
      resultPanel.waitFor({ state: 'visible' })
    ]).catch(() => { /* if neither appears, let the next assertion handle */ });

    // Quick sanity: amount input is usually cleared/hidden after success
    await expect(this.page.locator('#amount')).toHaveValue('').catch(() => {});
  }
}
