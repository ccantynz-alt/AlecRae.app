import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifySession } from '@/lib/auth';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = request.cookies.get('alecrae_session')?.value;
    if (!session || !(await verifySession(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const customVocab = formData.get('vocabulary') as string | null;
    const chunkIndex = formData.get('chunkIndex') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const vocabHint = customVocab
      ? `Legal and accounting dictation. Key terms: ${customVocab}`
      : 'Legal and accounting dictation. Attorney correspondence, memorandum, court filing, deposition, engagement letter, accounting report, tax advisory, audit opinion. Prima facie, res ipsa loquitur, habeas corpus, voir dire, stare decisis, certiorari, GAAP, IFRS, EBITDA, IRC, PCAOB.';

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event indicating processing has started
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : 0,
              })}\n\n`
            )
          );

          // Process audio through Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'verbose_json',
            prompt: vocabHint,
          });

          // Send the partial transcription result
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'partial',
                text: transcription.text,
                duration: transcription.duration,
                chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : 0,
              })}\n\n`
            )
          );

          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: err.message || 'Transcription failed',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Streaming transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Streaming transcription failed' },
      { status: 500 }
    );
  }
}
