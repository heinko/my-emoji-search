import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Myanmar Emoji Search - Find Perfect Emojis',
  description: 'Search for emojis using Burmese and supported Myanmar-region languages, with English keywords always available as a fallback.',
  icons: {
    icon: '/sparkle-icon.svg',
    shortcut: '/sparkle-icon.svg',
    apple: '/sparkle-icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
