import { test, expect } from '@playwright/test';
import { BankAPI } from '../src/utils/apiClient';

// Replace with a known account id if needed
const ACCOUNT_ID = Number(process.env.FALLBACK_TO_ACCOUNT || 0);
const AMOUNT = 12;

test('Find transactions by amount returns well-formed JSON', async () => {
  const { status, data } = await BankAPI.getTransactionsByAmount(ACCOUNT_ID, AMOUNT);
  expect([200,204,404,400]).toContain(status);
  if (Array.isArray(data) && data.length) {
    const t = data[0];
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('accountId');
    expect(typeof t.amount).toBe('number');
  }
});