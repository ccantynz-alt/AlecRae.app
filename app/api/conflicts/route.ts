import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { extractNames, type NameMatch } from '@/lib/name-extract';
import { findByName, type Client } from '@/lib/client-roster';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ maxRequests: 20, windowSeconds: 60 });

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('alecrae_session')?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Severity classification                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Determine conflict severity based on the matched client relationship:
 *
 *  critical — adverse party: representing the opposing side is a direct
 *             conflict and would likely require withdrawal.
 *  warning  — former client: duty of confidentiality and potential
 *             prejudice to former client interests.
 *  info     — current client, prospect, or alias-only partial match:
 *             worth noting but not necessarily disqualifying.
 */
type ConflictSeverity = 'critical' | 'warning' | 'info';

function classifySeverity(client: Client, score: number): ConflictSeverity {
  if (client.type === 'adverse') return 'critical';
  if (client.type === 'former') return 'warning';
  // current/prospect clients at high score = info (potential side-switching risk)
  // alias/partial matches (score 0.7) are always info regardless of type
  return 'info';
}

/* -------------------------------------------------------------------------- */
/*  Response shape                                                            */
/* -------------------------------------------------------------------------- */

interface ConflictFlag {
  name: NameMatch;
  clients: Client[];
  severity: ConflictSeverity;
}

interface ConflictsResponse {
  matches: ConflictFlag[];
  count: number;
  criticalCount: number;
}

/* -------------------------------------------------------------------------- */
/*  Route handler                                                             */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/conflicts
 *
 * Body: { text: string }
 *
 * Extracts all name and organisation references from the dictated text, then
 * cross-references each against the in-memory client roster. Returns a
 * structured list of conflict flags with severity levels.
 */
export async function POST(request: NextRequest) {
  const limited = limiter(request);
  if (limited) return limited;

  const authError = await checkAuth(request);
  if (authError) return authError;

  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body?.text !== 'string') {
      return NextResponse.json(
        { error: 'text field is required and must be a string', code: 'MISSING_TEXT' },
        { status: 400 }
      );
    }
    text = body.text.trim();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (!text) {
    return NextResponse.json<ConflictsResponse>({
      matches: [],
      count: 0,
      criticalCount: 0,
    });
  }

  // Extract all name/org mentions from the dictated text
  const nameMatches = extractNames(text);

  // Deduplicate by normalised raw text so we don't flag "John Smith" twice
  // if it appears multiple times in a long document.
  const seen = new Set<string>();
  const uniqueMatches = nameMatches.filter((nm) => {
    const key = nm.raw.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Cross-reference each unique name against the roster
  const flags: ConflictFlag[] = [];

  for (const nm of uniqueMatches) {
    const rosterHits = findByName(nm.raw);
    if (rosterHits.length === 0) continue;

    // Determine the worst severity across all matching clients
    let worstSeverity: ConflictSeverity = 'info';
    const matchedClients: Client[] = [];

    for (const hit of rosterHits) {
      const severity = classifySeverity(hit.client, hit.score);
      matchedClients.push(hit.client);
      if (severity === 'critical') {
        worstSeverity = 'critical';
      } else if (severity === 'warning' && worstSeverity !== 'critical') {
        worstSeverity = 'warning';
      }
    }

    flags.push({
      name: nm,
      clients: matchedClients,
      severity: worstSeverity,
    });
  }

  // Sort: critical first, then warning, then info; within each tier by position
  const SEVERITY_ORDER: Record<ConflictSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  flags.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.name.startChar - b.name.startChar
  );

  const criticalCount = flags.filter((f) => f.severity === 'critical').length;

  return NextResponse.json<ConflictsResponse>({
    matches: flags,
    count: flags.length,
    criticalCount,
  });
}
