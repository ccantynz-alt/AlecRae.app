import { NextRequest, NextResponse } from 'next/server';
import { cloneEnroll, isVoxlenConfigured } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 30;

/**
 * POST /api/voxlen/clone/enroll
 *
 * Enroll a voice sample for voice cloning (minimum 30 seconds).
 * Requires explicit user consent.
 * Tier: Pro+ (V7 — Voice Cloning)
 *
 * FormData: { audio: File, consent: "true", label?: string }
 * Returns: { voiceId, quality, durationProcessed, message }
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
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const consent = formData.get('consent') as string;
    const label = formData.get('label') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (consent !== 'true') {
      return NextResponse.json(
        {
          error: 'Voice cloning requires explicit consent. Pass consent=true to confirm.',
          code: 'CONSENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    // Minimum 30 seconds of audio required
    // Size heuristic: 30s of webm/opus ≈ 60KB minimum
    if (audioFile.size < 30000) {
      return NextResponse.json(
        {
          error: 'Audio sample too short. Voice cloning requires at least 30 seconds of clear speech.',
          code: 'AUDIO_TOO_SHORT',
        },
        { status: 400 }
      );
    }

    const userId = user?.id || 'admin';

    const result = await cloneEnroll(audioFile, {
      userId,
      consentGiven: true,
      label: label || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Voice clone enrollment error:', error);
    const message = error instanceof Error ? error.message : 'Voice cloning enrollment failed';
    return NextResponse.json(
      { error: message, code: 'CLONE_ENROLL_ERROR' },
      { status: 500 }
    );
  }
}
