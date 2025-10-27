import { test, expect } from '@playwright/test';
import { fakeCustomer, uniqueUsername } from '../src/utils/data';
import { Routes } from '../src/config/routes';
import { RegisterPage } from '../src/pages/RegisterPage';
import { LoginPage } from '../src/pages/LoginPage';
import { OpenAccountPage } from '../src/pages/OpenAccountPage';

test('Register (random) → Log in → Open SAVINGS → capture account #', async ({ page }) => {
  // Generate unique data so registration never collides
  const base = fakeCustomer();
  const user = { ...base, username: uniqueUsername('fabric'), password: 'Passw0rd!' };

  const register = new RegisterPage(page);
  const login = new LoginPage(page);
  const openAccount = new OpenAccountPage(page);

  // Go to home and register
  await page.goto(Routes.login);
  await login.clickRegister();
  await register.register(user);
  await register.assertRegistrationSuccess(user.username);

  // Log out and log back in (as requested)
  await page.getByRole('link', { name: 'Log Out' }).click();
  await page.goto(Routes.login);
  await login.login(user.username, user.password);

  // Open new SAVINGS account and capture ID
  await page.goto(Routes.openAccount);
  const newAccountId = await openAccount.openSavings(); // or pass fromAccountId if desired

  // Sanity: confirm the ID is digits
  expect(newAccountId).toMatch(/^\d+$/);

  // (Optional) Navigate to Accounts Overview and ensure the new account is listed
  await page.goto(Routes.accountsOverview);
  await expect(page.locator('#accountTable')).toContainText(newAccountId);
});
