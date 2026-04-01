import { DocMode } from './templates';

interface KeywordRule {
  mode: DocMode;
  /** Each group is an array of keywords. A group scores if ANY keyword in it matches. */
  keywordGroups: string[][];
  /** Bonus weight applied when all groups match (default 1.0). */
  weight?: number;
}

const DETECTION_RULES: KeywordRule[] = [
  {
    mode: 'legal-letter',
    keywordGroups: [
      ['dear', 'to whom it may concern'],
      ['sincerely', 'yours truly', 'very truly yours', 'respectfully'],
    ],
    weight: 1.0,
  },
  {
    mode: 'legal-memo',
    keywordGroups: [
      ['to:', 'memorandum'],
      ['from:'],
      ['re:', 'subject:'],
    ],
    weight: 1.2,
  },
  {
    mode: 'court-filing',
    keywordGroups: [
      ['comes now', 'respectfully represents', 'plaintiff', 'petitioner'],
      ['court', 'honorable', 'jurisdiction'],
      ['wherefore', 'prayer for relief', 'motion', 'complaint'],
    ],
    weight: 1.3,
  },
  {
    mode: 'demand-letter',
    keywordGroups: [
      ['demand', 'hereby demand'],
      ['within', 'days', 'deadline'],
      ['failure to', 'legal remedies', 'without further notice', 'liable'],
    ],
    weight: 1.2,
  },
  {
    mode: 'deposition-summary',
    keywordGroups: [
      ['deponent', 'deposition', 'witness'],
      ['testimony', 'testified', 'stated under oath'],
      ['page', 'line', 'exhibit'],
    ],
    weight: 1.2,
  },
  {
    mode: 'engagement-letter',
    keywordGroups: [
      ['scope of engagement', 'scope of representation', 'engagement'],
      ['retainer', 'fee arrangement', 'fee agreement'],
      ['fees', 'billing', 'hourly rate', 'flat fee'],
    ],
    weight: 1.1,
  },
  {
    mode: 'accounting-report',
    keywordGroups: [
      ['gaap', 'financial statements', 'accounting standards'],
      ['balance sheet', 'income statement', 'cash flow', 'financial position'],
    ],
    weight: 1.1,
  },
  {
    mode: 'tax-advisory',
    keywordGroups: [
      ['irc', 'internal revenue code', 'tax code'],
      ['section', 'regulation', 'treasury'],
      ['tax', 'deduction', 'taxable', 'tax liability', 'tax position'],
    ],
    weight: 1.3,
  },
  {
    mode: 'audit-opinion',
    keywordGroups: [
      ['audit', 'auditor', 'audited'],
      ['opinion', 'unqualified', 'qualified', 'adverse'],
      ['gaas', 'pcaob', 'scope', 'reasonable assurance'],
    ],
    weight: 1.3,
  },
  {
    mode: 'meeting-notes',
    keywordGroups: [
      ['meeting', 'conference', 'call'],
      ['attendees', 'participants', 'present'],
      ['action items', 'next steps', 'follow up', 'agenda'],
    ],
    weight: 1.0,
  },
  {
    mode: 'client-email',
    keywordGroups: [
      ['email', 'follow up', 'following up', 'reaching out'],
      ['regards', 'best regards', 'kind regards', 'thank you'],
    ],
    weight: 0.8,
  },
];

/**
 * Analyze text and suggest the best document mode based on keyword scoring.
 *
 * Returns the mode with the highest weighted score and a confidence value
 * between 0 and 1. If no keywords match at all, returns 'general' with
 * confidence 0.
 */
export function detectDocumentType(text: string): {
  mode: DocMode;
  confidence: number;
  scores: Partial<Record<DocMode, number>>;
} {
  const lowerText = text.toLowerCase();
  const scores: Partial<Record<DocMode, number>> = {};

  for (const rule of DETECTION_RULES) {
    let groupsMatched = 0;
    let totalKeywordsMatched = 0;

    for (const group of rule.keywordGroups) {
      const matched = group.some((keyword) => lowerText.includes(keyword));
      if (matched) {
        groupsMatched++;
        // Count how many keywords in the group actually matched for granular scoring
        totalKeywordsMatched += group.filter((keyword) =>
          lowerText.includes(keyword)
        ).length;
      }
    }

    if (groupsMatched === 0) continue;

    const totalGroups = rule.keywordGroups.length;
    const weight = rule.weight ?? 1.0;

    // Score based on proportion of groups matched, plus bonus for extra keyword hits
    const groupScore = groupsMatched / totalGroups;
    const keywordBonus = Math.min(totalKeywordsMatched * 0.05, 0.2);
    const rawScore = (groupScore + keywordBonus) * weight;

    scores[rule.mode] = rawScore;
  }

  // Find the mode with the highest score
  let bestMode: DocMode = 'general';
  let bestScore = 0;

  for (const [mode, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMode = mode as DocMode;
    }
  }

  // Normalize confidence to 0-1 range
  // A perfect score (all groups matched with weight 1.3 + keyword bonus) would be ~1.56
  // We clamp to 1.0 max
  const confidence = Math.min(bestScore / 1.2, 1.0);

  return {
    mode: bestMode,
    confidence: Math.round(confidence * 100) / 100,
    scores,
  };
}
