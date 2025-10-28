import { test, expectEx } from '../src/fixtures/test-fixtures';
import { z } from 'zod';

// Read from env (set FALLBACK_TO_ACCOUNT in .env to run this test meaningfully)
const ACCOUNT_ID = Number(process.env.FALLBACK_TO_ACCOUNT ?? '0');
// Allow override via env; defaults to 12 like before
const AMOUNT = Number(process.env.TXN_AMOUNT ?? '12');

// Minimal Transaction schema (matches ParaBank shape but tolerant to extras)
const TransactionSchema = z.object({
  id: z.number(),
  accountId: z.number(),
  amount: z.number(),
  type: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional()
});

test.describe('API: Find transactions by amount', () => {
  test.skip(!ACCOUNT_ID, 'Set FALLBACK_TO_ACCOUNT in .env to run this test (FALLBACK_TO_ACCOUNT=<existing account id>).');

  test('returns a permissible status and well-formed JSON if present', async ({ api }) => {
    const { status, data } = await api.getTransactionsByAmount(ACCOUNT_ID, AMOUNT);

    // ParaBank may reply 200/204/404/400 depending on data presence or params
    expectEx([200, 204, 404, 400]).toContain(status);

    if (Array.isArray(data) && data.length > 0) {
      // Validate the first item structure
      const parsed = TransactionSchema.safeParse(data[0]);
      expectEx(parsed.success).toBeTruthy();

      if (parsed.success) {
        // Light semantic check: accountId matches the one we queried
        expectEx(parsed.data.accountId).toBe(ACCOUNT_ID);
        // Amount may be neg/pos depending on TXN type; check it’s numeric already
        expectEx(typeof parsed.data.amount).toBe('number');
      }
    }
  });
});
