import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifySession } from '@/lib/auth';
import { rateLimiters } from '@/lib/rate-limit';
import { getVocabularyForMode } from '@/lib/legal-vocabulary';
import { isVoxlenConfigured, transcribe as voxlenTranscribe } from '@/lib/voxlen';

const VOCAB_CHAR_LIMIT = 800;

function buildVocabPrompt(customVocab: string | null, mode: string | null): string {
  const prefix = 'Legal and accounting dictation. Key terms: ';
  const maxTermsLength = VOCAB_CHAR_LIMIT - prefix.length;

  // User's custom terms get priority
  const userTerms = customVocab ? customVocab.split(',').map((t) => t.trim()).filter(Boolean) : [];

  // Built-in terms for the selected mode
  const builtInTerms = mode ? getVocabularyForMode(mode) : [];

  // Combine: user terms first, then built-in, respecting character limit
  const combined: string[] = [...userTerms];
  for (const term of builtInTerms) {
    if (!combined.includes(term)) {
      combined.push(term);
    }
  }

  // Join and truncate to fit within limit
  let result = '';
  for (const term of combined) {
    const addition = result ? `, ${term}` : term;
    if (result.length + addition.length > maxTermsLength) break;
    result += addition;
  }

  if (!result) {
    return 'Legal and accounting dictation. Attorney correspondence, memorandum, court filing, deposition, engagement letter, accounting report, tax advisory, audit opinion. Prima facie, res ipsa loquitur, habeas corpus, voir dire, stare decisis, certiorari, GAAP, IFRS, EBITDA, IRC, PCAOB.';
  }

  return prefix + result;
}

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const limited = rateLimiters.transcribeStream(request);
  if (limited) return limited;

  try {
    // Verify session
    const session = request.cookies.get('alecrae_session')?.value;
    if (!session || !(await verifySession(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const customVocab = formData.get('vocabulary') as string | null;
    const mode = formData.get('mode') as string | null;
    const chunkIndex = formData.get('chunkIndex') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const vocabHint = buildVocabPrompt(customVocab, mode);
    const useVoxlen = isVoxlenConfigured();
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
                engine: useVoxlen ? 'voxlen' : 'whisper',
              })}\n\n`
            )
          );

          let text = '';
          let duration: number | undefined;

          if (useVoxlen) {
            // --- Voxlen STT (primary) ---
            try {
              const result = await voxlenTranscribe(audioFile, {
                language: 'en',
                vocabulary: vocabHint,
                mode: mode || undefined,
              });
              text = result.text;
              duration = result.duration;
            } catch (voxlenErr: unknown) {
              // Fall back to Whisper
              console.warn('Voxlen streaming chunk failed, falling back to Whisper:', voxlenErr);
              const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              const transcription = await openai.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-1',
                language: 'en',
                response_format: 'verbose_json',
                prompt: vocabHint,
              });
              text = transcription.text;
              duration = transcription.duration;
            }
          } else {
            // --- Whisper fallback ---
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const transcription = await openai.audio.transcriptions.create({
              file: audioFile,
              model: 'whisper-1',
              language: 'en',
              response_format: 'verbose_json',
              prompt: vocabHint,
            });
            text = transcription.text;
            duration = transcription.duration;
          }

          // Send the partial transcription result
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'partial',
                text,
                duration,
                chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : 0,
              })}\n\n`
            )
          );

          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          console.error('Streaming transcription stream error:', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'Transcription failed',
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
    console.error('Streaming transcription error:', error);
    return NextResponse.json(
      { error: 'Streaming transcription failed', code: 'STREAM_TRANSCRIPTION_ERROR' },
      { status: 500 }
    );
  }
}
