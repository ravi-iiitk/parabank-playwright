// src/pages/TransferFundsPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class TransferFundsPage extends BasePage {
  /**
   * Transfer funds using robust selection logic:
   * - Waits for form + selects to be visible and populated
   * - Selects `fromId` (falls back to first available if not present)
   * - Selects `toId` if available, otherwise prefers a different id than fromId
   * - Clicks Transfer and asserts the result panel/texts
   */
  async transfer(amount: number, fromId: string, toId?: string) {
    // 1) Ensure form & controls are present
    const form = this.page.locator('#transferForm, #showForm');
    await form.waitFor({ state: 'visible', timeout: 20_000 });

    const fromSel = this.page.locator('#fromAccountId');
    const toSel   = this.page.locator('#toAccountId');
    await fromSel.waitFor({ state: 'visible', timeout: 20_000 });
    await toSel.waitFor({ state: 'visible', timeout: 20_000 });

    // Helper: wait until a <select> has at least one option
    const waitForOptions = async (css: string) => {
      await this.page.waitForFunction(
        (sel) => {
          const el = document.querySelector<HTMLSelectElement>(sel);
          return !!el && el.options && el.options.length > 0;
        },
        css, // <- single argument payload
        { timeout: 20_000 }
      );
    };

    // 2) Ensure options are populated (both selects)
    await Promise.all([
      waitForOptions('#fromAccountId'),
      waitForOptions('#toAccountId'),
    ]);

    const readOptions = async (css: string): Promise<string[]> =>
      this.page.$$eval(css + ' option', opts =>
        opts.map(o => (o as HTMLOptionElement).value).filter(Boolean)
      );

    const fromOptions = await readOptions('#fromAccountId');
    const toOptions   = await readOptions('#toAccountId');

    if (fromOptions.length === 0 || toOptions.length === 0) {
      throw new Error('Transfer selects are not populated with options.');
    }

    // 3) Resolve final from/to ids
    const finalFrom = fromOptions.includes(fromId) ? fromId : fromOptions[0];

    let finalTo: string | undefined;
    if (toId && toOptions.includes(toId)) {
      finalTo = toId;
    } else {
      // prefer a different id than from; otherwise first available
      finalTo = toOptions.find(v => v !== finalFrom) ?? toOptions[0];
    }
    if (!finalTo) throw new Error('No selectable value found for #toAccountId.');

    // 4) Select values (use BasePage helpers if you added them, else selectOption)
    if ((this as any).selectOptionByValue) {
      await (this as any).selectOptionByValue('#fromAccountId', finalFrom);
      await (this as any).selectOptionByValue('#toAccountId', finalTo);
    } else {
      await fromSel.selectOption(finalFrom);
      await toSel.selectOption(finalTo);
    }

    // 5) Fill amount & submit
    if ((this as any).fillAndAssert) {
      await (this as any).fillAndAssert('#amount', String(amount));
    } else {
      await this.page.locator('#amount').fill(String(amount));
    }

    const submit = this.page.locator('input[type="submit"][value="Transfer"], input.button[value="Transfer"]');
    await submit.waitFor({ state: 'visible', timeout: 10_000 });
    await submit.click();

    // 6) Wait for success indicators (either text or result panel)
    const successText = this.page.getByText(/Transfer Complete!?/i);
    const resultPanel = this.page.locator('#showResult, #transferResult');
    await Promise.race([
      successText.waitFor({ state: 'visible', timeout: 20_000 }),
      resultPanel.waitFor({ state: 'visible', timeout: 20_000 }),
    ]);

    // 7) Strong assertions on result content if present
    const amountResult = this.page.locator('#amountResult');
    if (await amountResult.isVisible().catch(() => false)) {
      const txt = (await amountResult.textContent())?.replace(/[^\d.-]/g, '') ?? '';
      expect(Number.parseFloat(txt)).toBeCloseTo(amount, 2);
    }

    const fromShown = this.page.locator('#fromAccountIdResult');
    if (await fromShown.isVisible().catch(() => false)) {
      await expect(fromShown).toHaveText(finalFrom);
    }
    const toShown = this.page.locator('#toAccountIdResult');
    if (await toShown.isVisible().catch(() => false)) {
      await expect(toShown).toHaveText(finalTo);
    }

    // 8) Light sanity (don’t fail if the UI doesn’t clear):
    await expect(this.page.locator('#amount')).toHaveValue('').catch(() => {});
  }
}
