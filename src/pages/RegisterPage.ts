// src/pages/RegisterPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class RegisterPage extends BasePage {
  private sel = {
    form: '#customerForm', // parent form has id="customerForm"
    firstName: 'input#customer\\.firstName',
    lastName: 'input#customer\\.lastName',
    address: 'input#customer\\.address\\.street',
    city: 'input#customer\\.address\\.city',
    state: 'input#customer\\.address\\.state',
    zip: 'input#customer\\.address\\.zipCode',
    phone: 'input#customer\\.phoneNumber',
    ssn: 'input#customer\\.ssn',
    username: 'input#customer\\.username',
    password: 'input#customer\\.password',
    confirm: 'input#repeatedPassword',
    submit: 'input[type="submit"][value="Register"]',
    successText: /Your account was created successfully/i,
  };

  /**
   * Fills the registration form and submits it.
   * Expects a `user` object with firstName,lastName,address,city,state,zipCode,phoneNumber,ssn,username,password.
   */
  async register(user: any) {
    // Make sure the form is there before filling
    await this.page.waitForSelector(this.sel.form, { state: 'visible', timeout: 20_000 });

    await this.page.locator(this.sel.firstName).fill(user.firstName);
    await this.page.locator(this.sel.lastName).fill(user.lastName);
    await this.page.locator(this.sel.address).fill(user.address);
    await this.page.locator(this.sel.city).fill(user.city);
    await this.page.locator(this.sel.state).fill(user.state);
    await this.page.locator(this.sel.zip).fill(user.zipCode);
    await this.page.locator(this.sel.phone).fill(user.phoneNumber);
    await this.page.locator(this.sel.ssn).fill(user.ssn);
    await this.page.locator(this.sel.username).fill(user.username);
    await this.page.locator(this.sel.password).fill(user.password);
    await this.page.locator(this.sel.confirm).fill(user.password);

    await this.page.locator(this.sel.submit).click();

    // Either: “Your account was created successfully.” or “… You are now logged in.”
    await expect(this.page.getByText(this.sel.successText)).toBeVisible({ timeout: 20_000 });
  }
}
