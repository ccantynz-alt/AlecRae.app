import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory sliding window rate limiter for Vercel serverless.
 *
 * Each route gets its own limiter instance with configurable limits.
 * Uses IP address from x-forwarded-for (Vercel proxy) as the identifier.
 *
 * Note: In serverless environments, each cold start gets a fresh store.
 * This is acceptable — it means rate limits are per-instance, which is
 * still effective against abuse while being simple and dependency-free.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Clean up expired entries periodically to prevent memory leaks.
 * Runs at most once per minute per store.
 */
const lastCleanup = new Map<string, number>();

function cleanupStore(storeName: string, store: Map<string, RateLimitEntry>, windowMs: number) {
  const now = Date.now();
  const lastRun = lastCleanup.get(storeName) || 0;

  // Only clean up once per minute
  if (now - lastRun < 60_000) return;
  lastCleanup.set(storeName, now);

  const cutoff = now - windowMs;
  const keys = Array.from(store.keys());
  for (const key of keys) {
    const entry = store.get(key)!;
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Extract client IP from the request.
 * Vercel sets x-forwarded-for; falls back to x-real-ip or a default.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; first is the client
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Create a rate limiter for a specific route.
 *
 * Usage in an API route:
 *   const limiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60 });
 *
 *   export async function POST(request: NextRequest) {
 *     const limited = limiter(request);
 *     if (limited) return limited;
 *     // ... handle request
 *   }
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const storeName = `${config.maxRequests}/${config.windowSeconds}s`;

  if (!stores.has(storeName)) {
    stores.set(storeName, new Map());
  }

  const store = stores.get(storeName)!;
  const windowMs = config.windowSeconds * 1000;

  /**
   * Check rate limit for the given request.
   * Returns a 429 Response if limit exceeded, or null if allowed.
   */
  return function checkRateLimit(request: NextRequest): NextResponse | null {
    const ip = getClientIp(request);
    const now = Date.now();
    const cutoff = now - windowMs;

    // Get or create entry
    let entry = store.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= config.maxRequests) {
      // Calculate when the oldest request in the window will expire
      const oldestInWindow = entry.timestamps[0];
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, retryAfter)),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((oldestInWindow + windowMs) / 1000)),
          },
        }
      );
    }

    // Record this request
    entry.timestamps.push(now);

    // Periodic cleanup
    cleanupStore(storeName, store, windowMs);

    return null;
  };
}

/**
 * Pre-configured rate limiters for each API route category.
 */
export const rateLimiters = {
  /** /api/transcribe — 30 requests per minute */
  transcribe: createRateLimiter({ maxRequests: 30, windowSeconds: 60 }),

  /** /api/enhance — 20 requests per minute */
  enhance: createRateLimiter({ maxRequests: 20, windowSeconds: 60 }),

  /** /api/transcribe-batch — 5 requests per minute */
  transcribeBatch: createRateLimiter({ maxRequests: 5, windowSeconds: 60 }),

  /** /api/auth — 10 requests per minute (brute force protection) */
  auth: createRateLimiter({ maxRequests: 10, windowSeconds: 60 }),

  /** /api/transcribe-stream — 10 requests per minute */
  transcribeStream: createRateLimiter({ maxRequests: 10, windowSeconds: 60 }),

  /** General API routes — 60 requests per minute */
  general: createRateLimiter({ maxRequests: 60, windowSeconds: 60 }),

  /** Admin routes — 30 requests per minute */
  admin: createRateLimiter({ maxRequests: 30, windowSeconds: 60 }),

  /** Billing routes — 10 requests per minute */
  billing: createRateLimiter({ maxRequests: 10, windowSeconds: 60 }),

  /** Voxlen TTS routes — 15 requests per minute */
  voxlenSynthesize: createRateLimiter({ maxRequests: 15, windowSeconds: 60 }),

  /** Voxlen translation routes — 10 requests per minute */
  voxlenTranslate: createRateLimiter({ maxRequests: 10, windowSeconds: 60 }),

  /** Voxlen voice cloning — 3 requests per minute (expensive operation) */
  voxlenClone: createRateLimiter({ maxRequests: 3, windowSeconds: 60 }),

  /** Voxlen sentiment analysis — 20 requests per minute */
  voxlenSentiment: createRateLimiter({ maxRequests: 20, windowSeconds: 60 }),

  /** Voxlen voiceprint — 5 requests per minute (security-sensitive) */
  voxlenVoiceprint: createRateLimiter({ maxRequests: 5, windowSeconds: 60 }),

  /** Voxlen diarization — 5 requests per minute (heavy processing) */
  voxlenDiarize: createRateLimiter({ maxRequests: 5, windowSeconds: 60 }),
};
