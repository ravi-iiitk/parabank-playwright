import { expect, Locator, Page } from '@playwright/test';

export async function expectUrlContains(page: Page, part: string) {
  const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(escaped));
}

export async function expectCurrency(text: string) {
  expect(text).toMatch(/^\$?\-?\d[\d,]*\.\d{2}$/);
}

export async function expectVisible(l: Locator) {
  await expect(l).toBeVisible();
}

export async function expectTextContains(l: Locator, s: string | RegExp) {
  await expect(l).toContainText(s);
}
