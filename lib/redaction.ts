/**
 * lib/redaction.ts — PII detection and redaction for AlecRae Voice.
 * Edge-safe: no Node APIs used.
 */

export type RedactionType =
  | 'email'
  | 'phone'
  | 'id'
  | 'financial'
  | 'address'
  | 'dob'
  | 'amount'
  | 'name'
  | 'case-no';

export interface Redaction {
  raw: string;
  type: RedactionType;
  startIndex: number;
  endIndex: number;
  replacement: string;
  confidence: number;
}

/* -------------------------------------------------------------------------- */
/*  Luhn algorithm — credit card validation                                   */
/* -------------------------------------------------------------------------- */

function luhnCheck(digits: string): boolean {
  const nums = digits.replace(/\D/g, '');
  if (nums.length < 13 || nums.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/* -------------------------------------------------------------------------- */
/*  Pattern definitions                                                        */
/* -------------------------------------------------------------------------- */

interface PatternDef {
  type: RedactionType;
  pattern: RegExp;
  replacement: string;
  confidence: number;
  /** Optional validator — return false to reject a match */
  validate?: (match: string) => boolean;
}

const ALREADY_REDACTED = /\[REDACTED-[A-Z-]+\]/g;

const PATTERNS: PatternDef[] = [
  // --- email ---
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[REDACTED-EMAIL]',
    confidence: 0.98,
  },

  // --- NZ bank account (XX-XXXX-XXXXXXX-XX) ---
  {
    type: 'financial',
    pattern: /\b\d{2}-\d{4}-\d{7}-\d{2,3}\b/g,
    replacement: '[REDACTED-FINANCIAL]',
    confidence: 0.97,
  },

  // --- IBAN (country code + up to 34 alphanumeric) ---
  {
    type: 'financial',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
    replacement: '[REDACTED-FINANCIAL]',
    confidence: 0.88,
  },

  // --- Credit card — 16 digits (spaced or unspaced), Luhn validated ---
  {
    type: 'financial',
    pattern: /\b(?:\d{4}[ \-]?){3}\d{4}\b/g,
    replacement: '[REDACTED-FINANCIAL]',
    confidence: 0.95,
    validate: (m) => luhnCheck(m),
  },

  // --- NZ IRD number (8-9 digits, optional dashes) ---
  {
    type: 'id',
    pattern: /\b\d{2,3}-?\d{3}-?\d{3}\b/g,
    replacement: '[REDACTED-ID]',
    confidence: 0.82,
    // Only match 8-9 digit sequences
    validate: (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 9;
    },
  },

  // --- US SSN (XXX-XX-XXXX) ---
  {
    type: 'id',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED-ID]',
    confidence: 0.97,
  },

  // --- UK NINO (XX 12 34 56 X or XX123456X) ---
  {
    type: 'id',
    pattern: /\b[A-CEGHJ-PR-TW-Z]{2}[ ]?\d{2}[ ]?\d{2}[ ]?\d{2}[ ]?[A-D]\b/gi,
    replacement: '[REDACTED-ID]',
    confidence: 0.95,
  },

  // --- AU TFN (9 digits, optionally space-separated in groups of 3) ---
  {
    type: 'id',
    pattern: /\b\d{3}[ ]?\d{3}[ ]?\d{3}\b/g,
    replacement: '[REDACTED-ID]',
    confidence: 0.78,
    validate: (m) => m.replace(/\D/g, '').length === 9,
  },

  // --- NZ court case numbers ---
  {
    type: 'case-no',
    pattern: /\bC(?:IV|RI)-\d{4}-\d{3}-\d{3,6}\b/gi,
    replacement: '[REDACTED-CASE-NO]',
    confidence: 0.99,
  },

  // --- Date of birth (preceded by DOB / D.O.B / born on) ---
  {
    type: 'dob',
    pattern:
      /\b(?:DOB|D\.O\.B\.?|born\s+on)\s*:?\s*\d{1,2}[\s\/\-\.]\w{2,9}[\s\/\-\.]\d{2,4}\b/gi,
    replacement: '[REDACTED-DOB]',
    confidence: 0.96,
  },

  // --- Amounts ≥ $10,000 (NZ$ or plain $) ---
  {
    type: 'amount',
    pattern: /\bNZ?\$[\d,]+(?:\.\d{1,2})?\b/g,
    replacement: '[REDACTED-AMOUNT]',
    confidence: 0.92,
    validate: (m) => {
      const num = parseFloat(m.replace(/[^0-9.]/g, ''));
      return num >= 10000;
    },
  },

  // --- Phone numbers (NZ, AU, UK, US) ---
  {
    type: 'phone',
    // Match international prefix or well-known local prefixes
    pattern:
      /(?:\+64|\+61|\+44|\+1|\b0(?:21|22|27|9|4|3|7|6|800|508))[\s\-.]?[\d][\d\s\-\.]{6,14}\d\b/g,
    replacement: '[REDACTED-PHONE]',
    confidence: 0.91,
    validate: (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    },
  },

  // --- Street address ---
  {
    type: 'address',
    pattern:
      /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Za-z]+)?\s+(?:Street|Road|Avenue|Drive|Lane|Place|Way|Court|Terrace|Close|Boulevard|Crescent)(?:\s+\d{4})?\b/g,
    replacement: '[REDACTED-ADDRESS]',
    confidence: 0.85,
  },

  // --- Titled names (Mr/Mrs/Ms/Dr/Prof/Hon + name) ---
  {
    type: 'name',
    pattern:
      /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Hon)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
    replacement: '[REDACTED-NAME]',
    confidence: 0.87,
  },
];

/* -------------------------------------------------------------------------- */
/*  Core detection                                                             */
/* -------------------------------------------------------------------------- */

export function detectRedactions(
  text: string,
  enabledTypes?: RedactionType[]
): Redaction[] {
  if (!text || text.trim().length === 0) return [];

  // Build a set of ranges already redacted so we don't double-detect
  const alreadyRedacted: Array<[number, number]> = [];
  {
    const re = new RegExp(ALREADY_REDACTED.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      alreadyRedacted.push([m.index, m.index + m[0].length]);
    }
  }

  function isAlreadyRedacted(start: number, end: number): boolean {
    return alreadyRedacted.some(([s, e]) => start >= s && end <= e);
  }

  const typesFilter = enabledTypes ? new Set(enabledTypes) : null;

  // Collect all raw matches across all patterns
  const raw: Redaction[] = [];

  for (const def of PATTERNS) {
    if (typesFilter && !typesFilter.has(def.type)) continue;

    const re = new RegExp(def.pattern.source, def.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (isAlreadyRedacted(start, end)) continue;
      if (def.validate && !def.validate(match[0])) continue;
      raw.push({
        raw: match[0],
        type: def.type,
        startIndex: start,
        endIndex: end,
        replacement: def.replacement,
        confidence: def.confidence,
      });
    }
  }

  // Sort by start ascending, then by length descending (longer wins on overlap)
  raw.sort((a, b) =>
    a.startIndex !== b.startIndex
      ? a.startIndex - b.startIndex
      : b.endIndex - a.endIndex
  );

  // Deduplicate: keep only non-overlapping, longer-wins
  const deduped: Redaction[] = [];
  let lastEnd = -1;
  for (const r of raw) {
    if (r.startIndex >= lastEnd) {
      deduped.push(r);
      lastEnd = r.endIndex;
    }
    // If overlapping, skip (shorter match was already handled by sort order)
  }

  return deduped;
}

/* -------------------------------------------------------------------------- */
/*  Apply                                                                      */
/* -------------------------------------------------------------------------- */

export function applyRedactions(text: string, redactions: Redaction[]): string {
  if (!text || redactions.length === 0) return text;

  // Sort descending by startIndex so we splice from the end
  const sorted = [...redactions].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;
  let lastStart = result.length + 1;

  for (const r of sorted) {
    // Skip overlaps (in case caller passes overlapping set)
    if (r.endIndex > lastStart) continue;
    result = result.slice(0, r.startIndex) + r.replacement + result.slice(r.endIndex);
    lastStart = r.startIndex;
  }

  return result;
}
