// src/components/features/Header.tsx
import Link from 'next/link'
import { Waves } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white border-b border-sable-fonce shadow-sm sticky top-0 z-40">
      <nav
        className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between"
        aria-label="Navigation principale"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-xl text-ocean hover:opacity-80 transition-opacity"
          aria-label="Plages Accessibles — Retour à l'accueil"
        >
          <Waves size={28} aria-hidden="true" />
          <span>Plages Accessibles</span>
        </Link>

        <ul className="flex items-center gap-6 text-sm font-semibold" role="list">
          <li>
            <Link
              href="/recherche"
              className="text-ardoise hover:text-ocean transition-colors"
            >
              🔍 Rechercher
            </Link>
          </li>
          <li>
            <Link
              href="/a-propos"
              className="text-ardoise hover:text-ocean transition-colors"
            >
              À propos
            </Link>
          </li>
          <li>
            <Link
              href="/contribuer"
              className="bg-ocean text-white px-4 py-2 rounded-lg hover:bg-ocean-clair transition-colors"
            >
              Contribuer
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}
