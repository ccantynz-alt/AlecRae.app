export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-ink-200 px-4 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <a href="/" className="inline-block mb-6">
            <h1 className="font-display text-2xl text-ink-50 tracking-tight">
              AlecRae <span className="text-gold-400">Voice</span>
            </h1>
          </a>
          <h2 className="font-display text-3xl sm:text-4xl text-ink-50 tracking-tight mb-3">
            Privacy &amp; Data Handling
          </h2>
          <p className="text-ink-400 text-sm">
            Last updated: 4 April 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-10">
          <p className="text-ink-300 leading-relaxed">
            AlecRae Voice is purpose-built for legal and accounting professionals who
            routinely handle sensitive, privileged, and confidential information. We
            understand the gravity of attorney-client privilege, professional
            confidentiality obligations, and regulatory compliance. This page explains
            precisely how your data is processed, stored, and protected when you use
            this platform.
          </p>
        </section>

        <div className="space-y-10">
          {/* 1. How Audio is Processed */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">01</span>
              How Audio Is Processed
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                When you record a dictation, the audio is transmitted directly from your
                browser to the OpenAI Whisper API for transcription. Audio data is
                processed in real-time and is <strong className="text-ink-100">not stored
                permanently</strong> on our servers. No audio files are written to disk,
                cached, or retained beyond the duration of the transcription request.
              </p>
              <p className="text-ink-300 leading-relaxed">
                Once the transcription is returned to your browser, the original audio
                data is discarded. We do not maintain audio archives, recordings, or
                any derivative audio content.
              </p>
            </div>
          </section>

          {/* 2. How Text is Processed */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">02</span>
              How Text Is Processed
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                Transcribed text is sent to the Anthropic Claude API for AI-powered
                enhancement, formatting, and document structuring. Anthropic processes
                the text to fulfil the request and does{' '}
                <strong className="text-ink-100">not retain your input or output data</strong>{' '}
                beyond the scope of the individual API request, in accordance with
                Anthropic&rsquo;s API data usage policy.
              </p>
              <p className="text-ink-300 leading-relaxed">
                Neither the raw transcription nor the enhanced output is stored on our
                servers. All text processing is transient and stateless.
              </p>
            </div>
          </section>

          {/* 3. Local Storage */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">03</span>
              Local Storage
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                Your dictation history, custom vocabulary, AI instructions, and
                application settings are stored in your browser&rsquo;s{' '}
                <code className="text-gold-400/80 bg-ink-800/50 px-1.5 py-0.5 rounded text-sm">localStorage</code>.
                This data resides exclusively on your device and is never transmitted to
                or stored on our servers unless a server-side database has been
                explicitly configured.
              </p>
              <p className="text-ink-300 leading-relaxed">
                Because this data is local to your browser, it is not accessible from
                other devices, browsers, or profiles. Clearing your browser data will
                permanently remove this information.
              </p>
            </div>
          </section>

          {/* 4. Data Retention */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">04</span>
              Data Retention
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5">
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Audio recordings:</strong> Not retained. Discarded immediately after transcription.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Raw transcriptions:</strong> Stored in browser localStorage only. Not transmitted to or held on any server.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Enhanced text:</strong> Stored in browser localStorage only. Not transmitted to or held on any server.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Session tokens:</strong> JWT cookies expire after 30 days. No session data is stored server-side.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 5. Encryption & Transport Security */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">05</span>
              Encryption &amp; Transport Security
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                All data transmitted between your browser and AlecRae Voice is encrypted
                via <strong className="text-ink-100">TLS 1.3</strong>. This includes audio
                uploads, transcription requests, enhancement requests, and
                authentication credentials.
              </p>
              <p className="text-ink-300 leading-relaxed">
                Session authentication uses{' '}
                <strong className="text-ink-100">httpOnly, Secure, SameSite</strong> cookies
                containing signed JWT tokens. These cookies cannot be accessed by
                client-side JavaScript, mitigating cross-site scripting (XSS) attack
                vectors.
              </p>
            </div>
          </section>

          {/* 6. Third-Party Processors */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">06</span>
              Third-Party Data Processors
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-4">
              <p className="text-ink-300 leading-relaxed">
                AlecRae Voice uses two third-party API services to provide its core
                functionality. No other third-party services receive your data.
              </p>
              <div className="space-y-3">
                <div className="border-l-2 border-gold-500/30 pl-4">
                  <p className="text-ink-100 font-medium mb-1">OpenAI — Audio Transcription</p>
                  <p className="text-ink-400 text-sm leading-relaxed">
                    Audio is sent to OpenAI&rsquo;s Whisper API for speech-to-text conversion.
                    OpenAI&rsquo;s API data usage policy states that data submitted via the API
                    is not used to train their models.
                  </p>
                  <a
                    href="https://openai.com/policies/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-400/80 hover:text-gold-400 text-sm underline underline-offset-2 transition-colors"
                  >
                    OpenAI Privacy Policy
                  </a>
                </div>
                <div className="border-l-2 border-gold-500/30 pl-4">
                  <p className="text-ink-100 font-medium mb-1">Anthropic — Text Enhancement</p>
                  <p className="text-ink-400 text-sm leading-relaxed">
                    Transcribed text is sent to Anthropic&rsquo;s Claude API for document
                    enhancement and formatting. Anthropic&rsquo;s API data usage policy states
                    that API inputs and outputs are not used to train their models.
                  </p>
                  <a
                    href="https://www.anthropic.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-400/80 hover:text-gold-400 text-sm underline underline-offset-2 transition-colors"
                  >
                    Anthropic Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Attorney-Client Privilege */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">07</span>
              Attorney-Client Privilege
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                We recognise that legal professionals using AlecRae Voice may dictate
                content that is protected by attorney-client privilege or work product
                doctrine. The platform includes a dedicated{' '}
                <strong className="text-ink-100">Privacy Mode</strong> that, when enabled,
                disables all history storage for the duration of that dictation session.
              </p>
              <p className="text-ink-300 leading-relaxed">
                When Privacy Mode is active, no transcription or enhanced text is
                written to localStorage or any other persistent storage. The dictation
                exists only in active memory and is lost when you navigate away or close
                the browser.
              </p>
              <div className="bg-ink-800/30 border border-ink-700/30 rounded-lg p-4 mt-2">
                <p className="text-ink-400 text-sm leading-relaxed">
                  <strong className="text-ink-300">Important:</strong> While AlecRae Voice
                  is designed to minimise data exposure, attorneys must independently
                  assess whether the use of any cloud-based dictation tool is appropriate
                  for their specific privilege and confidentiality obligations under
                  applicable rules of professional conduct.
                </p>
              </div>
            </div>
          </section>

          {/* 8. GDPR & Data Rights */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">08</span>
              GDPR &amp; Data Rights
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5 space-y-3">
              <p className="text-ink-300 leading-relaxed">
                AlecRae Voice does not collect, process, or store personal data on its
                servers. All user-generated content is stored locally on your device.
                There are no user accounts, no tracking cookies, no analytics scripts,
                and no behavioural profiling.
              </p>
              <p className="text-ink-300 leading-relaxed">
                You may exercise your data rights at any time:
              </p>
              <ul className="space-y-2 ml-1">
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Right to access:</strong> All your data is visible in your browser&rsquo;s localStorage and can be inspected via browser developer tools.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Right to erasure:</strong> Clear all local data at any time via the application settings or by clearing your browser storage. No server-side data exists to delete.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Right to portability:</strong> Export your dictation history and enhanced documents at any time using the built-in export functionality.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 9. Security Measures */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">09</span>
              Security Measures
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5">
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Password-protected access:</strong> The platform is gated behind admin authentication. No public access to dictation functionality.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Session expiry:</strong> JWT sessions expire after 30 days. Expired sessions require re-authentication.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Rate limiting:</strong> API endpoints are rate-limited to prevent abuse and denial-of-service attacks.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">No data monetisation:</strong> Your data is never sold, shared, licensed, or provided to any third party for marketing, analytics, or any purpose beyond the core transcription and enhancement services described herein.</span>
                </li>
                <li className="flex items-start gap-2 text-ink-300">
                  <span className="text-gold-500/60 mt-1.5 text-xs">&#9632;</span>
                  <span><strong className="text-ink-100">Secure hosting:</strong> The application is hosted on Vercel with automatic TLS certificate management, DDoS protection, and global edge network distribution.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 10. Contact */}
          <section>
            <h3 className="font-display text-xl text-gold-400 mb-3 flex items-center gap-2">
              <span className="text-gold-500/60 text-sm font-mono">10</span>
              Contact
            </h3>
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-5">
              <p className="text-ink-300 leading-relaxed">
                For questions regarding data handling, privacy practices, or to report a
                security concern, please contact us via the{' '}
                <a
                  href="https://alecrae.app"
                  className="text-gold-400/80 hover:text-gold-400 underline underline-offset-2 transition-colors"
                >
                  AlecRae website
                </a>.
              </p>
            </div>
          </section>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-12 pt-8 border-t border-ink-800/50">
          <p className="text-ink-500 text-xs leading-relaxed">
            This privacy and data handling statement is provided for informational
            purposes and describes the current technical architecture of AlecRae
            Voice. It does not constitute legal advice and should not be relied upon
            as a substitute for independent legal counsel regarding your data
            protection obligations. AlecRae reserves the right to update this
            statement as the platform evolves. Material changes will be reflected in
            the &ldquo;Last updated&rdquo; date above.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-ink-500 hover:text-ink-300 text-sm transition-colors"
          >
            &larr; Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
