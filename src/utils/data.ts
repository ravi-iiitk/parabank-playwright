// src/utils/data.ts

/**
 * Utilities for generating stable, collision-resistant test data
 * without hard-coding, and keeping usernames short enough for the UI.
 */

export type RegisterUser = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
};

/** Use crypto if available (Node 18+), fallback to Math.random */
function randBytes(n = 8): Uint8Array {
  if (typeof crypto?.getRandomValues === 'function') {
    const b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}

function randBase36(len = 6): string {
  // crypto-backed base36 string (letters+digits)
  const bytes = randBytes(len);
  let out = '';
  for (const x of bytes) out += (x % 36).toString(36);
  return out;
}

function digits(n: number): string {
  const bytes = randBytes(n);
  let out = '';
  for (const x of bytes) out += ((x % 10) as number).toString();
  return out;
}

/** Sanitize to `[a-z0-9_]+` and trim to maxLen */
function sanitizeUsername(s: string, maxLen: number): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, maxLen);
}

/** Long unique username (handy for logs) */
export function uniqueUsername(prefix = 'qa'): string {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14); // yyyymmddhhmmss
  const rand = randBase36(6);
  const raw = `${prefix}_${ts}_${rand}`;
  // Long version is fine for logs/persistence; cap at 32 just in case
  return sanitizeUsername(raw, 32);
}

/**
 * Short unique username to avoid UI length issues.
 * Max 12 chars by default (configurable).
 */
export function uniqueUsernameShort(prefix = 'qa', maxLen = 12): string {
  // Ensure we always have at least 3 random chars
  const minRand = 3;
  const sep = '_';
  const cleanPrefix = sanitizeUsername(prefix, maxLen);
  const room = Math.max(minRand, maxLen - (cleanPrefix.length + sep.length));
  const rand = randBase36(room);
  return sanitizeUsername(`${cleanPrefix}${sep}${rand}`, maxLen);
}

/** Random-but-valid US-style SSN string: XXX-XX-XXXX */
export function randomSSN(): string {
  const a = (100 + Math.floor(Math.random() * 900)).toString();
  const b = (10 + Math.floor(Math.random() * 90)).toString();
  const c = (1000 + Math.floor(Math.random() * 9000)).toString();
  return `${a}-${b}-${c}`;
}

/** 10-digit phone starting with 9 (common in examples): 9XXXXXXXXX */
export function randomPhone10(): string {
  return '9' + digits(9);
}

/** Simple postal codes without hard-coding: 5 or 6 digits */
export function randomZip(len: 5 | 6 = 6): string {
  return digits(len);
}

/**
 * Minimal customer fields used by the registration form (no username/password).
 * Keep strings realistic but neutral—override via params for locale-specific data.
 */
export function fakeCustomer(overrides?: Partial<Omit<RegisterUser, 'username' | 'password'>>) {
  const rand = randBase36(4);
  return {
    firstName: `Ravi${rand}`,
    lastName: `Kumar${rand}`,
    address: '221B Baker Street',
    city: 'Kolkata',
    state: 'WB',
    zipCode: randomZip(6),
    phoneNumber: randomPhone10(),
    ssn: randomSSN(),
    ...overrides,
  };
}

/**
 * Full registration payload: short unique username + password + customer fields.
 * - No hard-coded username length (defaults to 12 max)
 * - Deterministic structure, randomized values
 */
export function buildRegisterUser(
  opts?: {
    prefix?: string;
    maxUserLen?: number;
    password?: string;
    overrides?: Partial<Omit<RegisterUser, 'username' | 'password'>>;
  }
): RegisterUser {
  const {
    prefix = process.env.USER_PREFIX || 'qa',
    maxUserLen = 12,
    password = process.env.DEFAULT_PASSWORD || 'Passw0rd!',
    overrides,
  } = opts || {};

  const customer = fakeCustomer(overrides);
  const username = uniqueUsernameShort(prefix, maxUserLen);

  return {
    ...customer,
    username,
    password,
  };
}

/** Obfuscate anything sensitive for logs. */
export function mask(s: string, keep = 2): string {
  if (!s) return '';
  if (s.length <= keep) return '*'.repeat(s.length);
  const tail = s.slice(-keep);
  return `${'*'.repeat(s.length - keep)}${tail}`;
}
