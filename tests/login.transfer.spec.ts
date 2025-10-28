import { test } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';

const TRANSFER_AMOUNT = Number(process.env.TRANSFER_AMOUNT || 10);

test.describe('Login → Transfer Funds (using saved creds)', () => {
  test('login and transfer between two visible accounts with balance assertions', async ({ page, pages }) => {
    // ── Load last saved credentials ────────────────────────────────────────────
    const { username, password } = await SecureStore.loadLatestUser();

    // ── Login & sanity checks ─────────────────────────────────────────────────
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await pages.login.login(username, password);
    await pages.login.assertLoggedIn();

    // ── Ensure we have at least two accounts; open one if needed ─────────────
    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    let ids = await pages.overview.getAllAccountIds();

    if (ids.length < 2) {
      await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
      const newId = await pages.openAccount.openSavings();
      await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
      await pages.overview.assertHasAccount(newId);
      ids = await pages.overview.getAllAccountIds();
    }

    // Pick two distinct accounts
    const fromId = ids[0];
    const toId   = ids.find(x => x !== fromId) ?? ids[0];

    // ── Capture balances before ───────────────────────────────────────────────
    const beforeFrom = await pages.overview.getBalanceById(fromId);
    const beforeTo   = await pages.overview.getBalanceById(toId);

    // ── Transfer ──────────────────────────────────────────────────────────────
    await page.goto(Routes.transfer, { waitUntil: 'domcontentloaded' });
    await pages.transfer.transfer(TRANSFER_AMOUNT, fromId, toId);

    // Soft success hint (UI variants tolerated)
    await page.getByText(/Transfer Complete!?/i).waitFor({ state: 'visible' }).catch(() => {});

    // ── Verify deltas in Accounts Overview ────────────────────────────────────
    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    await pages.overview.assertHasAccount(fromId);
    await pages.overview.assertHasAccount(toId);

    await pages.overview.assertBalanceDelta(fromId, beforeFrom, -TRANSFER_AMOUNT);
    await pages.overview.assertBalanceDelta(toId,   beforeTo,   +TRANSFER_AMOUNT);
  });
});
