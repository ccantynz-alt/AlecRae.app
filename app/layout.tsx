import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlecRae Voice — Professional Dictation',
  description: 'AI-powered dictation for legal and accounting professionals. Whisper transcription + Claude AI formatting.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AlecRae Voice' },
  icons: { apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111920',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-ink-950 text-ink-100 font-body antialiased">{children}</body>
    </html>
  )
}
