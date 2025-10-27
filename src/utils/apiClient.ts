import axios from 'axios';
import * as dotenv from 'dotenv';
import { Transaction } from './types.js';
dotenv.config();

const base = process.env.BASE_URL || 'https://parabank.parasoft.com';
// ParaBank REST base per docs
const api = axios.create({ baseURL: `${base}/parabank/services/bank`, validateStatus: () => true });

export const BankAPI = {
  async getTransactionsByAmount(accountId: number, amount: number) {
    // Typical ParaBank REST pattern => /accounts/{id}/transactions/amount/{amount}
    const url = `/accounts/${accountId}/transactions/amount/${amount}`;
    const res = await api.get(url, { headers: { Accept: 'application/json' } });
    return { status: res.status, data: res.data as Transaction[] };
  },
};