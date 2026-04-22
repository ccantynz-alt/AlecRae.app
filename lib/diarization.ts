/**
 * Speaker Diarization — text-heuristic turn detection.
 *
 * Pure TypeScript. No external dependencies. Operates entirely on the
 * transcribed text; no audio-level processing is performed.
 *
 * Detection strategy (in priority order):
 *   1. Explicit role prefixes already present in the text
 *      (e.g. "Q:", "A:", "COUNSEL:", "WITNESS:", "SPEAKER 1:")
 *   2. Q/A alternation patterns → maps to role labels by context
 *   3. Double-newline paragraph breaks treated as turn boundaries,
 *      with heuristic label rotation
 *   4. Voice-command turn markers ("new speaker", "new paragraph")
 *
 * Confidence levels:
 *   high   — explicit role/speaker prefixes detected
 *   medium — Q/A alternation pattern detected
 *   low    — pure paragraph-break heuristics
 */

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export type Turn = {
  /** Display label for this speaker, e.g. "Counsel" or "Speaker 1". */
  speaker: string;
  /** The spoken content for this turn (prefix stripped). */
  text: string;
  /** Character offset of the start of this turn in the original text. */
  startChar: number;
  /** Character offset (exclusive) of the end of this turn in the original text. */
  endChar: number;
};

export type DiarizationResult = {
  turns: Turn[];
  /** Deduplicated, ordered list of unique speaker labels present. */
  speakerLabels: string[];
  confidence: 'low' | 'medium' | 'high';
};

export type DiarizationContext =
  | 'deposition'
  | 'meeting'
  | 'interview'
  | 'client-call';

export interface DiarizationHints {
  /** If provided, rotate through these names for unlabelled turns. */
  speakers?: string[];
  /** Contextual mode that influences default label selection. */
  context?: DiarizationContext;
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Normalise voice-command turn markers to paragraph separators. */
function normaliseVoiceCommands(text: string): string {
  // "new speaker" and "new paragraph" trigger turn boundaries
  return text
    .replace(/\b(new\s+speaker)\b/gi, '\n\n')
    .replace(/\b(new\s+paragraph)\b/gi, '\n\n');
}

/** Default speaker pair given context. */
function defaultSpeakerPair(context: DiarizationContext): [string, string] {
  switch (context) {
    case 'deposition':
      return ['Counsel', 'Witness'];
    case 'interview':
      return ['Interviewer', 'Respondent'];
    case 'meeting':
      return ['Chair', 'Participant'];
    case 'client-call':
      return ['Advisor', 'Client'];
    default:
      return ['Speaker 1', 'Speaker 2'];
  }
}

/**
 * Maps canonical prefix text (upper-cased) to a normalised speaker label.
 * Covers common legal/deposition shorthand.
 */
function canonicalisePrefix(raw: string): string {
  const up = raw.toUpperCase().trim();
  if (up === 'Q') return 'Counsel';
  if (up === 'A') return 'Witness';
  if (up === 'COUNSEL' || up === 'PLAINTIFF COUNSEL' || up === 'PLAINTIFF\'S COUNSEL') return 'Counsel';
  if (up === 'WITNESS' || up === 'DEPONENT') return 'Witness';
  if (up === 'THE COURT' || up === 'JUDGE' || up === 'HIS HONOUR' || up === 'HER HONOUR') return 'The Court';
  if (up === 'DEFENDANT' || up === 'DEFENDANT\'S COUNSEL' || up === 'DEFENSE' || up === 'DEFENCE') return 'Defense Counsel';
  if (up === 'INTERVIEWER') return 'Interviewer';
  if (up === 'RESPONDENT') return 'Respondent';
  if (up === 'CHAIR' || up === 'CHAIRPERSON' || up === 'MODERATOR') return 'Chair';
  if (up === 'MR' || up === 'MS' || up === 'MRS' || up === 'DR') return raw.trim(); // keep titled names as-is
  // SPEAKER N pattern
  const speakerMatch = up.match(/^SPEAKER\s+(\d+|[A-Z])$/);
  if (speakerMatch) return `Speaker ${speakerMatch[1]}`;
  // Fall through: title-case the raw value
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Regex that matches lines beginning with an explicit role/speaker prefix.
 * Captures: (prefix)(colon)(trailing text on that line)
 *
 * Supports:
 *   Q: / A: / Q. / A.
 *   COUNSEL: / WITNESS: / THE COURT:
 *   SPEAKER 1: / SPEAKER A:
 *   Any single word or two-word phrase followed by a colon
 */
const EXPLICIT_PREFIX_RE =
  /^[ \t]*(Q|A|COUNSEL|WITNESS|THE COURT|JUDGE|DEPONENT|PLAINTIFF(?:'S)? COUNSEL|DEFENSE COUNSEL|DEFENCE COUNSEL|DEFENDANT(?:'S)? COUNSEL|HIS HONOUR|HER HONOUR|INTERVIEWER|RESPONDENT|CHAIR(?:PERSON)?|MODERATOR|SPEAKER\s+[\dA-Z]+|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)[ \t]*[:.][ \t]*(.*)/;

/**
 * Returns true if the text contains explicit speaker/role prefixes.
 */
function detectExplicitPrefixes(lines: string[]): boolean {
  return lines.some((l) => EXPLICIT_PREFIX_RE.test(l));
}

/**
 * Returns true when the text has clear Q/A alternation — lines beginning
 * with "Q:" or "A:" (case-insensitive), at least two of each.
 */
function detectQAPattern(lines: string[]): boolean {
  const qs = lines.filter((l) => /^[ \t]*Q[ \t]*[:.]/i.test(l)).length;
  const as = lines.filter((l) => /^[ \t]*A[ \t]*[:.]/i.test(l)).length;
  return qs >= 2 && as >= 2;
}

/* -------------------------------------------------------------------------- */
/*  Segmentation strategies                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Strategy 1: parse explicit prefix-labelled turns.
 * Merges continuation lines (lines without a prefix) into the preceding turn.
 */
function parseExplicitPrefixes(
  text: string,
  lines: string[],
  hints: DiarizationHints,
): Turn[] {
  const turns: Turn[] = [];
  let currentSpeaker: string | null = null;
  let currentLines: string[] = [];
  let currentStart = 0;
  let charOffset = 0;

  // Build an index of line start offsets in the original text.
  // We re-split on \n to build line offsets, then use that for startChar.
  const rawLines = text.split('\n');
  const lineOffsets: number[] = [];
  let pos = 0;
  for (const l of rawLines) {
    lineOffsets.push(pos);
    pos += l.length + 1; // +1 for \n
  }

  // Flatten lines → raw lines mapping: the input `lines` has been
  // normalised so we can map them 1:1 to rawLines when lengths match.
  // If normalisation changed line count, fall back to offset tracking.
  void charOffset; // satisfy lint — we use lineOffsets instead

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const match = EXPLICIT_PREFIX_RE.exec(rawLine);

    if (match) {
      // Flush previous turn
      if (currentSpeaker !== null && currentLines.length > 0) {
        const content = currentLines.join(' ').replace(/\s+/g, ' ').trim();
        if (content) {
          const endChar = lineOffsets[i] - 1;
          turns.push({
            speaker: currentSpeaker,
            text: content,
            startChar: currentStart,
            endChar: Math.max(currentStart, endChar),
          });
        }
      }
      currentSpeaker = canonicalisePrefix(match[1]);
      currentLines = match[2] ? [match[2].trim()] : [];
      currentStart = lineOffsets[i];
    } else if (currentSpeaker !== null) {
      // Continuation of the current speaker's turn
      const trimmed = rawLine.trim();
      if (trimmed) currentLines.push(trimmed);
    }
  }

  // Flush final turn
  if (currentSpeaker !== null && currentLines.length > 0) {
    const content = currentLines.join(' ').replace(/\s+/g, ' ').trim();
    if (content) {
      turns.push({
        speaker: currentSpeaker,
        text: content,
        startChar: currentStart,
        endChar: text.length,
      });
    }
  }

  // Apply user-provided speaker name overrides (in order of first appearance)
  if (hints.speakers && hints.speakers.length > 0) {
    const encountered: Map<string, string> = new Map();
    let nameIdx = 0;
    for (const turn of turns) {
      if (!encountered.has(turn.speaker)) {
        encountered.set(
          turn.speaker,
          nameIdx < hints.speakers!.length
            ? hints.speakers![nameIdx++]
            : turn.speaker,
        );
      }
    }
    for (const turn of turns) {
      turn.speaker = encountered.get(turn.speaker) ?? turn.speaker;
    }
  }

  return turns;
}

/**
 * Strategy 2: paragraph-break alternation.
 * Splits on double-newlines and alternates between two speakers.
 */
function parseParagraphAlternation(
  text: string,
  hints: DiarizationHints,
): Turn[] {
  const context = hints.context ?? 'deposition';
  const [labelA, labelB] = defaultSpeakerPair(context);
  const speakers =
    hints.speakers && hints.speakers.length >= 2
      ? hints.speakers
      : [labelA, labelB];

  // Split on two or more consecutive newlines (paragraph breaks)
  const paragraphRe = /\n{2,}/g;
  const segments: { text: string; start: number }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = paragraphRe.exec(text)) !== null) {
    const segment = text.slice(lastIndex, match.index).trim();
    if (segment) segments.push({ text: segment, start: lastIndex });
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) segments.push({ text: tail, start: lastIndex });

  if (segments.length === 0) {
    // Single block — assign to speaker 0
    return [
      {
        speaker: speakers[0],
        text: text.trim(),
        startChar: 0,
        endChar: text.length,
      },
    ];
  }

  return segments.map((seg, idx) => ({
    speaker: speakers[idx % speakers.length],
    text: seg.text,
    startChar: seg.start,
    endChar: seg.start + seg.text.length,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Main export                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Diarize `text` into speaker turns using text heuristics.
 *
 * @param text    The transcribed dictation text to analyse.
 * @param hints   Optional hints: speaker names and conversational context.
 * @returns       Labelled turns, unique speaker labels, and confidence level.
 */
export function diarize(
  text: string,
  hints: DiarizationHints = {},
): DiarizationResult {
  if (!text || !text.trim()) {
    return { turns: [], speakerLabels: [], confidence: 'low' };
  }

  // Normalise voice commands to paragraph breaks before analysis
  const normalised = normaliseVoiceCommands(text);
  const lines = normalised.split('\n');

  let turns: Turn[];
  let confidence: DiarizationResult['confidence'];

  const hasExplicit = detectExplicitPrefixes(lines);
  const hasQA = !hasExplicit && detectQAPattern(lines);

  if (hasExplicit) {
    // Strategy 1: full explicit-prefix parsing
    turns = parseExplicitPrefixes(normalised, lines, hints);
    confidence = 'high';
  } else if (hasQA) {
    // Strategy 2: Q/A alternation — inject standard Q/A prefixes and re-parse
    // Map Q→ first label, A→ second label per context
    const context = hints.context ?? 'deposition';
    const [labelA, labelB] = defaultSpeakerPair(context);
    const injected = normalised
      .split('\n')
      .map((l) => {
        if (/^[ \t]*Q[ \t]*[:.]/i.test(l)) return l.replace(/^[ \t]*Q[ \t]*[:.][ \t]*/i, `${labelA}: `);
        if (/^[ \t]*A[ \t]*[:.]/i.test(l)) return l.replace(/^[ \t]*A[ \t]*[:.][ \t]*/i, `${labelB}: `);
        return l;
      })
      .join('\n');
    turns = parseExplicitPrefixes(injected, injected.split('\n'), hints);
    confidence = 'medium';
  } else {
    // Strategy 3: paragraph-break alternation
    turns = parseParagraphAlternation(normalised, hints);
    confidence = 'low';
  }

  // Build deduplicated ordered speaker list
  const seen = new Set<string>();
  const speakerLabels: string[] = [];
  for (const turn of turns) {
    if (!seen.has(turn.speaker)) {
      seen.add(turn.speaker);
      speakerLabels.push(turn.speaker);
    }
  }

  // Filter out empty turns that may result from whitespace-only segments
  const filteredTurns = turns.filter((t) => t.text.trim().length > 0);

  return { turns: filteredTurns, speakerLabels, confidence };
}
