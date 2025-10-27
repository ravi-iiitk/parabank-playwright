import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class AccountsOverviewPage extends BasePage {
  /**
   * Parses the balances table (#accountTable).
   */
  async balances() {
    // Wait for header + at least one data row: row index 1 must exist
    await this.page.waitForSelector('#accountTable tr >> nth=1', { timeout: 20_000 });

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
   * Robust: explicitly wait until the exact account id link is visible,
   * then confirm the parsed list includes it.
   */
  async assertHasAccount(id: string) {
    const link = this.page.locator('#accountTable a', { hasText: id });
    await expect(link).toBeVisible({ timeout: 20_000 });

    const allIds = (await this.page.locator('#accountTable a').allTextContents())
      .map(s => s.trim())
      .filter(Boolean);
    expect(allIds).toContain(id);
  }
}
