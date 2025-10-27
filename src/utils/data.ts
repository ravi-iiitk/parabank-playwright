// src/utils/data.ts

/** Long unique username (handy for logs) */
export function uniqueUsername(prefix = 'qa'): string {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

/** Short (<= ~12 chars) unique username to avoid UI length issues */
export function uniqueUsernameShort(prefix = 'qa'): string {
  const rand = Math.random().toString(36).slice(2, 8); // 6 chars
  return `${prefix}_${rand}`;
}

export function fakeCustomer() {
  const rand = Math.random().toString(36).slice(2, 6);
  return {
    firstName: `Ravixh${rand}`,
    lastName: `Kumarxh${rand}`,
    address: '221B Baker Street',
    city: 'Kolkata',
    state: 'WB',
    zipCode: '700001',
    phoneNumber: `9${Math.floor(1e9 + Math.random() * 9e8)}`,
    ssn: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-${Math.floor(1000 + Math.random() * 9000)}`
  };
}
