/**
 * Compliance Copilot — jurisdictional and professional-standard rule engine.
 *
 * Pure TypeScript. No external dependencies. Runs on the server (API route)
 * or the client (tests). Rules are organised by document mode, with a
 * wildcard key `'*'` that applies to every mode.
 *
 * Adding a rule: push a `Rule` into `RULES[mode]` (or `RULES['*']`). A rule
 * receives the full text + active mode and returns a `ComplianceIssue`, an
 * array of issues, or `null` when it does not fire.
 */

export type ComplianceSeverity = 'info' | 'warning' | 'critical';

export interface ComplianceIssue {
  /** Stable identifier — "<rule-id>:<startIndex|0>" so dismissals survive debounces. */
  id: string;
  severity: ComplianceSeverity;
  /** Human-readable rule name shown as the heading. */
  rule: string;
  /** Concise description of the compliance concern. */
  message: string;
  /** Concrete, actionable remediation step. */
  suggestion: string;
  /** Optional character offset of the offending span in the source text. */
  startIndex?: number;
  /** Optional character offset end (exclusive) of the offending span. */
  endIndex?: number;
  /** Optional authoritative documentation link. Omitted unless certain. */
  docsLink?: string;
}

type RuleResult = ComplianceIssue | ComplianceIssue[] | null;
type Rule = (text: string, mode: string) => RuleResult;

/* -------------------------------------------------------------------------- */
/*  Mode families                                                             */
/* -------------------------------------------------------------------------- */

const LEGAL_MODES = new Set([
  'legal-letter',
  'legal-memorandum',
  'legal-memo',
  'court-filing',
  'demand-letter',
  'engagement-letter',
  'deposition-summary',
]);

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function firstMatch(text: string, re: RegExp): RegExpExecArray | null {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const cloned = new RegExp(re.source, flags);
  return cloned.exec(text);
}

function makeIssue(
  ruleId: string,
  severity: ComplianceSeverity,
  rule: string,
  message: string,
  suggestion: string,
  match?: RegExpExecArray | null
): ComplianceIssue {
  const startIndex = match?.index;
  const endIndex =
    startIndex !== undefined && match ? startIndex + match[0].length : undefined;
  return {
    id: `${ruleId}:${startIndex ?? 0}`,
    severity,
    rule,
    message,
    suggestion,
    ...(startIndex !== undefined ? { startIndex, endIndex } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/*  Legal rules                                                               */
/* -------------------------------------------------------------------------- */

const uplReviewRule: Rule = (text, mode) => {
  if (!LEGAL_MODES.has(mode)) return null;
  const re = /\b(?:I recommend|you should)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  return makeIssue(
    'upl-review',
    'info',
    'Unauthorized Practice of Law (UPL)',
    'Prescriptive language ("I recommend" / "you should") in correspondence may constitute legal advice.',
    'Ensure a supervising attorney reviews this document before it is sent to the recipient.',
    match
  );
};

const privilegeMarkerRule: Rule = (text, mode) => {
  if (mode !== 'demand-letter' && mode !== 'legal-letter') return null;
  const re = /\b(?:confidential|settlement)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  if (/WITHOUT\s+PREJUDICE/i.test(text)) return null;
  return makeIssue(
    'privilege-marker',
    'warning',
    'Privilege marker missing',
    'Text references "confidential" or "settlement" content but no privilege marker is present.',
    'Add a "WITHOUT PREJUDICE" marker at the top of the letter to preserve settlement privilege.',
    match
  );
};

const CONTRACTION_MAP: Array<{ pattern: RegExp; expansion: string }> = [
  { pattern: /\bdon't\b/i, expansion: 'do not' },
  { pattern: /\bwon't\b/i, expansion: 'will not' },
  { pattern: /\bcan't\b/i, expansion: 'cannot' },
  { pattern: /\bisn't\b/i, expansion: 'is not' },
  { pattern: /\bwasn't\b/i, expansion: 'was not' },
  { pattern: /\bshouldn't\b/i, expansion: 'should not' },
];

const courtFilingContractionsRule: Rule = (text, mode) => {
  if (mode !== 'court-filing') return null;
  const issues: ComplianceIssue[] = [];
  for (const { pattern, expansion } of CONTRACTION_MAP) {
    const match = firstMatch(text, pattern);
    if (!match) continue;
    issues.push(
      makeIssue(
        `court-contraction-${expansion.replace(/\s+/g, '-')}`,
        'warning',
        'Informal contraction in court filing',
        `Court filings should avoid contractions. Found: "${match[0]}".`,
        `Replace "${match[0]}" with "${expansion}".`,
        match
      )
    );
  }
  return issues.length ? issues : null;
};

const numberedParagraphRule: Rule = (text, mode) => {
  if (mode !== 'court-filing') return null;
  if (text.length <= 200) return null;
  if (/(?:^|\n)\s*\d+\.\s/.test(text)) return null;
  return makeIssue(
    'court-numbered-paragraphs',
    'info',
    'Numbered paragraphs',
    'Court filings typically present factual allegations and legal arguments in numbered paragraphs.',
    'Restructure the filing into sequentially numbered paragraphs (1., 2., 3., ...).'
  );
};

const feeArrangementRule: Rule = (text, mode) => {
  if (mode !== 'engagement-letter') return null;
  if (/hourly|fixed fee|contingency|retainer|flat fee/i.test(text)) return null;
  return makeIssue(
    'engagement-fee-arrangement',
    'critical',
    'Fee arrangement required',
    'Engagement letter is missing any reference to the fee arrangement.',
    'Add an explicit fee arrangement clause (hourly, fixed fee, contingency, retainer, or flat fee) with rates.'
  );
};

const terminationClauseRule: Rule = (text, mode) => {
  if (mode !== 'engagement-letter') return null;
  if (/terminat|withdraw/i.test(text)) return null;
  return makeIssue(
    'engagement-termination-clause',
    'warning',
    'Termination clause missing',
    'Engagement letter does not appear to address termination or withdrawal.',
    'Include a termination clause covering mutual termination rights, withdrawal, and wind-down obligations.'
  );
};

const paymentDeadlineRule: Rule = (text, mode) => {
  if (mode !== 'demand-letter') return null;
  const hasWithinDays = /\bwithin\s+\d+\s+(?:calendar\s+|business\s+)?days?\b/i.test(text);
  const hasExplicitDate =
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4}\b/i.test(
      text
    ) ||
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4}\b/i.test(
      text
    ) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text);
  if (hasWithinDays || hasExplicitDate) return null;
  return makeIssue(
    'demand-payment-deadline',
    'warning',
    'Payment deadline not specified',
    'Demand letter does not state a concrete deadline for payment or performance.',
    'Add a specific deadline such as "within fourteen (14) calendar days of the date of this letter".'
  );
};

const limitationPeriodRule: Rule = (text, mode) => {
  if (mode !== 'demand-letter') return null;
  const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
  if (!yearMatches) return null;
  const currentYear = new Date().getFullYear();
  const oldYears = yearMatches
    .map((y) => parseInt(y, 10))
    .filter((y) => !Number.isNaN(y) && currentYear - y >= 6);
  if (oldYears.length === 0) return null;
  if (/limitation|tolled|tolling/i.test(text)) return null;
  const oldestYear = Math.min(...oldYears);
  const match = firstMatch(text, new RegExp(`\\b${oldestYear}\\b`));
  return makeIssue(
    'demand-limitation-period',
    'warning',
    'Limitation period risk',
    `Reference to ${oldestYear} is at least six years old and may fall outside the applicable limitation period.`,
    'Verify the limitation period has not expired (six years is the NZ default for contract/tort claims) or note any tolling.',
    match
  );
};

/* -------------------------------------------------------------------------- */
/*  Accounting rules                                                          */
/* -------------------------------------------------------------------------- */

const circular230Rule: Rule = (text, mode) => {
  if (mode !== 'tax-advisory') return null;
  if (/circular\s*230|written tax advice/i.test(text)) return null;
  return makeIssue(
    'tax-circular-230',
    'critical',
    'Circular 230 disclaimer missing',
    'Tax advisory appears to lack a Circular 230 disclaimer, which may be required for written tax advice.',
    'Add the standard Circular 230 notice stating that the advice is not intended to be used for avoiding penalties under the Internal Revenue Code.'
  );
};

const aicpaIndependenceRule: Rule = (text, mode) => {
  if (mode !== 'audit-opinion') return null;
  const re = /\b(?:non-audit|consulting|advisory services)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  return makeIssue(
    'audit-aicpa-independence',
    'warning',
    'AICPA independence risk',
    `Reference to "${match[0]}" alongside audit services raises potential independence concerns under AICPA standards.`,
    'Verify independence is maintained per AICPA Code of Professional Conduct and document the safeguards applied.',
    match
  );
};

const gaapIfrsCitationRule: Rule = (text, mode) => {
  if (mode !== 'accounting-report') return null;
  const re = /\b(?:GAAP|IFRS)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  if (/\bASC\s+\d|\bIAS\s+\d|\bIFRS\s+\d/i.test(text)) return null;
  return makeIssue(
    'accounting-standard-citation',
    'info',
    'Specific standard citation recommended',
    'Report references GAAP or IFRS in general terms but does not cite a specific standard.',
    'Cite the specific ASC Topic (e.g., ASC 606) or IFRS/IAS standard (e.g., IFRS 16, IAS 36) that applies.',
    match
  );
};

const taxYearRule: Rule = (text, mode) => {
  if (mode !== 'tax-advisory') return null;
  const re = /\b(?:this year|last year|next year)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  return makeIssue(
    'tax-year-ambiguous',
    'warning',
    'Tax year not specified',
    `Ambiguous temporal reference ("${match[0]}") in a tax advisory creates interpretation risk.`,
    'Replace with an explicit tax year (e.g., "the 2026 tax year" or "the year ended 31 March 2026").',
    match
  );
};

const materialityRule: Rule = (text, mode) => {
  if (mode !== 'audit-opinion') return null;
  if (/material|materiality/i.test(text)) return null;
  return makeIssue(
    'audit-materiality',
    'info',
    'Materiality threshold',
    'Audit opinion does not reference materiality.',
    'Consider adding a statement describing the materiality threshold applied during the audit.'
  );
};

/* -------------------------------------------------------------------------- */
/*  General rules (all modes)                                                 */
/* -------------------------------------------------------------------------- */

const vagueUrgencyRule: Rule = (text) => {
  const re = /\b(?:ASAP|as soon as possible|urgent)\b/i;
  const match = firstMatch(text, re);
  if (!match) return null;
  if (
    /\bwithin\s+\d+\s+(?:calendar\s+|business\s+)?days?\b/i.test(text) ||
    /\bby\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(
      text
    ) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(text)
  ) {
    return null;
  }
  return makeIssue(
    'vague-urgency',
    'info',
    'Vague urgency language',
    `"${match[0]}" is imprecise and invites disputes over timing.`,
    'Replace with a concrete deadline such as "by 5:00 pm on 27 April 2026" or "within seven (7) business days".',
    match
  );
};

const timeSensitiveNoYearRule: Rule = (text) => {
  const re = /\bby\s+\w+$/im;
  const match = firstMatch(text, re);
  if (!match) return null;
  if (/\b\d{4}\b/.test(match[0])) return null;
  return makeIssue(
    'time-sensitive-no-year',
    'info',
    'Deadline missing year',
    `Deadline phrase "${match[0].trim()}" does not include a year and may be ambiguous.`,
    'Qualify the deadline with an explicit year, e.g., "by Friday, 30 April 2027".',
    match
  );
};

/* -------------------------------------------------------------------------- */
/*  Rule registry                                                             */
/* -------------------------------------------------------------------------- */

const RULES: Record<string, Rule[]> = {
  '*': [vagueUrgencyRule, timeSensitiveNoYearRule],

  'legal-letter': [uplReviewRule, privilegeMarkerRule],
  'legal-memorandum': [uplReviewRule],
  'legal-memo': [uplReviewRule],
  'court-filing': [uplReviewRule, courtFilingContractionsRule, numberedParagraphRule],
  'demand-letter': [
    uplReviewRule,
    privilegeMarkerRule,
    paymentDeadlineRule,
    limitationPeriodRule,
  ],
  'engagement-letter': [uplReviewRule, feeArrangementRule, terminationClauseRule],
  'deposition-summary': [uplReviewRule],

  'tax-advisory': [circular230Rule, taxYearRule],
  'audit-opinion': [aicpaIndependenceRule, materialityRule],
  'accounting-report': [gaapIfrsCitationRule],
};

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Run every applicable rule against the given text and mode, returning the
 * union of detected compliance issues. Duplicates (same id) are collapsed.
 */
export function checkCompliance(text: string, mode: string): ComplianceIssue[] {
  if (!text || typeof text !== 'string') return [];

  const modeRules = RULES[mode] ?? [];
  const wildcardRules = RULES['*'] ?? [];
  const activeRules = [...wildcardRules, ...modeRules];

  const seen = new Set<string>();
  const issues: ComplianceIssue[] = [];

  for (const rule of activeRules) {
    let result: RuleResult;
    try {
      result = rule(text, mode);
    } catch {
      continue;
    }
    if (!result) continue;
    const list = Array.isArray(result) ? result : [result];
    for (const issue of list) {
      if (!issue || seen.has(issue.id)) continue;
      seen.add(issue.id);
      issues.push(issue);
    }
  }

  const severityRank: Record<ComplianceSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return issues;
}
