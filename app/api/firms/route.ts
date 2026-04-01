import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  FirmProfileInput,
  createFirmProfile,
  validateFirmProfile,
} from '@/lib/firm-profiles';
import { firmStore } from '@/lib/firm-store';

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const firms = Array.from(firmStore.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json({ firms });
}

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as FirmProfileInput;
    const errors = validateFirmProfile(body);

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const firm = createFirmProfile(body);
    firmStore.set(firm.id, firm);

    return NextResponse.json({ firm }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create firm profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Firm ID is required' }, { status: 400 });
    }

    const existing = firmStore.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }

    const errors = validateFirmProfile(updates);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    firmStore.set(id, updated);

    return NextResponse.json({ firm: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update firm profile' },
      { status: 500 }
    );
  }
}
