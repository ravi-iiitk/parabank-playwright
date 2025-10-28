// src/fixtures/test-fixtures.ts
import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { OpenAccountPage } from '../pages/OpenAccountPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { TransferFundsPage } from '../pages/TransferFundsPage';
import { BillPayPage } from '../pages/BillPayPage';
import { BankAPI } from '../utils/apiClient';
import { fakeCustomer, uniqueUsernameShort } from '../utils/data';

export type Pages = {
  home: HomePage;
  register: RegisterPage;
  login: LoginPage;
  openAccount: OpenAccountPage;
  overview: AccountsOverviewPage;
  transfer: TransferFundsPage;
  billpay: BillPayPage;
};

type UserData = { username: string; password: string } & ReturnType<typeof fakeCustomer>;

const USER_PREFIX = process.env.USER_PREFIX || 'fabric';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'Passw0rd!';

export const test = base.extend<{
  pages: Pages;
  user: UserData;
  api: typeof BankAPI;
}>({
  pages: async ({ page }, use) => {
    await use({
      home: new HomePage(page),
      register: new RegisterPage(page),
      login: new LoginPage(page),
      openAccount: new OpenAccountPage(page),
      overview: new AccountsOverviewPage(page),
      transfer: new TransferFundsPage(page),
      billpay: new BillPayPage(page),
    });
  },

  user: async ({}, use) => {
    const baseData = fakeCustomer();
    const username = uniqueUsernameShort(USER_PREFIX); // short, unique
    const password = DEFAULT_PASSWORD;
    await use({ ...baseData, username, password });
  },

  api: async ({}, use) => {
    await use(BankAPI);
  },
});

export const expectEx = expect;
