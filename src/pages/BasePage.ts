import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}
  link(text: string): Locator { return this.page.getByRole('link', { name: text }); }
  async goto(path: string) { await this.page.goto(path); }
  async assertTitleContains(txt: string) { await expect(this.page).toHaveTitle(new RegExp(txt, 'i')); }
}