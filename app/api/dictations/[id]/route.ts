import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateUser } from '@/lib/get-user';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getOrCreateUser();

    const rows = await query(
      `SELECT id, raw_text, enhanced_text, mode, audio_url, audio_duration, word_count, is_batch, created_at
       FROM dictations
       WHERE id = $1 AND user_id = $2`,
      [params.id, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Dictation not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch dictation', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getOrCreateUser();

    const rows = await query(
      `DELETE FROM dictations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [params.id, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Dictation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete dictation', details: error.message }, { status: 500 });
  }
}
