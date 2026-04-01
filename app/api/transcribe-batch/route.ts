import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifySession } from '@/lib/auth';

export const maxDuration = 300; // 5 minutes for batch processing

interface TranscriptionResult {
  filename: string;
  text: string;
  duration: number | undefined;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = request.cookies.get('alecrae_session')?.value;
    if (!session || !(await verifySession(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const customVocab = formData.get('vocabulary') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 files per batch' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const vocabHint = customVocab
      ? `Legal and accounting dictation. Key terms: ${customVocab}`
      : 'Legal and accounting dictation. Attorney correspondence, memorandum, court filing, deposition, engagement letter, accounting report, tax advisory, audit opinion. Prima facie, res ipsa loquitur, habeas corpus, voir dire, stare decisis, certiorari, GAAP, IFRS, EBITDA, IRC, PCAOB.';

    const encoder = new TextEncoder();

    // Stream progress via SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        const results: TranscriptionResult[] = [];

        // Send initial event with total count
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'start',
              total: files.length,
            })}\n\n`
          )
        );

        // Process each file sequentially
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Send progress event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: files.length,
                filename: file.name,
              })}\n\n`
            )
          );

          try {
            const transcription = await openai.audio.transcriptions.create({
              file: file,
              model: 'whisper-1',
              language: 'en',
              response_format: 'verbose_json',
              prompt: vocabHint,
            });

            const result: TranscriptionResult = {
              filename: file.name,
              text: transcription.text,
              duration: transcription.duration,
            };

            results.push(result);

            // Send individual result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'result',
                  ...result,
                  index: i,
                })}\n\n`
              )
            );
          } catch (err: any) {
            const result: TranscriptionResult = {
              filename: file.name,
              text: '',
              duration: undefined,
              error: err.message || 'Transcription failed',
            };

            results.push(result);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'result',
                  ...result,
                  index: i,
                })}\n\n`
              )
            );
          }
        }

        // Send completion event with all results
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              results,
            })}\n\n`
          )
        );

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
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
    console.error('Batch transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch transcription failed' },
      { status: 500 }
    );
  }
}
