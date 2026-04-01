import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db-schema';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDatabase();

    return NextResponse.json({ success: true, message: 'Database schema initialized' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to initialize database', details: error.message },
      { status: 500 }
    );
  }
}
