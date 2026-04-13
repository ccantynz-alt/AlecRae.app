import { NextRequest, NextResponse } from 'next/server';
import { voiceprintEnroll, isVoxlenConfigured } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 15;

/**
 * POST /api/voxlen/voiceprint/enroll
 *
 * Enroll a voiceprint for biometric authentication.
 * Combined with AlecRae passkeys = most secure email login available.
 * Tier: Enterprise (V11 — Voice Authentication)
 *
 * FormData: { audio: File, passphrase?: string }
 * Returns: { voiceprintId, quality, message }
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

  // Check tier access
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

    const result = await voiceprintEnroll(audioFile, {
      userId,
      passphrase: passphrase || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Voiceprint enrollment error:', error);
    const message = error instanceof Error ? error.message : 'Voiceprint enrollment failed';
    return NextResponse.json(
      { error: message, code: 'VOICEPRINT_ENROLL_ERROR' },
      { status: 500 }
    );
  }
}
