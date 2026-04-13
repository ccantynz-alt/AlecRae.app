import { NextRequest, NextResponse } from 'next/server';
import { cloneSynthesize, isVoxlenConfigured, arrayBufferToBase64 } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 30;

/**
 * POST /api/voxlen/clone/synthesize
 *
 * Generate speech using a previously enrolled cloned voice.
 * Tier: Pro+ (V7 — Voice Cloning)
 *
 * Body: { voiceId, text, speed?, format? }
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
  if (!hasFeatureAccess(tier, 'voice-cloning')) {
    return NextResponse.json(
      {
        error: 'Voice cloning requires a Pro plan or higher',
        code: 'TIER_REQUIRED',
        requiredTier: 'pro',
        currentTier: tier,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { voiceId, text, speed, format } = body;

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { error: 'No voiceId provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

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

    const result = await cloneSynthesize({
      voiceId,
      text: text.trim(),
      speed: speed || 1.0,
      format: format || 'mp3',
    });

    return NextResponse.json({
      audio: arrayBufferToBase64(result.audio),
      duration: result.duration,
      format: result.format,
    });
  } catch (error: unknown) {
    console.error('Clone synthesis error:', error);
    const message = error instanceof Error ? error.message : 'Cloned voice synthesis failed';
    return NextResponse.json(
      { error: message, code: 'CLONE_SYNTHESIZE_ERROR' },
      { status: 500 }
    );
  }
}
