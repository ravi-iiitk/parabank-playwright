// tests/open-savings.spec.ts
import { test, expect } from '@playwright/test';
import { fakeCustomer, uniqueUsernameShort } from '../src/utils/data';
import { Routes } from '../src/config/routes';
import { RegisterPage } from '../src/pages/RegisterPage';
import { LoginPage } from '../src/pages/LoginPage';
import { OpenAccountPage } from '../src/pages/OpenAccountPage';

test('Register (random) → Log in → Open SAVINGS → capture account #', async ({ page }) => {
  // Use short unique username to avoid length/dup issues
  const base = fakeCustomer();
  const user = { ...base, username: uniqueUsernameShort('fabric'), password: 'Passw0rd!' };

  const register = new RegisterPage(page);
  const login = new LoginPage(page);
  const openAccount = new OpenAccountPage(page);

  // Go to login, then click Register from the page (no clickRegister helper needed)
  await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Register' }).click();

  // Register and assert success
  await register.register(user);
  await register.assertRegistrationSuccess(user.username);

  // Log out and log back in
  await page.getByRole('link', { name: 'Log Out' }).click();
  await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
  await login.login(user.username, user.password);
  await login.assertLoggedIn(new RegExp(`${user.firstName}|${user.lastName}`, 'i'));

  // Open new SAVINGS account and capture the ID
  await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
  const newAccountId = await openAccount.openSavings(); // selects SAVINGS + a valid "from" account
  expect(newAccountId).toMatch(/^\d+$/); // sanity

  // Ensure it shows up in Accounts Overview
  await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#accountTable')).toContainText(newAccountId);
});
