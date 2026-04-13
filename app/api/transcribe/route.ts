import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
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

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const limited = rateLimiters.transcribe(request);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const customVocab = formData.get('vocabulary') as string | null;
    const mode = formData.get('mode') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const vocabHint = buildVocabPrompt(customVocab, mode);

    // --- Voxlen STT (primary) with Whisper fallback ---
    if (isVoxlenConfigured()) {
      try {
        const result = await voxlenTranscribe(audioFile, {
          language: 'en',
          vocabulary: vocabHint,
          mode: mode || undefined,
        });

        return NextResponse.json({
          text: result.text,
          duration: result.duration,
          confidence: result.confidence,
          engine: 'voxlen',
        });
      } catch (voxlenErr: unknown) {
        // Voxlen failed — fall through to Whisper
        console.warn('Voxlen transcription failed, falling back to Whisper:', voxlenErr);
      }
    }

    // --- Whisper fallback ---
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      prompt: vocabHint,
    });

    return NextResponse.json({
      text: transcription.text,
      duration: transcription.duration,
      engine: 'whisper',
    });
  } catch (error: unknown) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', code: 'TRANSCRIPTION_ERROR' },
      { status: 500 }
    );
  }
}
