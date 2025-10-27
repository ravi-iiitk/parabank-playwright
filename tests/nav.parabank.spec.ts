import { test } from '../src/fixtures/test-fixtures';
import { Routes } from '../src/config/routes';

test.describe('Global navigation menus', () => {
  test('Header leftmenu works', async ({ page, pages }) => {
    await page.goto(Routes.login);
    await pages.home.verifyHeaderNavigation([
      { label: 'Solutions' }, // plain LI
      { label: 'About Us', path: 'about.htm' },
      { label: 'Services', path: 'services.htm' },
      { label: 'Products', href: 'parasoft.com/jsp/products.jsp' },
      { label: 'Locations', href: 'parasoft.com/jsp/pr/contacts.jsp' },
      { label: 'Admin Page', path: 'admin.htm' },
    ]);
  });

  test('Account Services menu works', async ({ page, pages, user }) => {
    // quick registration to land in account area
    await page.goto(Routes.login);
    await page.getByRole('link', { name: 'Register' }).click();
    await pages.register.register(user);
    await pages.register.assertRegistrationSuccess(user.username);

    // ensure left nav rendered
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#leftPanel h2:has-text("Account Services")', { timeout: 15000 });
    await page.waitForSelector('#leftPanel ul li a', { timeout: 15000 });

    await pages.home.verifyAccountServicesNavigation([
      { label: 'Open New Account', path: 'openaccount.htm' },
      { label: 'Accounts Overview', path: 'overview.htm' },
      { label: 'Transfer Funds', path: 'transfer.htm' },
      { label: 'Bill Pay', path: 'billpay.htm' },
      { label: 'Find Transactions', path: 'findtrans.htm' },
      // { label: 'Update Contact Info', path: 'updateprofile.htm' },
      // { label: 'Request Loan', path: 'requestloan.htm' },
    ]);
  });
});
