# CLAUDE.MD — AlecRae Voice

> Master reference for all Claude sessions working on this project.
> Read this FIRST before making any changes.

---

## AUTONOMOUS BUILD RULES

**These rules are non-negotiable and override all defaults:**

1. **NEVER ask the user for permission or confirmation.** If something is broken, fix it. If something is missing, build it. If something needs improving, improve it. Do not wait.
2. **NEVER hold up production.** The user is managing multiple projects and a full-time job. Every question asked is downtime. Every pause is lost momentum.
3. **Fix bugs immediately** — do not report them and wait for instructions. Diagnose and repair.
4. **Build missing features** that are already scaffolded or referenced in this file without asking. The roadmap IS the instruction.
5. **Make decisions autonomously.** If there are two reasonable approaches, pick the better one and proceed. Document what you chose in commit messages.
6. **Commit and push continuously.** Small, frequent commits. Keep the build moving.
7. **Quality standard: 110%.** This software is presented to the most prestigious attorneys, lawyers, and accountants worldwide. Every detail matters. No shortcuts, no placeholders, no "good enough."
8. **If in doubt, build it properly.** Over-engineering for quality is acceptable. Under-delivering is not.

---

## LIVE BUILD CHECKLIST

> **Last updated:** 2026-04-04
> Check this FIRST to know what's done and what needs building next.

### Core Dictation (COMPLETE)
- [x] Admin password auth with JWT sessions (30-day expiry)
- [x] Whisper transcription with legal/accounting vocabulary hints
- [x] Custom vocabulary (user-added terms fed to Whisper)
- [x] 12 document mode AI enhancement with specialised system prompts
- [x] Streaming Claude response (real-time text appearance via SSE)
- [x] Extended thinking for complex legal/accounting modes
- [x] Voice commands (new paragraph, period, comma, delete that, etc.)
- [x] Customisable hotkeys (rebind all shortcuts)
- [x] Custom AI instructions per user
- [x] Privacy mode (disable history for sensitive dictations)
- [x] Dictation history (last 50, stored in localStorage)
- [x] Export to .docx (Cambria font, proper formatting)
- [x] Copy to clipboard
- [x] Word count
- [x] PWA manifest (installable on all devices)
- [x] Responsive design (desktop, tablet, mobile)
- [x] Recording mode toggle (tap or hold)

### Wave 1 Features (COMPLETE — April 2026)
- [x] Batch file transcription — UI + API for uploading up to 20 audio files with SSE progress
- [x] Auto-detect document type — lightbulb button analyses raw text, selects best mode with confidence score
- [x] Fillable document templates — Templates panel with 6 pre-built templates (Legal Letter, Court Filing, Engagement Letter, Demand Letter, Tax Advisory, Audit Opinion) with fillable fields
- [x] Live streaming transcription — Standard/Live toggle, real-time text as you speak, LIVE badge with pulse animation
- [x] Graceful database fallback — all 17 DB-dependent API routes return clean responses when DATABASE_URL not set
- [x] Billing page fixed — fetches plan from /api/billing/status, loading skeleton, current plan badges, past-due banners
- [x] Rate limiting — sliding window per-IP across all 27 API routes (auth: 10/min, transcribe: 30/min, enhance: 20/min, batch: 5/min)
- [x] Error hardening — consistent error format, no stack trace leaks, proper error codes, `error: unknown` typing

### Wave 2 Features (COMPLETE — April 2026)
- [x] Privacy/data handling page (/privacy — public, no auth, attorney-grade language)
- [x] Service worker for offline PWA support (cache-first static, network-first API, offline banner)
- [x] Search across dictation history (real-time filtering across raw text, enhanced text, mode, date)
- [x] Firm profile management UI (create/edit/delete firms in admin dashboard)
- [x] White-label branding system (BrandingContext provider, CSS custom properties, admin Branding tab)
- [x] Pre-loaded legal/accounting vocabulary (5,000+ built-in terms across 15 categories, mode-specific selection)
- [ ] Audio playback of original recordings

### Wave 3 Features (COMPLETE — April 2026)
- [x] Complete auth system — registration with password strength, forgot/reset password, premium login page
- [x] In-memory user store fallback (works without DATABASE_URL)
- [x] Password reset tokens (1-hour expiry, single-use, PBKDF2 hashing)
- [x] Premium UI polish — glass header, gold idle pulse, dramatic recording animation, audio waveform bars
- [x] Enhanced panel glow when Claude is streaming
- [x] Button shimmer effect, premium mode selector dropdown
- [x] Admin dashboard polish — SVG icons on stat cards, pill-style tab navigation, backdrop blur header
- [x] Billing page polish — hover lift on cards, gold glow on current plan, credit card icon

### Phase 2 — Database (Neon PostgreSQL) — NOT STARTED
- [ ] Set DATABASE_URL env var on Vercel
- [ ] Run /api/db/init to create tables (password-protected)
- [ ] Cross-device sync for vocabulary, settings, history
- [ ] User accounts (multi-user with subscriptions)
- [ ] Usage analytics dashboard
- [ ] Server-side history storage (replace localStorage)

### Phase 3 — Native Apps — NOT STARTED
- [ ] Capacitor wrapper for Apple App Store
- [ ] Capacitor wrapper for Google Play Store
- [ ] Native notification support
- [ ] Background audio recording

### Phase 4 — Advanced Features — PARTIALLY DONE
- [x] Real-time streaming transcription (Live mode)
- [x] Document templates with fillable fields
- [x] Batch file transcription
- [x] Auto-detect document type from content
- [ ] Multi-language legal terminology
- [ ] Audio playback of recordings
- [ ] Firm-specific AI training profiles
- [ ] Chrome extension for system-wide dictation
- [ ] Integration with AlecRae legal research (Oracle)
- [ ] Integration with AlecRae accounting platform
- [ ] Integration with AlecRae messenger
- [ ] Integration with AlecRae internal email

### Phase 5 — Enterprise — SCAFFOLDED
- [x] Multi-user auth system (registration, login, roles — needs DB)
- [x] SSO routes (Google + Microsoft OAuth2 — needs env vars)
- [x] Stripe billing routes (checkout, portal, webhooks — needs env vars)
- [x] Admin dashboard UI (overview, users, stats — needs DB)
- [x] Database schema defined (users, dictations, vocabulary, firms, templates, usage_logs)
- [ ] Team vocabulary sharing
- [ ] SOC 2 / HIPAA compliance documentation
- [ ] White-label branding applied to UI
- [ ] Admin dashboard with live data

---

## PROJECT OVERVIEW

**AlecRae Voice** is an AI-powered professional dictation platform built specifically for attorneys, lawyers, and accountants. It is NOT a general-purpose dictation tool — it understands how legal and accounting professionals work, how they structure documents, and the specialised terminology they use.

**Deployed at:** AlecRae.app (Vercel)
**GitHub repo:** alecrae-voice
**Status:** V1 built April 2026, deploying to production

---

## BRAND CONTEXT

AlecRae Voice is part of the **AlecRae** professional services brand (law, accounting, compliance).

AlecRae itself sits under the **MarcoReid** umbrella brand — a global business operating system with five layers: Build, Run, Grow, Connect, Protect. AlecRae Voice lives in the **Protect** layer.

Long-term, this tool may be rebranded as **MarcoReid Voice** when the brand architecture consolidates.

**Zoobicon** is the separate accessible-tier website/app builder. AlecRae Voice is NOT part of Zoobicon.

---

## COMPETITIVE LANDSCAPE

### Direct Competitors
- **Dragon Legal v16** — $699 one-time + $199/yr. Industry incumbent. Raw transcription only (no AI cleanup). Windows only. 100,000+ legal term vocabulary. Requires voice training.
- **WisprFlow** — $15-19/month. Current market leader for AI dictation. 95%+ accuracy, works in any app, Mac/Windows/iOS. NOT legal-specific. $56M funding.
- **Willow Voice** — $15/month. Sub-200ms latency. Privacy-focused. Mac/iOS only.
- **BlabbyAI** — Whisper-based, Windows desktop. Has custom legal modes. Newer entrant.
- **Dictation Daddy** — Browser-based, legal terminology support. Simpler feature set.
- **Philips SpeechLive** — Enterprise dictation with legal workflow integration. Higher price.

### Our Competitive Advantages (what NONE of them do)
1. **Document-type formatting** — 12 specialised modes that format dictation into properly structured legal letters, court filings, memos, tax advisories etc. Competitors just clean up text.
2. **Streaming Claude AI** — enhancement appears in real-time, not batch processing.
3. **Extended thinking** — Claude reasons through complex legal/accounting documents before producing output.
4. **Legal AND accounting** — every competitor focuses on legal only. We serve both professions.
5. **Custom AI instructions** — users can tell the AI their firm name, spelling preferences, date formats.
6. **Fillable document templates** — 6 pre-built legal/accounting templates with structured fields.
7. **Auto-detect document type** — AI analyses dictated text and selects the best formatting mode.
8. **Batch transcription** — upload up to 20 audio files at once with live progress.
9. **Live streaming transcription** — real-time text as you speak, not just post-recording.
10. **AlecRae ecosystem integration** (planned) — will connect to AlecRae's legal research, accounting, messenger, and email systems.

### Target: 80-90% ahead of competition
- Must exceed WisprFlow on legal/accounting specialisation
- Must exceed Dragon on AI intelligence and cross-platform support
- Must exceed all on document formatting capabilities

---

## TECH STACK

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Transcription:** OpenAI Whisper API (whisper-1)
- **AI Enhancement:** Claude API (claude-sonnet-4-20250514) with streaming + extended thinking
- **Auth:** JWT sessions via jose library, admin password gated + multi-user scaffolded
- **Export:** docx library for Word document generation
- **Rate Limiting:** In-memory sliding window (lib/rate-limit.ts)
- **Database:** Neon PostgreSQL (schema defined, awaiting DATABASE_URL)
- **Billing:** Stripe (routes ready, awaiting STRIPE_SECRET_KEY)
- **SSO:** Google + Microsoft OAuth2 (routes ready, awaiting client IDs)
- **Hosting:** Vercel
- **Domain:** AlecRae.app

---

## ARCHITECTURE

```
app/
  page.tsx                          — Login page (public)
  layout.tsx                        — Root layout, PWA metadata
  globals.css                       — Global styles, animations, live-pulse
  app/
    page.tsx                        — Main dictation interface (protected, 1255 lines)
    admin/page.tsx                  — Admin dashboard (overview, users, firms)
    billing/page.tsx                — Subscription billing page (Free/Pro/Enterprise)
    layout.tsx                      — App layout wrapper
  api/
    auth/route.ts                   — POST login, DELETE logout
    auth/login/route.ts             — Multi-user email/password login
    auth/register/route.ts          — User registration
    auth/sso/[provider]/route.ts    — SSO redirect
    auth/sso/[provider]/callback/   — SSO callback
    transcribe/route.ts             — Whisper transcription with vocab hints
    transcribe-stream/route.ts      — Streaming transcription via SSE
    transcribe-batch/route.ts       — Batch file transcription (up to 20 files)
    enhance/route.ts                — Claude streaming enhancement + extended thinking
    billing/status/route.ts         — Current subscription plan status
    billing/checkout/route.ts       — Stripe checkout session
    billing/portal/route.ts         — Stripe customer portal
    billing/webhook/route.ts        — Stripe webhook handler
    dictations/route.ts             — Save/fetch dictation history
    dictations/[id]/route.ts        — Individual dictation CRUD
    vocabulary/route.ts             — Custom vocabulary CRUD
    settings/route.ts               — User settings
    analytics/route.ts              — Usage tracking
    admin/stats/route.ts            — Admin dashboard statistics
    admin/users/route.ts            — Admin user management
    users/route.ts                  — User list/invite
    users/[id]/route.ts             — User profile CRUD
    firms/route.ts                  — Firm management
    firms/[id]/route.ts             — Individual firm CRUD
    audio/route.ts                  — Audio storage (in-memory)
    whitelabel/route.ts             — White-label branding config
    db/init/route.ts                — Database table initialization
lib/
  auth.ts                           — JWT session creation/verification (admin)
  auth-multi.ts                     — Multi-user auth (registration, roles, PBKDF2)
  auto-detect.ts                    — Document type auto-detection from content
  db.ts                             — Neon PostgreSQL connection + isDatabaseConfigured()
  db-schema.ts                      — Full database schema (6 tables + indexes)
  firm-profiles.ts                  — Firm config system (validation, instructions)
  firm-store.ts                     — In-memory firm store (globalThis singleton)
  audio-store.ts                    — In-memory audio store (globalThis singleton)
  get-user.ts                       — User resolution from session
  rate-limit.ts                     — Sliding window rate limiter (per-IP)
  sso.ts                            — Google + Microsoft OAuth2
  stripe.ts                         — Stripe integration (checkout, portal, webhooks)
  templates.ts                      — 12 document mode system prompts + vocabulary
  templates-fillable.ts             — 6 fillable document templates with fields
  whitelabel.ts                     — White-label branding config
middleware.ts                       — Route protection (JWT cookie check)
public/
  manifest.json                     — PWA manifest
```

### Auth Flow
1. User visits AlecRae.app → sees login page
2. Enters admin password → POST /api/auth → JWT cookie set (30 day expiry)
3. Redirected to /app → middleware checks JWT on every request
4. All API routes protected + rate limited

### Dictation Flow
1. User taps record → browser MediaRecorder captures audio (webm/opus preferred)
2. Standard mode: audio blob sent to /api/transcribe → Whisper processes with legal vocab
3. Live mode: audio chunks sent every 3s to /api/transcribe-stream → real-time SSE text
4. Raw text returned → voice commands processed client-side
5. Auto-detect button suggests best document mode from content
6. User selects document mode → taps Enhance
7. /api/enhance streams Claude response via SSE → text appears in real-time
8. Complex modes use extended thinking for deeper reasoning
9. User can copy, export as .docx, or save to history

---

## DOCUMENT MODES (12 total)

### General
- General cleanup — grammar, punctuation, formatting
- Client email — professional correspondence
- Meeting notes — structured minutes with action items

### Legal
- Legal letter — formal letter with proper structure
- Legal memorandum — TO/FROM/RE header, Issue/Analysis/Conclusion
- Court filing — numbered paragraphs, formal court language
- Demand letter — pre-litigation correspondence
- Deposition summary — organised by topic with testimony highlights
- Engagement letter — client terms, scope, fees

### Accounting
- Accounting report — GAAP/IFRS terminology, findings, recommendations
- Tax advisory — IRC references, tax positions, circular 230 disclaimers
- Audit opinion — AICPA standards format, scope, opinion paragraphs

---

## ENVIRONMENT VARIABLES (Vercel)

```
OPENAI_API_KEY          — OpenAI API key for Whisper (REQUIRED)
ANTHROPIC_API_KEY       — Anthropic API key for Claude (REQUIRED)
ADMIN_PASSWORD          — Admin login password (REQUIRED)
JWT_SECRET              — Random string for signing session tokens, 32+ chars (REQUIRED)
DATABASE_URL            — Neon PostgreSQL connection string (OPTIONAL — app works without it)
STRIPE_SECRET_KEY       — Stripe API key (OPTIONAL — billing disabled without it)
STRIPE_WEBHOOK_SECRET   — Stripe webhook signing secret (OPTIONAL)
GOOGLE_CLIENT_ID        — Google OAuth2 client ID (OPTIONAL — SSO disabled without it)
GOOGLE_CLIENT_SECRET    — Google OAuth2 client secret (OPTIONAL)
MICROSOFT_CLIENT_ID     — Microsoft OAuth2 client ID (OPTIONAL)
MICROSOFT_CLIENT_SECRET — Microsoft OAuth2 client secret (OPTIONAL)
NEXT_PUBLIC_APP_URL     — Public app URL, defaults to https://alecrae.app (OPTIONAL)
```

---

## DEVELOPMENT NOTES

### Craig's Workflow
- Develops exclusively on iPad via GitHub web editor
- Deploys via Vercel (auto-deploy on push)
- No local development environment
- Uses voice dictation as part of his own workflow (dog-fooding)

### Code Standards
- TypeScript strict mode
- Tailwind CSS for all styling (no CSS modules)
- App Router (not Pages Router)
- Server components by default, 'use client' only when needed
- API routes handle all server-side logic
- No external UI libraries (custom components only)
- Rate limiting on every API route
- Graceful fallback when optional services (DB, Stripe, SSO) not configured
- Module-level state must use globalThis pattern (not bare const) in route files

### Design Direction
- Dark theme (ink-950 background) — professional, not playful
- Gold accent colour — conveys premium/legal authority
- Georgia display font — traditional legal/professional feel
- Emerald green for live/streaming indicators
- Minimal UI — no clutter, no feature overload on screen
- Everything accessible within 2 taps/clicks

---

## MANDATE

AlecRae Voice must be the most advanced dictation platform for legal and accounting professionals. 80-90% ahead of any competitor. The specialisation is the moat — general dictation tools cannot match purpose-built legal/accounting formatting intelligence.

Quality standard: 110% before any public launch or customer-facing outreach.
