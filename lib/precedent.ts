/**
 * lib/precedent.ts
 *
 * TF-IDF cosine similarity engine for Precedent Match.
 *
 * Surfaces the user's most similar past dictations given a query text.
 * Designed to work entirely in-process — no database, no external deps.
 * When DATABASE_URL + pg_vector is available, this module can be replaced
 * with an embedding-based scorer without changing the public API surface.
 */

/* -------------------------------------------------------------------------- */
/*  Public types                                                               */
/* -------------------------------------------------------------------------- */

export type HistoryDoc = {
  id: string;
  mode: string;
  raw: string;
  enhanced: string;
  date: string;
};

export type PrecedentMatch = {
  id: string;
  mode: string;
  snippet: string;
  score: number;
  date: string;
  matchedTerms: string[];
};

/* -------------------------------------------------------------------------- */
/*  Stopwords                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Combined English + legal-accounting stopwords.
 * These carry no discriminative weight in professional document matching.
 */
const STOPWORDS = new Set<string>([
  // Core English
  'the', 'and', 'of', 'to', 'in', 'a', 'is', 'that', 'for', 'on', 'with',
  'as', 'at', 'by', 'this', 'shall', 'will', 'be', 'have', 'has',
  // Extended English
  'an', 'are', 'was', 'were', 'been', 'being', 'do', 'does', 'did', 'had',
  'it', 'its', 'from', 'or', 'but', 'not', 'if', 'than', 'so', 'any',
  'all', 'each', 'their', 'they', 'them', 'we', 'our', 'you', 'your',
  'he', 'she', 'his', 'her', 'my', 'me', 'us', 'no', 'may', 'can',
  'should', 'would', 'could', 'such', 'which', 'who', 'what', 'where',
  'when', 'how', 'there', 'here', 'also', 'more', 'other', 'into',
  'about', 'after', 'before', 'between', 'upon', 'under', 'above', 'over',
  'out', 'up', 'down', 'then', 'now', 'only', 'same', 'both', 'some',
  'these', 'those', 'one', 'two', 'three', 'four', 'five', 'six', 'set',
  'i', 'am', 'he', 'she', 'per', 're', 'via', 'ie', 'eg', 'etc',
  // Legal-accounting filler
  'said', 'hereby', 'herein', 'thereof', 'thereto', 'therein', 'whereas',
  'pursuant', 'notwithstanding', 'provided', 'including', 'without',
  'further', 'following', 'above', 'below', 'within', 'made', 'given',
  'date', 'dated', 'attached', 'enclosed', 'accordance', 'respect', 'basis',
  'matter', 'matters', 'issue', 'issues', 'client', 'clients',
  'regarding', 'reference', 'note', 'noted', 'please', 'attached',
  'letter', 'memo', 'memorandum', 'report', 'filing', 'document',
  'documents', 'see', 'refer', 'set', 'forth', 'herewith',
]);

/* -------------------------------------------------------------------------- */
/*  Tokeniser                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Tokenise `text` into lowercase, punctuation-stripped, stopword-filtered
 * terms of at least 2 characters.
 *
 * Numbers are retained because they are highly discriminative in legal/
 * accounting contexts (section numbers, dollar amounts, dates, etc.).
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  return text
    // Normalise Unicode punctuation to ASCII equivalents
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .toLowerCase()
    // Strip everything that is not a letter, digit, hyphen, or apostrophe
    .replace(/[^a-z0-9'\-\s]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    // Strip leading/trailing hyphens/apostrophes from each token
    .map((t) => t.replace(/^['\-]+|['\-]+$/g, ''))
    // Minimum length 2, not a stopword
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/* -------------------------------------------------------------------------- */
/*  TF-IDF index                                                               */
/* -------------------------------------------------------------------------- */

type TFIDFIndex = {
  /** termFreq[docIdx][term] = raw term frequency in that document */
  termFreq: Record<number, Record<string, number>>;
  /** docFreq[term] = number of documents containing this term */
  docFreq: Record<string, number>;
  /** Total number of indexed documents */
  totalDocs: number;
};

/**
 * Build a TF-IDF index from an array of HistoryDocs.
 * The text corpus for each doc is the concatenation of raw + enhanced fields.
 */
export function buildIndex(docs: HistoryDoc[]): TFIDFIndex {
  const termFreq: Record<number, Record<string, number>> = {};
  const docFreq: Record<string, number> = {};

  for (let i = 0; i < docs.length; i++) {
    const corpus = `${docs[i].raw ?? ''} ${docs[i].enhanced ?? ''}`;
    const tokens = tokenize(corpus);
    const tf: Record<string, number> = {};

    for (const t of tokens) {
      tf[t] = (tf[t] ?? 0) + 1;
    }

    termFreq[i] = tf;

    // docFreq — each term counted once per document
    for (const t of Object.keys(tf)) {
      docFreq[t] = (docFreq[t] ?? 0) + 1;
    }
  }

  return { termFreq, docFreq, totalDocs: docs.length };
}

/* -------------------------------------------------------------------------- */
/*  TF-IDF vector helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Compute the TF-IDF weight vector for a document given the index.
 * Uses log-normalised TF and standard IDF with a +1 smoothing term.
 */
function tfidfVector(
  tf: Record<string, number>,
  docFreq: Record<string, number>,
  totalDocs: number
): Record<string, number> {
  const vec: Record<string, number> = {};
  const docLen = Object.values(tf).reduce((s, n) => s + n, 0);
  if (docLen === 0) return vec;

  for (const [term, freq] of Object.entries(tf)) {
    const termTf = freq / docLen;
    const df = docFreq[term] ?? 0;
    const idf = Math.log((totalDocs + 1) / (df + 1)) + 1; // smoothed IDF
    vec[term] = termTf * idf;
  }

  return vec;
}

/**
 * Cosine similarity between two sparse vectors.
 * Returns a value in [0, 1].
 */
function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  const keysA = Object.keys(a);
  if (keysA.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const k of keysA) {
    const av = a[k];
    const bv = b[k] ?? 0;
    dot += av * bv;
    normA += av * av;
  }

  for (const v of Object.values(b)) {
    normB += v * v;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/* -------------------------------------------------------------------------- */
/*  Snippet extractor                                                          */
/* -------------------------------------------------------------------------- */

const SNIPPET_WINDOW = 240;

/**
 * Find the 240-character window in `corpus` that best frames the first
 * occurrence of any of the `matchedTerms`.
 *
 * Falls back to the first 240 characters of the corpus when nothing matches.
 */
function extractSnippet(corpus: string, matchedTerms: string[]): string {
  const lower = corpus.toLowerCase();
  let bestIdx = -1;

  for (const term of matchedTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) {
    // No match found — use start of corpus
    return corpus.slice(0, SNIPPET_WINDOW).trimEnd();
  }

  // Centre the window around the match
  const half = SNIPPET_WINDOW / 2;
  const start = Math.max(0, bestIdx - Math.floor(half));
  const end = Math.min(corpus.length, start + SNIPPET_WINDOW);

  let snippet = corpus.slice(start, end).trimEnd();

  // Add ellipsis where we've truncated
  if (start > 0) snippet = '…' + snippet;
  if (end < corpus.length) snippet = snippet + '…';

  return snippet;
}

/* -------------------------------------------------------------------------- */
/*  Public search function                                                     */
/* -------------------------------------------------------------------------- */

const MIN_SCORE = 0.1;
const DEFAULT_LIMIT = 5;

/**
 * Search `docs` for documents semantically similar to `query` using TF-IDF
 * cosine similarity.
 *
 * @param query  - The dictation text to match against.
 * @param docs   - The full history corpus to search.
 * @param limit  - Maximum results to return (default 5).
 * @returns      Matches with score > 0.1, sorted by descending score.
 */
export function searchPrecedents(
  query: string,
  docs: HistoryDoc[],
  limit: number = DEFAULT_LIMIT
): PrecedentMatch[] {
  if (!query?.trim() || docs.length === 0) return [];

  const index = buildIndex(docs);
  const { termFreq, docFreq, totalDocs } = index;

  // Build query vector
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryTf: Record<string, number> = {};
  for (const t of queryTokens) {
    queryTf[t] = (queryTf[t] ?? 0) + 1;
  }

  const queryVec = tfidfVector(queryTf, docFreq, totalDocs);
  const queryTermSet = new Set(Object.keys(queryVec));

  const results: PrecedentMatch[] = [];

  for (let i = 0; i < docs.length; i++) {
    const docTf = termFreq[i];
    if (!docTf) continue;

    const docVec = tfidfVector(docTf, docFreq, totalDocs);
    const score = cosineSimilarity(queryVec, docVec);

    if (score < MIN_SCORE) continue;

    // Determine which query terms actually appear in this document
    const matchedTerms = Object.keys(docTf).filter((t) => queryTermSet.has(t));

    const corpus = `${docs[i].raw ?? ''} ${docs[i].enhanced ?? ''}`;
    const snippet = extractSnippet(corpus, matchedTerms);

    results.push({
      id: docs[i].id,
      mode: docs[i].mode,
      date: docs[i].date,
      score,
      snippet,
      matchedTerms: matchedTerms.slice(0, 10), // cap for API response size
    });
  }

  // Sort by descending score, return top-N
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}
