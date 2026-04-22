import Link from 'next/link';

const PRODUCT_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/login', label: 'Sign in' },
  { href: '/app', label: 'Launch app' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy & Data Handling' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-800/60 bg-ink-950/80 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <svg
                className="w-6 h-6 text-gold-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
              <span className="font-display text-lg text-ink-50">
                AlecRae <span className="text-gold-400">Voice</span>
              </span>
            </Link>
            <p className="text-ink-500 text-sm leading-relaxed">
              Purpose-built dictation for lawyers and accountants.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-ink-100 text-xs font-semibold uppercase tracking-wider mb-3">
              Product
            </h4>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-400 text-sm hover:text-gold-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-ink-100 text-xs font-semibold uppercase tracking-wider mb-3">
              Company
            </h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-400 text-sm hover:text-gold-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-ink-100 text-xs font-semibold uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-400 text-sm hover:text-gold-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-ink-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-ink-600 text-xs">
            &copy; {year} AlecRae. All rights reserved.
          </p>
          <p className="text-ink-600 text-xs">
            Part of the AlecRae professional services brand. Hosted in New Zealand.
          </p>
        </div>
      </div>
    </footer>
  );
}
