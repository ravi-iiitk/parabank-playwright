import { test } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';

test.describe('Login → Open Account (using saved creds)', () => {
  test('login and open a savings account', async ({ page, pages }) => {
    const { username, password } = await SecureStore.loadLatestUser();

    await page.goto(Routes.login);
    await pages.login.login(username, password);

    await page.goto(Routes.openAccount);
    const newId = await pages.openAccount.openSavings();

    await page.goto(Routes.accountsOverview);
    await pages.overview.assertHasAccount(newId);
  });
});
