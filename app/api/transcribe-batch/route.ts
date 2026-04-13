import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifySession } from '@/lib/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { isVoxlenConfigured, transcribe as voxlenTranscribe } from '@/lib/voxlen';

export const maxDuration = 300; // 5 minutes for batch processing

interface TranscriptionResult {
  filename: string;
  text: string;
  duration: number | undefined;
  engine?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const limited = rateLimiters.transcribeBatch(request);
  if (limited) return limited;

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

    const useVoxlen = isVoxlenConfigured();

    const vocabHint = customVocab
      ? `Legal and accounting dictation. Key terms: ${customVocab}`
      : 'Legal and accounting dictation. Attorney correspondence, memorandum, court filing, deposition, engagement letter, accounting report, tax advisory, audit opinion. Prima facie, res ipsa loquitur, habeas corpus, voir dire, stare decisis, certiorari, GAAP, IFRS, EBITDA, IRC, PCAOB.';

    const encoder = new TextEncoder();

    // Stream progress via SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        const results: TranscriptionResult[] = [];

        try {
          // Send initial event with total count
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                total: files.length,
                engine: useVoxlen ? 'voxlen' : 'whisper',
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
              let text = '';
              let duration: number | undefined;
              let engine = 'whisper';

              if (useVoxlen) {
                try {
                  const result = await voxlenTranscribe(file, {
                    language: 'en',
                    vocabulary: vocabHint,
                  });
                  text = result.text;
                  duration = result.duration;
                  engine = 'voxlen';
                } catch (voxlenErr: unknown) {
                  // Fall back to Whisper for this file
                  console.warn(`Voxlen batch failed for ${file.name}, falling back to Whisper:`, voxlenErr);
                  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                  const transcription = await openai.audio.transcriptions.create({
                    file: file,
                    model: 'whisper-1',
                    language: 'en',
                    response_format: 'verbose_json',
                    prompt: vocabHint,
                  });
                  text = transcription.text;
                  duration = transcription.duration;
                }
              } else {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const transcription = await openai.audio.transcriptions.create({
                  file: file,
                  model: 'whisper-1',
                  language: 'en',
                  response_format: 'verbose_json',
                  prompt: vocabHint,
                });
                text = transcription.text;
                duration = transcription.duration;
              }

              const result: TranscriptionResult = {
                filename: file.name,
                text,
                duration,
                engine,
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
            } catch (err: unknown) {
              console.error(`Batch transcription error for file ${file.name}:`, err);
              const result: TranscriptionResult = {
                filename: file.name,
                text: '',
                duration: undefined,
                error: 'Transcription failed for this file',
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
        } catch (streamErr: unknown) {
          console.error('Batch transcription stream error:', streamErr);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'Batch processing failed',
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
  } catch (error: unknown) {
    console.error('Batch transcription error:', error);
    return NextResponse.json(
      { error: 'Batch transcription failed', code: 'BATCH_TRANSCRIPTION_ERROR' },
      { status: 500 }
    );
  }
}
