// src/config/amounts.ts
export const AMOUNTS = {
  transfer: Number(process.env.AMOUNT_TRANSFER ?? '10'),
  billpay:  Number(process.env.AMOUNT_BILLPAY  ?? '12'),
};
