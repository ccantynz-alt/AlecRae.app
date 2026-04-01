import { FirmProfile } from './firm-profiles';

/**
 * In-memory store for firm profiles.
 * When the database (Neon PostgreSQL) is connected,
 * this will be replaced with proper database queries.
 */
export const firmStore = new Map<string, FirmProfile>();
