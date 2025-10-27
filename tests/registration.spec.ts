import { test } from '../src/fixtures/test-fixtures';
import { Routes } from '../src/config/routes';
import { SecureStore } from '../src/utils/secureStore';

test.describe('Register only (and persist encrypted creds)', () => {
  test('registers a brand-new user and stores creds', async ({ page, pages, user }) => {
    // Go straight to Register
    await page.goto(Routes.register, { waitUntil: 'domcontentloaded' });

    // Fill & submit
    await pages.register.register(user);

    // Success text varies slightly across skins
    await page
      .getByText(/Your account was created successfully/i)
      .waitFor({ state: 'visible' });

    // Persist username + encrypted password locally (.secure/users.json)
    await SecureStore.saveUser(user.username, user.password);
  });
});
