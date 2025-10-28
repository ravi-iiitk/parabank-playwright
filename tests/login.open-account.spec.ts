import { test } from '../src/fixtures/test-fixtures';
import { SecureStore } from '../src/utils/secureStore';
import { Routes } from '../src/config/routes';

test.describe('Login → Open Account (using saved creds)', () => {
  test('login and open a SAVINGS account; verify in overview', async ({ page, pages }) => {
    // ── Load last saved creds (encrypted at rest) ───────────────────────────────
    const { username, password } = await SecureStore.loadLatestUser();

    // ── Login & assert post-login state ────────────────────────────────────────
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await pages.login.login(username, password);
    await pages.login.assertLoggedIn(); // left nav + logout visible

    // ── Snapshot current accounts (for delta assertion) ────────────────────────
    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    const beforeIds = await pages.overview.getAllAccountIds();

    // ── Open a SAVINGS account ─────────────────────────────────────────────────
    await page.goto(Routes.openAccount, { waitUntil: 'domcontentloaded' });
    const newId = await pages.openAccount.openSavings(); // asserts #newAccountId is numeric

    // ── Verify the new account appears in Overview ─────────────────────────────
    await page.goto(Routes.accountsOverview, { waitUntil: 'domcontentloaded' });
    await pages.overview.assertHasAccount(newId);

    // List should now contain the new id; size should be >= previous size + 1
    const afterIds = await pages.overview.getAllAccountIds();
    const afterHasNew = afterIds.includes(newId);

    // Primary assertion: new id present
    test.expect(afterHasNew).toBeTruthy();

    // Secondary (tolerant) assertion: count increased by at least one.
    // Some environments may auto-create an initial account on first login.
    test.expect(afterIds.length).toBeGreaterThanOrEqual(beforeIds.length + 1);

    // Optional: the new account should have a numeric balance column
    const bal = await pages.overview.getBalanceById(newId);
    test.expect(Number.isFinite(bal)).toBeTruthy();
  });
});
