// src/pages/AccountsOverviewPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class AccountsOverviewPage extends BasePage {
  private sel = {
    table: '#accountTable',
    rows:  '#accountTable tr',
    links: '#accountTable a',
  };

  /** Normalize currency text like `$1,234.56` → `1234.56` (0 if unparsable). */
  private parseMoney(txt?: string | null): number {
    const cleaned = (txt ?? '').trim().replace(/[$,]/g, '');
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  /** Wait until the overview table is rendered with header + at least one data row and at least one numeric id link. */
  private async waitForLoaded() {
    const table = this.page.locator(this.sel.table);
    await table.waitFor({ state: 'visible', timeout: 20_000 });

    // Header row index 0 + first data row index 1 exist.
    await expect
      .poll(async () => {
        const count = await this.page.locator(this.sel.rows).count();
        return count;
      }, { timeout: 20_000 })
      .toBeGreaterThan(1);

    // At least one numeric account link exists.
    await expect
      .poll(async () => {
        const txt = (await this.page.locator(this.sel.links).first().textContent())?.trim() ?? '';
        return /^\d+$/.test(txt);
      }, { timeout: 10_000 })
      .toBe(true);
  }

  /**
   * Parse the balances table into { id, balance } per data row.
   * Assumes Balance is column index 2 (matches ParaBank UI).
   */
  async balances(): Promise<Array<{ id: string; balance: number }>> {
    await this.waitForLoaded();

    const rows = this.page.locator(this.sel.rows);
    const out: { id: string; balance: number }[] = [];

    const count = await rows.count();
    for (let i = 1; i < count; i++) { // skip header row at index 0
      const row = rows.nth(i);
      const id = (await row.getByRole('link').first().textContent())?.trim() || '';
      const balText = (await row.locator('td').nth(2).textContent())?.trim();
      const balance = this.parseMoney(balText);
      if (id) out.push({ id, balance });
    }

    // Structural sanity: every parsed row must have a numeric id.
    for (const r of out) expect(r.id).toMatch(/^\d+$/);

    return out;
  }

  /** Robust: wait until the exact account id link is visible, then confirm the parsed list includes it. */
  async assertHasAccount(id: string) {
    expect(id).toMatch(/^\d+$/);

    const link = this.page.locator(this.sel.links, { hasText: id });
    await expect(link).toBeVisible({ timeout: 20_000 });

    const allIds = (await this.page.locator(this.sel.links).allTextContents())
      .map(s => s.trim())
      .filter(Boolean);
    expect(allIds).toContain(id);
  }

  /** Convenience: fetch the numeric balance for a specific account id. */
  async getBalanceById(id: string): Promise<number> {
    await this.waitForLoaded();

    const rows = this.page.locator(this.sel.rows);
    const count = await rows.count();

    for (let i = 1; i < count; i++) {
      const row = rows.nth(i);
      const linkText = (await row.getByRole('link').first().textContent())?.trim();
      if (linkText === id) {
        const balText = (await row.locator('td').nth(2).textContent())?.trim();
        return this.parseMoney(balText);
      }
    }

    throw new Error(`Balance row not found for account ${id}`);
  }

  /** Returns all account ids currently shown in the table. */
  async getAllAccountIds(): Promise<string[]> {
    await this.waitForLoaded();
    const ids = await this.page.locator(this.sel.links).allTextContents();
    return ids.map(s => s.trim()).filter(Boolean);
  }

  /**
   * Assert that a balance changed by ~expectedDelta (±), within a rounding tolerance.
   * Useful after transfers or bill payments.
   */
  async assertBalanceDelta(id: string, before: number, expectedDelta: number, tolerance = 0.01) {
    const after = await this.getBalanceById(id);
    const delta = Math.round((after - before) * 100) / 100;
    expect(Math.abs(delta - expectedDelta)).toBeLessThanOrEqual(tolerance);
  }
}
