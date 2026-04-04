/**
 * In-memory user store for when DATABASE_URL is not configured.
 *
 * Uses the globalThis pattern to persist across hot reloads in development
 * and across serverless invocations that share the same instance.
 *
 * This is a transitional solution — once Neon PostgreSQL is wired up,
 * all queries will go through lib/db.ts instead.
 */

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'user' | 'viewer';
  firmId?: string;
  firmName?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: number;
}

export interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

interface UserStoreData {
  users: Map<string, StoredUser>; // keyed by email
  resetTokens: Map<string, PasswordResetToken>; // keyed by token
}

declare global {
  // eslint-disable-next-line no-var
  var __alecrae_user_store: UserStoreData | undefined;
}

function getStore(): UserStoreData {
  if (!globalThis.__alecrae_user_store) {
    globalThis.__alecrae_user_store = {
      users: new Map(),
      resetTokens: new Map(),
    };
  }
  return globalThis.__alecrae_user_store;
}

/** Generate a short UUID-like identifier. */
function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a secure random token for password resets. */
export function generateResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── User operations ───────────────────────────────────────────

export function findUserByEmail(email: string): StoredUser | undefined {
  const store = getStore();
  return store.users.get(email.toLowerCase());
}

export function createUser(params: {
  email: string;
  name: string;
  passwordHash: string;
  firmName?: string;
}): StoredUser {
  const store = getStore();
  const email = params.email.toLowerCase();

  if (store.users.has(email)) {
    throw new Error('USER_EXISTS');
  }

  const user: StoredUser = {
    id: generateId(),
    email,
    name: params.name,
    passwordHash: params.passwordHash,
    role: 'user',
    firmName: params.firmName,
    subscriptionTier: 'free',
    createdAt: Date.now(),
  };

  store.users.set(email, user);
  return user;
}

export function updateUserPassword(email: string, newPasswordHash: string): boolean {
  const store = getStore();
  const user = store.users.get(email.toLowerCase());
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  return true;
}

// ─── Reset token operations ────────────────────────────────────

export function storeResetToken(email: string, token: string, ttlMs: number = 3600000): void {
  const store = getStore();
  // Remove any existing token for this email
  const entries = Array.from(store.resetTokens.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    if (val.email === email.toLowerCase()) {
      store.resetTokens.delete(key);
    }
  }
  store.resetTokens.set(token, {
    email: email.toLowerCase(),
    token,
    expiresAt: Date.now() + ttlMs,
  });
}

export function validateResetToken(token: string): PasswordResetToken | null {
  const store = getStore();
  const entry = store.resetTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.resetTokens.delete(token);
    return null;
  }
  return entry;
}

export function consumeResetToken(token: string): PasswordResetToken | null {
  const entry = validateResetToken(token);
  if (!entry) return null;
  const store = getStore();
  store.resetTokens.delete(token);
  return entry;
}
