import { test } from '../src/fixtures/test-fixtures';
import { Routes } from '../src/config/routes';

test.describe('Global navigation menus', () => {
  test('Header leftmenu works', async ({ page, pages }) => {
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });

    await pages.home.verifyHeaderNavigation([
      { label: 'Solutions' }, // plain <li> (no link)
      { label: 'About Us',  path: 'about.htm' },
      { label: 'Services',  path: 'services.htm' },
      { label: 'Products',  href: 'parasoft.com/jsp/products.jsp' },
      { label: 'Locations', href: 'parasoft.com/jsp/pr/contacts.jsp' },
      { label: 'Admin Page', path: 'admin.htm' },
    ]);
  });

  test('Account Services menu works', async ({ page, pages, user }) => {
    // Register quickly to land in the authenticated area so left nav is present
    await page.goto(Routes.login, { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Register' }).click();
    await pages.register.register(user);
    await pages.register.assertRegistrationSuccess(user.username);

    // Verify the left “Account Services” links with href checks
    await pages.home.verifyAccountServicesNavigation([
      { label: 'Open New Account',   path: 'openaccount.htm' },
      { label: 'Accounts Overview',  path: 'overview.htm' },
      { label: 'Transfer Funds',     path: 'transfer.htm' },
      { label: 'Bill Pay',           path: 'billpay.htm' },
      { label: 'Find Transactions',  path: 'findtrans.htm' },
      // You can uncomment these when you want to assert them too:
      // { label: 'Update Contact Info', path: 'updateprofile.htm' },
      // { label: 'Request Loan',        path: 'requestloan.htm' },
    ]);
  });
});
