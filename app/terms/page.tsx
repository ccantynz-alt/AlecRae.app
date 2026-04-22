import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'Terms of Service · AlecRae Voice',
  description: 'Terms of Service for AlecRae Voice, a dictation platform for legal and accounting professionals.',
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

export default function TermsPage() {
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
              Terms of Service
            </h2>
            <p className="text-ink-400 text-sm">Last updated: 20 April 2026</p>
          </div>

          <section className="mb-10">
            <p className="text-ink-300 leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
              AlecRae Voice (the &ldquo;Service&rdquo;), operated by AlecRae
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an
              account, signing in, or otherwise using the Service, you agree to be bound
              by these Terms. If you do not agree, you must not use the Service.
            </p>
          </section>

          <div className="space-y-10">
            <Section num="01" title="Acceptance of Terms">
              <p>
                By accessing the Service, you confirm that you are at least 18 years old,
                legally able to enter into a binding agreement, and authorised to bind the
                organisation (law firm, accounting practice, or other entity) on whose
                behalf you are using the Service.
              </p>
            </Section>

            <Section num="02" title="Service Description">
              <p>
                AlecRae Voice provides voice-to-text dictation, AI-powered document
                enhancement, template-based document generation, and related features
                specifically designed for legal and accounting professionals. The Service
                uses third-party transcription (OpenAI Whisper) and language model
                (Anthropic Claude) providers to process your audio and text.
              </p>
            </Section>

            <Section num="03" title="Account Registration and Password Security">
              <p>
                You are responsible for safeguarding your account credentials and for all
                activities that occur under your account. You must notify us immediately
                of any unauthorised access. We strongly recommend enabling
                single-sign-on (SSO) where available and selecting strong passwords. We
                are not liable for losses arising from compromised credentials that were
                not promptly reported.
              </p>
            </Section>

            <Section num="04" title="Acceptable Use">
              <p>You must not use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Engage in the unauthorised practice of law or accounting in any jurisdiction;</li>
                <li>Process protected health information without first executing a Business Associate Agreement with us where required;</li>
                <li>Process or transmit unlawful content, including content that infringes third-party rights;</li>
                <li>Attempt to reverse engineer, interfere with, or circumvent the security of the Service;</li>
                <li>Use the Service to compete with AlecRae or to train a competing AI model.</li>
              </ul>
            </Section>

            <Section num="05" title="Intellectual Property">
              <p>
                You retain ownership of all audio recordings, transcriptions, and
                documents you create using the Service (&ldquo;Your Content&rdquo;). AlecRae
                retains all rights in and to the Service, including its software,
                interfaces, document templates, system prompts, vocabulary packs, and
                brand assets. You grant us a limited licence to process Your Content
                solely to provide and improve the Service, subject to our Privacy &amp;
                Data Handling page.
              </p>
            </Section>

            <Section num="06" title="Confidentiality and Privileged Communications">
              <p>
                We recognise that dictations frequently contain information subject to
                attorney-client privilege, work-product doctrine, accountant-client
                privilege, or equivalent professional confidentiality obligations. We
                treat Your Content as confidential and process it in accordance with our
                <a href="/privacy" className="text-gold-400 hover:text-gold-300"> Privacy &amp; Data Handling</a> page. We do not review, index, or use Your Content to train
                AI models. Enterprise customers may execute a separate confidentiality
                agreement or BAA on request.
              </p>
            </Section>

            <Section num="07" title="Data Processing and Privacy">
              <p>
                Our processing of personal information is governed by our
                <a href="/privacy" className="text-gold-400 hover:text-gold-300"> Privacy &amp; Data Handling</a> page,
                which is incorporated into these Terms by reference. You are the data
                controller for information you dictate; we act as a data processor.
              </p>
            </Section>

            <Section num="08" title="Professional Responsibility Disclaimer">
              <p>
                <strong className="text-ink-100">The Service is a productivity tool, not legal or accounting advice.</strong>{' '}
                The Service does not establish an attorney-client, accountant-client, or
                advisory relationship with AlecRae. You remain solely responsible for
                compliance with all rules of professional conduct applicable to you,
                including but not limited to the New Zealand Lawyers and Conveyancers Act
                2006 and Rules of Conduct and Client Care for Lawyers, the AICPA Code of
                Professional Conduct, IRC Circular 230, the SRA Standards and Regulations,
                the ABA Model Rules of Professional Conduct, and any equivalent rules in
                your jurisdiction. Always independently verify citations, statutory
                references, and substantive legal or accounting conclusions produced by
                the Service.
              </p>
            </Section>

            <Section num="09" title="Subscription and Billing">
              <p>
                Pricing, plan entitlements, and usage limits are described on our
                <a href="/pricing" className="text-gold-400 hover:text-gold-300"> Pricing</a> page. Subscriptions
                auto-renew unless cancelled before the renewal date. Fees are
                non-refundable except where required by law. We may change pricing on
                30 days&rsquo; notice; changes apply at your next renewal.
              </p>
            </Section>

            <Section num="10" title="Disclaimers and Warranties">
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
                WARRANTY OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR
                ACCURACY OF TRANSCRIPTION OR AI OUTPUT. AI SYSTEMS CAN PRODUCE ERRORS.
                YOU MUST REVIEW ALL OUTPUT BEFORE USING IT PROFESSIONALLY.
              </p>
            </Section>

            <Section num="11" title="Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ALECRAE&rsquo;S AGGREGATE LIABILITY
                ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE WILL NOT EXCEED
                THE GREATER OF (A) THE FEES YOU PAID TO US IN THE 12 MONTHS PRECEDING THE
                CLAIM, OR (B) NZ$100. WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE,
                DATA, OR BUSINESS OPPORTUNITIES. NOTHING IN THESE TERMS LIMITS LIABILITY
                THAT CANNOT BE LIMITED BY LAW.
              </p>
            </Section>

            <Section num="12" title="Indemnification">
              <p>
                You will indemnify and hold harmless AlecRae and its officers, directors,
                employees, and agents from any third-party claim, demand, or proceeding
                arising out of or related to (a) your use of the Service in breach of
                these Terms, (b) your violation of any applicable law or professional
                rule, or (c) Your Content.
              </p>
            </Section>

            <Section num="13" title="Termination">
              <p>
                You may cancel your subscription at any time from your billing portal. We
                may suspend or terminate your access for breach of these Terms or for
                non-payment. On termination, your right to use the Service ceases
                immediately. You may export Your Content up to 30 days before
                cancellation takes effect.
              </p>
            </Section>

            <Section num="14" title="Governing Law and Jurisdiction">
              <p>
                These Terms are governed by the laws of New Zealand. The courts of
                Auckland, New Zealand have exclusive jurisdiction over any dispute arising
                from these Terms, subject to Section 15.
              </p>
            </Section>

            <Section num="15" title="Dispute Resolution">
              <p>
                Before commencing legal proceedings, the parties will attempt to resolve
                any dispute through good-faith negotiation for 30 days. If unresolved,
                the dispute will be referred to mediation administered by the Arbitrators
                and Mediators Institute of New Zealand (AMINZ). If mediation fails, the
                dispute will be finally resolved by arbitration under the AMINZ Rules.
                Nothing in this section prevents either party from seeking injunctive
                relief in a court of competent jurisdiction.
              </p>
            </Section>

            <Section num="16" title="Changes to Terms">
              <p>
                We may update these Terms from time to time. Material changes will be
                notified by email or in-app notice at least 30 days before taking effect.
                Continued use of the Service after the effective date constitutes
                acceptance of the updated Terms.
              </p>
            </Section>

            <Section num="17" title="Contact">
              <p>
                Questions about these Terms should be directed to{' '}
                <a href="mailto:legal@alecrae.app" className="text-gold-400 hover:text-gold-300">
                  legal@alecrae.app
                </a>
                . Commercial enquiries should be directed to{' '}
                <a href="mailto:sales@alecrae.app" className="text-gold-400 hover:text-gold-300">
                  sales@alecrae.app
                </a>
                .
              </p>
            </Section>
          </div>

          <div className="mt-16 text-center">
            <a
              href="/"
              className="text-ink-400 text-sm hover:text-gold-400 transition-colors"
            >
              &larr; Back to AlecRae Voice
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
