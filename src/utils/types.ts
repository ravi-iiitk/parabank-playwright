// src/utils/types.ts

// ---- Core domain types ----

/** Known account types from ParaBank UI; keep string fallback for safety. */
export type AccountType = 'CHECKING' | 'SAVINGS' | string;

/** Common transaction types seen in ParaBank; keep string fallback. */
export type TransactionType =
  | 'Debit'
  | 'Credit'
  | 'Deposit'
  | 'Withdrawal'
  | 'Bill Payment'
  | 'Transfer'
  | string;

/** Bank account (API sometimes omits some fields → mark optional). */
export type Account = {
  id: number;
  customerId?: number;
  type?: AccountType;
  balance?: number;
};

/** Transaction; ParaBank may return null/empty for some fields. */
export type Transaction = {
  id: number;
  accountId: number;
  type?: TransactionType;
  date?: string;              // ISO-ish date string from API
  amount: number;
  description?: string | null;
};

/** Minimal customer shape used in a few API responses. */
export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
};

// Generic API result shape used throughout the codebase
export type ApiResult<T> = { status: number; data: T };

// Convenience aggregates
export type Accounts = Account[];
export type Transactions = Transaction[];

// ---- Optional: Runtime validation with Zod ----
// Remove this block if you don't use Zod at runtime.
import { z } from 'zod';

export const AccountZ = z.object({
  id: z.number(),
  customerId: z.number().optional(),
  type: z.string().optional(),
  balance: z.number().optional().default(0),
});

export const TransactionZ = z.object({
  id: z.number(),
  accountId: z.number(),
  type: z.string().optional(),
  date: z.string().optional(),
  amount: z.number(),
  description: z.string().nullable().optional(),
});

export const AccountsZ = z.array(AccountZ);
export const TransactionsZ = z.array(TransactionZ);

// TS types inferred from Zod (keeps them in sync automatically)
export type AccountValidated = z.infer<typeof AccountZ>;
export type TransactionValidated = z.infer<typeof TransactionZ>;
