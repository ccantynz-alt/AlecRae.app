import { NextRequest, NextResponse } from 'next/server';
import { translate, isVoxlenConfigured, arrayBufferToBase64 } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 60;

/**
 * POST /api/voxlen/translate
 *
 * Real-time voice translation via Voxlen (35+ languages).
 * Tier: Pro+ (V6 — Real-time Voice Translation)
 *
 * Accepts FormData with audio file, or JSON with audio_base64.
 * Returns: { translatedText, detectedLanguage, confidence, audio? }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimiters.general(request);
  if (limited) return limited;

  if (!isVoxlenConfigured()) {
    return NextResponse.json(
      { error: 'Voxlen voice engine not configured', code: 'VOXLEN_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  // Check tier access
  const user = await getUserFromRequest(request);
  const tier = mapBillingPlanToTier(user?.subscriptionTier || 'free');
  if (!hasFeatureAccess(tier, 'translation')) {
    return NextResponse.json(
      {
        error: 'Voice translation requires a Pro plan or higher',
        code: 'TIER_REQUIRED',
        requiredTier: 'pro',
        currentTier: tier,
      },
      { status: 403 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let audio: ArrayBuffer | string;
    let targetLanguage: string;
    let sourceLanguage: string | undefined;
    let outputMode: 'text' | 'audio' | 'both' = 'both';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      if (!audioFile) {
        return NextResponse.json(
          { error: 'No audio file provided', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }
      audio = await audioFile.arrayBuffer();
      targetLanguage = (formData.get('target_language') as string) || 'en';
      sourceLanguage = (formData.get('source_language') as string) || undefined;
      outputMode = (formData.get('output_mode') as 'text' | 'audio' | 'both') || 'both';
    } else {
      const body = await request.json();
      if (!body.audio_base64) {
        return NextResponse.json(
          { error: 'No audio provided', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }
      audio = body.audio_base64;
      targetLanguage = body.target_language || 'en';
      sourceLanguage = body.source_language;
      outputMode = body.output_mode || 'both';
    }

    const result = await translate({
      audio,
      sourceLanguage,
      targetLanguage,
      outputMode,
    });

    return NextResponse.json({
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage,
      confidence: result.confidence,
      audio: result.audio ? arrayBufferToBase64(result.audio) : undefined,
    });
  } catch (error: unknown) {
    console.error('Translation error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json(
      { error: message, code: 'TRANSLATION_ERROR' },
      { status: 500 }
    );
  }
}
