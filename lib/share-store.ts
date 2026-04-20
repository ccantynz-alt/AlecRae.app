import { randomBytes, pbkdf2Sync } from 'node:crypto';

/**
 * In-memory store for dictation share links.
 * Uses globalThis singleton pattern (matches firm-store.ts, audio-store.ts).
 * When DATABASE_URL is configured in Phase 2, this will be replaced with
 * proper Neon PostgreSQL queries.
 */

export interface ShareLink {
  id: string;
  token: string;
  ownerSessionId: string;
  title: string;
  content: string;
  mode: string;
  createdAt: string;
  expiresAt?: string;
  passwordHash?: string;
  revoked: boolean;
  viewCount: number;
}

// PBKDF2 parameters — match auth-multi.ts conventions (node:crypto sync variant)
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32; // bytes → 64 hex chars
const PBKDF2_DIGEST = 'sha256';
const SALT_BYTES = 16;

// ---------------------------------------------------------------------------
// Internal store (globalThis singleton — survives Next.js hot-reloads)
// ---------------------------------------------------------------------------

function getStore(): Map<string, ShareLink> {
  if (!(globalThis as any).__shareStore) {
    (globalThis as any).__shareStore = new Map<string, ShareLink>();
  }
  return (globalThis as any).__shareStore as Map<string, ShareLink>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the share is currently accessible (not revoked, not expired). */
function isAccessible(share: ShareLink): boolean {
  if (share.revoked) return false;
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return false;
  return true;
}

/** Generate a cryptographically random 24-byte base64url token. */
function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Generate a random UUID-style ID for the share record. */
function generateId(): string {
  return randomBytes(16).toString('hex');
}

/** Hash a plain-text password for storage. Returns "saltHex:hashHex". */
function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createShare(input: {
  title: string;
  content: string;
  mode: string;
  expiresInSeconds?: number;
  password?: string;
  ownerSessionId: string;
}): ShareLink {
  const store = getStore();
  const now = new Date();

  const share: ShareLink = {
    id: generateId(),
    token: generateToken(),
    ownerSessionId: input.ownerSessionId,
    title: input.title.trim() || 'Untitled Dictation',
    content: input.content,
    mode: input.mode,
    createdAt: now.toISOString(),
    expiresAt:
      input.expiresInSeconds != null && input.expiresInSeconds > 0
        ? new Date(now.getTime() + input.expiresInSeconds * 1000).toISOString()
        : undefined,
    passwordHash:
      input.password && input.password.length > 0
        ? hashPassword(input.password)
        : undefined,
    revoked: false,
    viewCount: 0,
  };

  store.set(share.id, share);
  return share;
}

/**
 * Look up a share by its public token.
 * Returns null if not found, revoked, or expired.
 */
export function getShareByToken(token: string): ShareLink | null {
  const store = getStore();
  for (const share of store.values()) {
    if (share.token === token) {
      return isAccessible(share) ? share : null;
    }
  }
  return null;
}

/**
 * Verify a plain-text password against the stored hash.
 * Returns true if the share has no password, or if the password matches.
 */
export function verifyPassword(share: ShareLink, password: string): boolean {
  if (!share.passwordHash) return true; // no password required
  const [saltHex, expectedHex] = share.passwordHash.split(':');
  if (!saltHex || !expectedHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return hash.toString('hex') === expectedHex;
}

/**
 * List all non-revoked share links created by this owner session.
 * Expired links are included so the owner can see what has lapsed.
 */
export function listShares(ownerSessionId: string): ShareLink[] {
  const store = getStore();
  return Array.from(store.values())
    .filter((s) => s.ownerSessionId === ownerSessionId && !s.revoked)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Revoke a share link.
 * Returns true if the share was found and belonged to this owner.
 */
export function revokeShare(id: string, ownerSessionId: string): boolean {
  const store = getStore();
  const share = store.get(id);
  if (!share || share.ownerSessionId !== ownerSessionId) return false;
  store.set(id, { ...share, revoked: true });
  return true;
}

/** Increment the view count for a share (fire-and-forget after successful view). */
export function incrementViewCount(id: string): void {
  const store = getStore();
  const share = store.get(id);
  if (share) {
    store.set(id, { ...share, viewCount: share.viewCount + 1 });
  }
}
