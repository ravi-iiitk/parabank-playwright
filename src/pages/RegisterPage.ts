// src/pages/RegisterPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export interface RegisterUser {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

export class RegisterPage extends BasePage {
  private sel = {
    form:     '#customerForm',
    first:    'input#customer\\.firstName',
    last:     'input#customer\\.lastName',
    addr:     'input#customer\\.address\\.street',
    city:     'input#customer\\.address\\.city',
    state:    'input#customer\\.address\\.state',
    zip:      'input#customer\\.address\\.zipCode',
    phone:    'input#customer\\.phoneNumber',
    ssn:      'input#customer\\.ssn',
    user:     'input#customer\\.username',
    pass:     'input#customer\\.password',
    confirm:  'input#repeatedPassword',
    submit:   'input[type="submit"][value="Register"]',

    // messages
    successText: /Your account was created successfully/i,
    duplicateText: /(username.*already exists|user already exists)/i
  };

  /**
   * Fill and submit the registration form.
   * By default assumes you already navigated to /parabank/register.htm.
   * Pass { navigate: true } to navigate here inside the method.
   */
  async register(user: RegisterUser, opts?: { navigate?: boolean }) {
    if (opts?.navigate) {
      await this.goto('/parabank/register.htm');
    }

    await this.page.locator(this.sel.form).waitFor({ state: 'visible', timeout: 20_000 });

    // Use BasePage.fillAndAssert for stability
    await this.fillAndAssert(this.sel.first,   user.firstName);
    await this.fillAndAssert(this.sel.last,    user.lastName);
    await this.fillAndAssert(this.sel.addr,    user.address);
    await this.fillAndAssert(this.sel.city,    user.city);
    await this.fillAndAssert(this.sel.state,   user.state);
    await this.fillAndAssert(this.sel.zip,     user.zipCode);
    await this.fillAndAssert(this.sel.phone,   user.phoneNumber);
    await this.fillAndAssert(this.sel.ssn,     user.ssn);
    await this.fillAndAssert(this.sel.user,    user.username);
    await this.fillAndAssert(this.sel.pass,    user.password);
    await this.fillAndAssert(this.sel.confirm, user.password);

    const submit = this.page.locator(this.sel.submit);
    await submit.waitFor({ state: 'visible' });
    await submit.click();

    // Wait for success or a duplicate-username style error to show up
    const success = this.page.getByText(this.sel.successText);
    const duplicate = this.page.getByText(this.sel.duplicateText);

    const outcome = await Promise.race([
      success.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'success').catch(() => null),
      duplicate.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'duplicate').catch(() => null),
    ]);

    expect(outcome, 'Registration did not succeed and no known error appeared').toBeTruthy();
    if (outcome !== 'success') {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Registration failed (likely duplicate username). Page said:\n${bodyText}`);
    }
  }

  /** Explicit success assertion (optional to call separately). */
  async assertRegistrationSuccess(expectedUsername?: string) {
    await expect(this.page.getByText(this.sel.successText)).toBeVisible({ timeout: 20_000 });

    // Some skins echo username in a heading; assert softly if present
    if (expectedUsername) {
      const heading = this.page.locator('#rightPanel h1.title');
      if (await heading.isVisible().catch(() => false)) {
        await expect(heading).toContainText(expectedUsername);
      }
    }
  }

  /**
   * Optional helper: retries with a short random suffix if the username collides.
   * Returns the final username used (so your test can keep track if needed).
   */
  async registerEnsuringUnique(user: RegisterUser, maxAttempts = 3): Promise<string> {
    let attemptUser = user.username;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.register({ ...user, username: attemptUser });
        return attemptUser; // success
      } catch (e) {
        const msg = String(e);
        if (!this.sel.duplicateText.test(msg) && !/already exists/i.test(msg)) {
          throw e; // not a duplicate-username issue
        }
        // make a shorter unique suffix to avoid overly long usernames
        const suffix = Math.random().toString(36).slice(2, 7);
        attemptUser = `${user.username}-${suffix}`;
        // re-focus username+confirm fields before retrying
        await this.fillAndAssert(this.sel.user, attemptUser);
        await this.fillAndAssert(this.sel.confirm, user.password);
        await this.page.locator(this.sel.submit).click();
        // next loop iteration will handle outcome wait
        // but to keep consistent, just continue; the next try/catch will wait again
      }
    }
    throw new Error(`Unable to register a unique username after ${maxAttempts} attempts`);
  }
}
