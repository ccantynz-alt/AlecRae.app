import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const customVocab = formData.get('vocabulary') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build vocabulary prompt for Whisper — helps with specialised terms
    const vocabHint = customVocab
      ? `Legal and accounting dictation. Key terms: ${customVocab}`
      : 'Legal and accounting dictation. Attorney correspondence, memorandum, court filing, deposition, engagement letter, accounting report, tax advisory, audit opinion. Prima facie, res ipsa loquitur, habeas corpus, voir dire, stare decisis, certiorari, GAAP, IFRS, EBITDA, IRC, PCAOB.';

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
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
  }
}
