/**
 * Citation Intelligence — detect and parse legal citations from dictated text.
 *
 * Pure, edge-safe functions. No external dependencies. Regex-only detection.
 *
 * Supported jurisdictions: New Zealand, United Kingdom, United States,
 * Australia. Also detects statutes, regulations, and case names.
 *
 * All exported functions are pure — no Node/browser-specific APIs — so this
 * module is safe to import from edge runtimes, server components, and
 * client components alike.
 */

export type CitationType =
  | 'case-neutral'
  | 'case-reported'
  | 'case-name'
  | 'statute'
  | 'regulation';

export type Jurisdiction = 'NZ' | 'UK' | 'US' | 'AU' | 'Unknown';

export interface Citation {
  /** The raw matched text exactly as it appears in the source. */
  raw: string;
  /** The kind of citation detected. */
  type: CitationType;
  /** Best-guess jurisdiction. */
  jurisdiction: Jurisdiction;
  /** Court abbreviation where derivable (e.g. "NZSC", "EWCA", "HCA"). */
  court?: string;
  /** Case parties when the citation contains a party name. */
  parties?: { plaintiff: string; defendant: string };
  /** Four-digit year when derivable. */
  year?: number;
  /** The neutral citation string only (stripped of surrounding party names). */
  neutralCitation?: string;
  /** True when the match passes format validation. */
  valid: boolean;
  /** Start index of the match in the source string. */
  startIndex: number;
  /** End index (exclusive) of the match in the source string. */
  endIndex: number;
}

export interface CitationAnalysis {
  citations: Citation[];
  count: number;
  byJurisdiction: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Pattern registry                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Court abbreviation -> jurisdiction mapping for neutral citations written in
 * the form `[YYYY] COURT N`.
 */
const NEUTRAL_COURTS: Record<string, Jurisdiction> = {
  // New Zealand
  NZSC: 'NZ',
  NZCA: 'NZ',
  NZHC: 'NZ',
  NZDC: 'NZ',
  NZEmpC: 'NZ',
  NZEnvC: 'NZ',
  NZFC: 'NZ',
  // United Kingdom
  UKSC: 'UK',
  UKHL: 'UK',
  UKPC: 'UK',
  EWCA: 'UK',
  EWHC: 'UK',
  // Australia
  HCA: 'AU',
  FCA: 'AU',
  FCAFC: 'AU',
  NSWSC: 'AU',
  VSC: 'AU',
  QSC: 'AU',
  WASC: 'AU',
  SASC: 'AU',
  TASSC: 'AU',
};

/** Reporter series we recognise (reported citations). */
const REPORTED_SERIES: Record<string, Jurisdiction> = {
  NZLR: 'NZ',
  NZCPR: 'NZ',
  NZFLR: 'NZ',
  NZBLC: 'NZ',
  CLR: 'AU',
  ALR: 'AU',
  AC: 'UK',
  WLR: 'UK',
  QB: 'UK',
  Ch: 'UK',
  All: 'UK', // "All ER"
};

/* -------------------------------------------------------------------------- */
/*  Regex helpers                                                             */
/* -------------------------------------------------------------------------- */

// Neutral citation: [YYYY] COURT N, optional trailing (Div) e.g. (Ch)
const NEUTRAL_RE =
  /\[(\d{4})\]\s+(NZSC|NZCA|NZHC|NZDC|NZEmpC|NZEnvC|NZFC|UKSC|UKHL|UKPC|EWCA|EWHC|HCA|FCA|FCAFC|NSWSC|VSC|QSC|WASC|SASC|TASSC)(?:\s+(Civ|Crim|Ch|QB|Fam|Admin|Comm|TCC|Pat|IPEC))?\s+(\d{1,6})(?:\s*\((Ch|QB|Fam|Admin|Comm|TCC|Pat|IPEC)\))?/g;

// NZ reported with square-bracket year: [2019] 2 NZLR 100
const NZ_REPORTED_SQ_RE =
  /\[(\d{4})\]\s+(\d{1,3})\s+(NZLR|NZFLR|NZBLC)\s+(\d{1,6})/g;

// NZ / AU reported with round-bracket year: (2020) 21 NZCPR 405 or (2023) 280 CLR 456
const REPORTED_RND_RE =
  /\((\d{4})\)\s+(\d{1,3})\s+(NZLR|NZCPR|NZFLR|NZBLC|CLR|ALR)\s+(\d{1,6})/g;

// UK reported: [2020] AC 100, [2019] 2 WLR 50, [2018] 1 All ER 100
const UK_REPORTED_RE =
  /\[(\d{4})\]\s+(?:(\d{1,3})\s+)?(AC|WLR|QB|Ch|All\s+ER)\s+(\d{1,6})/g;

// US: 410 U.S. 113, 123 F.3d 456, 789 F. Supp. 2d 123
const US_REPORTED_RE =
  /\b(\d{1,4})\s+(U\.S\.|F\.\s?(?:2d|3d|4th)|F\.\s?Supp\.(?:\s?(?:2d|3d))?|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?)\s+(\d{1,6})\b/g;

// Case name: X v Y  or  X v. Y  or  X vs Y  (parties up to ~80 chars each side)
// Requires proper-noun-looking first token on each side to avoid false hits on
// everyday "you v them" phrasing.
const CASE_NAME_RE =
  /\b([A-Z][A-Za-z.'’\-]+(?:[ \t]+(?:of[ \t]+|the[ \t]+|and[ \t]+|&[ \t]+)?[A-Z][A-Za-z.'’\-]+){0,8})\s+(v\.?|vs\.?)\s+([A-Z][A-Za-z.'’\-]+(?:[ \t]+(?:of[ \t]+|the[ \t]+|and[ \t]+|&[ \t]+)?[A-Z][A-Za-z.'’\-]+){0,8})/g;

// Statutes: "Companies Act 1993, s 174" | "Crimes Act 1961, s 194" | "Income Tax Act 2007, s CB 1"
//           "section 15 of the Crimes Act 1961"
const STATUTE_FORWARD_RE =
  /\b((?:[A-Z][A-Za-z&'\-]+\s+){1,6}Act)\s+(\d{4})(?:\s*,?\s*(?:s|ss|section|sections)\s*([A-Z]{1,3}\s?\d{1,4}[A-Z]?(?:\(\d+\))?(?:\s*[-–]\s*\d{1,4}[A-Z]?)?|\d{1,4}[A-Z]?(?:\(\d+\))?(?:\s*[-–]\s*\d{1,4}[A-Z]?)?))?/g;

const STATUTE_REVERSE_RE =
  /\b(?:s|ss|section|sections)\s+(\d{1,4}[A-Z]?(?:\(\d+\))?)\s+of\s+the\s+((?:[A-Z][A-Za-z&'\-]+\s+){1,6}Act)\s+(\d{4})/g;

// Regulations / Rules: "High Court Rules 2016, r 15.1", "District Court Rules 2014 r 3.2"
const REGULATION_RE =
  /\b((?:[A-Z][A-Za-z&'\-]+\s+){1,6}(?:Rules|Regulations))\s+(\d{4})(?:\s*,?\s*(?:r|rr|reg|regs|rule|rules)\s*(\d{1,4}(?:\.\d{1,4})?[A-Z]?))?/g;

/* -------------------------------------------------------------------------- */
/*  Extraction                                                                */
/* -------------------------------------------------------------------------- */

function pushMatch(out: Citation[], c: Citation) {
  out.push(c);
}

function trimAndLimit(s: string, max = 80): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max).trim() : t;
}

/**
 * Run all citation detectors against `text` and return raw (possibly
 * overlapping) matches. Deduplication is performed later.
 */
function detectAll(text: string): Citation[] {
  const found: Citation[] = [];
  if (!text) return found;

  // --- Neutral citations -------------------------------------------------
  for (const m of text.matchAll(NEUTRAL_RE)) {
    const [raw, yearStr, court, _div, num] = m;
    const year = parseInt(yearStr, 10);
    const jurisdiction = NEUTRAL_COURTS[court] || 'Unknown';
    pushMatch(found, {
      raw,
      type: 'case-neutral',
      jurisdiction,
      court,
      year,
      neutralCitation: raw,
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100 && !!num,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- NZ reported (square brackets) ------------------------------------
  for (const m of text.matchAll(NZ_REPORTED_SQ_RE)) {
    const [raw, yearStr, , series] = m;
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw,
      type: 'case-reported',
      jurisdiction: REPORTED_SERIES[series] || 'NZ',
      court: series,
      year,
      neutralCitation: raw,
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- NZ / AU reported (round brackets) --------------------------------
  for (const m of text.matchAll(REPORTED_RND_RE)) {
    const [raw, yearStr, , series] = m;
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw,
      type: 'case-reported',
      jurisdiction: REPORTED_SERIES[series] || 'Unknown',
      court: series,
      year,
      neutralCitation: raw,
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- UK reported -------------------------------------------------------
  for (const m of text.matchAll(UK_REPORTED_RE)) {
    const [raw, yearStr, , seriesRaw] = m;
    const series = seriesRaw.replace(/\s+/g, ' ');
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw,
      type: 'case-reported',
      jurisdiction: 'UK',
      court: series,
      year,
      neutralCitation: raw,
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- US reported -------------------------------------------------------
  for (const m of text.matchAll(US_REPORTED_RE)) {
    const [raw, , seriesRaw] = m;
    const series = seriesRaw.replace(/\s+/g, ' ');
    pushMatch(found, {
      raw,
      type: 'case-reported',
      jurisdiction: 'US',
      court: series,
      neutralCitation: raw,
      valid: true,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- Case names --------------------------------------------------------
  for (const m of text.matchAll(CASE_NAME_RE)) {
    const [raw, plaintiff, , defendant] = m;
    // Guard: skip if the raw text is obviously part of a phrase (e.g. starts
    // mid-sentence with a pronoun). We lean on the capital-letter rule above.
    const p = trimAndLimit(plaintiff);
    const d = trimAndLimit(defendant);
    if (!p || !d) continue;
    pushMatch(found, {
      raw,
      type: 'case-name',
      jurisdiction: 'Unknown',
      parties: { plaintiff: p, defendant: d },
      valid: true,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- Statutes (forward form: "Crimes Act 1961, s 194") ----------------
  for (const m of text.matchAll(STATUTE_FORWARD_RE)) {
    const [raw, actName, yearStr] = m;
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw: raw.trim(),
      type: 'statute',
      jurisdiction: inferStatuteJurisdiction(actName),
      court: actName.trim(),
      year,
      neutralCitation: raw.trim(),
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- Statutes (reverse form: "section 15 of the Crimes Act 1961") -----
  for (const m of text.matchAll(STATUTE_REVERSE_RE)) {
    const [raw, , actName, yearStr] = m;
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw: raw.trim(),
      type: 'statute',
      jurisdiction: inferStatuteJurisdiction(actName),
      court: actName.trim(),
      year,
      neutralCitation: raw.trim(),
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  // --- Regulations / Rules ----------------------------------------------
  for (const m of text.matchAll(REGULATION_RE)) {
    const [raw, instrumentName, yearStr] = m;
    const year = parseInt(yearStr, 10);
    pushMatch(found, {
      raw: raw.trim(),
      type: 'regulation',
      jurisdiction: inferStatuteJurisdiction(instrumentName),
      court: instrumentName.trim(),
      year,
      neutralCitation: raw.trim(),
      valid: Number.isFinite(year) && year >= 1800 && year <= 2100,
      startIndex: m.index!,
      endIndex: m.index! + raw.length,
    });
  }

  return found;
}

/**
 * Very rough jurisdiction inference from a statute/rule title. Defaults to NZ
 * since this platform is NZ-centric, but will flag obvious UK/US/AU variants.
 */
function inferStatuteJurisdiction(title: string): Jurisdiction {
  const t = title.toLowerCase();
  if (/\bunited states\b|\busc\b|\binternal revenue\b|\bircode\b/.test(t)) return 'US';
  if (/\bcommonwealth\b|\baustralia|australian\b/.test(t)) return 'AU';
  if (/\bengland|english|uk\b|\bbritish\b/.test(t)) return 'UK';
  return 'NZ';
}

/* -------------------------------------------------------------------------- */
/*  Dedupe overlapping matches (longer wins)                                  */
/* -------------------------------------------------------------------------- */

function overlaps(a: Citation, b: Citation): boolean {
  return a.startIndex < b.endIndex && b.startIndex < a.endIndex;
}

function citationLength(c: Citation): number {
  return c.endIndex - c.startIndex;
}

/**
 * Remove overlapping matches, keeping the longest span per overlap cluster.
 * When spans are equal, the earlier-added match wins (stable).
 */
export function dedupeCitations(list: Citation[]): Citation[] {
  const sorted = [...list].sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return citationLength(b) - citationLength(a);
  });

  const kept: Citation[] = [];
  for (const c of sorted) {
    const conflictIndex = kept.findIndex((k) => overlaps(k, c));
    if (conflictIndex === -1) {
      kept.push(c);
      continue;
    }
    const existing = kept[conflictIndex];
    if (citationLength(c) > citationLength(existing)) {
      kept.splice(conflictIndex, 1, c);
    }
    // else: keep existing, drop c
  }

  return kept.sort((a, b) => a.startIndex - b.startIndex);
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Parse all citations from `text`. Returns deduplicated, sorted citations.
 * Zero citations returns an empty array (never throws).
 */
export function parseCitations(text: string): Citation[] {
  if (!text || typeof text !== 'string') return [];
  const raw = detectAll(text);
  if (raw.length === 0) return [];
  return dedupeCitations(raw);
}

/**
 * Full analysis including counts per jurisdiction.
 */
export function analyseCitations(text: string): CitationAnalysis {
  const citations = parseCitations(text);
  const byJurisdiction: Record<string, number> = {};
  for (const c of citations) {
    byJurisdiction[c.jurisdiction] = (byJurisdiction[c.jurisdiction] || 0) + 1;
  }
  return {
    citations,
    count: citations.length,
    byJurisdiction,
  };
}

/**
 * Convenience: format a citation into a compact display label.
 * Used by UI chips but exposed here so server code can render consistently.
 */
export function formatCitationLabel(c: Citation): string {
  if (c.type === 'case-name' && c.parties) {
    return `${c.parties.plaintiff} v ${c.parties.defendant}`;
  }
  if (c.neutralCitation) return c.neutralCitation;
  return c.raw;
}
