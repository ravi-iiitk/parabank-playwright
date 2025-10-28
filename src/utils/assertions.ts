// src/utils/assertions.ts
import { expect, Locator, Page } from '@playwright/test';

/** Escape a string for use inside a RegExp. */
function reEscape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize whitespace: collapse runs of whitespace to a single space. */
export function normalizeWS(s?: string | null) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/** Assert current URL contains a substring (regex-escaped). */
export async function expectUrlContains(page: Page, part: string, timeout = 20_000) {
  await expect(page).toHaveURL(new RegExp(reEscape(part)), { timeout });
}

/** Parse currency like `$1,234.56`, `-1234.56`, `€ 1.00` → number. */
export function parseCurrency(text: string): number {
  const cleaned = text.replace(/[^\d.\-]/g, ''); // keep digits, dot, minus
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Assert a string looks like a currency; customizable. */
export function expectCurrency(
  text: string,
  opts: { allowSymbol?: boolean; allowNegative?: boolean } = {},
) {
  const { allowSymbol = true, allowNegative = true } = opts;
  const sym = allowSymbol ? '[^\\d\\s-]?' : ''; // any currency symbol or none
  const sign = allowNegative ? '-?' : '';
  const re = new RegExp(`^\\s*${sign}${sym}\\s*\\d[\\d,]*\\.\\d{2}\\s*$`);
  expect(text).toMatch(re);
}

/** Basic visible assertion with a default timeout. */
export async function expectVisible(l: Locator, timeout = 20_000) {
  await expect(l).toBeVisible({ timeout });
}

/** Basic hidden assertion with a default timeout. */
export async function expectHidden(l: Locator, timeout = 20_000) {
  await expect(l).toBeHidden({ timeout });
}

/** Assert locator contains text (string or regex), with whitespace normalization. */
export async function expectTextContains(
  l: Locator,
  s: string | RegExp,
  timeout = 20_000,
) {
  if (s instanceof RegExp) {
    await expect(l).toContainText(s, { timeout });
  } else {
    // normalize both sides
    const want = normalizeWS(s);
    const got = normalizeWS(await l.innerText());
    expect(got).toContain(want);
  }
}

/** Assert locator has exact text (normalized). */
export async function expectTextEquals(
  l: Locator,
  s: string | RegExp,
  timeout = 20_000,
) {
  if (s instanceof RegExp) {
    await expect(l).toHaveText(s, { timeout });
  } else {
    const want = normalizeWS(s);
    await expect(l).toHaveText(new RegExp(`^${reEscape(want)}$`), { timeout });
  }
}

/** Assert a <select> has at least `min` options. */
export async function expectSelectHasOptions(select: Locator, min = 1, timeout = 20_000) {
  await expect(select).toBeVisible({ timeout });
  await select.waitFor({ state: 'attached', timeout });
  const count = await select.locator('option').count();
  expect(count).toBeGreaterThanOrEqual(min);
}

/** Assert a <select> contains a specific option value (or text). */
export async function expectOptionsInclude(
  select: Locator,
  expected: { value?: string; label?: string },
) {
  const options = await select.locator('option').all();
  const values = await Promise.all(options.map(o => o.getAttribute('value')));
  const labels = await Promise.all(options.map(o => o.textContent().then(normalizeWS)));
  if (expected.value) expect(values).toContain(expected.value);
  if (expected.label) expect(labels).toContain(normalizeWS(expected.label));
}

/** Eventually-passes helper: poll a predicate until it returns true or timeout. */
export async function expectEventually(
  fn: () => Promise<boolean>,
  { timeout = 10_000, interval = 200, reason = 'Condition not met' } = {},
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await fn()) return;
    } catch {
      // ignore transient errors
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(reason);
}

/**
 * Track runtime console errors on a page. Call startConsoleErrorTracker(page) before actions,
 * then await assertNoConsoleErrors() at the end to assert there were none.
 */
export function startConsoleErrorTracker(page: Page) {
  const errors: string[] = [];
  const handler = (msg: any) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', handler);
  return {
    get errors() { return errors.slice(); },
    async assertNoConsoleErrors() {
      expect(errors, `Console errors found:\n${errors.join('\n')}`).toHaveLength(0);
    },
    dispose() { page.off('console', handler); },
  };
}
