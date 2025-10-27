import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

type StoredUser = {
  username: string;
  // AES-256-GCM payload pieces (all base64)
  ct: string; // ciphertext
  iv: string;
  tag: string;
  createdAt: string;
};

const STORE_DIR = path.resolve('.secure');
const STORE_FILE = path.join(STORE_DIR, 'users.json');

/** Derive a 32-byte key from env SECRET_KEY (hex/base64/utf8 allowed). */
function deriveKey(): Buffer {
  const raw = process.env.SECRET_KEY || '';
  if (!raw) throw new Error('SECRET_KEY missing. Put a 32-byte key in .env');
  // accept hex, base64 or utf8 text and hash if needed
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');          // 32 bytes hex
  if (/^[A-Za-z0-9+/=]{43,44}$/.test(raw)) return Buffer.from(raw, 'base64');  // 32 bytes b64
  // fallback: hash arbitrary text into 32 bytes
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, '[]', 'utf8');
}

function readAll(): StoredUser[] {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as StoredUser[];
  } catch {
    return [];
  }
}

function writeAll(list: StoredUser[]) {
  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), 'utf8');
}

/** Encrypt plaintext using AES-256-GCM; returns pieces as base64 strings. */
function encrypt(plaintext: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ct: ct.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

/** Decrypt using AES-256-GCM pieces. */
function decrypt(pieces: { ct: string; iv: string; tag: string }, key: Buffer) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(pieces.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(pieces.tag, 'base64'));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(pieces.ct, 'base64')),
    decipher.final()
  ]);
  return pt.toString('utf8');
}

export const SecureStore = {
  /** Save username + encrypted password to local file. */
  async saveUser(username: string, password: string) {
    const key = deriveKey();
    const { ct, iv, tag } = encrypt(password, key);
    const list = readAll();
    list.push({ username, ct, iv, tag, createdAt: new Date().toISOString() });
    writeAll(list);
  },

  /** Load the latest saved user (decrypting the password). */
  async loadLatestUser(): Promise<{ username: string; password: string }> {
    const key = deriveKey();
    const list = readAll();
    if (!list.length) throw new Error('No saved users found in .secure/users.json');
    const u = list[list.length - 1];
    const password = decrypt({ ct: u.ct, iv: u.iv, tag: u.tag }, key);
    return { username: u.username, password };
  }
};
