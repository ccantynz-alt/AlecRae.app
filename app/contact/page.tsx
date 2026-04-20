import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'Contact · AlecRae Voice',
  description: 'Contact AlecRae Voice — sales, support, legal, and enterprise enquiries.',
};

type Channel = {
  title: string;
  description: string;
  email: string;
  response: string;
};

const CHANNELS: Channel[] = [
  {
    title: 'Sales and enterprise',
    description: 'Multi-seat licensing, SSO, white-label, and on-premises deployment.',
    email: 'sales@alecrae.app',
    response: 'Typically within 1 business day',
  },
  {
    title: 'Customer support',
    description: 'Help with your account, features, billing, or bug reports.',
    email: 'support@alecrae.app',
    response: 'Priority support within 4 business hours (Pro and Enterprise)',
  },
  {
    title: 'Legal and privacy',
    description: 'Data requests, Business Associate Agreements, DPIAs, and legal notices.',
    email: 'legal@alecrae.app',
    response: 'Within 5 business days',
  },
];

export default function ContactPage() {
  return (
    <>
      <main className="min-h-screen bg-ink-950 text-ink-200 px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <a href="/" className="inline-block mb-6">
              <h1 className="font-display text-2xl text-ink-50 tracking-tight">
                AlecRae <span className="text-gold-400">Voice</span>
              </h1>
            </a>
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
              Get in touch.
            </h2>
            <p className="text-ink-400 max-w-xl mx-auto">
              We read every message. Pick the right channel below so it reaches the
              correct team without delay.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-14">
            {CHANNELS.map((c) => (
              <div
                key={c.email}
                className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-6 flex flex-col"
              >
                <h3 className="font-display text-lg text-gold-400 mb-2">{c.title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed mb-4 flex-1">
                  {c.description}
                </p>
                <a
                  href={`mailto:${c.email}`}
                  className="text-ink-100 text-sm font-medium hover:text-gold-400 transition-colors mb-3 break-all"
                >
                  {c.email}
                </a>
                <p className="text-ink-500 text-xs">{c.response}</p>
              </div>
            ))}
          </div>

          <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-7 mb-10">
            <h3 className="font-display text-xl text-gold-400 mb-3">Mailing address</h3>
            <p className="text-ink-300 leading-relaxed">
              AlecRae
              <br />
              c/o MarcoReid
              <br />
              Auckland, New Zealand
            </p>
            <p className="text-ink-500 text-sm mt-4">
              Please send legal notices by email to{' '}
              <a href="mailto:legal@alecrae.app" className="text-gold-400 hover:text-gold-300">
                legal@alecrae.app
              </a>{' '}
              in addition to any physical copy.
            </p>
          </div>

          <div className="bg-gradient-to-b from-gold-500/10 to-ink-900/40 border border-gold-500/30 rounded-2xl p-7">
            <h3 className="font-display text-xl text-ink-50 mb-2">
              Looking for an enterprise demo?
            </h3>
            <p className="text-ink-300 leading-relaxed mb-4">
              We tailor demos to your firm&rsquo;s practice areas — litigation, tax,
              corporate, audit, or compliance. Tell us a little about your team and we
              will arrange a 30-minute walkthrough.
            </p>
            <a
              href="mailto:sales@alecrae.app?subject=Enterprise%20demo%20request"
              className="inline-block bg-gold-500 text-ink-950 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              Request a demo
            </a>
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
