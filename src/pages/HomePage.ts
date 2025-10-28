// src/pages/HomePage.ts
import { BasePage } from './BasePage';
import { Locator, expect } from '@playwright/test';

export type LeftItem   = { label: string; path: string };
export type HeaderItem = { label: string; path?: string; href?: string };

export class HomePage extends BasePage {
  // Left “Account Services” links
  get navLinks(): Locator {
    return this.page.locator('#leftPanel ul li a');
  }

  // Header (top) menu
  private get headerLinks(): Locator {
    return this.page.locator('#headerPanel ul.leftmenu li a');
  }
  private get headerLis(): Locator {
    return this.page.locator('#headerPanel ul.leftmenu li');
  }

  /** Normalize text helper */
  private static norm(s?: string | null) {
    return (s ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Ensure left nav rendered */
  private async waitLeftNavReady(minLinks = 3) {
    const title = this.page.locator('#leftPanel h2');
    await expect(title).toBeVisible({ timeout: 20_000 });
    await expect(title).toHaveText(/account services/i);

    const links = this.navLinks;
    await expect(links.first()).toBeVisible({ timeout: 20_000 });

    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(minLinks);
  }

  /** Ensure header menu rendered */
  private async waitHeaderReady() {
    await expect(this.headerLis.first()).toBeVisible({ timeout: 20_000 });
  }

  /** Return visible left nav texts */
  async getNavTexts(): Promise<string[]> {
    await this.waitLeftNavReady();
    const texts = await this.navLinks.allTextContents();
    return texts.map(HomePage.norm).filter(Boolean);
  }

  /** Assert left nav contains all labels (order not enforced) */
  async assertLeftNavContains(labels: string[]) {
    const got = await this.getNavTexts();
    for (const lbl of labels) expect(got).toContain(lbl);
  }

  /** Click an item in left nav by its text */
  async clickLeftNav(label: string) {
    await this.waitLeftNavReady();
    const link = this.navLinks.filter({ hasText: label }).first();
    await expect(link, `Left nav link "${label}" should be visible`).toBeVisible();
    await link.click();
  }

  /** Verify left “Account Services” navigation targets */
  async verifyAccountServicesNavigation(items: LeftItem[]) {
    await this.waitLeftNavReady();
    for (const it of items) {
      const link = this.navLinks.filter({ hasText: it.label }).first();
      await expect(link, `Left nav link "${it.label}" should be visible`).toBeVisible();
      const href = (await link.getAttribute('href')) || '';
      expect(href.includes(it.path), `"${it.label}" href "${href}" should include "${it.path}"`).toBeTruthy();
    }
  }

  /** Verify header navigation (note: “Solutions” may be a plain <li> without a link) */
  async verifyHeaderNavigation(items: HeaderItem[]) {
    await this.waitHeaderReady();
    for (const it of items) {
      if (!it.path && !it.href) {
        const li = this.headerLis.filter({ hasText: it.label }).first();
        await expect(li, `Header item "${it.label}" should exist`).toBeVisible();
        continue;
      }
      const link = this.headerLinks.filter({ hasText: it.label }).first();
      await expect(link, `Header link "${it.label}" should be visible`).toBeVisible();
      const href = (await link.getAttribute('href')) || '';
      const want = it.href || it.path || '';
      expect(href.includes(want), `"${it.label}" href "${href}" should include "${want}"`).toBeTruthy();
    }
  }
}
