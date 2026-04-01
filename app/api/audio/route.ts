import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

/**
 * Audio storage API route.
 *
 * Currently returns a reference ID for audio blobs. When cloud storage
 * (e.g., Vercel Blob, S3, or Neon) is connected, this will persist
 * audio files for playback and re-transcription.
 */

interface AudioReference {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// In-memory store — will be replaced with cloud storage
const audioStore = new Map<string, { reference: AudioReference; blob: Blob }>();

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * POST /api/audio — Accept an audio blob and return a reference
 */
export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const filename = (formData.get('filename') as string) || audioFile?.name || 'recording.webm';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/x-m4a',
      'audio/mp3',
    ];

    if (!allowedTypes.includes(audioFile.type) && !audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio files are accepted.' },
        { status: 400 }
      );
    }

    // Size limit: 25MB (Whisper API limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const id = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const reference: AudioReference = {
      id,
      filename,
      mimeType: audioFile.type,
      size: audioFile.size,
      createdAt: new Date().toISOString(),
    };

    // Store in memory (temporary until cloud storage is available)
    audioStore.set(id, { reference, blob: audioFile });

    return NextResponse.json({
      reference,
      message: 'Audio stored successfully. Note: in-memory storage only — will be lost on server restart.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Audio storage error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store audio' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audio?id=xxx — Retrieve an audio reference (or the audio itself)
 */
export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    // List all audio references
    const references = Array.from(audioStore.values())
      .map((entry) => entry.reference)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ references });
  }

  const entry = audioStore.get(id);
  if (!entry) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  // Check if requesting the audio blob itself
  const format = searchParams.get('format');
  if (format === 'blob') {
    const arrayBuffer = await entry.blob.arrayBuffer();
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': entry.reference.mimeType,
        'Content-Disposition': `inline; filename="${entry.reference.filename}"`,
        'Content-Length': entry.reference.size.toString(),
      },
    });
  }

  return NextResponse.json({ reference: entry.reference });
}
