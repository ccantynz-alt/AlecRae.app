/**
 * Voxlen Voice Engine — API Client
 *
 * Central client for all Voxlen API interactions. Voxlen is the voice engine
 * powering AlecRae's dictation platform, replacing OpenAI Whisper for STT
 * and adding TTS, voice cloning, translation, sentiment analysis, voiceprint
 * biometrics, and speaker diarization.
 *
 * All methods gracefully fall back when VOXLEN_API_KEY is not configured.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoxlenConfig {
  apiKey: string;
  baseUrl: string;
  /** WebSocket base URL for streaming endpoints */
  wsUrl: string;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  confidence?: number;
  language?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
}

export interface SynthesisOptions {
  text: string;
  voice?: string;
  speed?: number;
  /** SSML markup for emphasis, pauses, etc. */
  ssml?: boolean;
  /** Output format: pcm, wav, ogg, mp3 */
  format?: 'pcm' | 'wav' | 'ogg' | 'mp3';
}

export interface SynthesisResult {
  audio: ArrayBuffer;
  duration: number;
  format: string;
}

export interface TranslationOptions {
  /** Source audio as ArrayBuffer or base64 */
  audio: ArrayBuffer | string;
  sourceLanguage?: string;
  targetLanguage: string;
  /** Output as text, audio, or both */
  outputMode?: 'text' | 'audio' | 'both';
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence: number;
  audio?: ArrayBuffer;
}

export interface VoiceCloneEnrollResult {
  voiceId: string;
  quality: 'low' | 'medium' | 'high';
  durationProcessed: number;
  message: string;
}

export interface SentimentResult {
  overall: SentimentLabel;
  confidence: number;
  segments?: SentimentSegment[];
}

export type SentimentLabel =
  | 'urgent'
  | 'frustrated'
  | 'happy'
  | 'casual'
  | 'stressed'
  | 'neutral'
  | 'sarcastic'
  | 'professional';

export interface SentimentSegment {
  start: number;
  end: number;
  sentiment: SentimentLabel;
  confidence: number;
}

export interface VoiceprintEnrollResult {
  voiceprintId: string;
  quality: number;
  message: string;
}

export interface VoiceprintVerifyResult {
  match: boolean;
  confidence: number;
  spoofDetected: boolean;
}

export interface DiarizationResult {
  speakers: DiarizationSpeaker[];
  segments: DiarizationSegment[];
}

export interface DiarizationSpeaker {
  id: string;
  label: string;
  totalDuration: number;
}

export interface DiarizationSegment {
  start: number;
  end: number;
  speakerId: string;
  text: string;
  confidence: number;
}

export interface VoxlenError {
  code: string;
  message: string;
  status: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getConfig(): VoxlenConfig | null {
  const apiKey = process.env.VOXLEN_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: process.env.VOXLEN_API_URL || 'https://api.voxlen.io/v1',
    wsUrl: process.env.VOXLEN_WS_URL || 'wss://api.voxlen.io/v1',
  };
}

/**
 * Check if Voxlen is configured and available.
 * When false, callers should fall back to Whisper/OpenAI.
 */
export function isVoxlenConfigured(): boolean {
  return !!process.env.VOXLEN_API_KEY;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function voxlenFetch(
  path: string,
  options: RequestInit & { rawBody?: boolean } = {}
): Promise<Response> {
  const config = getConfig();
  if (!config) {
    throw new VoxlenClientError('VOXLEN_NOT_CONFIGURED', 'Voxlen API key not set', 503);
  }

  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    ...(options.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!options.rawBody && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorBody: any = {};
    try {
      errorBody = await res.json();
    } catch {
      errorBody = { message: res.statusText };
    }
    throw new VoxlenClientError(
      errorBody.code || 'VOXLEN_ERROR',
      errorBody.message || `Voxlen API error: ${res.status}`,
      res.status
    );
  }

  return res;
}

export class VoxlenClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'VoxlenClientError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Speech-to-Text (STT)
// ---------------------------------------------------------------------------

/**
 * POST /v1/transcribe — Batch audio-to-text transcription.
 * Replaces OpenAI Whisper with Voxlen's legal/accounting-optimised STT.
 */
export async function transcribe(
  audio: File | Blob,
  options: {
    language?: string;
    vocabulary?: string;
    mode?: string;
  } = {}
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('audio', audio);
  if (options.language) formData.append('language', options.language);
  if (options.vocabulary) formData.append('vocabulary', options.vocabulary);
  if (options.mode) formData.append('mode', options.mode);

  const res = await voxlenFetch('/transcribe', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

/**
 * Returns the WebSocket URL for real-time streaming STT.
 * Client should connect directly to this URL.
 * WebSocket /v1/transcribe/stream
 */
export function getStreamingTranscribeUrl(options: {
  language?: string;
  vocabulary?: string;
  mode?: string;
} = {}): string | null {
  const config = getConfig();
  if (!config) return null;

  const params = new URLSearchParams();
  params.set('token', config.apiKey);
  if (options.language) params.set('language', options.language);
  if (options.vocabulary) params.set('vocabulary', options.vocabulary);
  if (options.mode) params.set('mode', options.mode);

  return `${config.wsUrl}/transcribe/stream?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Text-to-Speech (TTS)
// ---------------------------------------------------------------------------

/**
 * POST /v1/synthesize — Convert text to speech.
 * Used for morning briefings, read-aloud, and voice feedback.
 */
export async function synthesize(options: SynthesisOptions): Promise<SynthesisResult> {
  const res = await voxlenFetch('/synthesize', {
    method: 'POST',
    body: JSON.stringify({
      text: options.text,
      voice: options.voice || 'professional-1',
      speed: options.speed || 1.0,
      ssml: options.ssml || false,
      format: options.format || 'mp3',
    }),
  });

  const audio = await res.arrayBuffer();
  const duration = parseFloat(res.headers.get('X-Audio-Duration') || '0');

  return {
    audio,
    duration,
    format: options.format || 'mp3',
  };
}

/**
 * Returns the WebSocket URL for streaming TTS.
 * WebSocket /v1/synthesize/stream
 */
export function getStreamingSynthesizeUrl(options: {
  voice?: string;
  speed?: number;
  format?: string;
} = {}): string | null {
  const config = getConfig();
  if (!config) return null;

  const params = new URLSearchParams();
  params.set('token', config.apiKey);
  if (options.voice) params.set('voice', options.voice);
  if (options.speed) params.set('speed', String(options.speed));
  if (options.format) params.set('format', options.format);

  return `${config.wsUrl}/synthesize/stream?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

/**
 * POST /v1/translate — Speech-to-speech translation across 35+ languages.
 */
export async function translate(options: TranslationOptions): Promise<TranslationResult> {
  const formData = new FormData();

  if (typeof options.audio === 'string') {
    // Base64 audio
    formData.append('audio_base64', options.audio);
  } else {
    formData.append('audio', new Blob([options.audio]));
  }

  if (options.sourceLanguage) formData.append('source_language', options.sourceLanguage);
  formData.append('target_language', options.targetLanguage);
  formData.append('output_mode', options.outputMode || 'both');

  const res = await voxlenFetch('/translate', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  // Translation returns JSON with text and optionally audio as base64
  const data = await res.json();

  return {
    translatedText: data.translated_text,
    detectedLanguage: data.detected_language,
    confidence: data.confidence,
    audio: data.audio_base64
      ? base64ToArrayBuffer(data.audio_base64)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Voice Cloning
// ---------------------------------------------------------------------------

/**
 * POST /v1/clone/enroll — Enroll a voice sample for cloning.
 * Requires minimum 30-second audio sample and explicit user consent.
 */
export async function cloneEnroll(
  audio: File | Blob,
  options: {
    userId: string;
    consentGiven: boolean;
    label?: string;
  }
): Promise<VoiceCloneEnrollResult> {
  if (!options.consentGiven) {
    throw new VoxlenClientError(
      'CONSENT_REQUIRED',
      'Voice cloning requires explicit user consent',
      400
    );
  }

  const formData = new FormData();
  formData.append('audio', audio);
  formData.append('user_id', options.userId);
  formData.append('consent_given', 'true');
  if (options.label) formData.append('label', options.label);

  const res = await voxlenFetch('/clone/enroll', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

/**
 * POST /v1/clone/synthesize — Generate speech using a cloned voice.
 */
export async function cloneSynthesize(options: {
  voiceId: string;
  text: string;
  speed?: number;
  format?: string;
}): Promise<SynthesisResult> {
  const res = await voxlenFetch('/clone/synthesize', {
    method: 'POST',
    body: JSON.stringify({
      voice_id: options.voiceId,
      text: options.text,
      speed: options.speed || 1.0,
      format: options.format || 'mp3',
    }),
  });

  const audio = await res.arrayBuffer();
  const duration = parseFloat(res.headers.get('X-Audio-Duration') || '0');

  return {
    audio,
    duration,
    format: options.format || 'mp3',
  };
}

// ---------------------------------------------------------------------------
// Sentiment Analysis
// ---------------------------------------------------------------------------

/**
 * POST /v1/sentiment — Analyse audio for tone and mood.
 * Returns: urgent, frustrated, happy, casual, stressed, neutral, sarcastic, professional
 */
export async function analyzeSentiment(
  audio: File | Blob
): Promise<SentimentResult> {
  const formData = new FormData();
  formData.append('audio', audio);

  const res = await voxlenFetch('/sentiment', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

// ---------------------------------------------------------------------------
// Voiceprint Biometrics
// ---------------------------------------------------------------------------

/**
 * POST /v1/voiceprint/enroll — Enroll a voiceprint for biometric auth.
 */
export async function voiceprintEnroll(
  audio: File | Blob,
  options: {
    userId: string;
    passphrase?: string;
  }
): Promise<VoiceprintEnrollResult> {
  const formData = new FormData();
  formData.append('audio', audio);
  formData.append('user_id', options.userId);
  if (options.passphrase) formData.append('passphrase', options.passphrase);

  const res = await voxlenFetch('/voiceprint/enroll', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

/**
 * POST /v1/voiceprint/verify — Verify a voiceprint for authentication.
 * Includes anti-spoofing detection (replay attacks, deepfake detection).
 */
export async function voiceprintVerify(
  audio: File | Blob,
  options: {
    userId: string;
    passphrase?: string;
  }
): Promise<VoiceprintVerifyResult> {
  const formData = new FormData();
  formData.append('audio', audio);
  formData.append('user_id', options.userId);
  if (options.passphrase) formData.append('passphrase', options.passphrase);

  const res = await voxlenFetch('/voiceprint/verify', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

// ---------------------------------------------------------------------------
// Speaker Diarization
// ---------------------------------------------------------------------------

/**
 * POST /v1/diarize — Identify speakers in audio.
 * Used for meeting mode to track who said what.
 */
export async function diarize(
  audio: File | Blob,
  options: {
    expectedSpeakers?: number;
    language?: string;
  } = {}
): Promise<DiarizationResult> {
  const formData = new FormData();
  formData.append('audio', audio);
  if (options.expectedSpeakers) {
    formData.append('expected_speakers', String(options.expectedSpeakers));
  }
  if (options.language) formData.append('language', options.language);

  const res = await voxlenFetch('/diarize', {
    method: 'POST',
    body: formData,
    rawBody: true,
  });

  return res.json();
}

// ---------------------------------------------------------------------------
// Voice Commands (Streaming)
// ---------------------------------------------------------------------------

/**
 * Returns the WebSocket URL for real-time voice command recognition.
 * WebSocket /v1/commands/stream
 */
export function getVoiceCommandStreamUrl(): string | null {
  const config = getConfig();
  if (!config) return null;

  const params = new URLSearchParams();
  params.set('token', config.apiKey);

  return `${config.wsUrl}/commands/stream?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Available TTS Voices
// ---------------------------------------------------------------------------

export const VOXLEN_VOICES = [
  { id: 'professional-1', name: 'Professional (Female)', tier: 'free' },
  { id: 'professional-2', name: 'Professional (Male)', tier: 'free' },
  { id: 'warm-1', name: 'Warm (Female)', tier: 'personal' },
  { id: 'warm-2', name: 'Warm (Male)', tier: 'personal' },
  { id: 'authoritative-1', name: 'Authoritative (Female)', tier: 'personal' },
  { id: 'authoritative-2', name: 'Authoritative (Male)', tier: 'personal' },
  { id: 'calm-1', name: 'Calm (Female)', tier: 'pro' },
  { id: 'calm-2', name: 'Calm (Male)', tier: 'pro' },
  { id: 'broadcast-1', name: 'Broadcast (Female)', tier: 'pro' },
  { id: 'broadcast-2', name: 'Broadcast (Male)', tier: 'pro' },
] as const;

// ---------------------------------------------------------------------------
// Supported Languages (35+ for translation)
// ---------------------------------------------------------------------------

export const VOXLEN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'el', name: 'Greek' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fa', name: 'Persian' },
] as const;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Strip data URL prefix if present
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
