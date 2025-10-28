// src/utils/secureStore.ts
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type StoredUser = {
  username: string;
  ct: string;   // ciphertext (base64)
  iv: string;   // 12-byte iv (base64)
  tag: string;  // auth tag (base64)
  createdAt: string;
};

type StoreFile = {
  version: 1;
  users: StoredUser[];
};

const DEFAULT_DIR = path.resolve(process.cwd(), '.secure');
const DEFAULT_FILE = path.join(DEFAULT_DIR, 'users.json');

/** Allow overriding path in CI (e.g., SECURE_STORE_FILE=.secure/users.json) */
function storeFilePath() {
  const p = process.env.SECURE_STORE_FILE;
  if (p) return path.resolve(process.cwd(), p);
  return DEFAULT_FILE;
}
function storeDirPath() {
  return path.dirname(storeFilePath());
}

/** Derive a 32-byte key from env SECRET_KEY (hex/base64/utf8 permitted). */
function deriveKey(): Buffer {
  const raw = process.env.SECRET_KEY || '';
  if (!raw) throw new Error('SECRET_KEY missing. Put a 32-byte secret in .env or GitHub Secret.');
  // 32 bytes hex
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  // 32 bytes base64
  if (/^[A-Za-z0-9+/=]{43,44}$/.test(raw)) return Buffer.from(raw, 'base64');
  // arbitrary text → sha256
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

async function ensureStore(): Promise<void> {
  const dir = storeDirPath();
  const file = storeFilePath();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    const initial: StoreFile = { version: 1, users: [] };
    await fs.writeFile(file, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readAll(): Promise<StoreFile> {
  await ensureStore();
  const raw = await fs.readFile(storeFilePath(), 'utf8').catch(() => '{"version":1,"users":[]}');
  try {
    const parsed = JSON.parse(raw) as StoreFile | StoredUser[];
    // Back-compat for old shape (array only)
    if (Array.isArray(parsed)) return { version: 1, users: parsed };
    return parsed.version ? (parsed as StoreFile) : { version: 1, users: [] };
  } catch {
    return { version: 1, users: [] };
  }
}

async function writeAll(data: StoreFile): Promise<void> {
  await ensureStore();
  const file = storeFilePath();
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

/** AES-256-GCM encrypt text → { ct, iv, tag } base64 pieces. */
function encryptGCM(plaintext: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ct: ct.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

/** AES-256-GCM decrypt from base64 pieces → utf8 string. */
function decryptGCM(pieces: { ct: string; iv: string; tag: string }, key: Buffer) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(pieces.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(pieces.tag, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(pieces.ct, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

/** Safe mask for logs. */
export function mask(s: string, keep = 2): string {
  if (!s) return '';
  if (s.length <= keep) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - keep)}${s.slice(-keep)}`;
}

export const SecureStore = {
  /** Save or update username + encrypted password (idempotent by username). */
  async saveUser(username: string, password: string) {
    const key = deriveKey();
    const enc = encryptGCM(password, key);
    const store = await readAll();
    const createdAt = new Date().toISOString();

    // upsert by username
    const idx = store.users.findIndex(u => u.username === username);
    const obj: StoredUser = { username, ...enc, createdAt };
    if (idx >= 0) store.users[idx] = obj; else store.users.push(obj);

    await writeAll(store);
  },

  /** Return latest saved user (decrypt password). */
  async loadLatestUser(): Promise<{ username: string; password: string }> {
    const key = deriveKey();
    const store = await readAll();
    if (store.users.length === 0) throw new Error('No saved users found in SecureStore.');
    const u = store.users[store.users.length - 1];
    const password = decryptGCM({ ct: u.ct, iv: u.iv, tag: u.tag }, key);
    return { username: u.username, password };
  },

  /** Load by exact username (throws if not found). */
  async loadByUsername(username: string): Promise<{ username: string; password: string }> {
    const key = deriveKey();
    const store = await readAll();
    const u = store.users.find(x => x.username === username);
    if (!u) throw new Error(`User "${username}" not found.`);
    const password = decryptGCM({ ct: u.ct, iv: u.iv, tag: u.tag }, key);
    return { username: u.username, password };
  },

  /** Load most recent user whose username starts with prefix (useful for suites). */
  async loadLatestByPrefix(prefix: string): Promise<{ username: string; password: string }> {
    const key = deriveKey();
    const store = await readAll();
    const candidates = store.users.filter(u => u.username.startsWith(prefix));
    if (candidates.length === 0) throw new Error(`No users found with prefix "${prefix}".`);
    const u = candidates[candidates.length - 1];
    const password = decryptGCM({ ct: u.ct, iv: u.iv, tag: u.tag }, key);
    return { username: u.username, password };
  },

  /** List stored usernames (masked), newest last. */
  async listUsers(): Promise<Array<{ username: string; createdAt: string }>> {
    const store = await readAll();
    return store.users.map(u => ({ username: u.username, createdAt: u.createdAt }));
  },

  /** Delete a username entry (noop if missing). */
  async deleteByUsername(username: string) {
    const store = await readAll();
    const next = store.users.filter(u => u.username !== username);
    await writeAll({ ...store, users: next });
  },

  /** Clear all saved users. */
  async clear() {
    await writeAll({ version: 1, users: [] });
  },

  /** Expose resolved file path (handy for debugging). */
  path() { return storeFilePath(); },
};
