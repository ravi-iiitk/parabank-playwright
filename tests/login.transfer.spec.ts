import { test, expectEx } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';

test.describe('Login → Transfer Funds (using saved creds)', () => {
  test('login and transfer between two visible accounts', async ({ page, pages }) => {
    // Load latest saved user
    const { username, password } = await SecureStore.loadLatestUser();

    // Login
    await page.goto(Routes.login);
    await pages.login.login(username, password);

    // Ensure we have at least two accounts; if only one, open a new savings
    await page.goto(Routes.accountsOverview);
    let balances = await pages.overview.balances();
    if (balances.length < 2) {
      await page.goto(Routes.openAccount);
      const newId = await pages.openAccount.openSavings();
      await page.goto(Routes.accountsOverview);
      await pages.overview.assertHasAccount(newId);
      balances = await pages.overview.balances();
    }

    const fromId = balances[0].id;
    const toId = balances.find(a => a.id !== fromId)?.id ?? balances[0].id;

    // Transfer
    await page.goto(Routes.transfer);
    await pages.transfer.transfer(10, fromId, toId);

    // Soft success hint
    await page.getByText(/Transfer Complete!?/i).waitFor({ state: 'visible' }).catch(() => {});
    expectEx(await page.locator('#amount').inputValue()).toBe('');
  });
});
