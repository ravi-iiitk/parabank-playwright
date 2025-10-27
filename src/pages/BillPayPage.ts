import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class BillPayPage extends BasePage {
  async payBill(amount: number, accountId: string) {
    await this.page.goto('/parabank/billpay.htm', { waitUntil: 'domcontentloaded' });

    // use direct name= selectors; the page validates client-side
    const f = (n: string) => `input[name="${n}"]`;
    await this.page.locator(f('payee.name')).fill('Test Payee');
    await this.page.locator(f('payee.address.street')).fill('221B Baker');
    await this.page.locator(f('payee.address.city')).fill('Kolkata');
    await this.page.locator(f('payee.address.state')).fill('WB');
    await this.page.locator(f('payee.address.zipCode')).fill('700001');
    await this.page.locator(f('payee.phoneNumber')).fill('9999999999');
    await this.page.locator(f('payee.accountNumber')).fill('999999');
    await this.page.locator(f('verifyAccount')).fill('999999');
    await this.page.locator(f('amount')).fill(String(amount));
    await this.page.locator('select[name="fromAccountId"]').selectOption(accountId);

    await this.page.getByRole('button', { name: 'Send Payment' }).click();

    await expect(this.page.locator('#billpayResult')).toBeVisible();
    await expect(this.page.locator('#fromAccountId')).toContainText(accountId);
  }
}
