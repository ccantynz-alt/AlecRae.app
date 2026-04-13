import { NextRequest, NextResponse } from 'next/server';
import { voiceprintVerify, isVoxlenConfigured } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 10;

/**
 * POST /api/voxlen/voiceprint/verify
 *
 * Verify a voiceprint for biometric authentication.
 * Includes anti-spoofing detection (replay attacks, deepfake detection).
 * Tier: Enterprise (V11 — Voice Authentication)
 *
 * FormData: { audio: File, passphrase?: string }
 * Returns: { match, confidence, spoofDetected }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimiters.auth(request);
  if (limited) return limited;

  if (!isVoxlenConfigured()) {
    return NextResponse.json(
      { error: 'Voxlen voice engine not configured', code: 'VOXLEN_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  // Check tier access — voiceprint verify can work without full user context
  // (used during login flow), but still requires enterprise setup
  const user = await getUserFromRequest(request);
  const tier = mapBillingPlanToTier(user?.subscriptionTier || 'free');
  if (!hasFeatureAccess(tier, 'voiceprint-auth')) {
    return NextResponse.json(
      {
        error: 'Voiceprint authentication requires an Enterprise plan',
        code: 'TIER_REQUIRED',
        requiredTier: 'enterprise',
        currentTier: tier,
      },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const passphrase = formData.get('passphrase') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const userId = user?.id || 'admin';

    const result = await voiceprintVerify(audioFile, {
      userId,
      passphrase: passphrase || undefined,
    });

    // Security: if spoof detected, log it
    if (result.spoofDetected) {
      console.warn(`Voiceprint spoof attempt detected for user ${userId}`);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Voiceprint verification error:', error);
    const message = error instanceof Error ? error.message : 'Voiceprint verification failed';
    return NextResponse.json(
      { error: message, code: 'VOICEPRINT_VERIFY_ERROR' },
      { status: 500 }
    );
  }
}
