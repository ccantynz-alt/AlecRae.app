import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlecRae Voice — Professional Dictation',
  description: 'AI-powered dictation for legal and accounting professionals. Whisper transcription + Claude AI formatting.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AlecRae Voice' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
    ],
  },
  applicationName: 'AlecRae Voice',
  other: {
    // Android Chrome
    'mobile-web-app-capable': 'yes',
    // Windows pinned site
    'msapplication-TileColor': '#111920',
    'msapplication-TileImage': '/icon-192.png',
    'msapplication-config': 'none',
    // Disable automatic phone number detection
    'format-detection': 'telephone=no',
    // Permissions policy for microphone access
    'permissions-policy': 'microphone=(self)',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#111920' },
    { media: '(prefers-color-scheme: light)', color: '#111920' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* iOS-specific meta tags for full PWA experience */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AlecRae Voice" />

        {/* Android Chrome theme */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Prevent zoom on input focus for iOS Safari */}
        <meta name="HandheldFriendly" content="true" />
      </head>
      <body className="h-full bg-ink-950 text-ink-100 font-body antialiased">
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .catch(function(err) {
                      console.warn('[SW] Registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
