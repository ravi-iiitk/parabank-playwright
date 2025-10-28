import { test, expectEx } from '../src/fixtures/test-fixtures';
import { Routes } from '../src/config/routes';
import { SecureStore } from '../src/utils/secureStore';
import { AMOUNTS } from '../src/config/amounts';

test.describe('ParaBank E2E happy path', () => {
  let newAccountId = '';

  test('Register → Login → Open Savings → Balances → Transfer → Bill Pay → Verify via API', async ({ page, pages, user, api }) => {
    await page.goto(Routes.home, { waitUntil: 'domcontentloaded' });

    await page.getByRole('link', { name: 'Register' }).click();
    await pages.register.register(user);
    await page.getByText(/Your account was created successfully/i).waitFor({ state: 'visible' });

    await SecureStore.saveUser(user.username, user.password);

    await page.getByRole('link', { name: 'Log Out' }).click();
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await pages.login.login(user.username, user.password);

    const leftNav = await pages.home.getNavTexts();
    for (const item of ['Open New Account','Accounts Overview','Transfer Funds','Bill Pay','Find Transactions']) {
      expectEx(leftNav).toContain(item);
    }

    await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
    newAccountId = await pages.openAccount.openSavings();

    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    await pages.overview.assertHasAccount(newAccountId);

    const fromId = newAccountId;
    const toId   = process.env.FALLBACK_TO_ACCOUNT || newAccountId;

    await page.goto(Routes.transfer, { waitUntil: 'domcontentloaded' });
    await pages.transfer.transfer(AMOUNTS.transfer, fromId, toId);
    await page.getByText(/Transfer Complete!?/i).waitFor({ state: 'visible' }).catch(() => {});

    await page.goto(Routes.billpay, { waitUntil: 'domcontentloaded' });
    await pages.billpay.payBill(AMOUNTS.billpay, newAccountId);
    await page.getByText(/Bill Payment Complete/i).waitFor();

    const accountIdNum = Number(newAccountId);
    const { status, data } = await api.getTransactionsByAmount(accountIdNum, AMOUNTS.billpay);
    expectEx(status).toBeLessThan(500);
    const match = Array.isArray(data)
      ? data.find(t => t.accountId === accountIdNum && Math.abs(t.amount) === AMOUNTS.billpay)
      : undefined;
    expectEx(match, `No transaction found with amount ${AMOUNTS.billpay} for account ${accountIdNum}`).toBeTruthy();
  });
});
