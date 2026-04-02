import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getWhisperPromptForLanguage } from '@/lib/languages';

export const maxDuration = 60;

// Map language codes to Whisper language codes
const WHISPER_LANG_MAP: Record<string, string> = {
  'en-US': 'en', 'en-GB': 'en', 'en-AU': 'en', 'en-NZ': 'en',
  'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it',
  'pt-BR': 'pt', 'pt-PT': 'pt', 'nl': 'nl', 'ja': 'ja',
  'ko': 'ko', 'zh': 'zh', 'ar': 'ar', 'hi': 'hi',
  'ru': 'ru', 'tr': 'tr', 'pl': 'pl', 'sv': 'sv',
  'th': 'th', 'vi': 'vi', 'id': 'id',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const customVocab = formData.get('vocabulary') as string | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Determine Whisper language code
    const whisperLang = language ? (WHISPER_LANG_MAP[language] || language.split('-')[0]) : 'en';

    // Build vocabulary prompt — language-specific with custom terms
    let vocabHint: string;
    if (customVocab) {
      const langHint = getWhisperPromptForLanguage(language || 'en-US');
      vocabHint = `${langHint} Additional terms: ${customVocab}`;
    } else {
      vocabHint = getWhisperPromptForLanguage(language || 'en-US');
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: whisperLang,
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
