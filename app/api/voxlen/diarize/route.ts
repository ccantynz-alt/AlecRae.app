import { NextRequest, NextResponse } from 'next/server';
import { diarize, isVoxlenConfigured } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 120;

/**
 * POST /api/voxlen/diarize
 *
 * Speaker diarization — identify who is talking in audio.
 * Used for meeting mode: track commitments, link transcripts to speakers.
 * Tier: Pro+ (V9 — Meeting Mode)
 *
 * FormData: { audio: File, expected_speakers?: number, language?: string }
 * Returns: { speakers, segments }
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
  if (!hasFeatureAccess(tier, 'diarization')) {
    return NextResponse.json(
      {
        error: 'Meeting mode (speaker diarization) requires a Pro plan or higher',
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
    const expectedSpeakers = formData.get('expected_speakers') as string | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Max 50MB for diarization (meetings can be long)
    if (audioFile.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file exceeds 50MB limit', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const result = await diarize(audioFile, {
      expectedSpeakers: expectedSpeakers ? parseInt(expectedSpeakers, 10) : undefined,
      language: language || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Diarization error:', error);
    const message = error instanceof Error ? error.message : 'Speaker diarization failed';
    return NextResponse.json(
      { error: message, code: 'DIARIZATION_ERROR' },
      { status: 500 }
    );
  }
}
