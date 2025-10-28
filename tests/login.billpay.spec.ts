import { test } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';
import { AMOUNTS } from '../src/config/amounts';

test.describe('Login → Bill Pay (using saved creds)', () => {
  test('login and send a bill payment', async ({ page, pages }) => {
    const { username, password } = await SecureStore.loadLatestUser();

    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await pages.login.login(username, password);
    await pages.login.assertLoggedIn();

    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    let list = await pages.overview.balances();
    if (!list.length) {
      await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
      const id = await pages.openAccount.openSavings();
      await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
      await pages.overview.assertHasAccount(id);
      list = await pages.overview.balances();
    }
    const accountId = list[0].id;
    const before = await pages.overview.getBalanceById(accountId);

    await page.goto(Routes.billpay, { waitUntil: 'domcontentloaded' });
    await pages.billpay.payBill(AMOUNTS.billpay, accountId);

    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    await pages.overview.assertBalanceDelta(accountId, before, -AMOUNTS.billpay);
  });
});
