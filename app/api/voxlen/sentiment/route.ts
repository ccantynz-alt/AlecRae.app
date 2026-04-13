import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, isVoxlenConfigured } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { hasFeatureAccess, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import { getUserFromRequest } from '@/lib/auth-multi';

export const maxDuration = 15;

/**
 * POST /api/voxlen/sentiment
 *
 * Analyse audio for tone and mood via Voxlen.
 * Returns: urgent, frustrated, happy, casual, stressed, neutral, sarcastic, professional
 * Tier: Pro+ (V10 — Voice Sentiment Analysis)
 *
 * FormData: { audio: File }
 * Returns: { overall, confidence, segments? }
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
  if (!hasFeatureAccess(tier, 'sentiment')) {
    return NextResponse.json(
      {
        error: 'Sentiment analysis requires a Pro plan or higher',
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

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Max 10MB for sentiment analysis
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file exceeds 10MB limit', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const result = await analyzeSentiment(audioFile);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Sentiment analysis error:', error);
    const message = error instanceof Error ? error.message : 'Sentiment analysis failed';
    return NextResponse.json(
      { error: message, code: 'SENTIMENT_ERROR' },
      { status: 500 }
    );
  }
}
