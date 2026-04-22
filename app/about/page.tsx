import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'About · AlecRae Voice',
  description: 'AlecRae Voice is purpose-built dictation for legal and accounting professionals. Built in New Zealand.',
};

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
        <span className="text-gold-500/60 text-sm font-mono">{num}</span>
        {title}
      </h3>
      <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3 text-ink-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-ink-950 text-ink-200 px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <a href="/" className="inline-block mb-6">
              <h1 className="font-display text-2xl text-ink-50 tracking-tight">
                AlecRae <span className="text-gold-400">Voice</span>
              </h1>
            </a>
            <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
              About AlecRae Voice
            </h2>
            <p className="text-ink-400 text-sm">
              Purpose-built dictation for lawyers and accountants.
            </p>
          </div>

          <section className="mb-10">
            <p className="text-ink-300 leading-relaxed">
              AlecRae Voice is not a general dictation tool that happens to work for
              lawyers. It was designed, from the first line of code, for legal and
              accounting professionals — for the way those professions draft, cite, file,
              and communicate. Everything from our vocabulary packs to our document modes
              to our AI system prompts reflects that focus.
            </p>
          </section>

          <div className="space-y-10">
            <Section num="01" title="Our mission">
              <p>
                Give every attorney, accountant, and compliance professional a dictation
                experience that understands their craft. No generic grammar cleanup. No
                one-size-fits-all transcription. Software that respects privilege, formats
                court filings properly, cites authority correctly, and flags the issues a
                partner would flag.
              </p>
            </Section>

            <Section num="02" title="Why legal and accounting specialisation matters">
              <p>
                Generic dictation platforms cannot distinguish between a citation and a
                case caption. They will not prompt you when a tax advisory is missing a
                Circular 230 disclaimer. They have no concept of attorney-client privilege
                as a first-class requirement. AlecRae Voice treats these concerns as core
                product, not edge cases.
              </p>
              <p>
                Our twelve document modes are not templates with blanks. They are
                professionally designed system prompts layered over Anthropic Claude with
                extended thinking, tuned for the conventions of each document type — from
                formal NZ High Court filings to AICPA-compliant audit opinions.
              </p>
            </Section>

            <Section num="03" title="Where AlecRae Voice fits in the AlecRae brand">
              <p>
                AlecRae is a professional services brand spanning law, accounting, and
                compliance. AlecRae sits within the <strong className="text-ink-100">MarcoReid</strong>{' '}
                umbrella — a global business operating system built around five layers:
                Build, Run, Grow, Connect, and Protect. AlecRae Voice lives in the
                <strong className="text-ink-100"> Protect</strong> layer, alongside the
                broader AlecRae ecosystem of legal research, accounting, messenger, and
                internal email systems that we integrate with over time.
              </p>
            </Section>

            <Section num="04" title="Our product philosophy">
              <p>
                Document formatting intelligence is the moat. Anyone can wrap Whisper.
                Very few teams have the domain depth to turn raw transcription into a
                properly structured demand letter, an IRC-cited tax memo, or a numbered
                court filing that would actually pass a registrar&rsquo;s review. That is
                what we build for.
              </p>
              <p>
                We also believe that attorneys and accountants deserve software that
                feels premium — dark themed, typographically considered, fast, and
                serious. No gimmicks, no attention-grabbing emoji, no &ldquo;fun&rdquo;.
                Just a tool that respects the seriousness of the work.
              </p>
            </Section>

            <Section num="05" title="Technology">
              <p>
                AlecRae Voice runs on Next.js 14 with Tailwind CSS, deployed on Vercel.
                Transcription is powered by OpenAI Whisper with a 5,000+ term legal and
                accounting vocabulary. Document enhancement is powered by Anthropic Claude
                (claude-sonnet-4) with extended thinking for complex legal and accounting
                reasoning. All infrastructure is built for privacy: we do not store audio,
                we do not index your content, and we do not train on your data.
              </p>
            </Section>

            <Section num="06" title="Built in New Zealand">
              <p>
                AlecRae Voice is designed and built in Aotearoa New Zealand, for the
                global legal and accounting profession. Our default vocabulary and
                citation detection cover New Zealand, United Kingdom, United States, and
                Australian practice — with more jurisdictions added as the platform
                grows.
              </p>
            </Section>
          </div>

          <div className="mt-16 text-center space-x-6">
            <a href="/pricing" className="text-gold-400 text-sm hover:text-gold-300 transition-colors">
              See pricing &rarr;
            </a>
            <a href="/contact" className="text-ink-400 text-sm hover:text-gold-400 transition-colors">
              Contact us
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
