// src/utils/apiClient.ts
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://parabank.parasoft.com';

// --- Types & runtime validation (keeps CI failures readable) ---
export const TransactionZ = z.object({
  id: z.number(),
  accountId: z.number(),
  type: z.string().optional().nullable().transform(v => v ?? ''),
  date: z.string().optional().nullable().transform(v => v ?? ''), // ParaBank often returns a string
  amount: z.number(),
  description: z.string().optional().nullable(),
});
export type Transaction = z.infer<typeof TransactionZ>;

export const AccountZ = z.object({
  id: z.number(),
  customerId: z.number().optional(),
  type: z.string().optional(),
  balance: z.number().optional().default(0),
});
export type Account = z.infer<typeof AccountZ>;

export const AccountsZ = z.array(AccountZ);
export const TransactionsZ = z.array(TransactionZ);

// --- Axios instance ---
function createClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BASE}/parabank/services/bank`,
    timeout: 30_000,
    headers: { Accept: 'application/json' },
    // we’ll evaluate status manually
    validateStatus: () => true,
  });
}

const api = createClient();

// --- Small retry helper (linear backoff) ---
async function retry<T>(fn: () => Promise<T>, attempts = 2, pauseMs = 600): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise(r => setTimeout(r, pauseMs * (i + 1)));
    }
  }
  throw lastErr;
}

// --- Narrow response helper ---
function okOrThrow(status: number, body: any, context: string) {
  if (status >= 200 && status < 300) return;
  const msg = typeof body === 'string' ? body : JSON.stringify(body);
  throw new Error(`${context} failed: HTTP ${status} – ${msg}`);
}

// --- Public API: keep return shapes simple for tests ---
export const BankAPI = {
  /**
   * GET /accounts/{id}
   */
  async getAccount(accountId: number) {
    return retry(async () => {
      const r = await api.get(`/accounts/${accountId}`);
      okOrThrow(r.status, r.data, 'getAccount');
      const parsed = AccountZ.safeParse(r.data);
      if (!parsed.success) throw new Error(`getAccount invalid payload: ${parsed.error.message}`);
      return { status: r.status, data: parsed.data };
    });
  },

  /**
   * GET /customers/{customerId}/accounts
   * Note: customerId is visible in some UIs (e.g., hardcoded 13322 in pages).
   */
  async getCustomerAccounts(customerId: number) {
    return retry(async () => {
      const r = await api.get(`/customers/${customerId}/accounts`);
      okOrThrow(r.status, r.data, 'getCustomerAccounts');
      const parsed = AccountsZ.safeParse(r.data ?? []);
      if (!parsed.success) throw new Error(`getCustomerAccounts invalid payload: ${parsed.error.message}`);
      return { status: r.status, data: parsed.data };
    });
  },

  /**
   * POST /createAccount?customerId=..&newAccountType=..&fromAccountId=..
   * newAccountType: 0 = CHECKING, 1 = SAVINGS (matches UI).
   */
  async createAccount(customerId: number, newAccountType: 0 | 1, fromAccountId: number) {
    return retry(async () => {
      const r = await api.post(`/createAccount`, null, {
        params: { customerId, newAccountType, fromAccountId },
      });
      okOrThrow(r.status, r.data, 'createAccount');
      const parsed = AccountZ.safeParse(r.data);
      if (!parsed.success) throw new Error(`createAccount invalid payload: ${parsed.error.message}`);
      return { status: r.status, data: parsed.data };
    });
  },

  /**
   * POST /transfer?fromAccountId=..&toAccountId=..&amount=..
   */
  async transfer(fromAccountId: number, toAccountId: number, amount: number) {
    return retry(async () => {
      const r = await api.post(`/transfer`, null, {
        params: { fromAccountId, toAccountId, amount },
        responseType: 'text', // ParaBank often responds with plain text
      });
      okOrThrow(r.status, r.data, 'transfer');
      return { status: r.status, data: r.data as string };
    });
  },

  /**
   * POST /billpay?accountId=..&amount=..
   * Body: payee object (same as UI form).
   */
  async billPay(accountId: number, amount: number, payee: {
    name: string;
    address: { street: string; city: string; state: string; zipCode: string };
    phoneNumber: string;
    accountNumber: string;
  }) {
    return retry(async () => {
      const r = await api.post(`/billpay`, payee, {
        params: { accountId, amount },
      });
      okOrThrow(r.status, r.data, 'billPay');
      // API returns the payment summary; we won’t over-validate here.
      return { status: r.status, data: r.data };
    });
  },

  /**
   * GET /accounts/{id}/transactions
   */
  async getTransactions(accountId: number) {
    return retry(async () => {
      const r = await api.get(`/accounts/${accountId}/transactions`);
      okOrThrow(r.status, r.data, 'getTransactions');
      const parsed = TransactionsZ.safeParse(r.data ?? []);
      if (!parsed.success) throw new Error(`getTransactions invalid payload: ${parsed.error.message}`);
      return { status: r.status, data: parsed.data };
    });
  },

  /**
   * GET /accounts/{id}/transactions/amount/{amount}
   */
  async getTransactionsByAmount(accountId: number, amount: number) {
    return retry(async () => {
      const r = await api.get(`/accounts/${accountId}/transactions/amount/${amount}`);
      // On empty result, ParaBank may return 200 with [] OR 404/204. We do not throw on non-2xx here.
      if (r.status >= 200 && r.status < 300) {
        const parsed = TransactionsZ.safeParse(r.data ?? []);
        if (!parsed.success) throw new Error(`getTransactionsByAmount invalid payload: ${parsed.error.message}`);
        return { status: r.status, data: parsed.data };
      }
      // keep shape stable
      return { status: r.status, data: [] as Transaction[] };
    });
  },
};
