import { NextRequest, NextResponse } from 'next/server';
import { synthesize, isVoxlenConfigured, arrayBufferToBase64 } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 30;

/**
 * POST /api/voxlen/synthesize
 *
 * Text-to-speech synthesis via Voxlen.
 * Used for: morning briefings, read-aloud, voice feedback.
 * Tier: Personal+ (V4 — Morning Briefing / TTS)
 *
 * Body: { text, voice?, speed?, ssml?, format? }
 * Returns: { audio: base64, duration, format }
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
  if (!hasFeatureAccess(tier, 'tts')) {
    return NextResponse.json(
      {
        error: 'Text-to-speech requires a Personal plan or higher',
        code: 'TIER_REQUIRED',
        requiredTier: 'personal',
        currentTier: tier,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { text, voice, speed, ssml, format } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds 5,000 character limit', code: 'TEXT_TOO_LONG' },
        { status: 400 }
      );
    }

    const result = await synthesize({
      text: text.trim(),
      voice: voice || 'professional-1',
      speed: speed || 1.0,
      ssml: ssml || false,
      format: format || 'mp3',
    });

    return NextResponse.json({
      audio: arrayBufferToBase64(result.audio),
      duration: result.duration,
      format: result.format,
    });
  } catch (error: unknown) {
    console.error('TTS synthesis error:', error);
    const message = error instanceof Error ? error.message : 'Synthesis failed';
    return NextResponse.json(
      { error: message, code: 'SYNTHESIS_ERROR' },
      { status: 500 }
    );
  }
}
