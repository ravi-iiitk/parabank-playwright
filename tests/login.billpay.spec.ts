import { test } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';

test.describe('Login → Bill Pay (using saved creds)', () => {
  test('login and send a bill payment', async ({ page, pages }) => {
    const { username, password } = await SecureStore.loadLatestUser();

    // Login
    await page.goto(Routes.login);
    await pages.login.login(username, password);

    // Use first available account for bill pay (open one if none)
    await page.goto(Routes.accountsOverview);
    let list = await pages.overview.balances();
    if (!list.length) {
      await page.goto(Routes.openAccount);
      const id = await pages.openAccount.openSavings();
      await page.goto(Routes.accountsOverview);
      await pages.overview.assertHasAccount(id);
      list = await pages.overview.balances();
    }
    const accountId = list[0].id;

    // Pay
    await page.goto(Routes.billpay);
    await pages.billpay.payBill(12, accountId);

    await page.getByText(/Bill Payment Complete/i).waitFor();
  });
});
