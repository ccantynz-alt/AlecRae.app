import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'Pricing · AlecRae Voice',
  description: 'Pricing plans for AlecRae Voice — built for solo practitioners, established firms, and enterprise legal and accounting organisations.',
};

type Tier = {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  highlight?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    priceSuffix: '/ month',
    tagline: 'Try the core dictation experience at no cost.',
    cta: { label: 'Sign in', href: '/login' },
    features: [
      '10 dictations per month',
      '3 document modes (cleanup, client email, meeting notes)',
      'Copy to clipboard and export to .docx',
      'Web, iOS, Android (PWA)',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    priceSuffix: '/ month',
    tagline: 'Everything a solo practitioner or small firm needs.',
    highlight: true,
    cta: { label: 'Upgrade to Pro', href: '/api/billing/checkout' },
    features: [
      'Unlimited dictations',
      'All 12 document modes (legal, accounting, general)',
      'Extended thinking on complex documents',
      'Live streaming transcription',
      'Batch transcription (up to 20 files)',
      'Fillable document templates',
      'Citation Intelligence',
      'Redaction Copilot',
      'Multi-Document Chain',
      'Compliance Copilot',
      'Auto-detect document type',
      'Dictation history with audio playback',
      'Custom vocabulary and AI instructions',
      'Priority email support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Contact',
    tagline: 'For firms that need SSO, white-label, and compliance.',
    cta: { label: 'Talk to sales', href: 'mailto:sales@alecrae.app' },
    features: [
      'Everything in Pro',
      'Single sign-on (Google, Microsoft)',
      'White-label branding',
      'Firm profile management',
      'Admin dashboard with usage analytics',
      'Custom vocabulary training',
      'SOC 2 / HIPAA compliance package',
      'Business Associate Agreement (BAA)',
      'Dedicated account manager',
      'On-premises deployment option',
      '99.9% uptime SLA',
      'Priority 24/7 support',
    ],
  },
];

const FAQ = [
  {
    q: 'What happens when I reach the Free plan limit?',
    a: 'Dictations pause until the first of the next month, or you can upgrade to Pro at any time for unlimited use. Your saved dictations remain accessible on any plan.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Pro subscriptions can be cancelled from the billing portal. Your plan remains active until the end of the billing period.',
  },
  {
    q: 'Is my dictation data used to train AI models?',
    a: 'No. We do not review, index, or use your content to train any AI model. Anthropic (Claude) and OpenAI (Whisper) process requests under their zero-retention API terms.',
  },
  {
    q: 'Is AlecRae Voice safe for privileged or HIPAA-regulated data?',
    a: 'Privileged attorney-client communications are treated as confidential by default. HIPAA-regulated data requires an Enterprise plan with a Business Associate Agreement in place before use.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Individual dictations can be exported to .docx at any time. Enterprise customers can request a full data export or deletion through support.',
  },
  {
    q: 'Do you offer discounts for multi-seat firms?',
    a: 'Yes. Contact sales for multi-seat pricing, law-firm enterprise bundles, and annual prepay discounts.',
  },
];

function Check() {
  return (
    <svg className="w-4 h-4 text-gold-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <>
      <main className="min-h-screen bg-ink-950 text-ink-200 px-4 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <a href="/" className="inline-block mb-6">
              <h1 className="font-display text-2xl text-ink-50 tracking-tight">
                AlecRae <span className="text-gold-400">Voice</span>
              </h1>
            </a>
            <h2 className="font-display text-3xl sm:text-5xl text-ink-50 tracking-tight mb-4">
              Pricing built for the profession.
            </h2>
            <p className="text-ink-400 text-base max-w-2xl mx-auto">
              Straightforward plans. No per-seat surprises. Every tier includes the full
              legal and accounting vocabulary and the same Anthropic Claude enhancement
              engine that powers the Pro experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={[
                  'rounded-2xl p-7 flex flex-col',
                  tier.highlight
                    ? 'bg-gradient-to-b from-gold-500/10 to-ink-900/50 border-2 border-gold-500/40 shadow-[0_0_40px_-12px_rgba(212,168,78,0.35)]'
                    : 'bg-ink-900/50 border border-ink-800/60',
                ].join(' ')}
              >
                {tier.highlight && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-gold-300 font-semibold mb-3">
                    Most popular
                  </div>
                )}
                <h3 className="font-display text-2xl text-ink-50 mb-1">{tier.name}</h3>
                <p className="text-ink-400 text-sm mb-5 min-h-[2.5rem]">{tier.tagline}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-4xl text-ink-50">{tier.price}</span>
                  {tier.priceSuffix && (
                    <span className="text-ink-500 text-sm">{tier.priceSuffix}</span>
                  )}
                </div>
                <a
                  href={tier.cta.href}
                  className={[
                    'block text-center rounded-lg px-4 py-2.5 text-sm font-medium mb-7 transition-colors',
                    tier.highlight
                      ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                      : 'bg-ink-800 text-ink-100 hover:bg-ink-700',
                  ].join(' ')}
                >
                  {tier.cta.label}
                </a>
                <ul className="space-y-2.5 text-sm text-ink-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="font-display text-2xl text-ink-50 mb-6 text-center">
              Frequently asked questions
            </h3>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="bg-ink-900/50 border border-ink-800/60 rounded-xl p-5 group"
                >
                  <summary className="cursor-pointer text-ink-100 font-medium flex items-center justify-between">
                    <span>{item.q}</span>
                    <span className="text-gold-400 text-xl leading-none group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="text-ink-300 text-sm leading-relaxed mt-3">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <a href="/" className="text-ink-400 text-sm hover:text-gold-400 transition-colors">
              &larr; Back to AlecRae Voice
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
