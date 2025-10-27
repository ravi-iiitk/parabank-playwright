import { BasePage } from './BasePage';
import { Locator, expect } from '@playwright/test';

type LeftItem = { label: string; path: string };
type HeaderItem = { label: string; path?: string; href?: string };

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

  /** Ensure left nav rendered */
  private async waitLeftNavReady() {
    await expect(this.page.locator('#leftPanel h2')).toHaveText('Account Services');
    await expect(this.navLinks.first()).toBeVisible();
  }

  /** Ensure header menu rendered */
  private async waitHeaderReady() {
    await expect(this.headerLis.first()).toBeVisible();
  }

  /** Return visible left nav texts */
  async getNavTexts(): Promise<string[]> {
    await this.waitLeftNavReady();
    const texts = await this.navLinks.allTextContents();
    return texts.map(s => s.trim()).filter(Boolean);
  }

  /** Verify left “Account Services” navigation */
  async verifyAccountServicesNavigation(items: LeftItem[]) {
    await this.waitLeftNavReady();
    for (const it of items) {
      const link = this.navLinks.filter({ hasText: it.label }).first();
      await expect(link, `Left nav link "${it.label}" should be visible`).toBeVisible();
      const href = (await link.getAttribute('href')) || '';
      expect(href.includes(it.path), `"${it.label}" href "${href}" should include "${it.path}"`).toBeTruthy();
    }
  }

  /** Verify header navigation (Solutions may be a plain <li>) */
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
