import { NextRequest, NextResponse } from 'next/server';
import { isVoxlenConfigured, VOXLEN_VOICES, VOXLEN_LANGUAGES } from '@/lib/voxlen';
import { rateLimiters } from '@/lib/rate-limit';
import { getFeaturesForTier, TIER_CONFIGS, mapBillingPlanToTier } from '@/lib/voxlen-tiers';
import type { VoxlenTier } from '@/lib/voxlen-tiers';

/**
 * GET /api/voxlen/status
 *
 * Returns Voxlen engine status, available features for the user's tier,
 * supported voices, and supported languages.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimiters.general(request);
  if (limited) return limited;

  // Determine user tier from billing status
  let userTier: VoxlenTier = 'free';
  try {
    const billingRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://alecrae.app'}/api/billing/status`,
      {
        headers: { cookie: request.headers.get('cookie') || '' },
      }
    );
    if (billingRes.ok) {
      const billing = await billingRes.json();
      userTier = mapBillingPlanToTier(billing.plan);
    }
  } catch {
    // Default to free tier
  }

  return NextResponse.json({
    configured: isVoxlenConfigured(),
    engine: isVoxlenConfigured() ? 'voxlen' : 'whisper-fallback',
    tier: userTier,
    features: getFeaturesForTier(userTier),
    voices: VOXLEN_VOICES,
    languages: VOXLEN_LANGUAGES,
    tiers: TIER_CONFIGS,
  });
}
