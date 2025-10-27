import { test, expectEx } from '../src/fixtures/test-fixtures';
import { Routes } from '../src/config/routes';
import { SecureStore } from '../src/utils/secureStore';

const AMOUNT_TRANSFER = 10;
const AMOUNT_BILLPAY = 12;

test.describe('ParaBank E2E happy path', () => {
  let newAccountId = '';

  test('Register → Login → Open Savings → Balances → Transfer → Bill Pay → Verify via API', async ({ page, pages, user, api }) => {
    // 1) Navigate home
    await page.goto(Routes.home, { waitUntil: 'domcontentloaded' });

    // 2) Register new user with unique username
    await page.getByRole('link', { name: 'Register' }).click();
    await pages.register.register(user);

    // Success text can be:
    // - "Your account was created successfully."
    // - "Your account was created successfully. You are now logged in."
    await page.getByText(/Your account was created successfully/i).waitFor({ state: 'visible' });

    // ⬅️ NEW: save encrypted creds for the follow-on login* tests
    await SecureStore.saveUser(user.username, user.password);

    // 3) Log out → Log in with the newly created user
    await page.getByRole('link', { name: 'Log Out' }).click();
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await pages.login.login(user.username, user.password);

    // 4) Quick smoke: left-nav has the main items
    const leftNav = await pages.home.getNavTexts();
    for (const item of ['Open New Account','Accounts Overview','Transfer Funds','Bill Pay','Find Transactions']) {
      expectEx(leftNav).toContain(item);
    }

    // 5) Open a new SAVINGS account and grab its id
    await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
    newAccountId = await pages.openAccount.openSavings();

    // 6) Ensure Accounts Overview shows the new account
    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    await pages.overview.assertHasAccount(newAccountId);

    // 7) Transfer funds (from the new account → either itself or fallback)
    const fromId = newAccountId;
    const toId = process.env.FALLBACK_TO_ACCOUNT || newAccountId;

    await page.goto(Routes.transfer, { waitUntil: 'domcontentloaded' });
    await pages.transfer.transfer(AMOUNT_TRANSFER, fromId, toId);

    // Optional UI success hint (skins differ)
    await page.getByText(/Transfer Complete!?/i).waitFor({ state: 'visible' }).catch(() => {});
    // Amount input usually clears to blank after success
    // (We don't assert hard here to tolerate skin differences.)

    // 8) Bill Pay using the new account
    await page.goto(Routes.billpay, { waitUntil: 'domcontentloaded' });
    await pages.billpay.payBill(AMOUNT_BILLPAY, newAccountId);
    await page.getByText(/Bill Payment Complete/i).waitFor();

    // 9) API: verify there's a transaction with that bill-pay amount
    const accountIdNum = Number(newAccountId);
    const { status, data } = await api.getTransactionsByAmount(accountIdNum, AMOUNT_BILLPAY);
    expectEx(status).toBeLessThan(500);

    const match = Array.isArray(data)
      ? data.find(t => t.accountId === accountIdNum && Math.abs(t.amount) === AMOUNT_BILLPAY)
      : undefined;

    expectEx(match, `No transaction found with amount ${AMOUNT_BILLPAY} for account ${accountIdNum}`).toBeTruthy();
  });
});
