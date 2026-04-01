import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateUser } from '@/lib/get-user';

export async function GET(request: NextRequest) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getOrCreateUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const rows = await query(
      `SELECT id, raw_text, enhanced_text, mode, audio_duration, word_count, is_batch, created_at
       FROM dictations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM dictations WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({
      dictations: rows,
      total: parseInt(countResult[0].total as string),
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch dictations', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getOrCreateUser();
    const body = await request.json();

    const { raw_text, enhanced_text, mode, audio_url, audio_duration, word_count } = body;

    if (!raw_text || !mode) {
      return NextResponse.json({ error: 'raw_text and mode are required' }, { status: 400 });
    }

    const rows = await query(
      `INSERT INTO dictations (user_id, raw_text, enhanced_text, mode, audio_url, audio_duration, word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, raw_text, enhanced_text, mode, audio_duration, word_count, created_at`,
      [userId, raw_text, enhanced_text || null, mode, audio_url || null, audio_duration || null, word_count || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to save dictation', details: error.message }, { status: 500 });
  }
}
