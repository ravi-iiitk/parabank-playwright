// src/pages/BillPayPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

type PayeeInput = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  account: string;
};

export class BillPayPage extends BasePage {
  /**
   * Pays a bill from the given account and asserts the success details.
   * Uses resilient helpers from BasePage and verifies the echoed values.
   *
   * @param amount   numeric amount to pay (e.g. 12)
   * @param accountId account id to debit (e.g. "15342")
   * @param payee    optional override for payee fields (defaults deterministic)
   */
  async payBill(
    amount: number,
    accountId: string,
    payee: Partial<PayeeInput> = {}
  ) {
    // Open Bill Pay (safe DOM-ready)
    await this.goto('/parabank/billpay.htm');

    // Deterministic defaults (stable across runs)
    const p: PayeeInput = {
      name:   'Test Payee',
      street: '221B Baker',
      city:   'Kolkata',
      state:  'WB',
      zip:    '700001',
      phone:  '9999999999',
      account:'999999',
      ...payee
    };

    // Convenience for name= selectors from the page source
    const f = (n: string) => `input[name="${n}"]`;

    // Fill, asserting each field actually took the value (de-flakes CI)
    await this.fillAndAssert(f('payee.name'),            p.name);
    await this.fillAndAssert(f('payee.address.street'),  p.street);
    await this.fillAndAssert(f('payee.address.city'),    p.city);
    await this.fillAndAssert(f('payee.address.state'),   p.state);
    await this.fillAndAssert(f('payee.address.zipCode'), p.zip);
    await this.fillAndAssert(f('payee.phoneNumber'),     p.phone);
    await this.fillAndAssert(f('payee.accountNumber'),   p.account);
    await this.fillAndAssert(f('verifyAccount'),         p.account);
    await this.fillAndAssert(f('amount'),                String(amount));

    // Select source account by value (helper waits until the option exists)
    await this.selectOptionByValue('select[name="fromAccountId"]', accountId);

    // Submit (the page uses <input type="button" value="Send Payment">)
    const submit = this.page.locator('input[type="button"][value="Send Payment"]');
    await submit.waitFor({ state: 'visible' });
    await submit.click();

    // Wait for success panel or success text (per page source ids)
    const resultPanel = this.page.locator('#billpayResult');
    const successText = this.page.getByText(/Bill Payment Complete/i);
    await Promise.race([
      resultPanel.waitFor({ state: 'visible' }),
      successText.waitFor({ state: 'visible' }),
    ]);

    // Assert echoed details
    // Payee
    const payeeEcho = this.page.locator('#payeeName');
    await expect(payeeEcho).toBeVisible();
    await expect(payeeEcho).toHaveText(p.name);

    // Amount (formatted as currency by the page JS: $12.00 etc.)
    const amountEcho = this.page.locator('#amount');
    await expect(amountEcho).toBeVisible();
    // Build a tolerant currency regex for the expected number (handles $12 or $12.00)
    const monetary = new RegExp(`^\\$?${amount.toFixed(2).replace('.', '\\.')}$|^\\$?${amount}(\\.00)?$`);
    await expect(amountEcho).toHaveText(monetary);

    // From account id
    const fromEcho = this.page.locator('#fromAccountId');
    await expect(fromEcho).toBeVisible();
    await expect(fromEcho).toHaveText(accountId);

    // Optional: amount input should be cleared after success
    await expect(this.page.locator(f('amount'))).toHaveValue('').catch(() => { /* some skins hide it */ });
  }
}
