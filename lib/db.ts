import { neon } from '@neondatabase/serverless';

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return url;
}

export function getDb() {
  return neon(getConnectionString());
}

export async function query(sql: string, params: unknown[] = []) {
  const db = getDb();
  return db.query(sql, params);
}
