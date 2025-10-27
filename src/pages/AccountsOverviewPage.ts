import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class AccountsOverviewPage extends BasePage {
  /**
   * Waits robustly for the overview table:
   * - waits for #accountTable to be attached
   * - then waits until there's at least 1 data row AND the first data row has a link
   */
  async balances() {
    const table = this.page.locator('#accountTable');
    await table.waitFor({ state: 'attached', timeout: 30_000 });

    await this.page.waitForFunction(() => {
      const t = document.querySelector('#accountTable');
      if (!t) return false;
      const rows = t.querySelectorAll('tr');
      if (rows.length < 2) return false;               // header + at least 1 data row
      const firstDataRow = rows[1];
      return !!firstDataRow.querySelector('a');        // link with account id exists
    }, { timeout: 30_000 });

    const rows = this.page.locator('#accountTable tr');

    const data: { id: string; balance: number }[] = [];
    const count = await rows.count();
    for (let i = 1; i < count; i++) {
      const row = rows.nth(i);
      const id = (await row.getByRole('link').first().textContent())?.trim() || '';
      const balText = (await row.locator('td').nth(2).textContent())?.trim() || '0.00';
      const balance = parseFloat(balText.replace(/[$,]/g, '')) || 0;
      if (id) data.push({ id, balance });
    }
    return data;
  }

  /**
   * Explicitly waits for the exact account-id link to appear.
   */
  async assertHasAccount(id: string) {
    const link = this.page.locator('#accountTable a', { hasText: id });
    await expect(link).toBeVisible({ timeout: 30_000 });

    const allIds = (await this.page.locator('#accountTable a').allTextContents())
      .map(s => s.trim()).filter(Boolean);
    expect(allIds).toContain(id);
  }
}
