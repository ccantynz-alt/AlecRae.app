/**
 * Name Extraction — identify person names and organisation references in
 * dictated legal/accounting text.
 *
 * Pure TypeScript, no external dependencies, safe to import from any runtime.
 *
 * Heuristics applied (in order of precedence):
 *  1. Titled names — Mr / Mrs / Ms / Dr / Prof / Hon / Justice / Judge /
 *     Sir / Dame / Mx followed by one or more Capitalised words.
 *  2. Case-caption party names — "Smith v Jones" / "Smith v. Jones" patterns.
 *  3. Organisation suffixes — Ltd / Limited / Pty / Pty Ltd / Inc / LLC /
 *     LLP / PLC / Corp / Corporation / Co / Company / Group / Holdings /
 *     Partners / Partnership / Trust / Foundation / Authority / Council /
 *     Bank / Capital / Investments / Services / Solutions / Consulting.
 *  4. Two-word capitalised sequences that are NOT sentence-initial (i.e. not
 *     the first word after . or the very first token in the text).
 *
 * Overlapping matches are deduplicated — the higher-confidence match wins.
 */

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export type NameMatchType = 'person' | 'organisation';
export type NameMatchConfidence = 'low' | 'medium' | 'high';

export interface NameMatch {
  /** Exact text as it appears in the source string. */
  raw: string;
  /** Whether this looks like a person or an organisation. */
  type: NameMatchType;
  /** Start character offset (inclusive) in the source string. */
  startChar: number;
  /** End character offset (exclusive) in the source string. */
  endChar: number;
  /** Confidence level for conflict-checking purposes. */
  confidence: NameMatchConfidence;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Personal-title prefixes. Case-insensitive match applied separately. */
const PERSON_TITLES = [
  'Mr\\.?',
  'Mrs\\.?',
  'Ms\\.?',
  'Miss',
  'Dr\\.?',
  'Prof\\.?',
  'Professor',
  'Hon\\.?',
  'Honourable',
  'Justice',
  'Judge',
  'Sir',
  'Dame',
  'Mx\\.?',
  'Reverend',
  'Rev\\.?',
  'Assoc\\.?\\s+Prof\\.?',
];

/** Organisation-type suffixes (case-insensitive at end of an entity name). */
const ORG_SUFFIXES = [
  'Ltd',
  'Limited',
  'Pty\\s+Ltd',
  'Pty',
  'Inc\\.?',
  'LLC',
  'LLP',
  'PLC',
  'Corp\\.?',
  'Corporation',
  'Co\\.?',
  'Company',
  'Group',
  'Holdings',
  'Holding',
  'Partners',
  'Partnership',
  'Trust',
  'Foundation',
  'Authority',
  'Council',
  'Bank',
  'Capital',
  'Investments',
  'Investment',
  'Services',
  'Solutions',
  'Consulting',
  'Consultants',
  'Associates',
  'Association',
  'Assoc',
  'International',
  'Industries',
  'Enterprises',
  'Ventures',
  'Properties',
  'Property',
  'Management',
  'Advisory',
  'Advisors',
];

/* -------------------------------------------------------------------------- */
/*  Pattern builders                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Titled-name pattern.
 * Captures: TITLE + one or more Capitalised-word tokens (hyphenated included).
 * e.g. "Mr. John Smith", "Dr Sarah-Jane O'Brien", "Mr Justice Elias"
 */
const titledNamePattern = new RegExp(
  `\\b(?:${PERSON_TITLES.join('|')})\\s+` +
    `([A-Z][a-zA-Z''-]+(\\s+[A-Z][a-zA-Z''-]+)*)`,
  'g'
);

/**
 * Case-caption pattern.
 * "Smith v Jones", "Smith v. Jones & Ors", "Smith and Jones v Brown"
 * Both sides must start with a capital letter.
 */
const caseCaptionPattern =
  /\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)\s+v\.?\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/g;

/**
 * Organisation-suffix pattern.
 * One or more capitalised words followed by a recognised corporate suffix.
 * Suffix may be followed by end-of-word boundary.
 */
const orgSuffixPattern = new RegExp(
  `\\b([A-Z][a-zA-Z&'-]*(?:\\s+[A-Z][a-zA-Z&'-]*)*)\\s+(?:${ORG_SUFFIXES.join('|')})\\b`,
  'g'
);

/**
 * Build a set of character-index positions that are "sentence-initial" —
 * i.e. immediately following a sentence-ending punctuation mark (. ! ?) and
 * optional whitespace, OR at position 0.
 *
 * These positions are excluded from the two-word heuristic to avoid
 * false-positives where any sentence naturally starts with a capital letter.
 */
function buildSentenceInitialSet(text: string): Set<number> {
  const positions = new Set<number>();
  positions.add(0); // Very first token is always sentence-initial

  // After . ! ? (not followed by a digit — avoids section numbers like "1.")
  const sentenceEndRe = /[.!?]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = sentenceEndRe.exec(text)) !== null) {
    positions.add(m.index + m[0].length);
  }
  return positions;
}

/**
 * Two-consecutive-capitalised-words heuristic.
 * Only fires when the first word is NOT at a sentence-initial position.
 */
function extractTwoWordNames(
  text: string,
  sentenceInitialPositions: Set<number>
): NameMatch[] {
  const results: NameMatch[] = [];
  // Match runs of 2+ capitalised words; we emit them as pairs (sliding window)
  const twoWordRe = /\b([A-Z][a-z'-]+)\s+([A-Z][a-z'-]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = twoWordRe.exec(text)) !== null) {
    if (sentenceInitialPositions.has(m.index)) continue;

    // Skip if either word is a very common non-name capitalised word
    if (isCommonWord(m[1]) || isCommonWord(m[2])) continue;

    results.push({
      raw: m[0],
      type: 'person',
      startChar: m.index,
      endChar: m.index + m[0].length,
      confidence: 'low',
    });
  }
  return results;
}

/**
 * Very common English words that appear capitalised mid-sentence but are
 * not names. Kept intentionally small — only the highest-frequency
 * false-positive triggers from legal documents.
 */
const COMMON_WORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'Which',
  'While', 'After', 'Before', 'Since', 'Until', 'Upon', 'From', 'With',
  'Into', 'Onto', 'Over', 'Under', 'Through', 'Within', 'Without',
  'Between', 'Among', 'Against', 'During', 'Pursuant', 'Section', 'Clause',
  'Part', 'Schedule', 'Appendix', 'Exhibit', 'Annex', 'Chapter', 'Article',
  'Paragraph', 'Subparagraph', 'Rule', 'Regulation', 'Act', 'Bill', 'Court',
  'Tribunal', 'Commission', 'Department', 'Ministry', 'Office', 'Board',
  'Committee', 'Panel', 'Division', 'Branch', 'Unit', 'Team', 'Group',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Sunday', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  'New', 'North', 'South', 'East', 'West', 'Upper', 'Lower', 'High',
  'Supreme', 'District', 'Regional', 'National', 'International', 'Global',
  'Federal', 'State', 'Crown', 'Government', 'Parliament', 'Senate',
  'House', 'Revenue', 'Inland', 'Customs', 'Police', 'Defence', 'Health',
  'Education', 'Finance', 'Justice', 'Attorney', 'Solicitor', 'Counsel',
  'Barrister', 'Judge', 'Plaintiff', 'Defendant', 'Respondent', 'Appellant',
  'Claimant', 'Petitioner', 'Trustee', 'Executor', 'Beneficiary',
  'Account', 'Agreement', 'Contract', 'Deed', 'Letter', 'Notice', 'Order',
  'Report', 'Statement', 'Certificate', 'Affidavit', 'Declaration',
  'Memorandum', 'Minute', 'Judgment', 'Decision', 'Ruling', 'Determination',
  'Pursuant', 'Herein', 'Hereto', 'Thereof', 'Therein', 'Whereby',
]);

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word);
}

/* -------------------------------------------------------------------------- */
/*  Deduplication                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Remove overlapping matches, preferring higher-confidence matches and then
 * longer spans. Returns a sorted (by startChar) non-overlapping list.
 */
function deduplicateMatches(matches: NameMatch[]): NameMatch[] {
  if (matches.length === 0) return [];

  const CONFIDENCE_RANK: Record<NameMatchConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Sort: higher confidence first, then longer match first, then earlier start
  const sorted = [...matches].sort((a, b) => {
    const confDiff =
      CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (confDiff !== 0) return confDiff;
    const lenDiff = b.endChar - b.startChar - (a.endChar - a.startChar);
    if (lenDiff !== 0) return lenDiff;
    return a.startChar - b.startChar;
  });

  const kept: NameMatch[] = [];
  for (const candidate of sorted) {
    const overlaps = kept.some(
      (k) => candidate.startChar < k.endChar && candidate.endChar > k.startChar
    );
    if (!overlaps) kept.push(candidate);
  }

  return kept.sort((a, b) => a.startChar - b.startChar);
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Extract all person and organisation name references from dictated text.
 *
 * Returns a deduplicated, position-sorted array of `NameMatch` objects.
 * The function is pure and has no side-effects.
 */
export function extractNames(text: string): NameMatch[] {
  if (!text || !text.trim()) return [];

  const matches: NameMatch[] = [];
  const sentenceInitialPositions = buildSentenceInitialSet(text);

  /* 1 — Titled person names (HIGH confidence) */
  let m: RegExpExecArray | null;
  titledNamePattern.lastIndex = 0;
  while ((m = titledNamePattern.exec(text)) !== null) {
    matches.push({
      raw: m[0].trim(),
      type: 'person',
      startChar: m.index,
      endChar: m.index + m[0].length,
      confidence: 'high',
    });
  }

  /* 2 — Case-caption parties (HIGH confidence for both sides) */
  caseCaptionPattern.lastIndex = 0;
  while ((m = caseCaptionPattern.exec(text)) !== null) {
    const fullMatch = m[0];
    const plaintiff = m[1];
    const defendant = m[2];
    const plaintiffStart = m.index;

    // Find defendant start: skip past plaintiff + " v " or " v. "
    const vIndex = fullMatch.search(/\bv\.?\s+/);
    const vLength = fullMatch.slice(vIndex).match(/^v\.?\s+/)![0].length;
    const defendantStart = m.index + vIndex + vLength;

    matches.push({
      raw: plaintiff,
      type: 'person',
      startChar: plaintiffStart,
      endChar: plaintiffStart + plaintiff.length,
      confidence: 'high',
    });
    matches.push({
      raw: defendant,
      type: 'person',
      startChar: defendantStart,
      endChar: defendantStart + defendant.length,
      confidence: 'high',
    });
  }

  /* 3 — Organisation-suffix names (HIGH confidence) */
  orgSuffixPattern.lastIndex = 0;
  while ((m = orgSuffixPattern.exec(text)) !== null) {
    matches.push({
      raw: m[0].trim(),
      type: 'organisation',
      startChar: m.index,
      endChar: m.index + m[0].length,
      confidence: 'high',
    });
  }

  /* 4 — Two-word capitalised sequences, non-sentence-initial (LOW confidence) */
  const twoWordMatches = extractTwoWordNames(text, sentenceInitialPositions);
  matches.push(...twoWordMatches);

  return deduplicateMatches(matches);
}
