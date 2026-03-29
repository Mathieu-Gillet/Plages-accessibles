// src/app/layout.tsx
import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/features/Header'
import { Footer } from '@/components/features/Footer'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Plages Accessibles — Trouver une plage adaptée en France',
    template: '%s | Plages Accessibles',
  },
  description:
    'Trouvez facilement les plages françaises accessibles aux personnes en situation de handicap : fauteuil roulant, tiralo, hippocampe, et bien plus.',
  keywords: [
    'plage accessible',
    'handicap',
    'PMR',
    'tiralo',
    'hippocampe',
    'handiplage',
    'fauteuil roulant plage',
    'vacances accessibles France',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Plages Accessibles',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={nunito.variable}>
      <body className="min-h-screen flex flex-col bg-sable text-ardoise antialiased">
        {/* Skip link pour accessibilité clavier */}
        <a
          href="#contenu-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ocean focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Aller au contenu principal
        </a>
        <Header />
        <main id="contenu-principal" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
