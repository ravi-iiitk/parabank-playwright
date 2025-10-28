// src/pages/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  link(text: string): Locator {
    return this.page.getByRole('link', { name: text });
  }

  async goto(path: string) {
    // Keep consistent, but ensure DOM is parsed before you act
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async assertTitleContains(txt: string) {
    await expect(this.page).toHaveTitle(new RegExp(txt, 'i'));
  }

  /**
   * Reliable <select> helper:
   * - waits for the <select> to be visible
   * - waits until the desired option value actually exists (using expect.poll)
   * - then selects it
   */
  async selectOptionByValue(
    target: string | Locator,
    value: string,
    timeout = 20_000
  ) {
    const sel = typeof target === 'string' ? this.page.locator(target) : target;

    // Ensure the <select> is visible/attached
    await sel.waitFor({ state: 'visible', timeout });

    // Wait until options are populated
    await expect
      .poll(
        async () =>
          await sel.evaluate((el: Element) => {
            const select = el as HTMLSelectElement;
            return select?.options?.length ?? 0;
          }),
        { timeout }
      )
      .toBeGreaterThan(0);

    // Wait until the specific option value exists
    await expect
      .poll(
        async () =>
          await sel.evaluate(
            (el: Element, val: string) => {
              const select = el as HTMLSelectElement;
              if (!select) return false;
              return Array.from(select.options).some(
                (o) => !o.disabled && o.value === val
              );
            },
            value
          ),
        { timeout }
      )
      .toBe(true);

    // Now select the value
    await sel.selectOption(value);
  }

  /**
   * Fill a field and assert the value (helps with flaky inputs).
   * If the input sometimes keeps stale content, set `forceClear=true` to Ctrl/⌘+A then Delete first.
   */
  async fillAndAssert(
    target: string | Locator,
    value: string,
    timeout = 10_000,
    forceClear = false
  ) {
    const loc = typeof target === 'string' ? this.page.locator(target) : target;

    if (forceClear) {
      await loc.click({ timeout });
      // Windows/Linux: Control; macOS: Meta is handled by Playwright alias 'Mod'
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.press('Delete');
    }

    await loc.fill(value);
    await expect(loc).toHaveValue(value, { timeout });
  }
}
