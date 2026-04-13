/**
 * Voxlen Feature Tier Gating
 *
 * Maps Voxlen features to subscription tiers. Every API route checks
 * the user's tier before allowing access to a feature.
 *
 * Tier hierarchy: free < personal < pro < enterprise
 * Higher tiers include all features from lower tiers.
 *
 * Pricing alignment:
 *   Free:       V1 (Voice Compose/STT), V2 (Voice Search)
 *   Personal:   V3 (Voice Replies), V4 (Morning Briefing/TTS), V5 (Voice Notes)
 *   Pro:        V6 (Translation), V7 (Voice Cloning), V8 (Voice Commands),
 *               V9 (Meeting Mode/Diarization), V10 (Sentiment Analysis)
 *   Enterprise: V11 (Voiceprint Auth), V12 (Call-to-Email), V13 (Team Channels)
 */

export type VoxlenTier = 'free' | 'personal' | 'pro' | 'enterprise';

export type VoxlenFeature =
  | 'stt'                  // V1 — Speech-to-text (batch + streaming)
  | 'voice-search'         // V2 — Voice search (STT + intent extraction)
  | 'voice-replies'        // V3 — Voice replies with voice profile
  | 'tts'                  // V4 — Text-to-speech (morning briefing, read-aloud)
  | 'voice-notes'          // V5 — Voice notes on threads
  | 'translation'          // V6 — Real-time voice translation (35+ languages)
  | 'voice-cloning'        // V7 — Voice cloning (30s enrollment)
  | 'voice-commands'       // V8 — Voice commands anywhere
  | 'diarization'          // V9 — Meeting mode (speaker diarization)
  | 'sentiment'            // V10 — Voice sentiment analysis
  | 'voiceprint-auth'      // V11 — Voiceprint biometric authentication
  | 'call-bridge'          // V12 — Call-to-email bridge
  | 'team-channels';       // V13 — Team voice channels

/**
 * Feature → minimum tier required.
 */
const FEATURE_TIERS: Record<VoxlenFeature, VoxlenTier> = {
  'stt':              'free',
  'voice-search':     'free',
  'voice-replies':    'personal',
  'tts':              'personal',
  'voice-notes':      'personal',
  'translation':      'pro',
  'voice-cloning':    'pro',
  'voice-commands':   'pro',
  'diarization':      'pro',
  'sentiment':        'pro',
  'voiceprint-auth':  'enterprise',
  'call-bridge':      'enterprise',
  'team-channels':    'enterprise',
};

/**
 * Tier numeric rank for comparison.
 */
const TIER_RANK: Record<VoxlenTier, number> = {
  free: 0,
  personal: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * Check if a tier has access to a feature.
 */
export function hasFeatureAccess(userTier: VoxlenTier, feature: VoxlenFeature): boolean {
  const requiredTier = FEATURE_TIERS[feature];
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * Get the minimum tier required for a feature.
 */
export function getRequiredTier(feature: VoxlenFeature): VoxlenTier {
  return FEATURE_TIERS[feature];
}

/**
 * Get all features available for a given tier.
 */
export function getFeaturesForTier(tier: VoxlenTier): VoxlenFeature[] {
  const rank = TIER_RANK[tier];
  return (Object.entries(FEATURE_TIERS) as [VoxlenFeature, VoxlenTier][])
    .filter(([, requiredTier]) => TIER_RANK[requiredTier] <= rank)
    .map(([feature]) => feature);
}

/**
 * Tier display metadata for billing/pricing UI.
 */
export interface TierConfig {
  id: VoxlenTier;
  name: string;
  price: string;
  priceMonthly: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceMonthly: 0,
    description: 'Essential voice dictation for professionals',
    features: [
      'Voice compose — speak, get formatted text',
      'Real-time streaming transcription',
      'Voice search across dictations',
      '12 document mode AI enhancement',
      'Legal & accounting vocabulary (5,000+ terms)',
      'Export to .docx',
      'Voice commands (punctuation, paragraphs)',
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    price: '$9/mo',
    priceMonthly: 9,
    description: 'Your personal voice-powered assistant',
    features: [
      'Everything in Free, plus:',
      'Voice replies — speak in your tone',
      'Morning briefing — spoken inbox summary',
      'Voice notes on any document',
      'Text-to-speech read-aloud',
      'Multiple TTS voice options',
      'Audio playback of recordings',
    ],
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19/mo',
    priceMonthly: 19,
    description: 'Advanced voice intelligence for power users',
    features: [
      'Everything in Personal, plus:',
      'Real-time voice translation (35+ languages)',
      'Voice cloning — AI speaks in your voice',
      'Voice commands — control everything by speaking',
      'Meeting mode — speaker diarization + transcription',
      'Sentiment analysis — detect tone and mood',
      'Premium TTS voices',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceMonthly: -1,
    description: 'Voice-native infrastructure for teams',
    features: [
      'Everything in Pro, plus:',
      'Voiceprint biometric authentication',
      'Call-to-email bridge — calls become threads',
      'Team voice channels — walkie-talkie for email',
      'SSO integration (Google + Microsoft)',
      'Custom voice model training',
      'SOC 2 / HIPAA compliance',
      'Dedicated account manager',
    ],
  },
];

/**
 * Map the existing AlecRae billing plan names to Voxlen tiers.
 * The billing/status route returns 'free' | 'pro' | 'enterprise'.
 * We add 'personal' as a new tier between free and pro.
 */
export function mapBillingPlanToTier(
  plan: string
): VoxlenTier {
  switch (plan) {
    case 'enterprise':
      return 'enterprise';
    case 'pro':
      return 'pro';
    case 'personal':
      return 'personal';
    case 'free':
    default:
      return 'free';
  }
}
