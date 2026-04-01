import { query } from './db';

const ADMIN_EMAIL = 'admin@alecrae.app';

/**
 * Gets or creates the default admin user from the session.
 * In Phase 5 this will use real user IDs from JWT claims.
 * For now, all authenticated sessions map to a single admin user.
 */
export async function getOrCreateUser(): Promise<string> {
  // Check if admin user exists
  const existing = await query(
    `SELECT id FROM users WHERE email = $1`,
    [ADMIN_EMAIL]
  );

  if (existing.length > 0) {
    return existing[0].id as string;
  }

  // Create admin user
  const created = await query(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id`,
    [ADMIN_EMAIL, 'Admin', 'admin']
  );

  return created[0].id as string;
}
