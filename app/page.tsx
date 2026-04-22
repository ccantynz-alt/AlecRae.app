import Link from 'next/link';
import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'AlecRae Voice · Dictation for lawyers and accountants',
  description:
    'The dictation platform built for legal and accounting professionals. 12 document modes, AI enhancement, citation intelligence, redaction, and compliance — all powered by Claude.',
};

const FEATURES = [
  {
    title: '12 document modes',
    body: 'Legal letters, court filings, memoranda, demand letters, engagement letters, tax advisories, audit opinions, and more — each with its own AI system prompt tuned for profession-specific conventions.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    ),
  },
  {
    title: 'Streaming Claude enhancement',
    body: 'Anthropic Claude Sonnet streams the polished document in real time as you watch, with extended thinking on complex legal and accounting reasoning.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    ),
  },
  {
    title: 'Live streaming transcription',
    body: 'Watch your words appear as you speak. Switch between Standard and Live modes for any workflow — deposition prep, client calls, or rapid drafting.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    ),
  },
  {
    title: 'Citation Intelligence',
    body: 'Automatic detection of NZ, UK, US, and Australian case law, neutral citations, law reports, statutes, and regulations. Every citation, validated and structured.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    ),
  },
  {
    title: 'Multi-Document Chain',
    body: 'One dictation, up to four documents generated in parallel — the letter, the memo, the client email, and the court filing, all from a single recording.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    ),
  },
  {
    title: 'Redaction Copilot',
    body: 'Auto-detect PII, case numbers, financial figures, bank accounts, and DOBs. One-click redact for discovery production, court filings, and client-safe sharing.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
  },
];

const COMPARE: Array<{ label: string; alecrae: boolean | string; dragon: boolean | string; wisprflow: boolean | string; willow: boolean | string }> = [
  { label: 'Legal and accounting specialisation', alecrae: true, dragon: 'Legal only', wisprflow: false, willow: false },
  { label: 'Streaming AI enhancement', alecrae: true, dragon: false, wisprflow: true, willow: true },
  { label: '12 purpose-built document modes', alecrae: true, dragon: false, wisprflow: false, willow: false },
  { label: 'Live streaming transcription', alecrae: true, dragon: false, wisprflow: true, willow: true },
  { label: 'Citation Intelligence', alecrae: true, dragon: false, wisprflow: false, willow: false },
  { label: 'Batch file transcription', alecrae: true, dragon: false, wisprflow: false, willow: false },
  { label: 'Cross-platform (Web, iOS, Android, Desktop)', alecrae: true, dragon: 'Windows only', wisprflow: true, willow: 'Mac, iOS only' },
  { label: 'Fillable document templates', alecrae: true, dragon: false, wisprflow: false, willow: false },
];

function Yes() {
  return (
    <svg className="w-5 h-5 text-gold-400 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function No() {
  return <span className="text-ink-600">&mdash;</span>;
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Yes />;
  if (value === false) return <No />;
  return <span className="text-ink-400 text-xs">{value}</span>;
}

const TIER_SUMMARY: Array<{ name: string; price: string; highlight?: boolean; features: string[]; cta: { href: string; label: string } }> = [
  {
    name: 'Free',
    price: '$0',
    features: ['10 dictations / month', '3 basic modes', 'Web + PWA'],
    cta: { href: '/login', label: 'Start free' },
  },
  {
    name: 'Pro',
    price: '$29',
    highlight: true,
    features: ['Unlimited dictations', 'All 12 modes + templates', 'Citation, Redaction, Compliance'],
    cta: { href: '/pricing', label: 'Upgrade to Pro' },
  },
  {
    name: 'Enterprise',
    price: 'Contact',
    features: ['SSO + white-label', 'Admin dashboard', 'SOC 2 / HIPAA + BAA'],
    cta: { href: 'mailto:sales@alecrae.app', label: 'Talk to sales' },
  },
];

export default function LandingPage() {
  return (
    <>
      <header className="border-b border-ink-800/60 bg-ink-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="font-display text-lg text-ink-50">
              AlecRae <span className="text-gold-400">Voice</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-ink-300">
            <Link href="/pricing" className="hover:text-gold-400 transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-gold-400 transition-colors">About</Link>
            <Link href="/contact" className="hover:text-gold-400 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-ink-300 hover:text-gold-400 transition-colors">
              Sign in
            </Link>
            <Link
              href="/login"
              className="bg-gold-500 text-ink-950 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              Launch app
            </Link>
          </div>
        </div>
      </header>

      <main className="bg-ink-950 text-ink-200">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,168,78,0.15),transparent_60%)]" aria-hidden />
          <div className="relative max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
            <div className="inline-block mb-6 rounded-full border border-gold-500/30 bg-gold-500/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-300">
              For lawyers and accountants
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-ink-50 tracking-tight mb-6 leading-tight">
              The dictation platform built{' '}
              <span className="text-gold-400">for the profession.</span>
            </h1>
            <p className="text-lg text-ink-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Twelve document modes. Streaming Claude enhancement. Citation Intelligence.
              Redaction Copilot. Multi-Document Chain. Built for the way lawyers and
              accountants actually draft.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="bg-gold-500 text-ink-950 rounded-lg px-7 py-3 text-sm font-medium hover:bg-gold-400 transition-colors"
              >
                Start dictating
              </Link>
              <Link
                href="/pricing"
                className="bg-ink-900/70 border border-ink-800 text-ink-100 rounded-lg px-7 py-3 text-sm font-medium hover:border-gold-500/40 transition-colors"
              >
                See pricing
              </Link>
            </div>
            <p className="text-ink-500 text-xs mt-6">
              Free plan, no card required. Pro from $29/month. Enterprise plans with SSO and BAA.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
              Everything a general dictation tool is missing.
            </h2>
            <p className="text-ink-400 max-w-2xl mx-auto">
              Not a thin wrapper over Whisper. Purpose-built, profession-specific intelligence at every layer.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-6 hover:border-gold-500/30 transition-colors"
              >
                <svg className="w-8 h-8 text-gold-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {f.icon}
                </svg>
                <h3 className="font-display text-lg text-ink-50 mb-2">{f.title}</h3>
                <p className="text-ink-400 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="bg-ink-900/40 border-y border-ink-800/60 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
                How we stack up.
              </h2>
              <p className="text-ink-400">
                A direct comparison with the incumbents — Dragon Legal, WisprFlow, and Willow Voice.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-ink-800/60 bg-ink-950/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-400 text-xs uppercase tracking-wider border-b border-ink-800">
                    <th className="py-4 px-5 font-medium">Capability</th>
                    <th className="py-4 px-3 font-medium text-gold-400 text-center">AlecRae Voice</th>
                    <th className="py-4 px-3 font-medium text-center">Dragon Legal</th>
                    <th className="py-4 px-3 font-medium text-center">WisprFlow</th>
                    <th className="py-4 px-3 font-medium text-center">Willow Voice</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-ink-900/30' : ''}>
                      <td className="py-3 px-5 text-ink-200">{row.label}</td>
                      <td className="py-3 px-3 text-center"><Cell value={row.alecrae} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={row.dragon} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={row.wisprflow} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={row.willow} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-ink-500 text-xs mt-4 text-center">
              Competitor features accurate as at April 2026 from public materials. Not an endorsement.
            </p>
          </div>
        </section>

        {/* Built-for sections */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
              Built for both sides of the practice.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-7">
              <h3 className="font-display text-xl text-gold-400 mb-3">For lawyers</h3>
              <ul className="text-ink-300 text-sm space-y-2 leading-relaxed">
                <li>&bull; Court filings with proper numbered paragraphs</li>
                <li>&bull; Demand letters with WITHOUT PREJUDICE markers</li>
                <li>&bull; Legal memoranda in IRAC structure</li>
                <li>&bull; Deposition summaries organised by topic</li>
                <li>&bull; Engagement letters with scope and fee clauses</li>
              </ul>
            </div>
            <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-7">
              <h3 className="font-display text-xl text-gold-400 mb-3">For accountants</h3>
              <ul className="text-ink-300 text-sm space-y-2 leading-relaxed">
                <li>&bull; Tax advisories with Circular 230 disclaimers</li>
                <li>&bull; Audit opinions in AICPA format</li>
                <li>&bull; GAAP/IFRS-cited accounting reports</li>
                <li>&bull; Materiality and independence flagging</li>
                <li>&bull; IRC section and regulation lookup</li>
              </ul>
            </div>
            <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-7">
              <h3 className="font-display text-xl text-gold-400 mb-3">For both</h3>
              <ul className="text-ink-300 text-sm space-y-2 leading-relaxed">
                <li>&bull; Professional client correspondence</li>
                <li>&bull; Structured meeting notes with action items</li>
                <li>&bull; Compliance Copilot across all 12 modes</li>
                <li>&bull; Redaction Copilot for discovery and filing</li>
                <li>&bull; Export to .docx in Cambria, ready to sign</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="bg-ink-900/40 border-y border-ink-800/60 py-14">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-center text-ink-500 text-xs uppercase tracking-[0.2em] mb-6">
              Built on the infrastructure you trust
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-ink-400 text-sm">
              <span>OpenAI Whisper</span>
              <span className="text-ink-700">&bull;</span>
              <span>Anthropic Claude</span>
              <span className="text-ink-700">&bull;</span>
              <span>Vercel</span>
              <span className="text-ink-700">&bull;</span>
              <span>SOC 2 / HIPAA ready</span>
              <span className="text-ink-700">&bull;</span>
              <span>New Zealand built</span>
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
              Simple plans. Serious software.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TIER_SUMMARY.map((t) => (
              <div
                key={t.name}
                className={[
                  'rounded-2xl p-7',
                  t.highlight
                    ? 'bg-gradient-to-b from-gold-500/10 to-ink-900/50 border-2 border-gold-500/40'
                    : 'bg-ink-900/50 border border-ink-800/60',
                ].join(' ')}
              >
                <h3 className="font-display text-xl text-ink-50 mb-1">{t.name}</h3>
                <div className="font-display text-3xl text-gold-400 mb-5">
                  {t.price}
                  {t.price.startsWith('$') && <span className="text-ink-500 text-sm font-sans ml-1">/mo</span>}
                </div>
                <ul className="text-ink-300 text-sm space-y-2 mb-6">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Yes />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta.href}
                  className={[
                    'block text-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    t.highlight
                      ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                      : 'bg-ink-800 text-ink-100 hover:bg-ink-700',
                  ].join(' ')}
                >
                  {t.cta.label}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-ink-400 text-sm mt-8">
            <Link href="/pricing" className="text-gold-400 hover:text-gold-300">
              View full pricing &rarr;
            </Link>
          </p>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,168,78,0.12),transparent_60%)]" aria-hidden />
          <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-4">
              Start dictating in 60 seconds.
            </h2>
            <p className="text-ink-300 mb-8">
              Sign in, press record, and ship a better document before the kettle boils.
            </p>
            <Link
              href="/login"
              className="inline-block bg-gold-500 text-ink-950 rounded-lg px-8 py-3 text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
