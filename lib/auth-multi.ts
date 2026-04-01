import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'alecrae_session';
const EXPIRY = '30d';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user' | 'viewer';
  firmId?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

/**
 * Create a session with full user data embedded in the JWT.
 */
export async function createUserSession(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    firmId: user.firmId,
    subscriptionTier: user.subscriptionTier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());

  return token;
}

/**
 * Verify a session token and extract the user data.
 */
export async function verifyUserSession(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.email || !payload.role) return null;

    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || '',
      role: payload.role as User['role'],
      firmId: (payload.firmId as string) || undefined,
      subscriptionTier: (payload.subscriptionTier as User['subscriptionTier']) || 'free',
    };
  } catch {
    return null;
  }
}

/**
 * Check whether the user has one of the required roles.
 */
export function requireRole(user: User, ...roles: string[]): boolean {
  return roles.includes(user.role);
}

/**
 * Extract user from the session cookie in a request.
 * Convenience wrapper for API routes.
 */
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  return verifyUserSession(token);
}

/**
 * Hash a password using PBKDF2 (Web Crypto API — edge-compatible).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hash = Buffer.from(bits).toString('hex');
  const saltHex = Buffer.from(salt).toString('hex');
  return `${saltHex}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hash = Buffer.from(bits).toString('hex');
  return hash === expectedHash;
}
