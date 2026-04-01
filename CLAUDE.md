# CLAUDE.MD — AlecRae Voice

> Master reference for all Claude sessions working on this project.
> Read this FIRST before making any changes.

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
3. **Legal AND accounting** — every competitor focuses on legal only. We serve both professions.
4. **Custom AI instructions** — users can tell the AI their firm name, spelling preferences, date formats.
5. **AlecRae ecosystem integration** (planned) — will connect to AlecRae's legal research, accounting, messenger, and email systems.
6. **No subscription for admin** — password-gated, zero recurring cost for the operator.

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
- **AI Enhancement:** Claude API (claude-sonnet-4-20250514) with streaming
- **Auth:** JWT sessions via jose library, admin password gated
- **Export:** docx library for Word document generation
- **Database:** Neon PostgreSQL (PENDING — currently localStorage)
- **Hosting:** Vercel
- **Domain:** AlecRae.app

---

## ARCHITECTURE

```
app/
  page.tsx              — Login page (public)
  layout.tsx            — Root layout, PWA metadata
  globals.css           — Global styles, animations
  app/
    page.tsx            — Main dictation interface (protected)
    layout.tsx          — App layout wrapper
  api/
    auth/route.ts       — POST login, DELETE logout
    transcribe/route.ts — Whisper transcription with vocab hints
    enhance/route.ts    — Claude streaming enhancement
lib/
  auth.ts               — JWT session creation/verification
  templates.ts          — 12 document mode system prompts, vocabulary
middleware.ts           — Route protection (checks JWT cookie)
public/
  manifest.json         — PWA manifest
```

### Auth Flow
1. User visits AlecRae.app → sees login page
2. Enters admin password → POST /api/auth → JWT cookie set (30 day expiry)
3. Redirected to /app → middleware checks JWT on every request
4. All /api/transcribe and /api/enhance routes also protected

### Dictation Flow
1. User taps record → browser MediaRecorder captures audio (webm/opus preferred)
2. Audio blob sent to /api/transcribe → Whisper processes with legal vocab prompt
3. Raw text returned → voice commands processed client-side (new paragraph, period, etc.)
4. User selects document mode → taps Enhance
5. /api/enhance streams Claude response via SSE → text appears in real-time
6. User can copy, export as .docx, or save to history

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

## FEATURES BUILT (V1)

- [x] Admin password auth with JWT sessions
- [x] Whisper transcription with legal/accounting vocabulary hints
- [x] Custom vocabulary (user-added terms fed to Whisper)
- [x] 12 document mode AI enhancement with specialised system prompts
- [x] Streaming Claude response (real-time text appearance)
- [x] Voice commands (new paragraph, period, comma, delete that, etc.)
- [x] Customisable hotkeys (rebind all shortcuts)
- [x] Custom AI instructions per user
- [x] Privacy mode (disable history for sensitive dictations)
- [x] Dictation history (last 50, stored in localStorage)
- [x] Export to .docx
- [x] Copy to clipboard
- [x] Word count
- [x] PWA manifest (installable on all devices)
- [x] Responsive design (desktop, tablet, mobile)
- [x] Recording mode toggle (tap or hold)

## FEATURES PENDING

### Phase 2 — Database (Neon PostgreSQL)
- [ ] Cross-device sync for vocabulary, settings, history
- [ ] User accounts (future: multi-user with subscriptions)
- [ ] Usage analytics
- [ ] Server-side history storage

### Phase 3 — Native Apps
- [ ] Capacitor wrapper for Apple App Store
- [ ] Capacitor wrapper for Google Play Store
- [ ] Native notification support
- [ ] Background audio recording

### Phase 4 — Advanced Features
- [ ] Real-time streaming transcription (text appears as you speak)
- [ ] Document templates with fillable fields
- [ ] Multi-language legal terminology
- [ ] Audio playback of recordings
- [ ] Batch file transcription (upload audio files)
- [ ] Auto-detect document type from content
- [ ] Firm-specific AI training profiles
- [ ] Integration with AlecRae legal research (Oracle)
- [ ] Integration with AlecRae accounting platform
- [ ] Integration with AlecRae messenger
- [ ] Integration with AlecRae internal email

### Phase 5 — Enterprise
- [ ] Multi-user with role-based access
- [ ] Team vocabulary sharing
- [ ] Subscription billing via Stripe
- [ ] SOC 2 / HIPAA compliance documentation
- [ ] SSO integration
- [ ] Admin dashboard with usage analytics
- [ ] White-label for law firms

---

## ENVIRONMENT VARIABLES (Vercel)

```
OPENAI_API_KEY      — OpenAI API key for Whisper
ANTHROPIC_API_KEY   — Anthropic API key for Claude
ADMIN_PASSWORD      — Admin login password
JWT_SECRET          — Random string for signing session tokens (32+ chars)
DATABASE_URL        — Neon PostgreSQL connection string (when database added)
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

### Design Direction
- Dark theme (ink-950 background) — professional, not playful
- Gold accent colour — conveys premium/legal authority
- Georgia display font — traditional legal/professional feel
- Minimal UI — no clutter, no feature overload on screen
- Everything accessible within 2 taps/clicks

---

## MANDATE

AlecRae Voice must be the most advanced dictation platform for legal and accounting professionals. 80-90% ahead of any competitor. The specialisation is the moat — general dictation tools cannot match purpose-built legal/accounting formatting intelligence.

Quality standard: 110% before any public launch or customer-facing outreach.
