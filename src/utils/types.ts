export type Account = { id: number; customerId: number; type: string; balance: number };
export type Transaction = {
  id: number; accountId: number; type: string; date: string; amount: number; description?: string;
};
export type Customer = { id: number; firstName: string; lastName: string; username: string };